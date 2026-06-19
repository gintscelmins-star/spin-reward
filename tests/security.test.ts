/**
 * A – RLS Isolation
 * B – Anon boundaries + PII
 * C – Spin / redeem integrity
 * D – Role / auth boundaries (D1-D4)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  setupFixtures, teardownFixtures,
  serviceClient, anonClient, signedInClient,
  type TestFixtures,
} from './helpers'

let f: TestFixtures

beforeAll(async () => { f = await setupFixtures() }, 90_000)
afterAll(async ()  => { await teardownFixtures(f)  }, 30_000)

// ═══════════════════════════════════════════════════════════
// A – RLS ISOLATION
// ═══════════════════════════════════════════════════════════
describe('A – RLS Isolation', () => {
  it('A1 client_admin A cannot read venue B prizes', async () => {
    const client = await signedInClient(f.adminA.email, f.adminA.password)
    const { data, error } = await client.from('prizes').select('id').eq('venue_id', f.venueB.id)
    expect(error).toBeNull()
    expect(data?.length).toBe(0)
  })

  it('A2 client_admin A cannot read venue B staff', async () => {
    const client = await signedInClient(f.adminA.email, f.adminA.password)
    const { data } = await client.from('staff').select('id').eq('venue_id', f.venueB.id)
    expect(data?.length).toBe(0)
  })

  it('A3 client_admin A cannot read venue B bookings', async () => {
    const client = await signedInClient(f.adminA.email, f.adminA.password)
    const { data } = await client.from('bookings').select('id').eq('venue_id', f.venueB.id)
    expect(data?.length).toBe(0)
  })

  it('A4 client_admin A cannot read venue B reviews / tips / sessions', async () => {
    const client = await signedInClient(f.adminA.email, f.adminA.password)
    const [reviews, tips, sessions] = await Promise.all([
      client.from('reviews').select('id').eq('venue_id', f.venueB.id),
      client.from('tips').select('id').eq('venue_id', f.venueB.id),
      client.from('sessions').select('id').eq('venue_id', f.venueB.id),
    ])
    expect(reviews.data?.length).toBe(0)
    expect(tips.data?.length).toBe(0)
    expect(sessions.data?.length).toBe(0)
  })

  it('A5 client_admin A cannot delete a venue B prize', async () => {
    const client = await signedInClient(f.adminA.email, f.adminA.password)
    const { error, count } = await client
      .from('prizes')
      .delete({ count: 'exact' })
      .eq('id', f.prizeB.id)
    // Either an error is returned or 0 rows affected (both mean blocked)
    const blocked = !!error || count === 0
    expect(blocked, `Expected delete to be blocked but error=${error?.message}, count=${count}`).toBe(true)
    // Verify prize still exists via service role
    const { data } = await serviceClient().from('prizes').select('id').eq('id', f.prizeB.id).single()
    expect(data).not.toBeNull()
  })

  it('A6 client_admin A cannot insert copy_string for venue B', async () => {
    const client = await signedInClient(f.adminA.email, f.adminA.password)
    const { error } = await client.from('copy_strings').insert({
      scope: 'venue', venue_id: f.venueB.id, key: 'test_rls', locale: 'lv', value: 'hacked',
    })
    // Should be blocked by RLS (error expected)
    expect(error).not.toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════
// B – ANON BOUNDARIES + PII
// ═══════════════════════════════════════════════════════════
describe('B – Anon Boundaries + PII', () => {
  it('B1 anon cannot read prizes table directly (weights hidden)', async () => {
    const { data } = await anonClient().from('prizes').select('id, probability_weight').eq('venue_id', f.venueA.id)
    expect(data?.length ?? 0).toBe(0)
  })

  it('B2 anon cannot read bookings (PII)', async () => {
    const { data } = await anonClient().from('bookings').select('id').eq('venue_id', f.venueA.id)
    expect(data?.length ?? 0).toBe(0)
  })

  it('B3 anon cannot read sessions or profiles', async () => {
    const [sessions, profiles] = await Promise.all([
      anonClient().from('sessions').select('id').eq('venue_id', f.venueA.id),
      anonClient().from('profiles').select('id'),
    ])
    expect(sessions.data?.length ?? 0).toBe(0)
    expect(profiles.data?.length ?? 0).toBe(0)
  })

  it('B4 get_session_context does NOT expose customer_phone (PII check)', async () => {
    // Create booking with phone, link to session
    const svc = serviceClient()
    const { data: booking } = await svc.from('bookings').insert({
      venue_id: f.venueA.id,
      customer_name: 'Jānis Bērziņš',
      customer_phone: '+37120000001',
      source: 'manual',
    }).select('id').single()

    const { data: sess } = await svc.from('sessions').insert({
      venue_id: f.venueA.id,
      staff_id: f.staffA.id,
      booking_id: booking!.id,
      status: 'active',
    }).select('id').single()

    const { data, error } = await anonClient().rpc('get_session_context', { p_session_id: sess!.id })
    expect(error).toBeNull()
    const row = (data as Record<string, unknown>[] | null)?.[0]
    // customer_name may be returned (for welcome screen), but phone must be absent/null
    if (row) {
      expect(row.customer_phone ?? null, 'customer_phone must NOT be exposed to anon').toBeNull()
    }

    // Cleanup
    await svc.from('sessions').delete().eq('id', sess!.id)
    await svc.from('bookings').delete().eq('id', booking!.id)
  })

  it('B5 get_wheel_prizes returns names but NOT probability_weight', async () => {
    const { data, error } = await anonClient().rpc('get_wheel_prizes', { p_venue_slug: f.venueA.slug })
    expect(error).toBeNull()
    expect((data as unknown[])?.length).toBeGreaterThan(0)
    const row = (data as Record<string, unknown>[])[0]
    expect(Object.keys(row)).not.toContain('probability_weight')
    expect(Object.keys(row)).toContain('name')
  })

  it('B6 get_copy returns resolved texts', async () => {
    const { data, error } = await anonClient().rpc('get_copy', { p_venue_id: f.venueA.id, p_locale: 'lv' })
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('B7 anon can insert review and tip (play flow)', async () => {
    const svc = serviceClient()
    const { data: spin } = await svc.from('spins').insert({
      venue_id: f.venueA.id,
      prize_id: f.prizeA_heavy.id,
      status: 'active',
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }).select('id').single()

    const anon = anonClient()
    // Anon can INSERT reviews (no RETURNING — SELECT RLS blocks return but insert succeeds)
    const { error: rErr } = await anon.from('reviews').insert({
      venue_id: f.venueA.id,
      session_id: f.sessionA.id,
      rating: 5,
      google_redirected: false,
    })
    expect(rErr).toBeNull()

    const { error: tErr } = await anon.from('tips').insert({
      venue_id: f.venueA.id,
      staff_id: f.staffA.id,
      amount_cents: 200,
      currency: 'EUR',
      status: 'pending',
    })
    expect(tErr).toBeNull()

    // Cleanup via service client
    await svc.from('reviews').delete().eq('venue_id', f.venueA.id).eq('rating', 5)
    await svc.from('tips').delete().eq('venue_id', f.venueA.id).eq('amount_cents', 200)
    await svc.from('spins').delete().eq('id', spin!.id)
  })
})

// ═══════════════════════════════════════════════════════════
// C – SPIN / REDEEM INTEGRITY
// ═══════════════════════════════════════════════════════════
describe('C – Spin / Redeem Integrity', () => {
  it('C1 spin_wheel 200× → distribution ≈ 70/30 (±12%)', async () => {
    const anon = anonClient()
    const svc  = serviceClient()
    const counts: Record<string, number> = {}

    // Run 200 spins in batches of 20 to avoid rate limiting
    for (let batch = 0; batch < 10; batch++) {
      await Promise.all(Array.from({ length: 20 }, async () => {
        const sid = crypto.randomUUID()
        const { data } = await anon.rpc('spin_wheel', { p_venue_slug: f.venueA.slug, p_session_id: sid })
        const name = (data as { prize_name?: string }[] | null)?.[0]?.prize_name ?? 'unknown'
        counts[name] = (counts[name] ?? 0) + 1
      }))
    }
    const total  = Object.values(counts).reduce((a, b) => a + b, 0)
    const heavy  = (counts['Heavy Prize'] ?? 0) / total
    const light  = (counts['Light Prize'] ?? 0) / total
    // Limited Prize starts with remaining=1; after 1 spin it's gone.
    // Heavy+Light should together approach 100% after limited is exhausted.
    expect(heavy, `Expected ~0.70 got ${heavy.toFixed(3)}`).toBeGreaterThan(0.58)
    expect(heavy).toBeLessThan(0.82)
    expect(light, `Expected ~0.30 got ${light.toFixed(3)}`).toBeGreaterThan(0.18)
    expect(light).toBeLessThan(0.42)

    // Cleanup spins created by this test
    await svc.from('spins').delete().eq('venue_id', f.venueA.id)
    // Restore limited prize remaining=1
    await svc.from('prizes').update({ remaining: 1 }).eq('id', f.prizeA_limited.id)
  }, 60_000)

  it('C2 spin_wheel_session twice on same session → 2nd is empty', async () => {
    const anon = anonClient()
    const first = await anon.rpc('spin_wheel_session', { p_session_id: f.sessionA.id })
    expect(first.error).toBeNull()
    expect((first.data as unknown[])?.length).toBeGreaterThan(0)

    const second = await anon.rpc('spin_wheel_session', { p_session_id: f.sessionA.id })
    expect(second.error).toBeNull()
    expect((second.data as unknown[])?.length ?? 0).toBe(0)

    // Cleanup spin created
    await serviceClient().from('spins').delete().eq('venue_id', f.venueA.id)
  })

  it('C4 check_spin is idempotent — does NOT change DB status', async () => {
    const svc = serviceClient()
    const { data: spin } = await svc.from('spins').insert({
      venue_id: f.venueA.id,
      prize_id: f.prizeA_heavy.id,
      status: 'active',
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }).select('id, qr_token').single()

    const anon = anonClient()
    const r1 = await anon.rpc('check_spin', { p_qr_token: spin!.qr_token })
    const r2 = await anon.rpc('check_spin', { p_qr_token: spin!.qr_token })
    expect((r1.data as { result: string }[])[0].result).toBe('active')
    expect((r2.data as { result: string }[])[0].result).toBe('active')

    const { data: fresh } = await svc.from('spins').select('status').eq('id', spin!.id).single()
    expect(fresh!.status).toBe('active')

    await svc.from('spins').delete().eq('id', spin!.id)
  })

  it('C5 redeem_spin twice → 2nd returns already_redeemed', async () => {
    const svc = serviceClient()
    const { data: spin } = await svc.from('spins').insert({
      venue_id: f.venueA.id,
      prize_id: f.prizeA_heavy.id,
      status: 'active',
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }).select('id, qr_token').single()

    const anon = anonClient()
    const r1 = await anon.rpc('redeem_spin', { p_qr_token: spin!.qr_token })
    const r2 = await anon.rpc('redeem_spin', { p_qr_token: spin!.qr_token })
    expect((r1.data as { result: string }[])[0].result).toBe('redeemed')
    expect((r2.data as { result: string }[])[0].result).toBe('already_redeemed')

    await svc.from('spins').delete().eq('id', spin!.id)
  })

  it('C6 redeem_spin on expired token → expired', async () => {
    const svc = serviceClient()
    const { data: spin } = await svc.from('spins').insert({
      venue_id: f.venueA.id,
      prize_id: f.prizeA_heavy.id,
      status: 'active',
      expires_at: new Date(Date.now() - 1000).toISOString(), // past
    }).select('id, qr_token').single()

    const { data } = await anonClient().rpc('redeem_spin', { p_qr_token: spin!.qr_token })
    expect((data as { result: string }[])[0].result).toBe('expired')

    await svc.from('spins').delete().eq('id', spin!.id)
  })

  it('C7 spin_wheel on inactive venue → error / no_prizes', async () => {
    // Deactivate venue A temporarily
    const svc = serviceClient()
    await svc.from('venues').update({ active: false }).eq('id', f.venueA.id)
    const { data, error } = await anonClient().rpc('spin_wheel', {
      p_venue_slug: f.venueA.slug,
      p_session_id: crypto.randomUUID(),
    })
    await svc.from('venues').update({ active: true }).eq('id', f.venueA.id)
    // Should return empty result or error
    const empty = !data || (Array.isArray(data) && data.length === 0)
    expect(empty || !!error, 'Expected empty result or error for inactive venue').toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════
// D – ROLE / AUTH BOUNDARIES
// ═══════════════════════════════════════════════════════════
describe('D – Role / Auth Boundaries', () => {
  it('D1 staff profile cannot CRUD venues', async () => {
    const svc = serviceClient()
    // Create a staff auth user
    const ts  = Date.now()
    const { data: staffUser } = await svc.auth.admin.createUser({
      email: `test-staff-${ts}@spinreward-test.invalid`,
      password: 'TestPass123!', email_confirm: true,
    })
    await svc.from('profiles').upsert({
      id: staffUser!.user!.id, role: 'staff', venue_id: f.venueA.id,
    }, { onConflict: 'id' })

    const staffClient = await signedInClient(
      `test-staff-${ts}@spinreward-test.invalid`, 'TestPass123!'
    )
    // RLS silently filters UPDATE (no error, 0 rows) — verify name unchanged
    await staffClient.from('venues').update({ name: 'Hacked' }).eq('id', f.venueA.id)
    const { data: check } = await svc.from('venues').select('name').eq('id', f.venueA.id).single()
    expect(check!.name).not.toBe('Hacked')

    await svc.auth.admin.deleteUser(staffUser!.user!.id)
  })

  it('D2 client_admin cannot update venue seats (super_admin only)', async () => {
    const client = await signedInClient(f.adminA.email, f.adminA.password)
    const { error, count } = await client
      .from('venues')
      .update({ seats: 99 }, { count: 'exact' })
      .eq('id', f.venueA.id)
    // Either blocked by RLS or 0 rows affected
    const blocked = !!error || count === 0
    expect(blocked, `seats update should be blocked (error=${error?.message}, count=${count})`).toBe(true)
  })

  it('D3 adding staff beyond venue seats triggers seat_limit_reached', async () => {
    // venueB has seats=1 and already 0 staff; add 2 → 2nd should fail
    const svc = serviceClient()
    await svc.from('staff').insert({ venue_id: f.venueB.id, name: 'Staff1', active: true })
    const { error } = await svc.from('staff').insert({ venue_id: f.venueB.id, name: 'Staff2', active: true })
    expect(error, 'Expected seat_limit_reached error').not.toBeNull()
    expect(error!.message.toLowerCase()).toContain('seat')
    // Cleanup
    await svc.from('staff').delete().eq('venue_id', f.venueB.id)
  })
})
