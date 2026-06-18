import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Spillit — Klientu iesaiste, atsauksmes un lojalitāte'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1b69 50%, #1e0a3c 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* Rainbow top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 10,
          background: 'linear-gradient(90deg,#FF3B3B,#FF8C00,#FFD700,#00CC44,#00BFFF,#7B2FFF,#FF1493)',
        }}
      />

      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.4) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Logo */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: 'white',
          letterSpacing: '-3px',
          marginBottom: 20,
          lineHeight: 1,
        }}
      >
        Spillit
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 30,
          color: 'rgba(255,255,255,0.75)',
          textAlign: 'center',
          maxWidth: 780,
          lineHeight: 1.45,
          marginBottom: 48,
        }}
      >
        Klientu iesaiste, atsauksmes un lojalitāte
      </div>

      {/* Pills row */}
      <div style={{ display: 'flex', gap: 16 }}>
        {['Spin Reward', 'Darbinieku novērtējums', 'Google atsauksmes'].map(label => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: 18,
              fontWeight: 600,
              padding: '10px 24px',
              borderRadius: 50,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Bottom domain */}
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 20,
          letterSpacing: '0.05em',
        }}
      >
        spillit.lv
      </div>
    </div>,
    { ...size }
  )
}
