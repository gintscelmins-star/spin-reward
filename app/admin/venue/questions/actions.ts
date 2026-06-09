'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type QuestionState = { error?: string; success?: boolean } | null

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

export async function upsertQuestion(
  _prev: QuestionState,
  formData: FormData
): Promise<QuestionState> {
  const venueId = formData.get('venueId') as string
  const supabase = await getVenueAccess(venueId)

  const id = (formData.get('id') as string) || null
  const label = (formData.get('label') as string).trim()
  const type = formData.get('type') as string
  const sort_order = parseInt(formData.get('sort_order') as string, 10)
  const active = formData.get('active') === 'true'

  if (id) {
    const { error } = await supabase
      .from('review_questions')
      .update({ label, type, sort_order, active })
      .eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('review_questions')
      .insert({ venue_id: venueId, label, type, sort_order, active })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/venue/questions')
  return { success: true }
}

export async function deleteQuestion(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const id = formData.get('id') as string
  const supabase = await getVenueAccess(venueId)
  await supabase.from('review_questions').delete().eq('id', id)
  revalidatePath('/admin/venue/questions')
}

export async function addPreset(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const label = (formData.get('label') as string).trim()
  const type = formData.get('type') as string
  const supabase = await getVenueAccess(venueId)

  const { data: last } = await supabase
    .from('review_questions')
    .select('sort_order')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sort_order = ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1

  await supabase
    .from('review_questions')
    .insert({ venue_id: venueId, label, type, sort_order, active: true })

  revalidatePath('/admin/venue/questions')
}

export async function reorderQuestion(formData: FormData): Promise<void> {
  const venueId = formData.get('venueId') as string
  const id = formData.get('id') as string
  const direction = formData.get('direction') as 'up' | 'down'
  const supabase = await getVenueAccess(venueId)

  const { data: questions } = await supabase
    .from('review_questions')
    .select('id, sort_order')
    .eq('venue_id', venueId)
    .order('sort_order')

  if (!questions) return

  const rows = questions as { id: string; sort_order: number }[]
  const idx = rows.findIndex(q => q.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1

  if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return

  const a = rows[idx]
  const b = rows[swapIdx]

  await Promise.all([
    supabase.from('review_questions').update({ sort_order: b.sort_order }).eq('id', a.id),
    supabase.from('review_questions').update({ sort_order: a.sort_order }).eq('id', b.id),
  ])

  revalidatePath('/admin/venue/questions')
}
