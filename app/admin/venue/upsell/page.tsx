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
          <div className="mt-3">
            <h1 className="text-2xl font-black text-gray-900">Papildu moduļi</h1>
            <p className="text-gray-500 text-sm mt-1">
              Funkcijas, kas palielina ieņēmumus un atvieglo komandas vadību
            </p>
          </div>
        </div>

        <UpsellCards />
      </div>
    </div>
  )
}
