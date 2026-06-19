import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'

interface VenueStat {
  id: string
  name: string
  logo_url: string | null
  active_wheels: number
  total_leads: number
  leads_month: number
  last_lead_at: string | null
}

export default async function AgencyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['agency_admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard/widgets')
  }

  const admin = getAdmin()

  // Fetch venues for this organization
  let venueQuery = admin.from('venues').select('id, name, logo_url')
  if (profile.role === 'agency_admin' && profile.organization_id) {
    venueQuery = venueQuery.eq('organization_id', profile.organization_id)
  }
  const { data: venues } = await venueQuery.order('name')

  if (!venues || venues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Aģentūras pārskats</h1>
          <p className="text-gray-400">Nav pievienotu venues šai organizācijai.</p>
        </div>
      </div>
    )
  }

  const venueIds = venues.map(v => v.id)
  // eslint-disable-next-line react-hooks/purity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: allWheels }, { data: allLeads }] = await Promise.all([
    admin
      .from('wheels')
      .select('id, venue_id, active')
      .in('venue_id', venueIds),
    admin
      .from('leads')
      .select('id, venue_id, created_at')
      .in('venue_id', venueIds),
  ])

  // Aggregate per venue
  const venueStats: VenueStat[] = venues.map(v => {
    const vWheels = (allWheels ?? []).filter(w => w.venue_id === v.id)
    const vLeads = (allLeads ?? []).filter(l => l.venue_id === v.id)
    const recentLeads = vLeads.filter(l => l.created_at >= thirtyDaysAgo)
    const sorted = [...vLeads].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return {
      id: v.id,
      name: v.name,
      logo_url: v.logo_url,
      active_wheels: vWheels.filter(w => w.active).length,
      total_leads: vLeads.length,
      leads_month: recentLeads.length,
      last_lead_at: sorted[0]?.created_at ?? null,
    }
  }).sort((a, b) => b.leads_month - a.leads_month)

  // Org-level totals
  const totalVenues = venueStats.length
  const totalActiveWheels = venueStats.reduce((s, v) => s + v.active_wheels, 0)
  const totalLeadsMonth = venueStats.reduce((s, v) => s + v.leads_month, 0)
  const totalLeadsAll = venueStats.reduce((s, v) => s + v.total_leads, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Agency Dashboard</p>
            <h1 className="text-2xl font-bold text-gray-800">Aģentūras pārskats</h1>
          </div>
          <Link
            href="/dashboard/widgets"
            className="text-sm text-purple-600 hover:underline"
          >
            ← Mani wheels
          </Link>
        </div>

        {/* Org-level stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Kopējie venues',         value: totalVenues },
            { label: 'Aktīvie wheels',          value: totalActiveWheels },
            { label: 'Leads šomēnes',           value: totalLeadsMonth.toLocaleString() },
            { label: 'Kopējie leads',           value: totalLeadsAll.toLocaleString() },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl shadow p-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className="text-2xl font-bold text-gray-800">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Venue table */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Venue</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Aktīvie wheels</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Leads kopā</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Leads šomēnes</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Pēdējais lead</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {venueStats.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {v.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">
                          {v.name[0]}
                        </div>
                      )}
                      <span className="font-medium text-gray-800">{v.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">{v.active_wheels}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">{v.total_leads.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-semibold ${v.leads_month > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                      {v.leads_month.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {v.last_lead_at
                      ? new Date(v.last_lead_at).toLocaleDateString('lv-LV')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/widgets?venue=${v.id}`}
                      className="text-xs text-purple-600 hover:underline whitespace-nowrap"
                    >
                      Skatīt wheels →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
