import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export default async function ClientAdminVenuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client_admin') redirect('/admin')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-2xl font-extrabold text-gray-800">Venue panelis</p>
        <p className="text-gray-400 mt-2 text-sm">Drīzumā — V1.3</p>
        <p className="mt-3 text-xs text-gray-300 font-mono">{profile.venue_id}</p>
        <LogoutButton />
      </div>
    </div>
  )
}
