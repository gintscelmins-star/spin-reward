'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'

export type VenueActionState = { error?: string } | null

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[āÁá]/g, 'a').replace(/[čĉ]/g, 'c').replace(/[ēé]/g, 'e')
    .replace(/[ģĝ]/g, 'g').replace(/[ī]/g, 'i').replace(/[ķ]/g, 'k')
    .replace(/[ļĺ]/g, 'l').replace(/[ņń]/g, 'n').replace(/[š]/g, 's')
    .replace(/[ū]/g, 'u').replace(/[žź]/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createVenue(
  _prev: VenueActionState,
  formData: FormData
): Promise<VenueActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nav autorizēts' }

  const venue_name = (formData.get('venue_name') as string).trim()
  const category   = (formData.get('category')   as string).trim()
  let   slug       = (formData.get('slug')        as string).trim().toLowerCase()

  if (!venue_name) return { error: 'Uzņēmuma nosaukums ir obligāts' }
  if (!slug)       slug = toSlug(venue_name)

  // Validate slug format
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length < 2) {
    return { error: 'URL adrese var saturēt tikai mazos burtus, ciparus un defises' }
  }

  const admin = getAdmin()

  // Check slug uniqueness, auto-suffix if taken
  let finalSlug = slug
  let suffix = 1
  while (true) {
    const { data: existing } = await admin
      .from('venues')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle()
    if (!existing) break
    finalSlug = `${slug}-${suffix}`
    suffix++
    if (suffix > 10) return { error: 'URL adrese jau tiek izmantota. Lūdzu izvēlieties citu.' }
  }

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  // Insert venue
  const { data: newVenue, error: venueError } = await admin
    .from('venues')
    .insert({
      name:           venue_name,
      slug:           finalSlug,
      venue_type:     category || null,
      plan:           'trial',
      billing_status: 'trial',
      trial_ends_at:  trialEndsAt,
      active:         true,
    })
    .select('id')
    .single()

  if (venueError) return { error: `Kļūda: ${venueError.message}` }

  // Update profile with venue_id
  const { error: profileError } = await admin
    .from('profiles')
    .update({ venue_id: newVenue.id })
    .eq('id', user.id)

  if (profileError) return { error: `Kļūda profila atjaunināšanā: ${profileError.message}` }

  revalidatePath('/onboarding/prizes')
  redirect('/onboarding/prizes')
}
