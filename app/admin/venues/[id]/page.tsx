import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'
import { updateVenue } from '../actions'
import AssignAdminForm from './AssignAdminForm'

export default async function VenuePage({
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/admin')

  const { data: venue } = await getAdmin()
    .from('venues')
    .select('*')
    .eq('id', id)
    .single()

  if (!venue) redirect('/admin/venues')

  // Fetch client_admin profiles for this venue + their emails
  const { data: adminProfiles } = await getAdmin()
    .from('profiles')
    .select('id')
    .eq('role', 'client_admin')
    .eq('venue_id', id)

  const adminEmails: Record<string, string> = {}
  for (const p of adminProfiles ?? []) {
    const { data: { user: u } } = await getAdmin().auth.admin.getUserById(p.id)
    if (u?.email) adminEmails[p.id] = u.email
  }

  const updateVenueWithId = updateVenue.bind(null, id)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/venues" className="text-gray-400 hover:text-gray-600 text-sm">← Venues</Link>
          <h1 className="text-2xl font-bold text-gray-800">{venue.name}</h1>
        </div>

        {/* ---- Edit form ---- */}
        <form action={updateVenueWithId} className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-gray-700">Rediģēt</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nosaukums</label>
            <input
              name="name"
              defaultValue={venue.name}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              name="slug"
              defaultValue={venue.slug}
              required
              pattern="[a-z0-9-]+"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Place ID</label>
            <input
              name="google_place_id"
              defaultValue={venue.google_place_id ?? ''}
              placeholder="ChIJ..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plāns</label>
              <select
                name="plan"
                defaultValue={venue.plan}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
              <input
                name="seats"
                type="number"
                min="1"
                defaultValue={venue.seats}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing</label>
              <select
                name="billing_status"
                defaultValue={venue.billing_status}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aktīvs</label>
              <select
                name="active"
                defaultValue={String(venue.active)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="true">Jā</option>
                <option value="false">Nē</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors active:scale-95"
          >
            Saglabāt
          </button>
        </form>

        {/* ---- Client admin section ---- */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Klienta administrators</h2>

          {adminProfiles && adminProfiles.length > 0 && (
            <div className="mb-4 space-y-1">
              {adminProfiles.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-2 border-b border-gray-50">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="text-sm text-gray-700 font-mono">
                    {adminEmails[p.id] ?? p.id}
                  </span>
                </div>
              ))}
            </div>
          )}

          <AssignAdminForm venueId={id} />
        </div>
      </div>
    </div>
  )
}
