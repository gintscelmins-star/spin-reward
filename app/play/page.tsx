import Wheel from '@/components/Wheel'
import SessionFlow from '@/components/SessionFlow'

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; venue?: string; variant?: string }>
}) {
  const { session, venue, variant } = await searchParams

  if (session) return <SessionFlow sessionId={session} variant={variant} />
  if (venue) return <Wheel venueSlug={venue} variant={variant} />

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Nederīga saite</p>
    </div>
  )
}
