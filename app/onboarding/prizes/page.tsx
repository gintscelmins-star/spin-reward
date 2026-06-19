import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrizesForm from './PrizesForm'

interface PrizeRow { name: string; weight: number }
interface DbPrize  { name: string; probability_weight: number }

export default async function OnboardingPrizesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.venue_id) redirect('/onboarding/venue')

  // Fetch existing prizes in case user came back
  const { data: existing } = await supabase
    .from('prizes')
    .select('name, probability_weight')
    .eq('venue_id', profile.venue_id)
    .eq('active', true)
    .order('probability_weight', { ascending: false })

  const initialPrizes: PrizeRow[] = (existing ?? []).map((p: DbPrize) => ({
    name:   p.name,
    weight: p.probability_weight,
  }))

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black text-gray-800">Kādas balvas piedāvāt?</h1>
        <p className="text-gray-400 text-sm mt-1">2. solis no 3</p>
      </div>
      <PrizesForm initialPrizes={initialPrizes} />
    </>
  )
}
