import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false, error: 'no_token' })
  }

  const admin = getAdmin()
  const { data } = await admin
    .from('demo_magic_links')
    .select('id, email, expires_at, used_at')
    .eq('token', token)
    .single()

  if (!data) {
    return NextResponse.json({ valid: false, error: 'not_found' })
  }
  if (data.used_at) {
    return NextResponse.json({ valid: false, error: 'already_used' })
  }
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'expired' })
  }

  return NextResponse.json({ valid: true, email: data.email })
}
