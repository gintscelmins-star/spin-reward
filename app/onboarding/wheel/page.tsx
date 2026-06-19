import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WheelForm from './WheelForm'

interface DbPrize { name: string; probability_weight: number }
interface DbVenue  { name: string }

export default async function OnboardingWheelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.venue_id) redirect('/onboarding/venue')

  const venueId = profile.venue_id

  // Fetch prizes — redirect back if none
  const [{ data: prizes }, { data: venue }] = await Promise.all([
    supabase
      .from('prizes')
      .select('name, probability_weight')
      .eq('venue_id', venueId)
      .eq('active', true)
      .order('probability_weight', { ascending: false }),
    supabase
      .from('venues')
      .select('name')
      .eq('id', venueId)
      .single(),
  ])

  if (!prizes || prizes.length < 2) redirect('/onboarding/prizes')

  const typedVenue = venue as DbVenue | null

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black text-gray-800">Jūsu laimes rats ir gatavs!</h1>
        <p className="text-gray-400 text-sm mt-1">3. solis no 3</p>
      </div>
      <WheelForm
        venueName={(typedVenue?.name ?? '')}
        prizes={(prizes as DbPrize[])}
      />
    </>
  )
}
