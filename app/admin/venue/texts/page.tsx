import TextsEditor from './TextsEditor'

export default async function TextsPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>
}) {
  const { venueId } = await searchParams
  return <TextsEditor venueId={venueId} />
}
