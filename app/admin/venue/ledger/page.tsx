import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LedgerClient, { type LedgerRow } from './LedgerClient'
import VenuePicker from '../_components/VenuePicker'

export default async function LedgerPage({
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

  if (!venueId) return <VenuePicker basePath="/admin/venue/ledger" />

  const { data: rows } = await supabase.rpc('get_prize_ledger', { venue_id: venueId })

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
            <Link
              href={`/admin/venue/prizes${q}`}
              className="text-sm text-purple-600 hover:underline"
            >
              Rediģēt balvas →
            </Link>
          </div>
        </div>

        <LedgerClient rows={(rows ?? []) as LedgerRow[]} />
      </div>
    </div>
  )
}
