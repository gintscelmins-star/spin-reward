import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import UpsellCards from './UpsellCards'

export default async function UpsellPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !['client_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const params = await searchParams
  const q =
    profile.role === 'super_admin' && params.venueId ? `?venueId=${params.venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href={`/admin/venue${q}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Atpakaļ
          </Link>
          <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Papildu moduļi</h1>
              <p className="text-gray-500 text-sm mt-1">
                Funkcijas, kas palielina ieņēmumus un atvieglo komandas vadību
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-full">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse inline-block" />
              Tiek veidots
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
          Šie moduļi ir aktīvā izstrādē. Ja kāds interesē — sazinies ar mums un saņemsi pirmais,
          kad tas būs pieejams, ar preferenciālu cenu.
        </p>

        <UpsellCards />
      </div>
    </div>
  )
}
