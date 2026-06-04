export default async function RedeemPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  await params
  return <h1>Redeem — Sprint 03</h1>
}
