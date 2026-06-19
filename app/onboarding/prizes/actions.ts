'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'

export type PrizesActionState = { error?: string } | null

export async function savePrizes(
  _prev: PrizesActionState,
  formData: FormData
): Promise<PrizesActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nav autorizēts' }

  // Get venue_id from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.venue_id) return { error: 'Vispirms izveidojiet uzņēmumu' }

  const venueId = profile.venue_id

  // Parse prizes from FormData
  const names   = formData.getAll('prize_name')   as string[]
  const weights = formData.getAll('prize_weight')  as string[]

  if (names.length < 2) {
    return { error: 'Nepieciešamas vismaz 2 balvas' }
  }

  const prizes: { name: string; weight: number }[] = []
  for (let i = 0; i < names.length; i++) {
    const name   = (names[i] ?? '').trim()
    const weight = parseInt(weights[i] ?? '0', 10)
    if (!name) return { error: `Balvas nosaukums nedrīkst būt tukšs (rinda ${i + 1})` }
    if (isNaN(weight) || weight < 1) return { error: `Svaram jābūt vismaz 1% (rinda ${i + 1})` }
    prizes.push({ name, weight })
  }

  const total = prizes.reduce((s, p) => s + p.weight, 0)
  if (total !== 100) {
    return { error: `Balvu svaru summai jābūt 100% (pašreizējā: ${total}%)` }
  }

  const admin = getAdmin()

  // Clean slate — delete existing prizes for this venue
  await admin.from('prizes').delete().eq('venue_id', venueId)

  // Insert new prizes
  const { error: insertError } = await admin.from('prizes').insert(
    prizes.map(p => ({
      venue_id:           venueId,
      name:               p.name,
      probability_weight: p.weight,
      expires_days:       30,
      active:             true,
      prize_type:         'physical',
    }))
  )

  if (insertError) return { error: `Kļūda saglabājot: ${insertError.message}` }

  redirect('/onboarding/wheel')
}
