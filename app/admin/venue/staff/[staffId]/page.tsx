import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { submitStaffEvaluation } from '../actions'
import { getStaffReviewsRows } from '../queries'
import StaffDateFilter from './StaffDateFilter'
import TasksClient from './TasksClient'
import { fmtDateTime } from '@/lib/fmt'

interface ReviewRow {
  session_id: string | null
  session_date: string | null
  rating: number | null
  comment: string | null
  activity: string | null
}


export default async function StaffStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>
  searchParams: Promise<{ venueId?: string; from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !['client_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const { staffId } = await params
  const sp = await searchParams
  const venueId = profile.role === 'super_admin' ? (sp.venueId ?? null) : profile.venue_id

  if (!venueId) redirect('/admin')

  // Default date range: last 30 days
  const today = new Date()
  const defaultTo = today.toISOString().slice(0, 10)
  const defaultFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const from = sp.from ?? defaultFrom
  const to = sp.to ?? defaultTo

  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, role, active, stripe_tip_link')
    .eq('id', staffId)
    .eq('venue_id', venueId)
    .single()

  if (!staff) redirect('/admin/venue/staff')

  const reviewRows = await getStaffReviewsRows(supabase, venueId, staffId, from, to)

  // Summary stats in date range
  const ratingRows = reviewRows.filter(r => r.rating != null && r.rating > 0)
  const avgRating = ratingRows.length
    ? Math.round((ratingRows.reduce((s, r) => s + (r.rating ?? 0), 0) / ratingRows.length) * 10) / 10
    : null
  const sessionCount = new Set(reviewRows.map(r => r.session_id).filter(Boolean)).size

  // Existing evaluations by admins for this staff
  const { data: evals } = await supabase
    .from('staff_evaluations')
    .select('id, rating, notes, created_at')
    .eq('staff_id', staffId)
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })
    .limit(10)

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        <Link href={`/admin/venue/staff${q}`} className="text-gray-400 hover:text-gray-600 text-sm block">
          ← Personāls
        </Link>

        {/* Staff header */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-xl font-bold text-purple-700 flex-shrink-0">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800">{staff.name}</h1>
            <p className="text-sm text-gray-400">{staff.role ?? 'Darbinieks'}</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
            staff.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {staff.active ? 'aktīvs' : 'neaktīvs'}
          </span>
        </div>

        {/* Date range filter */}
        <div className="bg-white rounded-2xl shadow px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Laika periods</p>
          <StaffDateFilter
            from={from}
            to={to}
            venueId={profile.role === 'super_admin' ? venueId : undefined}
          />
        </div>

        {/* Summary stats */}
        <section className="bg-white rounded-2xl shadow p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Kopsavilkums ({from} – {to})
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-800">{sessionCount}</p>
              <p className="text-xs text-gray-400 mt-1">Sesijas</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">{ratingRows.length}</p>
              <p className="text-xs text-gray-400 mt-1">Ar vērtējumu</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-700">
                {avgRating != null ? avgRating.toFixed(1) : '—'}
                {avgRating != null && <span className="text-xl text-yellow-400 ml-1">★</span>}
              </p>
              <p className="text-xs text-gray-400 mt-1">Vidējais</p>
            </div>
          </div>
        </section>

        {/* Per-session reviews table */}
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Sesijas un atsauksmes
            </p>
          </div>
          {reviewRows.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              Nav datu izvēlētajā periodā
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium text-xs">Datums</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium text-xs">Aktivitāte</th>
                    <th className="text-center px-4 py-2.5 text-gray-400 font-medium text-xs">Vērtējums</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium text-xs">Komentārs</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {fmtDateTime(r.session_date)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {r.activity ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-bold ${
                          r.rating && r.rating >= 4 ? 'text-green-600' :
                          r.rating && r.rating <= 2 ? 'text-red-500' : 'text-yellow-600'
                        }`}>
                          {r.rating != null ? `${r.rating} ★` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[200px]">
                        <span className="line-clamp-2">{r.comment || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Admin evaluation form */}
        <section className="bg-white rounded-2xl shadow p-6">
          <form action={submitStaffEvaluation} className="flex flex-col gap-4">
            <input type="hidden" name="staffId" value={staffId} />
            <input type="hidden" name="venueId" value={venueId} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vērtējums *</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      required
                      className="accent-purple-600"
                    />
                    <span className="text-sm text-gray-600">{n}★</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Piezīmes</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Novērojumi, ieteikumi darbiniekam..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors active:scale-95"
            >
              Saglabāt novērtējumu
            </button>
          </form>

          {/* Previous evaluations */}
          {evals && evals.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Iepriekšējie novērtējumi</p>
              <div className="space-y-3">
                {evals.map(e => (
                  <div key={e.id} className="flex items-start gap-3 text-sm">
                    <span className="font-bold text-purple-600 flex-shrink-0">{e.rating}★</span>
                    <div className="flex-1 min-w-0">
                      {e.notes && <p className="text-gray-700 text-xs leading-relaxed">{e.notes}</p>}
                      <p className="text-gray-400 text-xs mt-0.5">{fmtDateTime(e.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Task checkboxes + messages to staff */}
        <TasksClient staffId={staffId} venueId={venueId} />

        {staff.stripe_tip_link && (
          <section className="bg-white rounded-2xl shadow p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Tip karte</p>
            <a
              href={staff.stripe_tip_link}
              target="_blank"
              rel="noreferrer"
              className="text-purple-600 hover:underline text-sm break-all"
            >
              {staff.stripe_tip_link}
            </a>
          </section>
        )}

      </div>
    </div>
  )
}
