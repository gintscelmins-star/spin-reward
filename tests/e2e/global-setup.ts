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

  // Create a minimal venue + staff + session for E2E tests
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

  // Create booking with phone for session
  const { data: booking } = await svc.from('bookings').insert({
    venue_id: venue!.id,
    customer_name: 'Testa Klients',
    customer_phone: '+37120000099',
    source: 'manual',
  }).select('id').single()

  // Create active session
  const { data: session } = await svc.from('sessions').insert({
    venue_id: venue!.id,
    staff_id: staff!.id,
    booking_id: booking!.id,
    status: 'active',
  }).select('id').single()

  // Create active spin for /prize + /redeem tests
  const { data: prize } = await svc.from('prizes').select('id').eq('venue_id', venue!.id).limit(1).single()
  const { data: spin } = await svc.from('spins').insert({
    venue_id: venue!.id,
    prize_id: prize!.id,
    status: 'active',
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  }).select('id, qr_token').single()

  // Persist IDs for tests to read
  const ctx = {
    venueId:   venue!.id,
    venueSlug: venue!.slug,
    sessionId: session!.id,
    spinToken: spin!.qr_token,
    spinId:    spin!.id,
    ts,
  }
  writeFileSync('tests/e2e/.ctx.json', JSON.stringify(ctx))
  process.env.E2E_CTX = JSON.stringify(ctx)
}
