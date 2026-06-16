import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LedgerClient, { type LedgerRow } from './LedgerClient'
import VenuePicker from '../_components/VenuePicker'

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string; from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, venue_id').eq('id', user.id).single()

  if (!profile?.role || !['client_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const params = await searchParams
  const venueId =
    profile.role === 'super_admin' ? (params.venueId ?? null) : profile.venue_id

  if (!venueId) return <VenuePicker basePath="/admin/venue/ledger" />

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const toStr = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`

  const from = params.from ?? toStr(firstDay)
  const to = params.to ?? toStr(lastDay)

  const { data: rows, error: ledgerError } = await supabase.rpc('get_prize_ledger_dated', {
    p_venue_id: venueId,
    p_from: `${from}T00:00:00Z`,
    p_to: `${to}T23:59:59Z`,
  })

  if (ledgerError) console.error('[ledger] get_prize_ledger_dated error:', ledgerError)

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <Link href={`/admin/venue${q}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Venue
          </Link>
          <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Izsniedzamās balvas</h1>
              <p className="text-sm text-gray-400 mt-0.5">Balvu uzskaite un grāmatvedības pārskats</p>
            </div>
            <Link href={`/admin/venue/prizes${q}`} className="text-sm text-purple-600 hover:underline">
              Rediģēt balvas →
            </Link>
          </div>
        </div>

        {ledgerError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            <p className="font-semibold mb-1">Kļūda ielādējot ledger</p>
            <p className="font-mono text-xs text-red-600">{ledgerError.message}</p>
            <p className="text-xs text-red-500 mt-1">Kods: {ledgerError.code}</p>
          </div>
        )}

        <LedgerClient
          rows={(rows ?? []) as LedgerRow[]}
          from={from}
          to={to}
          venueId={profile.role === 'super_admin' ? venueId : undefined}
        />
      </div>
    </div>
  )
}
