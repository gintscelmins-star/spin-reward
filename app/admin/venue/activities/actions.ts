'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ActivityState = { error?: string; success?: boolean } | null

async function getVenueAccess(venueId: string): Promise<SupabaseClient> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('403')
  const { data: profile } = await supabase
    .from('profiles').select('role, venue_id').eq('id', user.id).single()
  if (!profile) throw new Error('403')
  if (profile.role === 'super_admin') return supabase
  if (profile.role === 'client_admin' && profile.venue_id === venueId) return supabase
  throw new Error('403')
}

export async function upsertActivity(
  _prev: ActivityState,
  formData: FormData
): Promise<ActivityState> {
  const venueId = formData.get('venueId') as string
  const supabase = await getVenueAccess(venueId)
  const id = (formData.get('id') as string) || null
  const name = (formData.get('name') as string).trim()
  const active = formData.get('active') !== 'false'

  const default_staff_id = (formData.get('default_staff_id') as string) || null

  if (id) {
    const { error } = await supabase.from('activities').update({ name, active, default_staff_id }).eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('activities').insert({ venue_id: venueId, name, active: true, default_staff_id })
    if (error) return { error: error.message }
  }
  revalidatePath('/admin/venue/activities')
  return { success: true }
}

export async function deleteActivity(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const id = formData.get('id') as string
  const supabase = await getVenueAccess(venueId)
  await supabase.from('activities').delete().eq('id', id)
  revalidatePath('/admin/venue/activities')
}

export async function addActivityPreset(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const name = formData.get('name') as string
  const supabase = await getVenueAccess(venueId)
  await supabase.from('activities').insert({ venue_id: venueId, name, active: true })
  revalidatePath('/admin/venue/activities')
}

export async function toggleUsesSessions(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const uses_sessions = formData.get('uses_sessions') === 'true'
  const supabase = await getVenueAccess(venueId)
  await supabase.from('venues').update({ uses_sessions }).eq('id', venueId)
  revalidatePath('/admin/venue/activities')
}
