import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createVenue } from '../actions'

export default async function NewVenuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/admin')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/venues" className="text-gray-400 hover:text-gray-600 text-sm">← Venues</Link>
          <h1 className="text-2xl font-bold text-gray-800">Jauns venue</h1>
        </div>

        <form action={createVenue} className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nosaukums</label>
            <input
              name="name"
              required
              placeholder="Kafejnīca Rīga"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-gray-400 font-normal">(URL identifikators)</span>
            </label>
            <input
              name="slug"
              required
              pattern="[a-z0-9-]+"
              placeholder="kafejnica-riga"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Place ID <span className="text-gray-400 font-normal">(opcionāli)</span>
            </label>
            <input
              name="google_place_id"
              placeholder="ChIJ..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plāns</label>
              <select
                name="plan"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="multi">Multi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
              <input
                name="seats"
                type="number"
                min="1"
                defaultValue="5"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors active:scale-95"
          >
            Izveidot venue
          </button>
        </form>
      </div>
    </div>
  )
}
