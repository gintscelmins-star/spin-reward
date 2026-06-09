'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Venue {
  id: string
  name: string
  slug: string
  plan: string | null
  billing_status: string | null
  seats: number
  active: boolean
  uses_sessions: boolean
  created_at: string
}

export default function VenuesPage() {
  const [venues,  setVenues]  = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [email,   setEmail]   = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setEmail(user.email ?? null)

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'super_admin') { router.replace('/admin'); return }

      const { data } = await supabase
        .from('venues').select('*').order('name')
      setVenues((data ?? []) as Venue[])
      setLoading(false)
    }
    load()
  }, [router])

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('venues').update({ active: !current }).eq('id', id)
    setVenues(vs => vs.map(v => v.id === id ? { ...v, active: !current } : v))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Ielādē...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Venues</h1>
            {email && <p className="text-xs text-gray-400 mt-0.5">{email} · super_admin</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/venues/new"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors"
            >
              + Pievienot venue
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              Iziet
            </button>
          </div>
        </div>

        {/* Table */}
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
              {venues.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Nav neviena venue
                  </td>
                </tr>
              )}
              {venues.map(v => (
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
                  <td className="px-4 py-3 text-gray-600">{v.plan ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.billing_status === 'active' ? 'bg-green-100 text-green-700' :
                      v.billing_status === 'trial'  ? 'bg-blue-100 text-blue-700'  :
                                                      'bg-red-100 text-red-700'
                    }`}>
                      {v.billing_status ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.seats}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(v.id, v.active)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        v.active
                          ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                      }`}
                    >
                      {v.active ? 'Aktīvs' : 'Neaktīvs'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/venues/${v.id}`}
                      className="text-xs text-purple-500 hover:underline"
                    >
                      Rediģēt →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-400 text-right">{venues.length} venue kopā</p>
      </div>
    </div>
  )
}
