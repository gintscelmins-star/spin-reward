import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'
import WheelSubNav from '@/components/WheelSubNav'
import PreviewClient from './PreviewClient'

const TRIGGER_LABELS: Record<string, string> = {
  delay:         'Aizkave',
  exit_intent:   'Exit intent',
  scroll_pct:    'Scroll %',
  element_click: 'Pogas klikšķis',
  inline:        'Inline',
  direct_link:   'Tiešā saite',
}

const THEME_LABELS: Record<string, string> = {
  light:   'Gaišs',
  dark:    'Tumšs',
  brand:   'Zīmola krāsa',
  festive: 'Svētku',
}

export default async function PreviewPage({
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
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['client_admin', 'agency_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const admin = getAdmin()

  const { data: wheel } = await admin
    .from('wheels')
    .select('id, name, slug, active, trigger_type, trigger_value, style_theme, brand_color, locale, form_show_name, form_show_phone, one_spin_per_email')
    .eq('id', id)
    .single()

  if (!wheel) redirect('/dashboard/widgets')

  const [{ data: segments }, { data: formFields }] = await Promise.all([
    admin
      .from('wheel_segments')
      .select('id, label, color, probability_weight, active')
      .eq('wheel_id', id)
      .eq('active', true)
      .order('sort_order'),
    admin
      .from('wheel_form_fields')
      .select('id, field_type, label, required, active')
      .eq('wheel_id', id)
      .eq('active', true)
      .order('sort_order'),
  ])

  const activeSegments = segments ?? []
  const activeFields = formFields ?? []
  const totalWeight = activeSegments.reduce((s, seg) => s + (seg.probability_weight ?? 0), 0)

  // Check if there's an email-capable field (wheel always collects email; form_fields are custom)
  // Email is always collected — the warning is if form has no name/phone which might affect lead quality
  const hasEmailField = true // email is always collected in the wheel form
  const hasSegments = activeSegments.length > 0

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.spillit.lv'
  const previewUrl = `${appUrl}/w/${wheel.slug}?mode=popup`

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <WheelSubNav wheelId={id} wheelName={wheel.name} active="preview" />

        <div className="grid md:grid-cols-[2fr_3fr] gap-6">
          {/* LEFT — settings summary */}
          <div className="space-y-4">
            {/* Segments */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Segmenti ({activeSegments.length})
              </h2>
              {activeSegments.length === 0 ? (
                <p className="text-sm text-red-500">Nav aktīvu segmentu</p>
              ) : (
                <ul className="space-y-2">
                  {activeSegments.map(seg => {
                    const pct = totalWeight > 0
                      ? Math.round((seg.probability_weight / totalWeight) * 100)
                      : 0
                    return (
                      <li key={seg.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: seg.color ?? '#6366f1' }}
                        />
                        <span className="flex-1 truncate text-gray-700">{seg.label}</span>
                        <span className="text-gray-400 text-xs">{pct}%</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Form fields */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Forma
              </h2>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> E-pasts (obligāts)
                </li>
                {wheel.form_show_name && (
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Vārds
                  </li>
                )}
                {wheel.form_show_phone && (
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Tālrunis
                  </li>
                )}
                {activeFields.map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <span className="text-purple-500">+</span> {f.label}
                    {f.required && <span className="text-xs text-gray-400">(oblig.)</span>}
                  </li>
                ))}
              </ul>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Iestatījumi
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Triggeris</dt>
                  <dd className="text-gray-700 font-medium">
                    {TRIGGER_LABELS[wheel.trigger_type ?? ''] ?? wheel.trigger_type}
                    {wheel.trigger_value != null && ` (${wheel.trigger_value})`}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Tēma</dt>
                  <dd className="text-gray-700 font-medium">
                    {THEME_LABELS[wheel.style_theme ?? ''] ?? wheel.style_theme}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Krāsa</dt>
                  <dd className="flex items-center gap-1.5">
                    {wheel.brand_color && (
                      <span
                        className="w-4 h-4 rounded-full border border-gray-200 inline-block"
                        style={{ backgroundColor: wheel.brand_color }}
                      />
                    )}
                    <span className="text-gray-700 font-mono text-xs">{wheel.brand_color}</span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Valoda</dt>
                  <dd className="text-gray-700 font-medium uppercase">{wheel.locale}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">1× spin/e-pasts</dt>
                  <dd className="text-gray-700">{wheel.one_spin_per_email ? 'Jā' : 'Nē'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* RIGHT — live preview + publish */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Live preview
            </h2>
            <PreviewClient
              wheelId={id}
              previewUrl={previewUrl}
              isActive={wheel.active}
              hasSegments={hasSegments}
              hasEmailField={hasEmailField}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
