import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'

function ctx() {
  const path = 'tests/e2e/.ctx.json'
  if (!existsSync(path)) throw new Error('.ctx.json not found — run globalSetup first')
  return JSON.parse(readFileSync(path, 'utf-8')) as {
    venueId: string
    venueSlug: string
    sessionId: string
    spinToken: string
    spinId: string
    wheelSlug: string
    wheelId: string
    ts: number
  }
}

test('W1 embedded widget /w/{slug} loads and shows welcome screen', async ({ page }) => {
  const c = ctx()
  await page.goto(`/w/${c.wheelSlug}`)
  await page.waitForFunction(
    () => document.body.textContent!.length > 50,
    { timeout: 15000 }
  )
  const body = await page.textContent('body')
  const hasSvg = (await page.locator('svg').count()) > 0
  const hasContent = hasSvg ||
    body?.includes('Griez') ||
    body?.includes('Spin') ||
    body?.includes('laimē') ||
    body?.includes('email')
  expect(hasContent, `Widget welcome screen not found. Body: ${body?.slice(0, 300)}`).toBe(true)
})

test('W2 embedded widget full spin flow: welcome → form → email → reveal', async ({ page }) => {
  const c = ctx()
  await page.goto(`/w/${c.wheelSlug}`)

  // Phase 1: welcome screen — click the "Griezt ratu" button to open form
  const spinBtn = page.locator('button').filter({ hasText: /Griezt|Spin/i }).first()
  await spinBtn.waitFor({ timeout: 15000 })
  await spinBtn.click()

  // Phase 2: form — fill email and submit
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })
  const uniqueEmail = `widget-flow-${Date.now()}@spinreward-test.invalid`
  await page.fill('input[type="email"]', uniqueEmail)

  const submitBtn = page.locator('button[type="submit"]').first()
  await submitBtn.click()

  // Phase 3: wait for reveal (spin animation + prize display)
  await page.waitForFunction(
    () => {
      const t = document.body.textContent ?? ''
      return t.includes('uzvarēji') || t.includes('Won') ||
             t.includes('Apsveicam') || t.includes('kods') ||
             t.includes('Atlaide') || t.includes('Bezmaksas') ||
             t.includes('Mēģini') || t.includes('Try Again')
    },
    { timeout: 25000 }
  )
  const body = await page.textContent('body')
  expect(body?.length ?? 0).toBeGreaterThan(80)
})

test('W3 POST /api/w/spin creates a lead and returns valid segment', async ({ request }) => {
  const c = ctx()
  const uniqueEmail = `spin-api-${Date.now()}@spinreward-test.invalid`

  const res = await request.post('/api/w/spin', {
    data: { slug: c.wheelSlug, email: uniqueEmail },
  })

  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('segment')
  expect(body).toHaveProperty('segment_index')
  expect(typeof body.segment_index).toBe('number')
  expect(body.segment).toHaveProperty('label')
  expect(body.segment).toHaveProperty('prize_type')
})

test('W4 POST /api/w/spin with one_spin_per_email blocks duplicate (409)', async ({ request }) => {
  const c = ctx()
  const uniqueEmail = `spin-dupe-${Date.now()}@spinreward-test.invalid`

  const r1 = await request.post('/api/w/spin', {
    data: { slug: c.wheelSlug, email: uniqueEmail },
  })
  expect(r1.status()).toBe(200)

  const r2 = await request.post('/api/w/spin', {
    data: { slug: c.wheelSlug, email: uniqueEmail },
  })
  expect(r2.status()).toBe(409)
  const body = await r2.json()
  expect(body.error).toBe('already_spun')
})

test('W5 GET /api/w/{slug} returns public config without total_views', async ({ request }) => {
  const c = ctx()
  const res = await request.get(`/api/w/${c.wheelSlug}`)

  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('slug', c.wheelSlug)
  expect(body).toHaveProperty('active', true)
  expect(body).not.toHaveProperty('total_views')
})
