/**
 * I – V2 Onboarding
 * Tests the self-onboarding chain (register → createVenue → savePrizes → completeOnboarding)
 * by simulating the identical DB operations that each server action performs.
 * Server actions cannot be imported directly in Vitest (they require Next.js context and
 * call redirect() which throws), so we reproduce the same inserts with the same field/value
 * constraints to catch constraint violations and logic bugs.
 */
import { describe, it, expect, afterAll } from 'vitest'
import { serviceClient } from './helpers'

const created: { venueIds: string[]; userIds: string[] } = { venueIds: [], userIds: [] }

afterAll(async () => {
  const svc = serviceClient()
  if (created.venueIds.length) {
    await svc.from('venues').delete().in('id', created.venueIds)
  }
  for (const uid of created.userIds) {
    await svc.auth.admin.deleteUser(uid)
  }
  await svc.from('registration_attempts').delete().like('email', '%-onboarding-test-%')
})

describe('I – V2 Onboarding', () => {
  it('I1 full chain: venue plan=free, billing_status=trial, venue_type set, prizes, wheel with valid prize_type segments, onboarding_completed=true', async () => {
    const svc = serviceClient()
    const ts = Date.now()
    const email = `${ts}-onboarding-test@spinreward-test.invalid`

    // Step 1: register user (mirrors app/register/actions.ts)
    const { data: authData, error: authErr } = await svc.auth.admin.createUser({
      email, password: 'TestPass123!', email_confirm: true,
    })
    expect(authErr).toBeNull()
    created.userIds.push(authData!.user!.id)

    await svc.from('profiles').upsert({
      id: authData!.user!.id, role: 'client_admin', full_name: 'Test Onboarding User',
    }, { onConflict: 'id' })

    // Step 2: createVenue (mirrors app/onboarding/venue/actions.ts)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: venue, error: venueErr } = await svc.from('venues').insert({
      name: `I1 Onboarding Test ${ts}`,
      slug: `i1-onboard-${ts}`,
      venue_type: 'restaurant',
      plan: 'free',
      billing_status: 'trial',
      trial_ends_at: trialEndsAt,
      active: true,
    }).select('id, plan, billing_status, venue_type').single()
    expect(venueErr).toBeNull()
    expect(venue!.plan).toBe('free')
    expect(venue!.billing_status).toBe('trial')
    expect(venue!.venue_type).toBe('restaurant')
    created.venueIds.push(venue!.id)

    await svc.from('profiles').update({ venue_id: venue!.id }).eq('id', authData!.user!.id)

    // Step 3: savePrizes (mirrors app/onboarding/prizes/actions.ts)
    const { data: prizes, error: prizeErr } = await svc.from('prizes').insert([
      { venue_id: venue!.id, name: 'I1 Prize Alpha', probability_weight: 70, active: true, expires_days: 30 },
      { venue_id: venue!.id, name: 'I1 Prize Beta', probability_weight: 30, active: true, expires_days: 30 },
    ]).select('id, probability_weight')
    expect(prizeErr).toBeNull()
    expect(prizes!.length).toBe(2)

    // Step 4: completeOnboarding (mirrors app/onboarding/wheel/actions.ts)
    const { data: wheel, error: wheelErr } = await svc.from('wheels').insert({
      venue_id: venue!.id,
      name: `I1 Test Wheel ${ts}`,
      slug: `i1-wheel-${ts}`,
      type: 'web_widget',
      locale: 'lv',
      style_theme: 'light',
      brand_color: '#7C3AED',
      trigger_type: 'direct_link',
      display_type: 'popup',
      show_powered_by: true,
      one_spin_per_email: false,
      active: true,
    }).select('id').single()
    expect(wheelErr).toBeNull()

    const SEGMENT_COLORS = ['#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95']
    const segments = prizes!.map((p, i) => ({
      wheel_id: wheel!.id,
      label: p.id,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      prize_type: 'gift' as const,
      probability_weight: p.probability_weight,
      expires_days: 30,
      active: true,
      auto_code: false,
    }))
    const { error: segErr } = await svc.from('wheel_segments').insert(segments)
    expect(segErr).toBeNull()

    // Mark onboarded (mirrors completeOnboarding update)
    const { error: updateErr } = await svc.from('venues').update({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    }).eq('id', venue!.id)
    expect(updateErr).toBeNull()

    // Verify final state
    const { data: finalVenue } = await svc
      .from('venues')
      .select('plan, billing_status, onboarding_completed')
      .eq('id', venue!.id).single()
    expect(finalVenue!.plan).toBe('free')
    expect(finalVenue!.billing_status).toBe('trial')
    expect(finalVenue!.onboarding_completed).toBe(true)

    // Verify segment prize_type is within DB constraint
    const validTypes = ['discount_pct', 'discount_eur', 'free_product', 'gift', 'retry', 'custom']
    const { data: segs } = await svc.from('wheel_segments').select('prize_type').eq('wheel_id', wheel!.id)
    for (const s of segs!) {
      expect(validTypes).toContain(s.prize_type)
    }
  })

  it('I2 rate-limit: 3 registration attempts within 1h → 4th would be blocked (count >= 3)', async () => {
    const svc = serviceClient()
    const ts = Date.now()
    const email = `${ts}-onboarding-test-ratelimit@spinreward-test.invalid`

    // Insert 3 attempts (same as registerUser action does after each attempt)
    const { error: insErr } = await svc.from('registration_attempts').insert([
      { email },
      { email },
      { email },
    ])
    expect(insErr).toBeNull()

    // Simulate the rate-limit check from app/register/actions.ts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await svc
      .from('registration_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', oneHourAgo)

    // Per register/actions.ts: (count ?? 0) >= 3 → blocked
    expect((count ?? 0) >= 3, `Expected count >= 3, got ${count}`).toBe(true)

    // Cleanup
    await svc.from('registration_attempts').delete().eq('email', email)
  })
})
