'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function activateBooking(
  bookingId: string,
  venueId: string,
  activityId: string | null,
  staffId: string | null
): Promise<{ sessionId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nav autentificēts' }

  const { data: profile } = await supabase
    .from('profiles').select('role, venue_id').eq('id', user.id).single()
  if (!profile || !['client_admin', 'super_admin'].includes(profile.role)) return { error: '403' }
  if (profile.role === 'client_admin' && profile.venue_id !== venueId) return { error: '403' }

  // If session already exists for this booking, return it
  const { data: existing } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return { sessionId: existing.id }

  // Resolve staff from activity if not provided
  let resolvedStaffId = staffId
  if (!resolvedStaffId && activityId) {
    const { data: act } = await supabase
      .from('activities').select('default_staff_id').eq('id', activityId).single()
    resolvedStaffId = act?.default_staff_id ?? null
  }

  const headersList = await headers()
  const activate_ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    null

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      venue_id: venueId,
      booking_id: bookingId,
      activity_id: activityId,
      staff_id: resolvedStaffId,
      status: 'active',
      activate_ip,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { sessionId: session.id }
}
