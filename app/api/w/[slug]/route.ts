import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const admin = getAdmin()

  const { data: wheel } = await admin
    .from('wheels')
    .select('id, name, slug, type, trigger_type, trigger_value, display_type, style_theme, brand_color, show_powered_by, locale, active, total_views')
    .eq('slug', slug)
    .single()

  if (!wheel?.active) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Increment total_views unless the caller already counted this session
  if (req.headers.get('X-Spillit-Counted') !== '1') {
    admin
      .from('wheels')
      .update({ total_views: (wheel.total_views ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', wheel.id)
      .then(() => {})
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { total_views: _tv, ...publicWheel } = wheel
  return NextResponse.json(publicWheel, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
