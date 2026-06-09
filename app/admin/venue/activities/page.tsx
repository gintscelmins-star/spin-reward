import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ActivitiesClient from './ActivitiesClient'
import VenuePicker from '../_components/VenuePicker'

export default async function ActivitiesPage({
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

  if (!venueId) return <VenuePicker basePath="/admin/venue/activities" />

  const [{ data: venue }, { data: activities }, { data: staffList }] = await Promise.all([
    supabase.from('venues').select('uses_sessions').eq('id', venueId).single(),
    supabase
      .from('activities')
      .select('id, name, active, default_staff_id')
      .eq('venue_id', venueId)
      .order('name'),
    supabase
      .from('staff')
      .select('id, name')
      .eq('venue_id', venueId)
      .eq('active', true)
      .order('name'),
  ])

  if (!venue) redirect('/admin')

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href={`/admin/venue${q}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Venue
          </Link>
        </div>
        <ActivitiesClient
          activities={activities ?? []}
          staffList={staffList ?? []}
          venueId={venueId}
          usesSessions={venue.uses_sessions ?? false}
        />
      </div>
    </div>
  )
}
