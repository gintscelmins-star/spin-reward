'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Status = 'loading' | 'unconfigured' | 'no_session'

export default function AdminPage() {
  const [status, setStatus] = useState<Status>('loading')
  const router = useRouter()

  useEffect(() => {
    async function route() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('no_session'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

      if (!profile?.role) { setStatus('unconfigured'); return }

      if      (profile.role === 'super_admin')  router.replace('/admin/venues')
      else if (profile.role === 'client_admin') router.replace('/admin/venue')
      else if (profile.role === 'staff')        router.replace('/admin/session')
      else    setStatus('unconfigured')
    }
    route()
  }, [router])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Ielādē...</p>
    </div>
  )

  if (status === 'no_session') {
    router.replace('/login')
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-gray-500 text-lg">Konts nav konfigurēts</p>
        <p className="text-gray-400 text-sm mt-2">Sazinies ar administratoru</p>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="mt-6 w-full py-2 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl transition-colors"
        >
          Iziet
        </button>
      </div>
    </div>
  )
}
