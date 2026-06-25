import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

export default async function globalSetup() {
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const ts = Date.now()

  // ── V1 fixture: venue + staff + session + spin ────────────────────────────
  const { data: venue } = await svc.from('venues').insert({
    name: `E2E Venue ${ts}`, slug: `e2e-${ts}`,
    active: true, uses_sessions: true, default_locale: 'lv',
  }).select('id, slug').single()

  await svc.from('prizes').insert([
    { venue_id: venue!.id, name: 'E2E Prize A', probability_weight: 60, active: true, expires_days: 30 },
    { venue_id: venue!.id, name: 'E2E Prize B', probability_weight: 40, active: true, expires_days: 30 },
  ])

  const { data: staff } = await svc.from('staff').insert({
    venue_id: venue!.id, name: 'E2E Staff', active: true,
  }).select('id').single()

  const { data: booking } = await svc.from('bookings').insert({
    venue_id: venue!.id,
    customer_name: 'Testa Klients',
    customer_phone: '+37120000099',
    source: 'manual',
  }).select('id').single()

  const { data: session } = await svc.from('sessions').insert({
    venue_id: venue!.id,
    staff_id: staff!.id,
    booking_id: booking!.id,
    status: 'active',
  }).select('id').single()

  const { data: prize } = await svc.from('prizes').select('id').eq('venue_id', venue!.id).limit(1).single()
  const { data: spin } = await svc.from('spins').insert({
    venue_id: venue!.id,
    prize_id: prize!.id,
    status: 'active',
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  }).select('id, qr_token').single()

  // ── V2 fixture: embedded widget wheel + segments ──────────────────────────
  const wheelSlug = `e2e-wheel-${ts}`
  const { data: wheel } = await svc.from('wheels').insert({
    venue_id: venue!.id,
    name: `E2E Widget ${ts}`,
    slug: wheelSlug,
    type: 'web_widget',
    locale: 'lv',
    style_theme: 'light',
    brand_color: '#7C3AED',
    trigger_type: 'direct_link',
    display_type: 'popup',
    show_powered_by: true,
    one_spin_per_email: true,
    active: true,
  }).select('id, slug').single()

  await svc.from('wheel_segments').insert([
    {
      wheel_id: wheel!.id, label: 'Atlaide 20%', color: '#6366f1',
      prize_type: 'discount_pct', probability_weight: 70,
      active: true, auto_code: true, expires_days: 30,
    },
    {
      wheel_id: wheel!.id, label: 'Bezmaksas produkts', color: '#ec4899',
      prize_type: 'gift', probability_weight: 30,
      active: true, auto_code: false, expires_days: 30,
    },
  ])

  // Persist IDs for tests
  const ctx = {
    venueId:   venue!.id,
    venueSlug: venue!.slug,
    sessionId: session!.id,
    spinToken: spin!.qr_token,
    spinId:    spin!.id,
    wheelSlug: wheel!.slug,
    wheelId:   wheel!.id,
    ts,
  }
  writeFileSync('tests/e2e/.ctx.json', JSON.stringify(ctx))
  process.env.E2E_CTX = JSON.stringify(ctx)
}
