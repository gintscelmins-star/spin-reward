/**
 * J – Super-Admin Venues + Redemptions RPC
 * Tests get_venues_overview(), manual_redeem_spin(), and get_redemptions()
 * using authenticated signedInClient calls (so auth.uid() / auth_role() work).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { serviceClient, signedInClient } from './helpers'

const PW = 'TestPass123!'
let ts: number
let superAdminId = ''
let superAdminEmail = ''
let clientAdminId = ''
let clientAdminEmail = ''
let testVenueId = ''
let testPrizeId = ''
let testSpinToken = ''

beforeAll(async () => {
  ts = Date.now()
  const svc = serviceClient()

  // ── super_admin user ──────────────────────────────────────────────────────
  superAdminEmail = `super-venues-${ts}@spinreward-test.invalid`
  const { data: sa, error: saErr } = await svc.auth.admin.createUser({
    email: superAdminEmail, password: PW, email_confirm: true,
  })
  if (saErr) throw new Error(`createUser super_admin: ${saErr.message}`)
  superAdminId = sa!.user!.id
  await svc.from('profiles').upsert(
    { id: superAdminId, role: 'super_admin', venue_id: null },
    { onConflict: 'id' }
  )

  // ── test venue ────────────────────────────────────────────────────────────
  const { data: venue, error: vErr } = await svc.from('venues').insert({
    name: `Admin Venues Test ${ts}`,
    slug: `admin-venues-${ts}`,
    plan: 'starter',
    billing_status: 'active',
    module_google_enabled: true,
    module_tips_enabled: false,
    module_whatsapp_enabled: false,
    active: true,
  }).select('id').single()
  if (vErr) throw new Error(`venues insert: ${vErr.message}`)
  testVenueId = venue!.id

  // ── client_admin for this venue ───────────────────────────────────────────
  clientAdminEmail = `client-venues-${ts}@spinreward-test.invalid`
  const { data: ca, error: caErr } = await svc.auth.admin.createUser({
    email: clientAdminEmail, password: PW, email_confirm: true,
  })
  if (caErr) throw new Error(`createUser client_admin: ${caErr.message}`)
  clientAdminId = ca!.user!.id
  await svc.from('profiles').upsert(
    { id: clientAdminId, role: 'client_admin', venue_id: testVenueId },
    { onConflict: 'id' }
  )

  // ── prize + spin for redemption tests ────────────────────────────────────
  const { data: prize } = await svc.from('prizes').insert({
    venue_id: testVenueId, name: 'J Redeem Prize', probability_weight: 100,
    active: true, expires_days: 30,
  }).select('id').single()
  testPrizeId = prize!.id

  const { data: spin } = await svc.from('spins').insert({
    venue_id: testVenueId,
    prize_id: testPrizeId,
    status: 'active',
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  }).select('id, qr_token').single()
  testSpinToken = spin!.qr_token
}, 90_000)

afterAll(async () => {
  const svc = serviceClient()
  await svc.from('venues').delete().eq('id', testVenueId)
  await svc.auth.admin.deleteUser(superAdminId)
  await svc.auth.admin.deleteUser(clientAdminId)
}, 30_000)

describe('J – Super-Admin Venues + Redemptions RPC', () => {
  it('J1 get_venues_overview as super_admin returns correct column names (module_google_enabled, billing_status, review_count, spin_count)', async () => {
    const sa = await signedInClient(superAdminEmail, PW)
    const { data, error } = await sa.rpc('get_venues_overview')
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)

    const rows = data as Record<string, unknown>[]
    const row = rows.find(r => r.id === testVenueId)
    expect(row, 'Test venue should appear in overview for super_admin').toBeTruthy()
    expect(Object.keys(row!)).toContain('module_google_enabled')
    expect(Object.keys(row!)).toContain('billing_status')
    expect(Object.keys(row!)).toContain('review_count')
    expect(Object.keys(row!)).toContain('spin_count')
    expect(row!.billing_status).toBe('active')
    expect(row!.module_google_enabled).toBe(true)
  })

  it('J2 get_venues_overview as client_admin returns empty array (auth_role() guard)', async () => {
    const ca = await signedInClient(clientAdminEmail, PW)
    const { data, error } = await ca.rpc('get_venues_overview')
    expect(error).toBeNull()
    const rows = (data as unknown[]) ?? []
    expect(rows.length).toBe(0)
  })

  it('J3 manual_redeem_spin → "redeemed"; second call → "already_redeemed"', async () => {
    const sa = await signedInClient(superAdminEmail, PW)

    const r1 = await sa.rpc('manual_redeem_spin', { p_qr_token: testSpinToken })
    expect(r1.error).toBeNull()
    const res1 = (r1.data as { result: string }[])[0]
    expect(res1.result).toBe('redeemed')

    const r2 = await sa.rpc('manual_redeem_spin', { p_qr_token: testSpinToken })
    expect(r2.error).toBeNull()
    const res2 = (r2.data as { result: string }[])[0]
    expect(res2.result).toBe('already_redeemed')
  })

  it('J4 get_redemptions as super_admin returns spins for the test venue', async () => {
    const svc = serviceClient()

    // Create a fresh spin so there is at least one row to return
    const { data: spin } = await svc.from('spins').insert({
      venue_id: testVenueId,
      prize_id: testPrizeId,
      status: 'active',
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }).select('id').single()

    const sa = await signedInClient(superAdminEmail, PW)
    const { data, error } = await sa.rpc('get_redemptions', { p_venue_id: testVenueId })
    expect(error).toBeNull()

    const rows = (data as { spin_id: string }[]) ?? []
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every(r => typeof r.spin_id === 'string')).toBe(true)

    // Cleanup
    await svc.from('spins').delete().eq('id', spin!.id)
  })
})
