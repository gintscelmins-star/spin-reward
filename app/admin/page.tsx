import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

interface Profile {
  role: string | null
  venue_id: string | null
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile?.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <p className="text-gray-500 text-lg text-center max-w-sm">
          Konts nav konfigurēts, sazinies ar admin
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-sm text-gray-400 uppercase tracking-widest">Pieslēdzies kā</p>
        <p className="text-3xl font-extrabold text-gray-800 mt-2">{profile.role}</p>
        {profile.venue_id && (
          <p className="mt-3 text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2 inline-block">
            venue: {profile.venue_id}
          </p>
        )}
        <LogoutButton />
      </div>
    </div>
  )
}
