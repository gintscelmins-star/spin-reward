import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BookingsClient from './BookingsClient'
import VenuePicker from '../_components/VenuePicker'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string; date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !['client_admin', 'super_admin', 'staff'].includes(profile.role)) {
    redirect('/admin')
  }

  const params = await searchParams
  const venueId =
    profile.role === 'super_admin' ? (params.venueId ?? null) : profile.venue_id

  if (!venueId) return <VenuePicker basePath="/admin/venue/bookings" />

  const today = new Date().toISOString().split('T')[0]
  const date = params.date ?? today

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  const [{ data: bookings }, { data: activities }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, customer_name, customer_phone, activity_id, starts_at, ends_at, source')
      .eq('venue_id', venueId)
      .gte('starts_at', dayStart)
      .lte('starts_at', dayEnd)
      .order('starts_at'),
    supabase
      .from('activities')
      .select('id, name')
      .eq('venue_id', venueId)
      .eq('active', true)
      .order('name'),
  ])

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''
  const backHref =
    profile.role === 'staff' ? '/admin/session' : `/admin/venue${q}`

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href={backHref} className="text-gray-400 hover:text-gray-600 text-sm">
            ← {profile.role === 'staff' ? 'Sesija' : 'Venue'}
          </Link>
        </div>
        <BookingsClient
          bookings={bookings ?? []}
          activities={activities ?? []}
          venueId={venueId}
          date={date}
        />
      </div>
    </div>
  )
}
