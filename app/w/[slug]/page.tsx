import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAdmin } from '@/lib/supabase/admin'
import WheelPage from './WheelPage'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mode?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const admin = getAdmin()
  const { data: wheel } = await admin
    .from('wheels')
    .select('name')
    .eq('slug', slug)
    .single()
  const title = wheel?.name ?? 'Spin & Win'
  return {
    title,
    description: 'Piedalies un uzvar!',
    openGraph: { title, type: 'website' },
  }
}

export default async function WheelRoutePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { mode } = await searchParams
  const admin = getAdmin()

  const { data: wheel } = await admin
    .from('wheels')
    .select('id, name, slug, style_theme, brand_color, logo_url, show_powered_by, form_show_name, form_show_phone, form_require_name, form_require_phone, gdpr_text, survey_enabled, one_spin_per_email, locale, active')
    .eq('slug', slug)
    .single()

  if (!wheel) notFound()

  if (!wheel.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-2xl font-bold text-gray-500">
          {wheel.locale === 'en' ? 'This campaign has ended.' : 'Šī kampaņa ir beigusies.'}
        </p>
      </div>
    )
  }

  const [{ data: segments }, { data: formFields }] = await Promise.all([
    admin
      .from('wheel_segments')
      .select('id, label, color, sort_order')
      .eq('wheel_id', wheel.id)
      .eq('active', true)
      .order('sort_order'),
    admin
      .from('wheel_form_fields')
      .select('id, field_type, label, placeholder, required, sort_order')
      .eq('wheel_id', wheel.id)
      .eq('active', true)
      .order('sort_order'),
  ])

  return (
    <WheelPage
      wheel={wheel}
      segments={segments ?? []}
      formFields={formFields ?? []}
      isPopup={mode === 'popup'}
    />
  )
}
