'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function VenueDashboard() {
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setReady(true); return }
      supabase.from('profiles').select('role').eq('id', user.id).single()
        .then(({ data }) => {
          if (data && ['client_admin', 'super_admin'].includes(data.role)) setAllowed(true)
          setReady(true)
        })
    })
  }, [])

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Ielādē...</p>
    </div>
  )

  if (!allowed) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">Nav piekļuves tiesību</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Venue pārvaldnieks</h1>
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
