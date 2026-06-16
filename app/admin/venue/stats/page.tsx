import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import VenuePicker from '../_components/VenuePicker'

type Period = '7d' | '30d' | 'all'

interface SpinRow {
  status: string
  prize_id: string | null
  prizes: { name: string } | null
}

interface ReviewRow {
  google_redirected: boolean
}

interface ReviewDetailRow {
  id: string
  created_at: string
  google_redirected: boolean
  staff: { name: string } | null
  activity: { name: string } | null
  review_answers: { rating: number; comment: string | null }[]
}

interface AnswerRow {
  question_id: string | null
  rating: number
  review_questions: { label: string } | null
}

interface TipRow {
  amount_cents: number
  status: string
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string; period?: string }>
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

  if (!venueId) return <VenuePicker basePath="/admin/venue/stats" />

  const period: Period = (params.period as Period) === '7d' || (params.period as Period) === '30d'
    ? (params.period as Period)
    : 'all'

  const now = new Date()
  const since =
    period === '7d'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      : period === '30d'
      ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      : null

  // Parallel data fetch
  const [spinsRes, reviewsRes, answersRes, tipsRes, evalsRes, reviewDetailsRes] = await Promise.all([
    (() => {
      const q = supabase
        .from('spins')
        .select('status, prize_id, prizes(name)')
        .eq('venue_id', venueId)
      return since ? q.gte('spun_at', since) : q
    })(),
    (() => {
      const q = supabase
        .from('reviews')
        .select('google_redirected')
        .eq('venue_id', venueId)
      return since ? q.gte('created_at', since) : q
    })(),
    (() => {
      const q = supabase
        .from('review_answers')
        .select('question_id, rating, review_questions(label)')
        .eq('venue_id', venueId)
      return since ? q.gte('created_at', since) : q
    })(),
    (() => {
      const q = supabase
        .from('tips')
        .select('amount_cents, status')
        .eq('venue_id', venueId)
      return since ? q.gte('created_at', since) : q
    })(),
    (() => {
      const q = supabase
        .from('staff_evaluations')
        .select('rating, notes, created_at, staff:staff_id(name)')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })
        .limit(20)
      return since ? q.gte('created_at', since) : q
    })(),
    (() => {
      const q = supabase
        .from('reviews')
        .select('id, created_at, google_redirected, staff:staff_id(name), activity:activity_id(name), review_answers(rating, comment)')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })
        .limit(50)
      return since ? q.gte('created_at', since) : q
    })(),
  ])

  const spins = ((spinsRes.data ?? []) as unknown) as SpinRow[]
  const reviews = ((reviewsRes.data ?? []) as unknown) as ReviewRow[]
  const answers = ((answersRes.data ?? []) as unknown) as AnswerRow[]
  const tips = ((tipsRes.data ?? []) as unknown) as TipRow[]
  const staffEvals = (evalsRes?.data ?? []) as unknown as Array<{
    rating: number; notes: string | null; created_at: string; staff: { name: string } | null
  }>
  const reviewDetails = (reviewDetailsRes?.data ?? []) as unknown as ReviewDetailRow[]
  if (reviewDetailsRes?.error) {
    console.error('[stats] reviews fetch error:', reviewDetailsRes.error)
  }

  // ---- Aggregations ----

  const spinStats = {
    total: spins.length,
    active: spins.filter(s => s.status === 'active').length,
    redeemed: spins.filter(s => s.status === 'redeemed').length,
    expired: spins.filter(s => s.status === 'expired').length,
  }

  const prizeMap = new Map<string, { name: string; count: number }>()
  for (const s of spins) {
    if (!s.prize_id) continue
    const name = s.prizes?.name ?? 'Nezināma'
    const entry = prizeMap.get(s.prize_id) ?? { name, count: 0 }
    entry.count++
    prizeMap.set(s.prize_id, entry)
  }
  const prizeBreakdown = Array.from(prizeMap.values()).sort((a, b) => b.count - a.count)
  const maxPrizeCount = Math.max(...prizeBreakdown.map(p => p.count), 1)

  const reviewStats = {
    total: reviews.length,
    googleRedirected: reviews.filter(r => r.google_redirected).length,
  }

  const questionMap = new Map<string, { label: string; sum: number; count: number }>()
  for (const a of answers) {
    if (!a.question_id) continue
    const label = a.review_questions?.label ?? 'Jautājums'
    const entry = questionMap.get(a.question_id) ?? { label, sum: 0, count: 0 }
    entry.sum += a.rating
    entry.count++
    questionMap.set(a.question_id, entry)
  }
  const questionStats = Array.from(questionMap.values()).map(q => ({
    label: q.label,
    avg: q.count > 0 ? Math.round((q.sum / q.count) * 10) / 10 : 0,
    count: q.count,
  }))

  const tipStats = {
    count: tips.length,
    totalEur: tips.reduce((sum, t) => sum + t.amount_cents, 0) / 100,
    pending: tips.filter(t => t.status === 'pending').length,
  }

  // ---- URL helpers ----
  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''
  const periodLink = (p: Period) =>
    profile.role === 'super_admin'
      ? `/admin/venue/stats?venueId=${venueId}&period=${p}`
      : `/admin/venue/stats?period=${p}`

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header + period filter */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link href={`/admin/venue${q}`} className="text-gray-400 hover:text-gray-600 text-sm block mb-1">
              ← Venue
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Statistika</h1>
          </div>
          <div className="flex gap-1 bg-white rounded-xl shadow p-1">
            {(['7d', '30d', 'all'] as const).map(p => (
              <Link
                key={p}
                href={periodLink(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {p === '7d' ? '7 dienas' : p === '30d' ? '30 dienas' : 'Viss'}
              </Link>
            ))}
          </div>
        </div>

        {/* Spins */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Spini</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            {(
              [
                { label: 'Kopā', value: spinStats.total, cls: 'text-gray-800' },
                { label: 'Aktīvs', value: spinStats.active, cls: 'text-blue-600' },
                { label: 'Izpirkts', value: spinStats.redeemed, cls: 'text-green-600' },
                { label: 'Beidzies', value: spinStats.expired, cls: 'text-gray-400' },
              ] as const
            ).map(stat => (
              <div key={stat.label}>
                <p className={`text-3xl font-bold ${stat.cls}`}>{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Prize breakdown */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Balvu sadalījums</h2>
          {prizeBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm">Nav datu</p>
          ) : (
            <div className="space-y-3">
              {prizeBreakdown.map(p => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{p.name}</span>
                    <span className="text-sm font-mono font-medium text-gray-600">{p.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full transition-all"
                      style={{ width: `${(p.count / maxPrizeCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Atsauksmes</h2>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <p className="text-3xl font-bold text-gray-800">{reviewStats.total}</p>
              <p className="text-xs text-gray-400 mt-1">Kopā atsauksmes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">
                {reviewStats.total > 0
                  ? Math.round((reviewStats.googleRedirected / reviewStats.total) * 100)
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-400 mt-1">Google redirect</p>
            </div>
          </div>
          {questionStats.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                Vidējais vērtējums pēc jautājuma
              </p>
              {questionStats.map(qs => (
                <div key={qs.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{qs.label}</span>
                  <span className="text-sm font-bold text-gray-800">
                    {qs.avg.toFixed(1)}
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      ({qs.count} atb.)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {questionStats.length === 0 && reviewStats.total === 0 && (
            <p className="text-gray-400 text-sm">Nav datu</p>
          )}
        </section>

        {/* Tips */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Tips</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-3xl font-bold text-gray-800">{tipStats.count}</p>
              <p className="text-xs text-gray-400 mt-1">Kopā tips</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">
                &euro;{tipStats.totalEur.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Kopā summa</p>
            </div>
          </div>
          {tipStats.pending > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-xs text-yellow-700">
                {tipStats.pending} tips ar statusu &ldquo;pending&rdquo; — Revolut integrācija tiks pievienota V1.4
              </p>
            </div>
          )}
          {tipStats.count === 0 && (
            <p className="text-gray-400 text-sm mt-3">Nav datu</p>
          )}
        </section>

        {/* Reviews detail list */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Atsauksmju saraksts</h2>
          {reviewDetailsRes?.error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              Kļūda ielādējot atsauksmes: {reviewDetailsRes.error.message}
            </div>
          )}
          {reviewDetails.length === 0 ? (
            <p className="text-gray-400 text-sm">Nav atsauksmju izvēlētajā periodā.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {reviewDetails.map(r => {
                const avgRating = r.review_answers.length > 0
                  ? r.review_answers.reduce((s, a) => s + a.rating, 0) / r.review_answers.length
                  : null
                const comment = r.review_answers.find(a => a.comment)?.comment ?? null
                return (
                  <div key={r.id} className="py-3 flex items-start gap-3 text-sm">
                    <div className="flex-shrink-0 w-10 text-center">
                      {avgRating !== null ? (
                        <span className="font-black text-purple-600">{avgRating.toFixed(1)}★</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-700 text-xs">
                          {r.staff?.name ?? 'Nezināms darbinieks'}
                        </span>
                        {r.activity?.name && (
                          <span className="text-xs text-gray-400">· {r.activity.name}</span>
                        )}
                        {r.google_redirected && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">Google</span>
                        )}
                      </div>
                      {comment && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed italic">&ldquo;{comment}&rdquo;</p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-300">
                      {new Date(r.created_at).toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Staff evaluations */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Vadītāja novērtējumi</h2>
          {staffEvals.length === 0 ? (
            <p className="text-gray-400 text-sm">
              Nav vadītāja novērtējumu izvēlētajā periodā.{' '}
              <span className="text-gray-300">Pieejami Personāls → darbinieks → Vadītāja novērtējums.</span>
            </p>
          ) : (
            <div className="space-y-3">
              {staffEvals.map((e, i) => (
                <div key={i} className="flex items-start gap-3 text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <span className="font-bold text-purple-600 flex-shrink-0 w-8">{e.rating}★</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 text-xs">
                      {e.staff?.name ?? 'Nezināms darbinieks'}
                    </p>
                    {e.notes && <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{e.notes}</p>}
                    <p className="text-gray-300 text-xs mt-1">
                      {new Date(e.created_at).toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-gray-300 text-center pb-2">
          Per-darbinieka statistika — skat. Personāls → Stats
        </p>
      </div>
    </div>
  )
}
