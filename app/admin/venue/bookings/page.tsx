import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BookingsClient from './BookingsClient'
import type { BookingRpc } from './BookingsClient'
import VenuePicker from '../_components/VenuePicker'

function getWeekBounds(date: Date): { from: string; to: string } {
  const y = date.getFullYear()
  const m = date.getMonth()
  const day = date.getDate()
  const dow = date.getDay() || 7 // Sun=0→7
  const toStr = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
  const mon = new Date(y, m, day - (dow - 1))
  const sun = new Date(y, m, day + (7 - dow))
  return { from: toStr(mon), to: toStr(sun) }
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string; from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, venue_id').eq('id', user.id).single()

  if (!profile?.role || !['client_admin', 'super_admin', 'staff'].includes(profile.role)) {
    redirect('/admin')
  }

  const params = await searchParams
  const venueId =
    profile.role === 'super_admin' ? (params.venueId ?? null) : profile.venue_id

  if (!venueId) return <VenuePicker basePath="/admin/venue/bookings" />

  const defaultBounds = getWeekBounds(new Date())
  const from = params.from ?? defaultBounds.from
  const to = params.to ?? defaultBounds.to

  const [bookingsRes, activitiesRes, staffRes, spinStatusRes] = await Promise.all([
    supabase.rpc('get_bookings', { p_venue_id: venueId, p_from: from, p_to: to }),
    supabase.from('activities').select('id, name').eq('venue_id', venueId).eq('active', true).order('name'),
    supabase.from('staff').select('id, name').eq('venue_id', venueId).eq('active', true).order('name'),
    supabase.rpc('get_booking_spin_status', { p_venue_id: venueId, p_from: from, p_to: to }),
  ])

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''
  const backHref = profile.role === 'staff' ? '/admin/session' : `/admin/venue${q}`

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href={backHref} className="text-gray-400 hover:text-gray-600 text-sm">
            ← {profile.role === 'staff' ? 'Sesija' : 'Venue'}
          </Link>
        </div>
        <BookingsClient
          bookings={(bookingsRes.data ?? []) as unknown as BookingRpc[]}
          spinStatus={spinStatusRes.data ?? []}
          activities={activitiesRes.data ?? []}
          staff={staffRes.data ?? []}
          venueId={venueId}
          from={from}
          to={to}
        />
      </div>
    </div>
  )
}
