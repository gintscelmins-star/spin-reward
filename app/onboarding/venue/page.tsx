import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VenueForm from './VenueForm'

export default async function OnboardingVenuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If user already has a venue, skip to prizes
  const { data: profile } = await supabase
    .from('profiles')
    .select('venue_id')
    .eq('id', user.id)
    .single()

  if (profile?.venue_id) redirect('/onboarding/prizes')

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black text-gray-800">Iepazīstiniet ar sevi</h1>
        <p className="text-gray-400 text-sm mt-1">1. solis no 3</p>
      </div>
      <VenueForm />
    </>
  )
}
