'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function VenueDashboard() {
  const [ready,  setReady]  = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [role,   setRole]   = useState<string | null>(null)
  const [email,  setEmail]  = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setReady(true); return }
      setEmail(user.email ?? null)
      supabase.from('profiles').select('role').eq('id', user.id).single()
        .then(({ data }) => {
          if (data && ['client_admin', 'super_admin'].includes(data.role)) {
            setAllowed(true)
            setRole(data.role)
          }
          setReady(true)
        })
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Ielādē...</p>
    </div>
  )

  if (!allowed) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <p className="text-red-500">Nav piekļuves tiesību</p>
      <Link href="/login" className="text-purple-600 underline text-sm">Pieslēgties</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Venue pārvaldnieks</h1>
            {email && (
              <p className="text-xs text-gray-400 mt-0.5">
                {email} · <span className="font-medium">{role}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Iziet
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/admin/venue/texts"
            className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2 hover:shadow-md transition-shadow"
          >
            <p className="font-bold text-gray-800">Teksti</p>
            <p className="text-sm text-gray-400">Lokalizētas copy virknes LV / EN</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
