import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyDemoToken, COOKIE_NAME } from '@/lib/demo-auth'
import { getAdmin } from '@/lib/supabase/admin'

const DEMO_VENUE_ID = '11111111-1111-1111-1111-111111111111'

interface SpinRow {
  id: string
  status: string
  spun_at: string
  staff_id: string | null
  prizes: { name: string } | null
  staff: { name: string } | null
}

interface ReviewRow {
  id: string
  rating: number
  comment: string | null
  google_redirected: boolean
  created_at: string
  staff_id: string | null
}

interface EvalRow {
  staff_id: string
  rating: number | null
}

interface StaffRow {
  id: string
  name: string
  role: string | null
  active: boolean
}

interface PrizeRow {
  id: string
  name: string
  probability_weight: number
  active: boolean
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
}

function statusBadge(status: string) {
  if (status === 'redeemed') return 'bg-green-100 text-green-700'
  if (status === 'expired') return 'bg-gray-100 text-gray-500'
  return 'bg-blue-100 text-blue-700'
}

const STATUS_LV: Record<string, string> = {
  redeemed: 'Izpirkts',
  expired: 'Beidzies',
  active: 'Aktīvs',
}

export default async function DemoDashboard() {
  // Verify session (middleware already checked, re-verify to get email)
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) redirect('/demo?error=session_expired')
  const session = await verifyDemoToken(token)
  if (!session) redirect('/demo?error=session_expired')

  const admin = getAdmin()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: venue },
    { data: staffList },
    { data: prizes },
    { data: recentSpins },
    { data: allSpins30d },
    { data: allReviews },
    { data: staffEvals },
  ] = await Promise.all([
    admin
      .from('venues')
      .select('name, plan, billing_status, seats')
      .eq('id', DEMO_VENUE_ID)
      .single(),
    admin
      .from('staff')
      .select('id, name, role, active')
      .eq('venue_id', DEMO_VENUE_ID)
      .order('name'),
    admin
      .from('prizes')
      .select('id, name, probability_weight, active')
      .eq('venue_id', DEMO_VENUE_ID)
      .order('probability_weight', { ascending: false }),
    admin
      .from('spins')
      .select('id, status, spun_at, staff_id, prizes(name), staff(name)')
      .eq('venue_id', DEMO_VENUE_ID)
      .order('spun_at', { ascending: false })
      .limit(8),
    admin
      .from('spins')
      .select('id, status, staff_id, prize_id')
      .eq('venue_id', DEMO_VENUE_ID)
      .gte('spun_at', thirtyDaysAgo),
    admin
      .from('reviews')
      .select('id, rating, comment, google_redirected, created_at, staff_id')
      .eq('venue_id', DEMO_VENUE_ID)
      .order('created_at', { ascending: false }),
    admin
      .from('staff_evaluations')
      .select('staff_id, rating')
      .eq('venue_id', DEMO_VENUE_ID),
  ])

  // Aggregate stats
  const totalSpins = allSpins30d?.length ?? 0
  const redeemedSpins = allSpins30d?.filter(s => s.status === 'redeemed').length ?? 0
  const totalReviews = allReviews?.length ?? 0
  const ratingSum = allReviews?.reduce((sum, r) => sum + ((r as ReviewRow).rating ?? 0), 0) ?? 0
  const avgRating = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : null
  const googleRedirected = allReviews?.filter(r => (r as ReviewRow).google_redirected).length ?? 0

  // Per-staff stats
  const staffStats = (staffList as StaffRow[] ?? []).map(s => {
    const spinCount = allSpins30d?.filter(sp => sp.staff_id === s.id).length ?? 0
    const evals = (staffEvals as EvalRow[] ?? []).filter(e => e.staff_id === s.id && e.rating != null)
    const evalAvg = evals.length > 0
      ? (evals.reduce((sum, e) => sum + (e.rating ?? 0), 0) / evals.length).toFixed(1)
      : null
    return { ...s, spinCount, evalAvg, evalCount: evals.length }
  })

  // Prize spin counts (30d)
  const prizeCountMap = new Map<string, number>()
  allSpins30d?.forEach(sp => {
    if (sp.prize_id) {
      prizeCountMap.set(sp.prize_id as string, (prizeCountMap.get(sp.prize_id as string) ?? 0) + 1)
    }
  })

  const PLAN_LV: Record<string, string> = {
    free: 'Bezmaksas', starter: 'Starter', growth: 'Growth', multi: 'Multi',
  }
  const BILLING_LV: Record<string, string> = {
    trial: 'Izmēģinājums', active: 'Aktīvs', suspended: 'Apturēts', cancelled: 'Atcelts',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo banner */}
      <div className="sticky top-0 z-50 bg-purple-700 text-white px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-sm">
          <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">Demo</span>
          <span>Tu skatāties Spillit admin paneļa demo versiju ar fiktīviem datiem.</span>
        </div>
        <Link
          href="https://spillit.lv"
          className="flex-shrink-0 bg-white text-purple-700 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
        >
          Sākt bezmaksas izmēģinājumu →
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{venue?.name ?? 'Melnie Lāči'}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Demo admin panelis · {session.email}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
              {PLAN_LV[venue?.plan ?? ''] ?? venue?.plan ?? 'growth'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              {BILLING_LV[venue?.billing_status ?? ''] ?? 'Aktīvs'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {staffList?.filter(s => (s as StaffRow).active).length ?? 0} darbinieki
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Spini (30d)', value: totalSpins, color: 'text-purple-700' },
            { label: 'Izpirkti', value: redeemedSpins, color: 'text-green-600' },
            { label: 'Atsauksmes', value: totalReviews, color: 'text-blue-600' },
            { label: 'Vidējais', value: avgRating ? `${avgRating} ★` : '—', color: 'text-yellow-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent spins */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Pēdējie spini</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium text-xs">Datums</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium text-xs">Balva</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium text-xs">Darbinieks</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium text-xs">Statuss</th>
                  </tr>
                </thead>
                <tbody>
                  {((recentSpins ?? []) as unknown as SpinRow[]).map(spin => (
                    <tr key={spin.id} className="border-t border-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {fmtDate(spin.spun_at)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 text-xs max-w-[140px]">
                        <span className="line-clamp-1">{spin.prizes?.name ?? '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">
                        {spin.staff?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(spin.status)}`}>
                          {STATUS_LV[spin.status] ?? spin.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Prize breakdown */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Balvu sadalījums (30d)</p>
            </div>
            <div className="p-5 space-y-3">
              {(prizes as PrizeRow[] ?? []).map(prize => {
                const count = prizeCountMap.get(prize.id) ?? 0
                const pct = totalSpins > 0 ? Math.round((count / totalSpins) * 100) : 0
                return (
                  <div key={prize.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium truncate pr-2">{prize.name}</span>
                      <span className="text-gray-400 text-xs flex-shrink-0">{count}× ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Staff performance */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Darbinieku statistika</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-2.5 text-gray-400 font-medium text-xs">Darbinieks</th>
                  <th className="text-left px-5 py-2.5 text-gray-400 font-medium text-xs">Loma</th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-medium text-xs">Spini (30d)</th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-medium text-xs">Novērtējums</th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-medium text-xs">Statuss</th>
                </tr>
              </thead>
              <tbody>
                {staffStats.map(s => (
                  <tr key={s.id} className="border-t border-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-bold text-purple-700 flex-shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800 text-sm">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs capitalize">{s.role ?? '—'}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="font-bold text-purple-700">{s.spinCount}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {s.evalAvg ? (
                        <span className="font-bold text-yellow-500">{s.evalAvg} ★</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                      {s.evalCount > 0 && (
                        <span className="text-xs text-gray-400 ml-1">({s.evalCount})</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active ? 'Aktīvs' : 'Neaktīvs'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent reviews */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Pēdējās atsauksmes</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{googleRedirected} → Google</span>
              <span>Vidēji {avgRating ?? '—'} ★</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {(allReviews as ReviewRow[] ?? []).slice(0, 6).map(r => (
              <div key={r.id} className="px-5 py-3.5 flex items-start gap-3">
                <span className={`mt-0.5 text-sm font-bold flex-shrink-0 ${r.rating >= 5 ? 'text-green-500' : r.rating >= 4 ? 'text-yellow-500' : 'text-red-400'}`}>
                  {r.rating} ★
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug line-clamp-2">{r.comment ?? '—'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span>
                    {r.google_redirected && (
                      <span className="text-xs text-blue-500 font-medium">→ Google</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disabled quick links */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Admin paneļa sadaļas
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Balvas', icon: '🎁' },
              { label: 'Krājumu virsgrāmata', icon: '📦' },
              { label: 'Personāls', icon: '👥' },
              { label: 'Statistika', icon: '📊' },
              { label: 'Rezervācijas', icon: '📅' },
              { label: 'Šodienas sesijas', icon: '⚡' },
            ].map(item => (
              <div
                key={item.label}
                title="Demo versijā nav pieejams"
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed select-none"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-gray-600 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Demo versijā nav pieejams — pierakstīties pilnai versijai var{' '}
            <a href="https://spillit.lv" className="text-purple-500 hover:underline">spillit.lv</a>
          </p>
        </div>

      </div>
    </div>
  )
}
