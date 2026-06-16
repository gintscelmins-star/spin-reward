import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/supabase/admin'
import {
  renderMediaOnLambda,
  getRenderProgress,
  type AwsRegion,
} from '@remotion/lambda/client'

// Allow up to 5 minutes — parallel Lambda renders for a full session
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const REGION = (process.env.REMOTION_AWS_REGION ?? 'eu-central-1') as AwsRegion
const LAMBDA_FN = process.env.REMOTION_LAMBDA_FN ?? ''
const SERVE_URL = process.env.REMOTION_SERVE_URL ?? ''
const STORE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') +
  '/storage/v1/object/public'

async function waitForRender(renderId: string, bucketName: string): Promise<string> {
  for (let i = 0; i < 120; i++) {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      region: REGION,
      functionName: LAMBDA_FN,
    })
    if (progress.fatalErrorEncountered) {
      throw new Error(progress.errors?.[0]?.message ?? 'Render failed')
    }
    if (progress.done) {
      return `https://${bucketName}.s3.${REGION}.amazonaws.com/renders/${renderId}/out.mp4`
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
  throw new Error('Render timeout')
}

async function copyToSupabase(s3Url: string, path: string): Promise<string> {
  const admin = getAdmin()
  const res = await fetch(s3Url)
  if (!res.ok) throw new Error(`S3 fetch failed: ${res.status}`)
  const buffer = await res.arrayBuffer()

  const { error } = await admin.storage
    .from('cards-rendered')
    .upload(path, buffer, { contentType: 'video/mp4', upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = admin.storage.from('cards-rendered').getPublicUrl(path)
  return data.publicUrl
}

async function renderOnePlayer(r: {
  share_token: string
  callsign: string
  kd_ratio: number | null
  accuracy: number | null
  shots_fired: number | null
  top_class: string | null
  team: string | null
}) {
  const admin = getAdmin()

  // Idempotence: skip if already rendered
  const { data: existing } = await admin
    .from('game_results')
    .select('share_video_url')
    .eq('share_token', r.share_token)
    .single()

  if (existing?.share_video_url) return { token: r.share_token, status: 'skipped' }

  const cls = (r.top_class ?? 'commando').toLowerCase()
  const kd = r.kd_ratio != null ? String(r.kd_ratio) : '—'
  const accuracy = r.accuracy != null ? `${r.accuracy.toFixed(1)}%` : '—'
  const shots =
    r.shots_fired != null ? r.shots_fired.toLocaleString('lv-LV') : '—'
  const team = (r.team ?? 'red') as 'red' | 'blue'

  const { renderId, bucketName } = await renderMediaOnLambda({
    region: REGION,
    functionName: LAMBDA_FN,
    serveUrl: SERVE_URL,
    composition: 'commando-card',
    inputProps: {
      cls,
      callsign: r.callsign,
      kd,
      accuracy,
      shots,
      team,
      templateUrl: `${STORE}/card-templates/${cls}.mp4`,
    },
    codec: 'h264',
    privacy: 'public',
  })

  const s3Url = await waitForRender(renderId, bucketName)
  const publicUrl = await copyToSupabase(
    s3Url,
    `${r.share_token}.mp4`,
  )

  await admin
    .from('game_results')
    .update({ share_video_url: publicUrl })
    .eq('share_token', r.share_token)

  return { token: r.share_token, status: 'rendered', url: publicUrl }
}

export async function POST(req: NextRequest) {
  if (!LAMBDA_FN || !SERVE_URL) {
    return NextResponse.json(
      { error: 'REMOTION_LAMBDA_FN or REMOTION_SERVE_URL not configured' },
      { status: 503 },
    )
  }

  let session_id: string
  try {
    const body = await req.json()
    session_id = body.session_id
    if (!session_id) throw new Error('missing session_id')
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const admin = getAdmin()
  const { data: results } = await admin.rpc('get_session_results', {
    p_session: session_id,
  })

  if (!results || results.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  // Fetch full rows (RPC returns limited fields; need kd_ratio etc.)
  const { data: rows } = await admin
    .from('game_results')
    .select(
      'share_token, callsign, kd_ratio, accuracy, shots_fired, top_class, team',
    )
    .in(
      'share_token',
      results.map((r: { share_token: string }) => r.share_token),
    )

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  // Render all players in parallel
  const outcomes = await Promise.allSettled(rows.map(renderOnePlayer))

  const summary = outcomes.map((o, i) => {
    if (o.status === 'fulfilled') {
      const { token: _t, ...rest } = o.value
      return { token: rows[i].share_token, ...rest }
    }
    return { token: rows[i].share_token, status: 'error', error: String(o.reason) }
  })

  return NextResponse.json({ ok: true, count: rows.length, results: summary })
}
