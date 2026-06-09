import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import TodayClient, { type BookingRow } from './TodayClient'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['client_admin', 'super_admin'].includes(profile.role)) redirect('/admin')
  const venueId = profile.venue_id!
  if (!venueId) redirect('/admin/venues')

  const { data: venue } = await supabase
    .from('venues').select('name').eq('id', venueId).single()

  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const in7Days = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Load bookings with activity info
  const { data: rawBookings } = await supabase
    .from('bookings')
    .select('id, customer_name, customer_phone, starts_at, activity_id')
    .eq('venue_id', venueId)
    .gte('starts_at', startOfToday.toISOString())
    .lt('starts_at', in7Days.toISOString())
    .order('starts_at')

  const bookings = rawBookings ?? []

  // Collect unique activity IDs and resolve activity + staff names
  const activityIds = [...new Set(bookings.map(b => b.activity_id).filter(Boolean))] as string[]

  const { data: activities } = activityIds.length > 0
    ? await supabase
        .from('activities')
        .select('id, name, default_staff_id')
        .in('id', activityIds)
    : { data: [] }

  const staffIds = [...new Set(
    (activities ?? []).map(a => a.default_staff_id).filter(Boolean)
  )] as string[]

  const { data: staffList } = staffIds.length > 0
    ? await supabase.from('staff').select('id, name').in('id', staffIds)
    : { data: [] }

  // Existing sessions for these bookings
  const bookingIds = bookings.map(b => b.id)
  const { data: sessions } = bookingIds.length > 0
    ? await supabase
        .from('sessions')
        .select('id, booking_id, status')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Build lookup maps
  const actById: Record<string, { name: string; default_staff_id: string | null }> = {}
  for (const a of (activities ?? [])) actById[a.id] = { name: a.name, default_staff_id: a.default_staff_id }

  const staffById: Record<string, string> = {}
  for (const s of (staffList ?? [])) staffById[s.id] = s.name

  // Most recent session per booking
  const sessionByBooking: Record<string, { id: string; status: string }> = {}
  for (const s of (sessions ?? [])) {
    if (s.booking_id && !sessionByBooking[s.booking_id]) {
      sessionByBooking[s.booking_id] = { id: s.id, status: s.status }
    }
  }

  const rows: BookingRow[] = bookings.map(b => {
    const act = b.activity_id ? actById[b.activity_id] : null
    const defaultStaffId = act?.default_staff_id ?? null
    const sess = sessionByBooking[b.id] ?? null
    return {
      id: b.id,
      customer_name: b.customer_name,
      customer_phone: b.customer_phone,
      starts_at: b.starts_at,
      activity_id: b.activity_id,
      activity_name: act?.name ?? null,
      default_staff_id: defaultStaffId,
      staff_name: defaultStaffId ? (staffById[defaultStaffId] ?? null) : null,
      existing_session_id: sess?.id ?? null,
      existing_session_status: sess?.status ?? null,
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Šodienas sesijas</h1>
            {venue?.name && (
              <p className="text-xs text-gray-400 mt-0.5">{venue.name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/venue"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Iestatījumi
            </Link>
            <LogoutButton />
          </div>
        </div>

        <TodayClient bookings={rows} venueId={venueId} />
      </div>
    </div>
  )
}
