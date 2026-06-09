'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="mt-6 w-full py-2 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl transition-colors"
    >
      Iziet
    </button>
  )
}
