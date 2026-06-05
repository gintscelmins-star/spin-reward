import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'
import { toggleVenueActive } from './actions'

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

  const [{ data: venues }, { data: staffRows }] = await Promise.all([
    getAdmin().from('venues').select('*').order('name'),
    getAdmin().from('staff').select('venue_id').eq('active', true),
  ])

  const staffCount = (staffRows ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.venue_id] = (acc[s.venue_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</Link>
            <h1 className="text-2xl font-bold text-gray-800">Venues</h1>
          </div>
          <Link
            href="/admin/venues/new"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            + Pievienot venue
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Nosaukums</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Slug</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Plāns</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Billing</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Seats</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Statuss</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(venues ?? []).map(v => {
                const used = staffCount[v.id] ?? 0
                const overage = used > v.seats
                return (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/venues/${v.id}`}
                        className="font-medium text-purple-700 hover:underline"
                      >
                        {v.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{v.slug}</td>
                    <td className="px-4 py-3 text-gray-600">{v.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        v.billing_status === 'active'    ? 'bg-green-100 text-green-700' :
                        v.billing_status === 'trial'     ? 'bg-blue-100 text-blue-700'  :
                                                           'bg-red-100 text-red-700'
                      }`}>
                        {v.billing_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono ${overage ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {used}/{v.seats}{overage ? ' ⚠' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        v.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {v.active ? 'aktīvs' : 'neaktīvs'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/venue/prizes?venueId=${v.id}`}
                          className="text-xs text-purple-600 hover:underline whitespace-nowrap"
                        >
                          Rediģēt config
                        </Link>
                        <form action={toggleVenueActive}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="active" value={(!v.active).toString()} />
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-gray-700 underline"
                          >
                            {v.active ? 'Atslēgt' : 'Ieslēgt'}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!venues?.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Nav neviena venue — <Link href="/admin/venues/new" className="underline text-purple-600">pievienot pirmo</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
