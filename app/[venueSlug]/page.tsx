import { createClient } from '@/lib/supabase/server'
import FunWheel from '@/components/FunWheel'
import Wheel from '@/components/Wheel'

export default async function VenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ venueSlug: string }>
  searchParams: Promise<{ variant?: string }>
}) {
  const { venueSlug } = await params
  const { variant } = await searchParams

  const supabase = await createClient()
  const { data: venue } = await supabase
    .from('venues')
    .select('mode')
    .eq('slug', venueSlug)
    .single()

  if (venue?.mode === 'fun') return <FunWheel venueSlug={venueSlug} />
  return <Wheel venueSlug={venueSlug} variant={variant} />
}
