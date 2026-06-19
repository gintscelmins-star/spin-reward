import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['client_admin', 'agency_admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = getAdmin()

  const { data: wheel } = await admin
    .from('wheels')
    .select('id, total_views, total_leads, total_spins, created_at')
    .eq('slug', slug)
    .single()

  if (!wheel) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Ownership check for client_admin
  if (profile.role === 'client_admin' && profile.venue_id) {
    const { data: ownWheel } = await admin
      .from('wheels')
      .select('id')
      .eq('id', wheel.id)
      .eq('venue_id', profile.venue_id)
      .single()
    if (!ownWheel) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: leads }, { data: segBreakdown }, { data: utmData }] = await Promise.all([
    admin
      .from('leads')
      .select('id, created_at')
      .eq('wheel_id', wheel.id)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at'),
    admin
      .from('leads')
      .select('segment_id, wheel_segments(label)')
      .eq('wheel_id', wheel.id),
    admin
      .from('leads')
      .select('utm_source, utm_medium')
      .eq('wheel_id', wheel.id),
  ])

  // Daily leads (last 30 days)
  const dailyMap: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    dailyMap[d.toISOString().slice(0, 10)] = 0
  }
  for (const l of leads ?? []) {
    const day = l.created_at.slice(0, 10)
    if (day in dailyMap) dailyMap[day] = (dailyMap[day] ?? 0) + 1
  }
  const daily_leads = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  // Segment breakdown
  const segMap: Record<string, number> = {}
  for (const l of segBreakdown ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const label = (l.wheel_segments as any)?.label ?? 'Unknown'
    segMap[label] = (segMap[label] ?? 0) + 1
  }
  const segment_breakdown = Object.entries(segMap)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count]) => ({ label, count }))

  // UTM sources
  const utmMap: Record<string, { count: number; medium: string }> = {}
  for (const l of utmData ?? []) {
    const key = `${l.utm_source ?? '(direct)'}|${l.utm_medium ?? '(none)'}`
    if (!utmMap[key]) utmMap[key] = { count: 0, medium: l.utm_medium ?? '(none)' }
    utmMap[key].count++
  }
  const utm_sources = Object.entries(utmMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([key, v]) => ({
      source: key.split('|')[0],
      medium: v.medium,
      leads: v.count,
    }))

  const daysSinceCreated = Math.max(
    1,
    Math.floor((Date.now() - new Date(wheel.created_at).getTime()) / (24 * 60 * 60 * 1000))
  )

  return NextResponse.json({
    totals: {
      total_views: wheel.total_views ?? 0,
      total_leads: wheel.total_leads ?? 0,
      conversion_pct: wheel.total_views
        ? Math.round(((wheel.total_leads ?? 0) / wheel.total_views) * 100 * 10) / 10
        : 0,
      active_days: daysSinceCreated,
    },
    daily_leads,
    segment_breakdown,
    utm_sources,
  })
}
