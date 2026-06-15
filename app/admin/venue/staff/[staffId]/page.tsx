import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface SpinRow { status: string }
interface AnswerRow { rating: number }

export default async function StaffStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>
  searchParams: Promise<{ venueId?: string }>
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

  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, role, active, stripe_tip_link')
    .eq('id', staffId)
    .eq('venue_id', venueId)
    .single()

  if (!staff) redirect('/admin/venue/staff')

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setUTCHours(0, 0, 0, 0)
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, created_at')
    .eq('staff_id', staffId)
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })

  const allSessions = sessions ?? []
  const sessionIds = allSessions.map(s => s.id)

  const todayCount = allSessions.filter(s => s.created_at >= startOfToday.toISOString()).length
  const week7Count = allSessions.filter(s => s.created_at >= since7d.toISOString()).length
  const month30Count = allSessions.filter(s => s.created_at >= since30d.toISOString()).length

  const [spinsRes, answersRes] = await Promise.all([
    sessionIds.length
      ? supabase.from('spins').select('status').in('session_id', sessionIds)
      : { data: [] as SpinRow[], error: null },
    sessionIds.length
      ? supabase.from('review_answers').select('rating').in('session_id', sessionIds)
      : { data: [] as AnswerRow[], error: null },
  ])

  const spins = (spinsRes.error ? [] : (spinsRes.data ?? [])) as SpinRow[]
  const answers = (answersRes.error ? [] : (answersRes.data ?? [])) as AnswerRow[]

  const spinStats = {
    total: spins.length,
    redeemed: spins.filter(s => s.status === 'redeemed').length,
    active: spins.filter(s => s.status === 'active').length,
  }

  const ratingAnswers = answers.filter(a => a.rating > 0)
  const avgRating =
    ratingAnswers.length > 0
      ? Math.round((ratingAnswers.reduce((sum, a) => sum + a.rating, 0) / ratingAnswers.length) * 10) / 10
      : null

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        <Link href={`/admin/venue/staff${q}`} className="text-gray-400 hover:text-gray-600 text-sm block">
          ← Personāls
        </Link>

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

        <section className="bg-white rounded-2xl shadow p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Sesijas</p>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-800">{allSessions.length}</p>
              <p className="text-xs text-gray-400 mt-1">Kopā</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">{month30Count}</p>
              <p className="text-xs text-gray-400 mt-1">30 dienas</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-500">{week7Count}</p>
              <p className="text-xs text-gray-400 mt-1">7 dienas</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-400">{todayCount}</p>
              <p className="text-xs text-gray-400 mt-1">Šodien</p>
            </div>
          </div>
        </section>

        {!spinsRes.error && (
          <section className="bg-white rounded-2xl shadow p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Spini</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-gray-800">{spinStats.total}</p>
                <p className="text-xs text-gray-400 mt-1">Kopā</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{spinStats.redeemed}</p>
                <p className="text-xs text-gray-400 mt-1">Izpirkts</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-500">{spinStats.active}</p>
                <p className="text-xs text-gray-400 mt-1">Aktīvs</p>
              </div>
            </div>
          </section>
        )}

        {!answersRes.error && (
          <section className="bg-white rounded-2xl shadow p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Novērtējumi</p>
            {answers.length === 0 ? (
              <p className="text-sm text-gray-400">Nav datu</p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold text-purple-700">
                    {avgRating !== null ? avgRating.toFixed(1) : '—'}
                    <span className="text-2xl text-yellow-400 ml-1">★</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Vidējais vērtējums</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-700">{answers.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Atbildes kopā</p>
                </div>
              </div>
            )}
          </section>
        )}

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
