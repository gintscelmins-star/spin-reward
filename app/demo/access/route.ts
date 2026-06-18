import { NextRequest, NextResponse } from 'next/server'
import { createDemoToken, COOKIE_NAME } from '@/lib/demo-auth'
import { getAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/demo?error=no_token', request.url))
  }

  const admin = getAdmin()

  const { data: link } = await admin
    .from('demo_magic_links')
    .select('id, email')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('used_at', null)
    .single()

  if (!link) {
    return NextResponse.redirect(new URL('/demo?error=expired', request.url))
  }

  await admin
    .from('demo_magic_links')
    .update({ used_at: new Date().toISOString() })
    .eq('id', link.id)

  const sessionToken = await createDemoToken(link.email)
  const response = NextResponse.redirect(new URL('/demo/dashboard', request.url))

  response.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  })

  return response
}
