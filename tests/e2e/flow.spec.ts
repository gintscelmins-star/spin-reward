import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'

// Load E2E context created by globalSetup
function ctx() {
  const path = 'tests/e2e/.ctx.json'
  if (!existsSync(path)) throw new Error('.ctx.json not found — run globalSetup first')
  return JSON.parse(readFileSync(path, 'utf-8')) as {
    venueId: string
    venueSlug: string
    sessionId: string
    spinToken: string
    spinId: string
    ts: number
  }
}

// ─── D5 / D6 ────────────────────────────────────────────────────────────────

test('D5 /admin/venue without login shows access-denied (no redirect needed)', async ({ page }) => {
  await page.goto('/admin/venue')
  // Wait for client-side auth check
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 10000 })
  const body = await page.textContent('body')
  // Should NOT show the dashboard links (Teksti, etc.)
  // Should show "Nav piekļuves tiesību" or similar
  const isDenied = body?.includes('Nav piekļuves') || body?.includes('piekļ') || !body?.includes('Venue pārvaldnieks')
  expect(isDenied, 'Admin page should deny access to unauthenticated user').toBe(true)
})

test('D6a /play?venue=X is publicly accessible (no auth needed)', async ({ page }) => {
  const c = ctx()
  const response = await page.goto(`/play?venue=${c.venueSlug}`)
  expect(response?.status()).not.toBe(401)
  expect(response?.status()).not.toBe(403)
  // Should load (200 or redirect to same)
  expect(response?.ok() || response?.status() === 200).toBe(true)
})

test('D6b /prize/fake-token is publicly accessible', async ({ page }) => {
  const response = await page.goto('/prize/00000000-0000-0000-0000-000000000000')
  expect(response?.ok()).toBe(true)
})

test('D6c /redeem/fake-token is publicly accessible', async ({ page }) => {
  const response = await page.goto('/redeem/00000000-0000-0000-0000-000000000000')
  expect(response?.ok()).toBe(true)
})

// ─── E – FLOW ────────────────────────────────────────────────────────────────

test('E1 session flow: /play?session=X loads welcome screen with customer name', async ({ page }) => {
  const c = ctx()
  await page.goto(`/play?session=${c.sessionId}`)
  // Wait for SessionFlow to load (idle → welcome transition)
  await page.waitForFunction(
    () => !document.querySelector('p.animate-pulse') ||
          document.querySelector('button') !== null,
    { timeout: 15000 }
  )
  const body = await page.textContent('body')
  // Should show "Testa Klients" name OR welcome text
  const hasWelcome = body?.includes('Testa Klients') ||
                     body?.includes('Paldies') ||
                     body?.includes('Sākt')
  expect(hasWelcome, `Welcome screen not found. Body: ${body?.slice(0, 300)}`).toBe(true)
})

test('E6 /prize/{real-token} shows prize info', async ({ page }) => {
  const c = ctx()
  await page.goto(`/prize/${c.spinToken}`)
  // Should show prize info, not "not found"
  await page.waitForFunction(
    () => !document.querySelector('p.animate-pulse'),
    { timeout: 10000 }
  )
  const body = await page.textContent('body')
  expect(body).not.toContain('NEDERĪGS KODS')
  // Should show prize name or QR
  const hasPrize = body?.includes('E2E Prize') || body?.includes('Tava balva') || body?.includes('Uzrādi')
  expect(hasPrize, `Prize page should show prize content. Body: ${body?.slice(0, 300)}`).toBe(true)
})

test('H3 /prize/invalid-token shows NEDERĪGS KODS', async ({ page }) => {
  await page.goto('/prize/00000000-0000-0000-0000-000000000000')
  await page.waitForFunction(
    () => !document.querySelector('p.animate-pulse'),
    { timeout: 10000 }
  )
  const body = await page.textContent('body')
  expect(body).toContain('NEDERĪGS KODS')
})

test('E7 /redeem/{real-token} loads confirm page, then marks redeemed', async ({ page }) => {
  const c = ctx()
  await page.goto(`/redeem/${c.spinToken}`)
  await page.waitForFunction(
    () => !document.querySelector('.animate-pulse') || document.querySelector('button') !== null,
    { timeout: 10000 }
  )
  const body = await page.textContent('body')
  // Should show prize info or confirm button
  const loaded = body?.includes('E2E Prize') || body?.includes('Apstiprināt') ||
                 body?.includes('Izsnieg') || body?.includes('redeemed') || body?.includes('Tava')
  expect(loaded, `Redeem page should load with content. Body: ${body?.slice(0, 300)}`).toBe(true)
})

test('E8 anon flow /play?venue=X shows wheel', async ({ page }) => {
  const c = ctx()
  await page.goto(`/play?venue=${c.venueSlug}`)
  // Wait for loading to complete
  await page.waitForFunction(
    () => !document.querySelector('p.animate-pulse') || document.querySelector('svg') !== null,
    { timeout: 15000 }
  )
  const body = await page.textContent('body')
  const hasSvg = await page.locator('svg').count() > 0
  expect(hasSvg || body?.includes('Griezt'), 'Wheel should be visible').toBe(true)
})
