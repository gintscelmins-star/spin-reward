import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewWheelForm from './NewWheelForm'

interface Venue {
  id: string
  name: string
}

export default async function NewWheelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['client_admin', 'agency_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  let venues: Venue[] = []
  if (profile.role === 'agency_admin' && profile.organization_id) {
    const { data } = await supabase
      .from('venues')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .eq('active', true)
      .order('name')
    venues = data ?? []
  } else if (profile.role === 'super_admin') {
    const { data } = await supabase
      .from('venues')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .limit(200)
    venues = data ?? []
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/widgets" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Wheels
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">New Wheel</h1>
        <NewWheelForm
          defaultVenueId={profile.venue_id ?? ''}
          venues={venues}
          showVenuePicker={profile.role !== 'client_admin'}
        />
      </div>
    </div>
  )
}
