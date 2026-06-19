import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { toggleWheelActive } from './actions'

const TYPE_LABELS: Record<string, string> = {
  web_widget: 'Web Widget',
  campaign_lp: 'Campaign LP',
}

const TYPE_COLORS: Record<string, string> = {
  web_widget: 'bg-indigo-100 text-indigo-700',
  campaign_lp: 'bg-amber-100 text-amber-700',
}

interface Wheel {
  id: string
  name: string
  type: string
  active: boolean
  total_leads: number
  created_at: string
}

export default async function WidgetsPage() {
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

  let query = supabase
    .from('wheels')
    .select('id, name, type, active, total_leads, created_at')
    .order('created_at', { ascending: false })

  if (profile.role === 'client_admin' && profile.venue_id) {
    query = query.eq('venue_id', profile.venue_id)
  }
  // agency_admin and super_admin: RLS handles filtering

  const { data: wheels } = await query

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">
              {profile.role === 'agency_admin' ? 'Agency' : 'Venue'} Dashboard
            </p>
            <h1 className="text-2xl font-bold text-gray-800">Wheels</h1>
          </div>
          <Link
            href="/dashboard/widgets/new"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            + New Wheel
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Active</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Leads</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(wheels ?? []).map((w: Wheel) => (
                <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{w.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[w.type] ?? 'bg-gray-100 text-gray-500'}`}>
                      {TYPE_LABELS[w.type] ?? w.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleWheelActive}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="active" value={String(w.active)} />
                      <button
                        type="submit"
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                          w.active ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                            w.active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{w.total_leads ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(w.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-xs">
                      <Link href={`/dashboard/widgets/${w.id}/segments`} className="text-purple-600 hover:underline">
                        Segments
                      </Link>
                      <Link href={`/dashboard/widgets/${w.id}/form`} className="text-purple-600 hover:underline">
                        Form
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {(wheels ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No wheels yet —{' '}
                    <Link href="/dashboard/widgets/new" className="text-purple-600 hover:underline">
                      create your first
                    </Link>
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
