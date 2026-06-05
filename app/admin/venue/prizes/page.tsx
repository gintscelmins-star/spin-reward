import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PrizesClient from './PrizesClient'
import VenuePicker from '../_components/VenuePicker'

export default async function PrizesPage({
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

  if (!venueId) return <VenuePicker basePath="/admin/venue/prizes" />

  const { data: prizes } = await supabase
    .from('prizes')
    .select('*')
    .eq('venue_id', venueId)
    .order('probability_weight', { ascending: false })

  const totalWeight = (prizes ?? []).reduce(
    (sum: number, p: { probability_weight: number }) => sum + p.probability_weight,
    0
  )

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href={`/admin/venue${q}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Venue
          </Link>
        </div>
        <PrizesClient prizes={prizes ?? []} venueId={venueId} totalWeight={totalWeight} />
      </div>
    </div>
  )
}
