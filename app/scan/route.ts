import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/supabase/admin'

// Static venue QR — redirects to the latest active session's player list
// URL: /scan?venue=<venue_id>
// Printed on venue QR codes; always redirects to current game session

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venue')
  if (!venueId) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const admin = getAdmin()
  const { data } = await admin
    .from('game_sessions')
    .select('id')
    .eq('venue_id', venueId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    // No active session — redirect to homepage or a "no active game" page
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.redirect(new URL(`/g/${data.id}`, req.url))
}
