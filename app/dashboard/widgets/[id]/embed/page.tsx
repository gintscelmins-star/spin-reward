import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WheelSubNav from '@/components/WheelSubNav'
import EmbedClient from './EmbedClient'
import QRCode from 'qrcode'

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['client_admin', 'agency_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const { data: wheel } = await supabase
    .from('wheels')
    .select('id, name, slug, active, trigger_type')
    .eq('id', id)
    .single()

  if (!wheel) redirect('/dashboard/widgets')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.spillit.lv'
  const directUrl = `${appUrl}/w/${wheel.slug}`
  const qrDataUrl = await QRCode.toDataURL(directUrl, { width: 200, margin: 2 })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <WheelSubNav wheelId={id} wheelName={wheel.name} active="embed" />

        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-6">Embed kods</h1>
          <EmbedClient
            wheelId={id}
            slug={wheel.slug}
            appUrl={appUrl}
            triggerType={wheel.trigger_type ?? 'delay'}
            active={wheel.active}
            qrDataUrl={qrDataUrl}
          />
        </div>
      </div>
    </div>
  )
}
