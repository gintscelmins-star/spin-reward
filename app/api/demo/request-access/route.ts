import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/supabase/admin'
import { sendDemoAccessEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Nepareizs pieprasījuma formāts' }, { status: 400 })
  }

  const email = (body as { email?: string })?.email?.trim()?.toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Nederīga e-pasta adrese' }, { status: 400 })
  }

  const admin = getAdmin()

  // Rate limit: max 3 requests per email per 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('demo_magic_links')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since)

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Pārsniegts pieprasījumu limits — mēģini vēlāk' },
      { status: 429 }
    )
  }

  const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null

  const { error: insertErr } = await admin.from('demo_magic_links').insert({
    email,
    token,
    expires_at: expiresAt,
    ip_address: ip,
  })

  if (insertErr) {
    console.error('[demo/request-access] insert error:', insertErr)
    return NextResponse.json({ error: 'Iekšēja kļūda, mēģini vēlāk' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.spillit.lv'
  const magicLink = `${appUrl}/demo/access?token=${token}`

  await sendDemoAccessEmail(email, magicLink)

  return NextResponse.json({ ok: true })
}
