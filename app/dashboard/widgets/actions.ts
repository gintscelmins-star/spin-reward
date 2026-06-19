'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionState = { error?: string; success?: boolean; id?: string } | null

const ALLOWED_ROLES = ['client_admin', 'agency_admin', 'super_admin']

async function getAllowedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('403')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) throw new Error('403')
  return { supabase, profile }
}

export async function createWheel(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let ctx: Awaited<ReturnType<typeof getAllowedClient>>
  try { ctx = await getAllowedClient() } catch { return { error: 'Unauthorized' } }
  const { supabase, profile } = ctx

  const venueId = (formData.get('venue_id') as string) || profile.venue_id
  if (!venueId) return { error: 'Venue required' }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Name is required' }

  const triggerRaw = formData.get('trigger_value') as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    venue_id: venueId,
    name,
    type: formData.get('type') as string,
    locale: formData.get('locale') as string,
    style_theme: formData.get('style_theme') as string,
    brand_color: formData.get('brand_color') as string,
    trigger_type: formData.get('trigger_type') as string,
    trigger_value: triggerRaw ? parseInt(triggerRaw, 10) : null,
    display_type: formData.get('display_type') as string,
    show_powered_by: formData.get('show_powered_by') === 'true',
    one_spin_per_email: formData.get('one_spin_per_email') === 'true',
    webhook_url: (formData.get('webhook_url') as string).trim() || null,
  }

  if (profile.organization_id) {
    payload.organization_id = profile.organization_id
  }

  const { data, error } = await supabase.from('wheels').insert(payload).select('id').single()
  if (error) return { error: error.message }

  revalidatePath('/dashboard/widgets')
  return { success: true, id: data.id }
}

export async function toggleWheelActive(formData: FormData): Promise<void> {
  try { await getAllowedClient() } catch { return }
  const supabase = await createClient()
  const id = formData.get('id') as string
  const current = formData.get('active') === 'true'
  await supabase.from('wheels').update({ active: !current }).eq('id', id)
  revalidatePath('/dashboard/widgets')
}

export async function publishWheel(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let ctx: Awaited<ReturnType<typeof getAllowedClient>>
  try { ctx = await getAllowedClient() } catch { return { error: 'Unauthorized' } }
  const { supabase } = ctx

  const wheelId = formData.get('wheel_id') as string

  const { data: segments } = await supabase
    .from('wheel_segments')
    .select('id')
    .eq('wheel_id', wheelId)
    .eq('active', true)

  if (!segments || segments.length === 0) {
    return { error: 'Pievienojiet vismaz 1 segmentu pirms publicēšanas' }
  }

  const { error } = await supabase
    .from('wheels')
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq('id', wheelId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/widgets/${wheelId}/preview`)
  revalidatePath(`/dashboard/widgets/${wheelId}/embed`)
  revalidatePath('/dashboard/widgets')
  return { success: true }
}

export async function upsertSegment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try { await getAllowedClient() } catch { return { error: 'Unauthorized' } }
  const supabase = await createClient()

  const wheelId = formData.get('wheel_id') as string
  const id = (formData.get('id') as string) || null
  const autoCode = formData.get('auto_code') === 'true'
  const prizeValueRaw = formData.get('prize_value') as string
  const stockRaw = formData.get('stock') as string
  const stock = stockRaw ? parseInt(stockRaw, 10) : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    wheel_id: wheelId,
    label: (formData.get('label') as string).trim(),
    color: formData.get('color') as string,
    prize_type: formData.get('prize_type') as string,
    prize_value: prizeValueRaw ? parseInt(prizeValueRaw, 10) : null,
    prize_description: (formData.get('prize_description') as string).trim() || null,
    auto_code: autoCode,
    prize_code: autoCode ? null : ((formData.get('prize_code') as string).trim() || null),
    probability_weight: parseInt(formData.get('probability_weight') as string, 10) || 1,
    stock,
    remaining: stock,
    expires_days: parseInt(formData.get('expires_days') as string, 10) || 30,
    active: formData.get('active') === 'true',
  }

  const { error } = id
    ? await supabase.from('wheel_segments').update(payload).eq('id', id)
    : await supabase.from('wheel_segments').insert(payload)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/widgets/${wheelId}/segments`)
  return { success: true }
}

export async function deleteSegment(formData: FormData): Promise<void> {
  try { await getAllowedClient() } catch { return }
  const supabase = await createClient()
  const id = formData.get('id') as string
  const wheelId = formData.get('wheel_id') as string
  await supabase.from('wheel_segments').delete().eq('id', id)
  revalidatePath(`/dashboard/widgets/${wheelId}/segments`)
}

export async function updateFormSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try { await getAllowedClient() } catch { return { error: 'Unauthorized' } }
  const supabase = await createClient()

  const wheelId = formData.get('wheel_id') as string
  const { error } = await supabase.from('wheels').update({
    form_show_name: formData.get('form_show_name') === 'true',
    form_show_phone: formData.get('form_show_phone') === 'true',
    form_require_name: formData.get('form_require_name') === 'true',
    form_require_phone: formData.get('form_require_phone') === 'true',
    gdpr_text: (formData.get('gdpr_text') as string).trim() || null,
    survey_enabled: formData.get('survey_enabled') === 'true',
  }).eq('id', wheelId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/widgets/${wheelId}/form`)
  return { success: true }
}

export async function upsertFormField(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try { await getAllowedClient() } catch { return { error: 'Unauthorized' } }
  const supabase = await createClient()

  const wheelId = formData.get('wheel_id') as string
  const id = (formData.get('id') as string) || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    wheel_id: wheelId,
    field_type: formData.get('field_type') as string,
    label: (formData.get('label') as string).trim(),
    placeholder: (formData.get('placeholder') as string).trim() || null,
    required: formData.get('required') === 'true',
    sort_order: parseInt(formData.get('sort_order') as string, 10) || 0,
    active: true,
  }

  const { error } = id
    ? await supabase.from('wheel_form_fields').update(payload).eq('id', id)
    : await supabase.from('wheel_form_fields').insert(payload)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/widgets/${wheelId}/form`)
  return { success: true }
}

export async function deleteFormField(formData: FormData): Promise<void> {
  try { await getAllowedClient() } catch { return }
  const supabase = await createClient()
  const id = formData.get('id') as string
  const wheelId = formData.get('wheel_id') as string
  await supabase.from('wheel_form_fields').delete().eq('id', id)
  revalidatePath(`/dashboard/widgets/${wheelId}/form`)
}

export async function reorderFormField(formData: FormData): Promise<void> {
  try { await getAllowedClient() } catch { return }
  const supabase = await createClient()

  const id = formData.get('id') as string
  const wheelId = formData.get('wheel_id') as string
  const direction = formData.get('direction') as 'up' | 'down'
  const currentOrder = parseInt(formData.get('sort_order') as string, 10)
  const targetOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1

  const { data: other } = await supabase
    .from('wheel_form_fields')
    .select('id')
    .eq('wheel_id', wheelId)
    .eq('sort_order', targetOrder)
    .single()

  if (other) {
    await supabase.from('wheel_form_fields').update({ sort_order: currentOrder }).eq('id', other.id)
  }
  await supabase.from('wheel_form_fields').update({ sort_order: targetOrder }).eq('id', id)
  revalidatePath(`/dashboard/widgets/${wheelId}/form`)
}
