import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Clients ────────────────────────────────────────────────────────────────

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function anonClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function signedInClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn(${email}) failed: ${error.message}`)
  return client
}

// ─── Fixture types ───────────────────────────────────────────────────────────

export interface TestFixtures {
  venueA: { id: string; slug: string }
  venueB: { id: string; slug: string }
  prizeA_heavy: { id: string; name: string }   // weight 70
  prizeA_light: { id: string; name: string }   // weight 30
  prizeA_limited: { id: string; name: string } // remaining=1
  prizeB: { id: string; name: string }
  staffA: { id: string; name: string }
  staffA2: { id: string; name: string }        // 2nd staff — for seat limit test
  adminA: { id: string; email: string; password: string }
  adminB: { id: string; email: string; password: string }
  sessionA: { id: string }                     // active session in venue A
  questionA: { id: string }                    // review question in venue A
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export async function setupFixtures(): Promise<TestFixtures> {
  const svc = serviceClient()
  const ts  = Date.now()

  // Pre-cleanup: remove leftover global test_key rows from aborted previous runs
  await svc.from('copy_strings').delete().like('key', 'test_key_%')

  // ── Venues (seats=3 for A so we can test seat limit separately) ──
  const { data: vA, error: vAErr } = await svc.from('venues').insert({
    name: `Test Venue A ${ts}`,
    slug: `test-a-${ts}`,
    active: true,
    seats: 3,
    uses_sessions: true,
    default_locale: 'lv',
  }).select('id, slug').single()
  if (vAErr) throw new Error(`venueA insert: ${vAErr.message}`)

  const { data: vB, error: vBErr } = await svc.from('venues').insert({
    name: `Test Venue B ${ts}`,
    slug: `test-b-${ts}`,
    active: true,
    seats: 1,
  }).select('id, slug').single()
  if (vBErr) throw new Error(`venueB insert: ${vBErr.message}`)

  // ── Prizes for A ──
  const prizes = await svc.from('prizes').insert([
    { venue_id: vA.id, name: 'Heavy Prize', probability_weight: 70, active: true, expires_days: 30 },
    { venue_id: vA.id, name: 'Light Prize',  probability_weight: 30, active: true, expires_days: 30 },
    { venue_id: vA.id, name: 'Limited Prize', probability_weight: 50, active: true, expires_days: 30, remaining: 1 },
  ]).select('id, name')
  if (prizes.error) throw new Error(`prizes insert: ${prizes.error.message}`)
  const [pHeavy, pLight, pLimited] = prizes.data!

  // ── Prize for B ──
  const { data: pB } = await svc.from('prizes').insert({
    venue_id: vB.id, name: 'Venue B Prize', probability_weight: 100, active: true, expires_days: 30,
  }).select('id, name').single()

  // ── Staff for A (2 staff; venue A has seats=3 so both fit) ──
  const { data: sA } = await svc.from('staff').insert({
    venue_id: vA.id, name: 'Anna', active: true, revolut_link: 'https://revolut.me/test',
  }).select('id, name').single()

  const { data: sA2 } = await svc.from('staff').insert({
    venue_id: vA.id, name: 'Bruno', active: true,
  }).select('id, name').single()

  // ── Review question for A ──
  const { data: qA, error: qErr } = await svc.from('review_questions').insert({
    venue_id: vA.id, label: 'Kā bija?', type: 'stars', sort_order: 1, active: true,
  }).select('id').single()
  if (qErr) throw new Error(`review_questions insert: ${qErr.message}`)

  // ── Copy strings ──
  const { error: csErr } = await svc.from('copy_strings').insert([
    { scope: 'global', venue_id: null, key: `test_key_${ts}`, locale: 'lv', value: 'Globāls LV' },
    { scope: 'global', venue_id: null, key: `test_key_${ts}`, locale: 'en', value: 'Global EN' },
    { scope: 'venue',  venue_id: vA.id, key: `test_key_${ts}`, locale: 'lv', value: 'Venue A LV override' },
  ])
  if (csErr) throw new Error(`copy_strings insert: ${csErr.message}`)

  // ── Auth users ──
  const emailA = `test-a-${ts}@spinreward-test.invalid`
  const emailB = `test-b-${ts}@spinreward-test.invalid`
  const pw = 'TestPass123!'

  const { data: uA } = await svc.auth.admin.createUser({
    email: emailA, password: pw, email_confirm: true,
  })
  const { data: uB } = await svc.auth.admin.createUser({
    email: emailB, password: pw, email_confirm: true,
  })

  // Update profiles (trigger creates them with role='staff')
  await svc.from('profiles').upsert({
    id: uA!.user!.id, role: 'client_admin', venue_id: vA.id, full_name: 'Admin A',
  }, { onConflict: 'id' })
  await svc.from('profiles').upsert({
    id: uB!.user!.id, role: 'client_admin', venue_id: vB.id, full_name: 'Admin B',
  }, { onConflict: 'id' })

  // ── Session for venue A (active) ──
  const { data: sess } = await svc.from('sessions').insert({
    venue_id: vA.id, staff_id: sA!.id, status: 'active',
  }).select('id').single()

  return {
    venueA:       { id: vA.id, slug: vA.slug },
    venueB:       { id: vB.id, slug: vB.slug },
    prizeA_heavy: { id: pHeavy!.id, name: pHeavy!.name },
    prizeA_light: { id: pLight!.id, name: pLight!.name },
    prizeA_limited: { id: pLimited!.id, name: pLimited!.name },
    prizeB:       { id: pB!.id,     name: pB!.name },
    staffA:       { id: sA!.id,     name: sA!.name },
    staffA2:      { id: sA2!.id,    name: sA2!.name },
    adminA:       { id: uA!.user!.id, email: emailA, password: pw },
    adminB:       { id: uB!.user!.id, email: emailB, password: pw },
    sessionA:     { id: sess!.id },
    questionA:    { id: qA!.id },
  }
}

// ─── Teardown ────────────────────────────────────────────────────────────────

export async function teardownFixtures(f: TestFixtures): Promise<void> {
  const svc = serviceClient()
  // Venues cascade-delete: prizes, staff, sessions, bookings, reviews, tips, copy_strings
  await svc.from('venues').delete().in('id', [f.venueA.id, f.venueB.id])
  // Delete global copy_strings test keys (venue_id=null, not cascade-deleted)
  await svc.from('copy_strings').delete().like('key', 'test_key_%')
  // Delete auth users
  await svc.auth.admin.deleteUser(f.adminA.id)
  await svc.auth.admin.deleteUser(f.adminB.id)
}
