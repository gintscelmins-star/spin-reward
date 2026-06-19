import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WheelSubNav from '@/components/WheelSubNav'
import FormSettingsClient from './FormSettingsClient'

interface WheelRow {
  id: string
  name: string
  form_show_name: boolean
  form_show_phone: boolean
  form_require_name: boolean
  form_require_phone: boolean
  gdpr_text: string | null
  survey_enabled: boolean
}

export default async function FormPage({
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
    .select('id, name, form_show_name, form_show_phone, form_require_name, form_require_phone, gdpr_text, survey_enabled')
    .eq('id', id)
    .single<WheelRow>()

  if (!wheel) redirect('/dashboard/widgets')

  const { data: fields } = await supabase
    .from('wheel_form_fields')
    .select('id, field_type, label, placeholder, required, sort_order, active')
    .eq('wheel_id', id)
    .eq('active', true)
    .order('sort_order')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <WheelSubNav wheelId={id} wheelName={wheel.name} active="form" />

        <FormSettingsClient
          wheel={wheel}
          fields={fields ?? []}
        />
      </div>
    </div>
  )
}
