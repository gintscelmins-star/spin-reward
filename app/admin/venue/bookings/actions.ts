'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type BookingState = { error?: string; success?: boolean } | null

async function getVenueAccess(venueId: string): Promise<SupabaseClient> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('403')
  const { data: profile } = await supabase
    .from('profiles').select('role, venue_id').eq('id', user.id).single()
  if (!profile) throw new Error('403')
  if (profile.role === 'super_admin') return supabase
  if (['client_admin', 'staff'].includes(profile.role) && profile.venue_id === venueId) return supabase
  throw new Error('403')
}

export async function upsertBooking(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const venueId = formData.get('venueId') as string
  const supabase = await getVenueAccess(venueId)
  const id = (formData.get('id') as string) || null
  const customer_name = (formData.get('customer_name') as string).trim()
  const customer_phone = (formData.get('customer_phone') as string).trim() || null
  const activity_id = (formData.get('activity_id') as string) || null
  const starts_at = formData.get('starts_at') as string
  const ends_at = (formData.get('ends_at') as string) || null

  if (!customer_name) return { error: 'Klienta vārds ir obligāts' }
  if (!starts_at) return { error: 'Sākuma laiks ir obligāts' }

  if (id) {
    const { error } = await supabase
      .from('bookings')
      .update({ customer_name, customer_phone, activity_id, starts_at, ends_at })
      .eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('bookings').insert({
      venue_id: venueId,
      customer_name,
      customer_phone,
      activity_id,
      starts_at,
      ends_at,
      source: 'manual',
    })
    if (error) return { error: error.message }
  }
  revalidatePath('/admin/venue/bookings')
  return { success: true }
}

export async function deleteBooking(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const id = formData.get('id') as string
  const supabase = await getVenueAccess(venueId)
  await supabase.from('bookings').delete().eq('id', id)
  revalidatePath('/admin/venue/bookings')
}
