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

export type CsvImportResult = { imported: number; errors: number; errorDetails: string[] } | { error: string }

export async function importBookingsCsv(
  _prev: CsvImportResult | null,
  formData: FormData
): Promise<CsvImportResult> {
  const venueId = formData.get('venueId') as string
  const rowsJson = formData.get('rows') as string
  const date = formData.get('date') as string

  let rows: Array<Record<string, string>>
  try {
    rows = JSON.parse(rowsJson)
  } catch {
    return { error: 'Nepareizs datu formāts' }
  }

  const supabase = await getVenueAccess(venueId)
  const { data: activities } = await supabase
    .from('activities')
    .select('id, name')
    .eq('venue_id', venueId)
    .eq('active', true)

  const activityMap = new Map<string, string>()
  for (const a of activities ?? []) {
    activityMap.set(a.name.toLowerCase(), a.id)
  }

  let imported = 0
  let errors = 0
  const errorDetails: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    const name = (row['vards'] ?? row['name'] ?? row['customer_name'] ?? '').trim()
    const phone = (row['talrunis'] ?? row['phone'] ?? row['customer_phone'] ?? '').trim() || null
    const activityRaw = (row['aktivitate'] ?? row['activity'] ?? '').trim()
    const startsAtRaw = (row['sakums'] ?? row['starts_at'] ?? row['datums'] ?? row['datetime'] ?? '').trim()
    const endsAtRaw = (row['beigas'] ?? row['ends_at'] ?? '').trim() || null

    if (!name) {
      errors++
      errorDetails.push(`Rinda ${rowNum}: trūkst vārda`)
      continue
    }
    if (!startsAtRaw) {
      errors++
      errorDetails.push(`Rinda ${rowNum}: trūkst sākuma laika`)
      continue
    }

    let starts_at: string
    try {
      const d = new Date(startsAtRaw)
      if (isNaN(d.getTime())) throw new Error('invalid')
      starts_at = d.toISOString()
    } catch {
      // try combining with current date
      const combined = new Date(`${date}T${startsAtRaw}`)
      if (isNaN(combined.getTime())) {
        errors++
        errorDetails.push(`Rinda ${rowNum}: nevar parsēt laiku "${startsAtRaw}"`)
        continue
      }
      starts_at = combined.toISOString()
    }

    let ends_at: string | null = null
    if (endsAtRaw) {
      try {
        const d = new Date(endsAtRaw)
        ends_at = isNaN(d.getTime()) ? new Date(`${date}T${endsAtRaw}`).toISOString() : d.toISOString()
      } catch {
        ends_at = null
      }
    }

    const activity_id = activityRaw
      ? (activityMap.get(activityRaw.toLowerCase()) ?? null)
      : null

    const { error } = await supabase.from('bookings').insert({
      venue_id: venueId,
      customer_name: name,
      customer_phone: phone,
      activity_id,
      starts_at,
      ends_at,
      source: 'csv',
    })

    if (error) {
      errors++
      errorDetails.push(`Rinda ${rowNum} (${name}): ${error.message}`)
    } else {
      imported++
    }
  }

  revalidatePath('/admin/venue/bookings')
  return { imported, errors, errorDetails }
}
