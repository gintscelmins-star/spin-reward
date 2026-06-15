'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PrizeState = { error?: string; success?: boolean } | null

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

export async function upsertPrize(
  _prev: PrizeState,
  formData: FormData
): Promise<PrizeState> {
  const venueId = formData.get('venueId') as string
  const supabase = await getVenueAccess(venueId)

  const id = (formData.get('id') as string) || null
  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim() || null
  const code = (formData.get('code') as string).trim() || null
  const probability_weight = parseInt(formData.get('probability_weight') as string, 10)
  const totalRaw = (formData.get('total_available') as string).trim()
  const total_available = totalRaw ? parseInt(totalRaw, 10) : null
  const stockRaw = (formData.get('stock') as string).trim()
  const stock = stockRaw ? parseInt(stockRaw, 10) : null
  const expires_days = parseInt(formData.get('expires_days') as string, 10)
  const active = formData.get('active') === 'true'

  if (id) {
    const { error } = await supabase
      .from('prizes')
      .update({ name, description, code, probability_weight, total_available, stock, expires_days, active })
      .eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('prizes').insert({
      venue_id: venueId,
      name,
      description,
      code,
      probability_weight,
      total_available,
      remaining: total_available,
      stock,
      expires_days,
      active,
    })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/venue/prizes')
  return { success: true }
}

export async function deletePrize(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const id = formData.get('id') as string
  const supabase = await getVenueAccess(venueId)
  await supabase.from('prizes').delete().eq('id', id)
  revalidatePath('/admin/venue/prizes')
}
