import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'
import { toggleVenueActive } from './actions'
import VenueRowActions from './VenueRowActions'

interface VenueOverview {
  id: string
  name: string
  slug: string
  plan: string
  active: boolean
  billing_status: string
  module_google_enabled: boolean
  module_tips_enabled: boolean
  module_whatsapp_enabled: boolean
  review_count: number
  avg_rating: number | null
  spin_count: number
  last_activity: string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtRating(r: number | null) {
  if (r == null) return '—'
  return r.toFixed(1) + ' ★'
}

export default async function VenuesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/admin')

  const { data: venues, error } = await getAdmin().rpc('get_venues_overview')
  const rows = ((venues ?? []) as unknown as VenueOverview[]).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</Link>
            <h1 className="text-2xl font-bold text-gray-800">Venues</h1>
            <span className="text-sm text-gray-400">{rows.length} kopā</span>
          </div>
          <Link
            href="/admin/venues/new"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            + Pievienot venue
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            RPC kļūda: {error.message}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Venue</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Plāns / Moduļi</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Spini</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Atsauksmes</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Rating</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Pēdējā aktivitāte</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Billing</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">

                  {/* Name + slug */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/venue?venueId=${v.id}`}
                      className="font-semibold text-purple-700 hover:underline block"
                    >
                      {v.name}
                    </Link>
                    <span className="font-mono text-gray-400 text-xs">{v.slug}</span>
                  </td>

                  {/* Plan + module toggles */}
                  <td className="px-4 py-3">
                    <VenueRowActions
                      venueId={v.id}
                      plan={v.plan}
                      moduleGoogle={v.module_google_enabled ?? false}
                      moduleTips={v.module_tips_enabled ?? false}
                      moduleWhatsapp={v.module_whatsapp_enabled ?? false}
                    />
                  </td>

                  {/* Spin count */}
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    {v.spin_count ?? 0}
                  </td>

                  {/* Review count */}
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    {v.review_count ?? 0}
                  </td>

                  {/* Avg rating */}
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-semibold ${
                      v.avg_rating != null && v.avg_rating >= 4 ? 'text-green-600' :
                      v.avg_rating != null && v.avg_rating < 3 ? 'text-red-500' : 'text-gray-600'
                    }`}>
                      {fmtRating(v.avg_rating)}
                    </span>
                  </td>

                  {/* Last activity */}
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {fmtDate(v.last_activity)}
                  </td>

                  {/* Billing status */}
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.billing_status === 'active' ? 'bg-green-100 text-green-700' :
                      v.billing_status === 'trial'  ? 'bg-blue-100 text-blue-700'  :
                                                       'bg-red-100 text-red-700'
                    }`}>
                      {v.billing_status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/venues/${v.id}`}
                        className="text-xs text-purple-600 hover:underline whitespace-nowrap"
                      >
                        Edit
                      </Link>
                      <form action={toggleVenueActive}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="active" value={(!v.active).toString()} />
                        <button type="submit" className="text-xs text-gray-400 hover:text-gray-700 underline">
                          {v.active ? 'Atslēgt' : 'Ieslēgt'}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    Nav neviena venue —{' '}
                    <Link href="/admin/venues/new" className="underline text-purple-600">
                      pievienot pirmo
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          Plāns un moduļi tiek mainīti nekavējoties. Klikšķis uz venue nosaukuma — detalizēts skats.
        </p>
      </div>
    </div>
  )
}
