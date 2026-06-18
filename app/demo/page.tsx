import DemoForm from './DemoForm'

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return <DemoForm error={error} />
}
