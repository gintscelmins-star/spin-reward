import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'gnl_aid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export async function POST(req: NextRequest) {
  let body: { token?: string; event?: string; network?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const { token, event, network } = body
  if (!token || !event) {
    return NextResponse.json({ error: 'missing token or event' }, { status: 400 })
  }

  const cookieStore = await cookies()
  let anonId = cookieStore.get(COOKIE_NAME)?.value ?? ''

  const res = NextResponse.json({ ok: true })

  if (!anonId) {
    anonId = crypto.randomUUID()
    res.cookies.set(COOKIE_NAME, anonId, {
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }

  const referer = req.headers.get('referer') ?? ''
  const ua = req.headers.get('user-agent') ?? ''

  const admin = getAdmin()

  // Validate the share_token exists to prevent fake event spam
  const { data: valid } = await admin
    .from('game_results')
    .select('share_token')
    .eq('share_token', token)
    .single()
  if (!valid) {
    return NextResponse.json({ error: 'invalid token' }, { status: 404 })
  }

  await admin.from('share_events').insert({
    share_token: token,
    event_type: event,
    network: network ?? null,
    anon_id: anonId,
    referer,
    ua,
  })

  return res
}
