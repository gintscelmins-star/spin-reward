'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateModuleToggle(
  venueId: string,
  field: 'module_google_enabled' | 'module_tips_enabled' | 'module_whatsapp_enabled',
  value: boolean
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile) return
  if (profile.role !== 'super_admin' && profile.venue_id !== venueId) return

  await supabase.from('venues').update({ [field]: value }).eq('id', venueId)
  revalidatePath('/admin/venue')
}
