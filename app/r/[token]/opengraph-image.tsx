import { ImageResponse } from 'next/og'
import { getResult, teamLabel, fmt } from '@/lib/result'

export const alt = 'GUNSnLASERS rezultāts'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await getResult(token)

  const callsign = result?.callsign ?? '???'
  const topClass = result?.top_class ?? 'WARRIOR'
  const team = teamLabel(result?.team ?? null)
  const rating = fmt(result?.rating ?? null)
  const kd = fmt(result?.kd_ratio ?? null)
  const acc = fmt(result?.accuracy ?? null, 2, '%')

  const CYAN = '#22dcff'
  const GOLD = '#ffc63d'
  const BG = '#07080e'
  const CARD = '#0c0e17'
  const LINE = 'rgba(34,220,255,.22)'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: BG,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Corner glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 400, height: 400,
          background: 'radial-gradient(circle,rgba(34,220,255,.12) 0%,transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: 0, width: 300, height: 300,
          background: 'radial-gradient(circle,rgba(109,73,230,.15) 0%,transparent 70%)',
          display: 'flex',
        }} />

        {/* Main card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          background: CARD,
          border: `1px solid ${LINE}`,
          borderRadius: 24,
          padding: '48px 56px',
          width: '100%',
          maxWidth: 1000,
          gap: 32,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: CYAN,
              boxShadow: `0 0 12px ${CYAN}`,
            }} />
            <span style={{
              fontSize: 52, fontWeight: 900,
              color: '#e8edf3',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {callsign}
            </span>
            <span style={{
              fontSize: 16, fontWeight: 700,
              color: GOLD,
              background: 'rgba(255,198,61,.12)',
              border: '1px solid rgba(255,198,61,.3)',
              borderRadius: 20,
              padding: '5px 14px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginLeft: 8,
            }}>
              {topClass}
            </span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 48, width: '100%' }}>
            {[
              { label: 'Komanda', value: team.label, color: team.color },
              { label: 'Reitings', value: rating, color: CYAN },
              { label: 'K:D ratio', value: kd, color: (result?.kd_ratio ?? 0) >= 1 ? '#4ade80' : '#ff4d4d' },
              { label: 'Precizitāte', value: acc, color: '#e8edf3' },
            ].map(stat => (
              <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#7a8699', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {stat.label}
                </span>
                <span style={{ fontSize: 32, fontWeight: 800, color: stat.color, letterSpacing: '0.02em' }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: CYAN, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              GUNSnLASERS
            </span>
            <span style={{ fontSize: 13, color: '#4a5568' }}>·</span>
            <span style={{ fontSize: 14, color: '#7a8699' }}>Apmeklē saiti, lai redzētu pilnu video</span>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
