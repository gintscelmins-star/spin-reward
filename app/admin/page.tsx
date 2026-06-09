import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

interface Profile {
  role: string | null
  venue_id: string | null
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  client_admin: 'Klienta Admin',
  staff: 'Darbinieks',
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

  if (profile?.role === 'super_admin') redirect('/admin/venues')
  if (profile?.role === 'client_admin') redirect('/admin/venue')
  if (profile?.role === 'staff') redirect('/admin/session')

  if (!profile?.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-gray-500 text-lg">Konts nav konfigurēts, sazinies ar admin</p>
          <LogoutButton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-sm text-gray-400 uppercase tracking-widest">Pieslēdzies kā</p>
        <p className="text-3xl font-extrabold text-gray-800 mt-2">
          {ROLE_LABELS[profile.role] ?? profile.role}
        </p>

        {profile.role === 'super_admin' && (
          <Link
            href="/admin/venues"
            className="mt-6 block w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
          >
            Venue saraksts →
          </Link>
        )}

        {profile.role === 'client_admin' && (
          <Link
            href="/admin/venue"
            className="mt-6 block w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
          >
            Mans venue →
          </Link>
        )}

        {profile.role === 'staff' && (
          <p className="mt-6 text-gray-400 text-sm">Darbinieka panelis — drīzumā</p>
        )}

        <LogoutButton />
      </div>
    </div>
  )
}
