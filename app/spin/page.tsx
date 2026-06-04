import { supabase } from '@/lib/supabase'
import type { Prize, Venue } from '@/types'

export default async function SpinPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; session?: string }>
}) {
  const { venue: venueSlug } = await searchParams

  if (!venueSlug) {
    return (
      <main className="p-8">
        <p className="text-red-600">Šī vieta nav atrasta</p>
      </main>
    )
  }

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', venueSlug)
    .single<Venue>()

  if (venueError && venueError.code !== 'PGRST116') {
    return (
      <main className="p-8">
        <p className="text-red-600">Neizdevās savienoties</p>
        <a href={`/spin?venue=${venueSlug}`} className="underline text-blue-600">
          Mēģināt vēlreiz
        </a>
      </main>
    )
  }

  if (!venue) {
    return (
      <main className="p-8">
        <p className="text-red-600">Šī vieta nav atrasta</p>
      </main>
    )
  }

  const { data: prizes, error: prizesError } = await supabase
    .from('prizes')
    .select('*')
    .eq('venue_id', venue.id)
    .eq('active', true)

  if (prizesError) {
    return (
      <main className="p-8">
        <p className="text-red-600">Neizdevās savienoties</p>
        <a href={`/spin?venue=${venueSlug}`} className="underline text-blue-600">
          Mēģināt vēlreiz
        </a>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-2">{venue.name}</h1>
      <p className="text-green-600 mb-6">Ielādēts ✓</p>
      <ul className="space-y-2">
        {(prizes as Prize[]).map((prize) => (
          <li key={prize.id} className="border rounded px-4 py-2">
            {prize.name}
          </li>
        ))}
      </ul>
    </main>
  )
}
