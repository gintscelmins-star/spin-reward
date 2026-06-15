import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StaffClient from './StaffClient'
import VenuePicker from '../_components/VenuePicker'

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !['client_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const params = await searchParams
  const venueId =
    profile.role === 'super_admin' ? (params.venueId ?? null) : profile.venue_id

  if (!venueId) return <VenuePicker basePath="/admin/venue/staff" />

  const now = new Date()
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const toDate = now.toISOString().slice(0, 10)

  const [{ data: staff }, { data: venue }, { count: activeCount }, { data: statsRows }] = await Promise.all([
    supabase.from('staff').select('*').eq('venue_id', venueId).order('name'),
    supabase.from('venues').select('seats').eq('id', venueId).single(),
    supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('active', true),
    supabase.rpc('get_staff_stats', { p_venue_id: venueId, p_from: since30d, p_to: toDate }),
  ])

  interface StaffStat { staff_id: string; sessions_count: number; reviews_count: number; avg_rating: number | null }
  const statsMap = new Map<string, StaffStat>(
    ((statsRows ?? []) as unknown as StaffStat[]).map(s => [s.staff_id, s])
  )

  if (!venue) redirect('/admin')

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href={`/admin/venue${q}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Venue
          </Link>
        </div>
        <StaffClient
          staff={staff ?? []}
          venueId={venueId}
          seats={venue.seats}
          activeCount={activeCount ?? 0}
          q={q}
        />

        {/* Per-staff stats from RPC (30 dienas) */}
        {(staff ?? []).length > 0 && (
          <section className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Statistika — pēdējās 30 dienas</p>
              <p className="text-xs text-gray-400">{since30d} – {toDate}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-2.5 text-gray-400 font-medium text-xs">Darbinieks</th>
                  <th className="text-right px-5 py-2.5 text-gray-400 font-medium text-xs">Sesijas</th>
                  <th className="text-right px-5 py-2.5 text-gray-400 font-medium text-xs">Atsauksmes</th>
                  <th className="text-right px-5 py-2.5 text-gray-400 font-medium text-xs">Vid. vērtējums</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {(staff ?? []).map(s => {
                  const st = statsMap.get(s.id)
                  const rating = st?.avg_rating ?? null
                  return (
                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-700">{st?.sessions_count ?? 0}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-700">{st?.reviews_count ?? 0}</td>
                      <td className="px-5 py-3 text-right">
                        {rating != null ? (
                          <span className={`font-bold ${rating >= 4 ? 'text-green-600' : rating < 3 ? 'text-red-500' : 'text-yellow-600'}`}>
                            {rating.toFixed(1)} ★
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/venue/staff/${s.id}${q}`}
                          className="text-xs text-purple-600 hover:underline"
                        >
                          Detaļas →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  )
}
