import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import VenuePicker from '../_components/VenuePicker'
import RedemptionsClient, { type RedemptionRow } from './RedemptionsClient'

export default async function RedemptionsPage({
  searchParams,
}: {
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

  const params = await searchParams
  const venueId =
    profile.role === 'super_admin' ? (params.venueId ?? null) : profile.venue_id

  if (!venueId) return <VenuePicker basePath="/admin/venue/redemptions" />

  const [redemptionsRes, prizesRes, staffRes] = await Promise.all([
    supabase.rpc('get_redemptions', {
      p_venue_id: venueId,
      p_limit: 50,
      p_offset: 0,
    }),
    supabase
      .from('prizes')
      .select('id, name')
      .eq('venue_id', venueId)
      .eq('active', true)
      .order('name'),
    supabase
      .from('staff')
      .select('id, name')
      .eq('venue_id', venueId)
      .eq('active', true)
      .order('name'),
  ])

  if (redemptionsRes.error) {
    console.error('[redemptions] get_redemptions error:', redemptionsRes.error)
  }

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <Link href={`/admin/venue${q}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Venue
          </Link>
          <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Balvu izsniegšana</h1>
              <p className="text-sm text-gray-400 mt-0.5">QR balvu izsniegšanas vēsture</p>
            </div>
            <Link
              href="/admin/redeem"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              <span>📷</span> QR Skeneris
            </Link>
          </div>
        </div>

        {redemptionsRes.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            <p className="font-semibold mb-1">Kļūda ielādējot datus</p>
            <p className="font-mono text-xs text-red-600">{redemptionsRes.error.message}</p>
          </div>
        )}

        <RedemptionsClient
          rows={(redemptionsRes.data ?? []) as RedemptionRow[]}
          prizes={(prizesRes.data ?? []) as { id: string; name: string }[]}
          staff={(staffRes.data ?? []) as { id: string; name: string }[]}
          venueId={venueId}
        />
      </div>
    </div>
  )
}
