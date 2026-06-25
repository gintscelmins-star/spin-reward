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
    .select('id, name, slug, type, trigger_type, trigger_value, display_type, style_theme, brand_color, show_powered_by, locale, active')
    .eq('slug', slug)
    .single()

  if (!wheel?.active) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (req.headers.get('X-Spillit-Counted') !== '1') {
    admin.rpc('increment_wheel_view', { p_wheel_id: wheel.id }).then(() => {})
  }

  return NextResponse.json(wheel, {
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
