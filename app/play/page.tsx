import { createClient } from '@/lib/supabase/server'
import FunWheel from '@/components/FunWheel'
import Wheel from '@/components/Wheel'
import SessionFlow from '@/components/SessionFlow'

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; venue?: string; variant?: string }>
}) {
  const { session, venue, variant } = await searchParams

  if (session) return <SessionFlow sessionId={session} variant={variant} />

  if (venue) {
    const supabase = await createClient()
    const { data: v } = await supabase
      .from('venues')
      .select('mode')
      .eq('slug', venue)
      .single()
    if (v?.mode === 'fun') return <FunWheel venueSlug={venue} />
    return <Wheel venueSlug={venue} variant={variant} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Nederīga saite</p>
    </div>
  )
}
