import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WheelSubNav from '@/components/WheelSubNav'
import SegmentsClient from './SegmentsClient'

export default async function SegmentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['client_admin', 'agency_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const { data: wheel } = await supabase
    .from('wheels')
    .select('id, name, type')
    .eq('id', id)
    .single()

  if (!wheel) redirect('/dashboard/widgets')

  const { data: segments } = await supabase
    .from('wheel_segments')
    .select('id, label, color, prize_type, prize_value, prize_description, prize_code, auto_code, probability_weight, stock, expires_days, active, sort_order')
    .eq('wheel_id', id)
    .order('sort_order')
    .order('created_at')

  const totalWeight = (segments ?? []).reduce(
    (sum: number, s: { probability_weight: number }) => sum + (s.probability_weight || 0),
    0
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <WheelSubNav wheelId={id} wheelName={wheel.name} active="segments" />

        <SegmentsClient
          wheelId={id}
          segments={segments ?? []}
          totalWeight={totalWeight}
        />
      </div>
    </div>
  )
}
