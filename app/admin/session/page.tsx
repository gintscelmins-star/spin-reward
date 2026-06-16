import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SessionClient from './SessionClient'
import VenuePicker from '../venue/_components/VenuePicker'

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !['client_admin', 'super_admin', 'staff'].includes(profile.role)) {
    redirect('/admin')
  }

  const params = await searchParams
  const venueId =
    profile.role === 'super_admin' ? (params.venueId ?? null) : profile.venue_id

  if (!venueId) return <VenuePicker basePath="/admin/session" />

  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const in7Days = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [{ data: staffList }, { data: activities }, { data: todaySessions }] = await Promise.all([
    supabase
      .from('staff')
      .select('id, name')
      .eq('venue_id', venueId)
      .eq('active', true)
      .order('name'),
    supabase
      .from('activities')
      .select('id, name, default_staff_id')
      .eq('venue_id', venueId)
      .eq('active', true)
      .order('name'),
    supabase
      .from('sessions')
      .select('id, staff_id, activity_id, created_at')
      .eq('venue_id', venueId)
      .eq('status', 'active')
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false }),
  ])

  const backHref =
    profile.role === 'staff'
      ? '/admin'
      : profile.role === 'super_admin'
      ? `/admin/venue?venueId=${venueId}`
      : '/admin/venue'

  return (
    <div className="relative">
      <div className="absolute top-4 left-4">
        <Link href={backHref} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {profile.role === 'staff' ? 'Admin' : 'Venue'}
        </Link>
      </div>
      <SessionClient
        staffList={staffList ?? []}
        activities={activities ?? []}
        venueId={venueId}
        todaySessions={todaySessions ?? []}
      />
    </div>
  )
}
