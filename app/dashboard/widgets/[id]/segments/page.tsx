import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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
        <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
          <Link href="/dashboard/widgets" className="hover:text-gray-600">Wheels</Link>
          <span>/</span>
          <span className="text-gray-600 font-medium">{wheel.name}</span>
          <span>/</span>
          <span>Segments</span>
        </div>

        <div className="flex items-center justify-between mt-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Segments</h1>
          <Link
            href={`/dashboard/widgets/${id}/form`}
            className="text-sm text-purple-600 hover:underline"
          >
            Form Settings →
          </Link>
        </div>

        <SegmentsClient
          wheelId={id}
          segments={segments ?? []}
          totalWeight={totalWeight}
        />
      </div>
    </div>
  )
}
