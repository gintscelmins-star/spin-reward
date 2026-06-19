import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'
import WheelSubNav from '@/components/WheelSubNav'

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  return `${local[0]}***@${domain}`
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['client_admin', 'agency_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const admin = getAdmin()

  const { data: wheel } = await admin
    .from('wheels')
    .select('id, name, total_views, total_leads, created_at')
    .eq('id', id)
    .single()

  if (!wheel) redirect('/dashboard/widgets')

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const daysSinceCreated = Math.max(
    1,
    Math.floor((now - new Date(wheel.created_at).getTime()) / (24 * 60 * 60 * 1000))
  )

  const [{ data: recentLeads }, { data: allLeads }, { data: segLeads }] = await Promise.all([
    admin
      .from('leads')
      .select('id, email, created_at, wheel_segments(label)')
      .eq('wheel_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('leads')
      .select('created_at, utm_source, utm_medium')
      .eq('wheel_id', id)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at'),
    admin
      .from('leads')
      .select('segment_id, wheel_segments(label)')
      .eq('wheel_id', id),
  ])

  // Daily leads chart data
  const dailyMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000)
    dailyMap[d.toISOString().slice(0, 10)] = 0
  }
  for (const l of allLeads ?? []) {
    const day = l.created_at.slice(0, 10)
    if (day in dailyMap) dailyMap[day] = (dailyMap[day] ?? 0) + 1
  }
  const dailyData = Object.entries(dailyMap).map(([date, count]) => ({ date, count }))
  const maxDaily = Math.max(1, ...dailyData.map(d => d.count))

  // Segment breakdown
  const segMap: Record<string, number> = {}
  for (const l of segLeads ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const label = (l.wheel_segments as any)?.label ?? 'Nezināms'
    segMap[label] = (segMap[label] ?? 0) + 1
  }
  const totalSegLeads = Object.values(segMap).reduce((a, b) => a + b, 0) || 1
  const segData = Object.entries(segMap)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count]) => ({ label, count, pct: Math.round((count / totalSegLeads) * 100) }))

  // UTM breakdown
  const utmMap: Record<string, number> = {}
  for (const l of allLeads ?? []) {
    const key = `${l.utm_source ?? '(direct)'}|${l.utm_medium ?? '(none)'}`
    utmMap[key] = (utmMap[key] ?? 0) + 1
  }
  const utmData = Object.entries(utmMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([key, count]) => {
      const [source, medium] = key.split('|')
      return { source, medium, count }
    })

  const convPct = (wheel.total_views ?? 0) > 0
    ? Math.round(((wheel.total_leads ?? 0) / (wheel.total_views ?? 1)) * 100 * 10) / 10
    : 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <WheelSubNav wheelId={id} wheelName={wheel.name} active="analytics" />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Kopējie skatījumi', value: (wheel.total_views ?? 0).toLocaleString() },
            { label: 'Kopējie leads',     value: (wheel.total_leads ?? 0).toLocaleString() },
            { label: 'Konversija %',      value: `${convPct}%` },
            { label: 'Aktīvo dienu',      value: daysSinceCreated },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl shadow p-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className="text-2xl font-bold text-gray-800">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Daily leads bar chart */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-widest mb-4">
              Leads pa dienām (30 dienas)
            </h2>
            <div className="flex items-end gap-0.5 h-32">
              {dailyData.map(({ date, count }) => (
                <div
                  key={date}
                  className="flex-1 flex flex-col items-center justify-end group relative"
                >
                  <div
                    className="w-full bg-purple-400 hover:bg-purple-600 rounded-t transition-colors"
                    style={{ height: `${(count / maxDaily) * 100}%`, minHeight: count > 0 ? '2px' : '0' }}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                    {date.slice(5)}: {count}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>{dailyData[0]?.date.slice(5)}</span>
              <span>{dailyData[dailyData.length - 1]?.date.slice(5)}</span>
            </div>
          </div>

          {/* Segment breakdown */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-widest mb-4">
              Segmentu sadalījums
            </h2>
            {segData.length === 0 ? (
              <p className="text-sm text-gray-400">Nav datu</p>
            ) : (
              <div className="space-y-3">
                {segData.map(({ label, count, pct }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate">{label}</span>
                      <span className="text-gray-500 ml-2 whitespace-nowrap">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* UTM sources */}
        {utmData.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-widest mb-4">
              Top avoti (UTM)
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Avots</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Medijs</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Leads</th>
                </tr>
              </thead>
              <tbody>
                {utmData.map(row => (
                  <tr key={`${row.source}-${row.medium}`} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{row.source}</td>
                    <td className="py-2 text-gray-500">{row.medium}</td>
                    <td className="py-2 text-right font-mono text-gray-700">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent leads */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-widest">
              Pēdējie leads
            </h2>
          </div>
          {(recentLeads ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">Nav leads vēl</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">E-pasts</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Segments</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Laiks</th>
                </tr>
              </thead>
              <tbody>
                {(recentLeads ?? []).map(l => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="py-2 font-mono text-gray-700">{maskEmail(l.email)}</td>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <td className="py-2 text-gray-500">{(l.wheel_segments as any)?.label ?? '—'}</td>
                    <td className="py-2 text-right text-gray-400 text-xs">
                      {new Date(l.created_at).toLocaleString('lv-LV')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
