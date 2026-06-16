import { createPublicClient } from './supabase/public'

export interface GameResult {
  id: string
  session_id: string
  callsign: string
  team: string | null
  top_class: string | null
  rating: number | null
  kd_ratio: number | null
  kd_plusminus: number | null
  accuracy: number | null
  shots_fired: number | null
  hits: number | null
  injuries: number | null
  team_hit_pct: number | null
  share_token: string
  created_at: string
}

export interface SessionPlayer {
  id: string
  callsign: string
  team: string | null
  top_class: string | null
  rating: number | null
  kd_ratio: number | null
  kd_plusminus: number | null
  accuracy: number | null
  shots_fired: number | null
  hits: number | null
  injuries: number | null
  team_hit_pct: number | null
  share_token: string
}

export async function getResult(token: string): Promise<GameResult | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('get_result_by_token', { p_token: token })
  if (error || !data || data.length === 0) return null
  return data[0] as GameResult
}

export async function getSessionResults(sessionId: string): Promise<SessionPlayer[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('get_session_results', { p_session: sessionId })
  if (error || !data) return []
  return data as SessionPlayer[]
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? ''

interface MediaAssets {
  video: string
  poster: string
  label: string
}

export function classMedia(topClass: string | null | undefined): MediaAssets {
  const cls = (topClass ?? '').toUpperCase()
  switch (cls) {
    case 'COMMANDO':
      return {
        video: `${SITE}/auratag/commando1.mp4`,
        poster: `${SITE}/auratag/commando pict.jpg`,
        label: 'COMMANDO',
      }
    case 'SNIPER':
      return {
        video: `${SITE}/auratag/commando1.mp4`,
        poster: `${SITE}/auratag/commando pict.jpg`,
        label: 'SNIPER',
      }
    default:
      return {
        video: `${SITE}/auratag/commando1.mp4`,
        poster: `${SITE}/auratag/commando pict.jpg`,
        label: cls || 'WARRIOR',
      }
  }
}

export function teamLabel(team: string | null): { label: string; color: string } {
  switch ((team ?? '').toLowerCase()) {
    case 'red':    return { label: 'Sarkanā', color: '#ff4d4d' }
    case 'blue':   return { label: 'Zilā',    color: '#22dcff' }
    default:       return { label: team ?? '—', color: '#aeb6c2' }
  }
}

export function fmt(val: number | null, decimals = 2, suffix = ''): string {
  if (val == null) return '—'
  return val.toFixed(decimals) + suffix
}
