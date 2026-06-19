'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'
import { sendWelcomeEmail, sendNewVenueNotification } from '@/lib/email'

export type WheelActionState = { error?: string } | null

const SEGMENT_COLORS = [
  '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95',
  '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE',
]

export async function completeOnboarding(
  _prev: WheelActionState,
  formData: FormData
): Promise<WheelActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nav autorizēts' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.venue_id) return { error: 'Uzņēmums nav atrasts' }

  const venueId = profile.venue_id
  const admin   = getAdmin()

  // Get venue name + category
  const { data: venue } = await admin
    .from('venues')
    .select('name, category')
    .eq('id', venueId)
    .single()

  if (!venue) return { error: 'Uzņēmums nav atrasts' }

  // Get prizes
  const { data: prizes } = await admin
    .from('prizes')
    .select('id, name, probability_weight')
    .eq('venue_id', venueId)
    .eq('active', true)
    .order('probability_weight', { ascending: false })

  if (!prizes || prizes.length < 2) {
    return { error: 'Nepieciešamas vismaz 2 balvas' }
  }

  const wheelName = (formData.get('wheel_name') as string)?.trim() || `${venue.name} laimes rats`

  // Insert wheel
  const { data: wheel, error: wheelError } = await admin
    .from('wheels')
    .insert({
      venue_id:         venueId,
      name:             wheelName,
      type:             'web_widget',
      locale:           'lv',
      style_theme:      'light',
      brand_color:      '#7C3AED',
      trigger_type:     'direct_link',
      display_type:     'popup',
      show_powered_by:  true,
      one_spin_per_email: false,
      active:           true,
    })
    .select('id')
    .single()

  if (wheelError) return { error: `Kļūda: ${wheelError.message}` }

  // Insert wheel_segments — one per prize
  const segments = prizes.map((p, i) => ({
    wheel_id:           wheel.id,
    label:              p.name,
    color:              SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    prize_type:         'physical' as const,
    probability_weight: p.probability_weight,
    expires_days:       30,
    active:             true,
    auto_code:          false,
  }))

  const { error: segError } = await admin.from('wheel_segments').insert(segments)
  if (segError) return { error: `Kļūda segmentu veidošanā: ${segError.message}` }

  // Mark venue as onboarded
  await admin
    .from('venues')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', venueId)

  // Send emails (non-blocking — don't fail onboarding if email fails)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.spillit.lv'
  await Promise.allSettled([
    sendWelcomeEmail(user.email!, venue.name, `${appUrl}/dashboard`),
    sendNewVenueNotification(venue.name, user.email!, venue.category ?? 'Nezināma'),
  ])

  redirect('/dashboard')
}
