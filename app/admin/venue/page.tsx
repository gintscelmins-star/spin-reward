import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export default async function ClientAdminVenuePage({
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

  if (!profile?.role || !['client_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const params = await searchParams
  const venueId =
    profile.role === 'super_admin' ? (params.venueId ?? null) : profile.venue_id

  if (!venueId) redirect('/admin')

  const [{ data: venue }, { count: activeStaff }] = await Promise.all([
    supabase.from('venues').select('*').eq('id', venueId).single(),
    supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('active', true),
  ])

  if (!venue) redirect('/admin')

  const q = profile.role === 'super_admin' ? `?venueId=${venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            {profile.role === 'super_admin' && (
              <Link
                href="/admin/venues"
                className="text-gray-400 hover:text-gray-600 text-sm block mb-1"
              >
                ← Venues
              </Link>
            )}
            <h1 className="text-2xl font-bold text-gray-800">{venue.name}</h1>
            <p className="text-sm text-gray-400 font-mono">{venue.slug}</p>
          </div>
          <LogoutButton />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Plāns</p>
            <p className="text-xl font-bold text-purple-600 capitalize">{venue.plan}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Darbinieki</p>
            <p
              className={`text-xl font-bold ${
                (activeStaff ?? 0) > venue.seats ? 'text-red-600' : 'text-gray-800'
              }`}
            >
              {activeStaff ?? 0}
              <span className="text-gray-400 text-base font-normal">/{venue.seats}</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Norēķini</p>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                venue.billing_status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : venue.billing_status === 'trial'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {venue.billing_status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/admin/venue/prizes${q}`}
            className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow group"
          >
            <p className="text-lg font-bold text-gray-800 group-hover:text-purple-700">Balvas</p>
            <p className="text-sm text-gray-400 mt-1">Pārvaldīt ruletē esošās balvas</p>
          </Link>
          <Link
            href={`/admin/venue/staff${q}`}
            className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow group"
          >
            <p className="text-lg font-bold text-gray-800 group-hover:text-purple-700">Personāls</p>
            <p className="text-sm text-gray-400 mt-1">Darbinieki un tip kartes</p>
          </Link>
          <Link
            href={`/admin/venue/questions${q}`}
            className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow group"
          >
            <p className="text-lg font-bold text-gray-800 group-hover:text-purple-700">Novērtējumi</p>
            <p className="text-sm text-gray-400 mt-1">Atsauksmju jautājumu konfigurācija</p>
          </Link>
          <Link
            href={`/admin/venue/stats${q}`}
            className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow group"
          >
            <p className="text-lg font-bold text-gray-800 group-hover:text-purple-700">Statistika</p>
            <p className="text-sm text-gray-400 mt-1">Spini, atsauksmes, tips</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
