'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type StaffState = { error?: string; success?: boolean } | null

async function getVenueAccess(venueId: string): Promise<SupabaseClient> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('403')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('403')
  if (profile.role === 'super_admin') return supabase
  if (profile.role === 'client_admin' && profile.venue_id === venueId) return supabase
  throw new Error('403')
}

export async function upsertStaff(
  _prev: StaffState,
  formData: FormData
): Promise<StaffState> {
  const venueId = formData.get('venueId') as string
  const supabase = await getVenueAccess(venueId)

  const id = (formData.get('id') as string) || null
  const isNew = !id

  if (isNew) {
    const [{ count: activeCount }, { data: venue }] = await Promise.all([
      supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('venue_id', venueId)
        .eq('active', true),
      supabase.from('venues').select('seats').eq('id', venueId).single(),
    ])
    if (venue && (activeCount ?? 0) >= venue.seats) {
      return {
        error: `Sasniegts apmaksāto vietu (${venue.seats}) limits. Lai pievienotu vairāk, palielini seats vai sazinies ar administratoru.`,
      }
    }
  }

  const name = (formData.get('name') as string).trim()
  const role = (formData.get('role') as string).trim() || null
  const phone = (formData.get('phone') as string).trim() || null
  const stripe_tip_link = (formData.get('stripe_tip_link') as string).trim() || null
  const limitRaw = (formData.get('daily_spin_limit') as string).trim()
  const daily_spin_limit = limitRaw ? parseInt(limitRaw, 10) : null
  const active = formData.get('active') !== 'false'
  const tips_enabled = formData.get('tips_enabled') !== 'false'

  if (id) {
    const { error } = await supabase
      .from('staff')
      .update({ name, role, phone, stripe_tip_link, daily_spin_limit, active, tips_enabled })
      .eq('id', id)
    if (error) return { error: error.message }
  } else {
    const staff_code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { error } = await supabase.from('staff').insert({
      venue_id: venueId,
      name,
      role,
      phone,
      stripe_tip_link,
      daily_spin_limit,
      active: true,
      staff_code,
    })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/venue/staff')
  return { success: true }
}

export async function toggleStaffActive(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const id = formData.get('id') as string
  const active = formData.get('active') === 'true'
  const supabase = await getVenueAccess(venueId)
  await supabase.from('staff').update({ active }).eq('id', id)
  revalidatePath('/admin/venue/staff')
}

export async function submitStaffEvaluation(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const supabase = await getVenueAccess(venueId)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('403')

  const staffId = formData.get('staffId') as string
  const rating = parseInt(formData.get('rating') as string, 10)
  const notes = (formData.get('notes') as string | null)?.trim() || null

  if (!staffId || isNaN(rating) || rating < 1 || rating > 5) throw new Error('Nepareizi dati')

  const { error } = await supabase.from('staff_evaluations').insert({
    staff_id: staffId,
    venue_id: venueId,
    admin_id: user.id,
    rating,
    notes,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/venue/staff/${staffId}`)
}

export async function submitStaffTasks(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const staffId = formData.get('staffId') as string
  const supabase = await getVenueAccess(venueId)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('403')

  const tasksList = [
    'Piedalīties apmācībās',
    'Atjaunot QR kodu',
    'Izlasīt feedback pārskatu',
  ]

  const completedTasks = tasksList.filter(t => formData.get(`task_${t}`) === 'on')
  const message = (formData.get('message') as string | null)?.trim() || null

  if (completedTasks.length === 0 && !message) {
    throw new Error('Jāizvēlas vismaz viens uzdevums vai jāievada ziņa')
  }

  const { error } = await supabase.from('staff_tasks').insert({
    staff_id: staffId,
    venue_id: venueId,
    admin_id: user.id,
    completed_tasks: completedTasks,
    message,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/venue/staff/${staffId}`)
}
