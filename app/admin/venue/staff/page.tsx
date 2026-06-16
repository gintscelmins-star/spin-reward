import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StaffClient from './StaffClient'
import StaffSummary from './StaffSummary'
import { getStaffSummaryRows } from './queries'
import VenuePicker from '../_components/VenuePicker'

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string; from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !['client_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const params = await searchParams
  const venueId =
    profile.role === 'super_admin' ? (params.venueId ?? null) : profile.venue_id

  if (!venueId) return <VenuePicker basePath="/admin/venue/staff" />

  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const defaultTo = now.toISOString().slice(0, 10)
  
  const from = params.from ?? defaultFrom
  const to = params.to ?? defaultTo

  const [{ data: staff }, { data: venue }, { count: activeCount }] = await Promise.all([
    supabase.from('staff').select('*').eq('venue_id', venueId).order('name'),
    supabase.from('venues').select('seats').eq('id', venueId).single(),
    supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('active', true),
  ])

  const summaryRows = await getStaffSummaryRows(supabase, venueId, from, to)

  if (!venue) redirect('/admin')

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link href={`/admin/venue${q}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Venue
          </Link>
        </div>
        <StaffClient
          staff={staff ?? []}
          venueId={venueId}
          seats={venue.seats}
          activeCount={activeCount ?? 0}
          q={q}
        />

        {/* Staff summary stats */}
        {(staff ?? []).length > 0 && (
          <StaffSummary
            staff={staff ?? []}
            summary={summaryRows ?? []}
            venueId={venueId}
            from={from}
            to={to}
            q={q}
          />
        )}
      </div>
    </div>
  )
}
