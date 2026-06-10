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
  return <Wheel venueSlug={venueSlug} variant={variant} />
}
