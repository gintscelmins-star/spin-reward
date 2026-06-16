'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type SessionState = { error?: string; sessionId?: string } | null

export async function createSession(
  _prev: SessionState,
  formData: FormData
): Promise<SessionState> {
  const venueId = formData.get('venueId') as string
  const activity_id = (formData.get('activity_id') as string) || null
  let staff_id = (formData.get('staff_id') as string) || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nav autentificēts' }

  const { data: profile } = await supabase
    .from('profiles').select('role, venue_id').eq('id', user.id).single()
  if (!profile) return { error: '403' }
  if (profile.role !== 'super_admin' && profile.venue_id !== venueId) return { error: '403' }
  if (!['client_admin', 'super_admin', 'staff'].includes(profile.role)) return { error: '403' }

  // Auto-resolve staff from activity if not provided
  if (!staff_id && activity_id) {
    const { data: act } = await supabase
      .from('activities').select('default_staff_id').eq('id', activity_id).single()
    staff_id = act?.default_staff_id ?? null
  }

  // Dienas limita pārbaude
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  const [{ count: todayCount }, { data: staffRow }] = await Promise.all([
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('staff_id', staff_id)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString()),
    supabase.from('staff').select('daily_spin_limit').eq('id', staff_id).single(),
  ])

  if (
    staffRow?.daily_spin_limit !== null &&
    staffRow?.daily_spin_limit !== undefined &&
    (todayCount ?? 0) >= staffRow.daily_spin_limit
  ) {
    return {
      error: `Sasniegts darbinieka dienas spin limits (${staffRow.daily_spin_limit})`,
    }
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
      staff_id,
      activity_id,
      status: 'active',
      activate_ip,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { sessionId: session.id }
}
