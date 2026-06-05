import Wheel from '@/components/Wheel'

export default async function VenuePage({
  params,
}: {
  params: Promise<{ venueSlug: string }>
}) {
  const { venueSlug } = await params
  return <Wheel venueSlug={venueSlug} />
}
