import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/supabase/admin'

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function pickWeightedIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

export async function POST(req: NextRequest) {
  let body: {
    slug: string
    email: string
    name?: string
    phone?: string
    form_data?: Record<string, string>
    gdpr_consent?: boolean
    locale?: string
    trigger_type?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    referrer_url?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { slug, email } = body
  if (!slug || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  const admin = getAdmin()

  const { data: wheel } = await admin
    .from('wheels')
    .select('id, venue_id, active, one_spin_per_email, locale')
    .eq('slug', slug)
    .single()

  if (!wheel?.active) {
    return NextResponse.json({ error: 'wheel_not_found' }, { status: 404 })
  }

  if (wheel.one_spin_per_email) {
    const { data: existing } = await admin
      .from('leads')
      .select('id')
      .eq('wheel_id', wheel.id)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'already_spun' }, { status: 409 })
    }
  }

  const { data: allSegments } = await admin
    .from('wheel_segments')
    .select('id, label, color, prize_type, prize_value, prize_description, prize_code, auto_code, probability_weight, remaining')
    .eq('wheel_id', wheel.id)
    .eq('active', true)
    .order('sort_order')

  if (!allSegments || allSegments.length === 0) {
    return NextResponse.json({ error: 'no_segments' }, { status: 422 })
  }

  const available = allSegments.filter(s => s.remaining === null || (s.remaining ?? 0) > 0)
  if (available.length === 0) {
    return NextResponse.json({ error: 'out_of_stock' }, { status: 422 })
  }

  const winnerIdx = pickWeightedIndex(available.map(s => s.probability_weight ?? 0))
  const winner = available[winnerIdx]
  const prize_code = winner.auto_code ? generateCode(8) : (winner.prize_code ?? null)

  const { error: insertError } = await admin.from('leads').insert({
    wheel_id: wheel.id,
    venue_id: wheel.venue_id,
    segment_id: winner.id,
    email: email.toLowerCase().trim(),
    name: body.name?.trim() || null,
    phone: body.phone?.trim() || null,
    form_data: body.form_data ?? {},
    prize_code,
    locale: body.locale ?? wheel.locale ?? 'lv',
    trigger_type: body.trigger_type ?? null,
    utm_source: body.utm_source ?? null,
    utm_medium: body.utm_medium ?? null,
    utm_campaign: body.utm_campaign ?? null,
    referrer_url: body.referrer_url ?? null,
    gdpr_consent: body.gdpr_consent ?? false,
    gdpr_consent_at: body.gdpr_consent ? new Date().toISOString() : null,
  })

  if (insertError) {
    console.error('[widget/spin] insert error', insertError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  // Atomic stock decrement (fire and forget)
  if (winner.remaining !== null) {
    admin.rpc('decrement_segment_stock', { p_segment_id: winner.id }).then(() => {})
  }

  // Atomic counter increments (fire and forget)
  admin.rpc('increment_wheel_counters', { p_wheel_id: wheel.id }).then(() => {})

  const displayIndex = allSegments.findIndex(s => s.id === winner.id)

  return NextResponse.json({
    segment: {
      label: winner.label,
      color: winner.color,
      prize_type: winner.prize_type,
      prize_value: winner.prize_value,
      prize_description: winner.prize_description,
    },
    prize_code,
    segment_index: displayIndex >= 0 ? displayIndex : 0,
  })
}
