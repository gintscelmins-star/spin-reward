import React from 'react'
import { AbsoluteFill, OffthreadVideo } from 'remotion'
import { z } from 'zod'

export const schema = z.object({
  cls: z.string().default('commando'),
  callsign: z.string().default('CALLSIGN'),
  kd: z.string().default('1.00'),
  accuracy: z.string().default('10%'),
  shots: z.string().default('1000'),
  team: z.enum(['red', 'blue']).default('red'),
  templateUrl: z.string(),
})

const CYAN = '#22dcff'

interface StatPanelProps {
  x: number
  y: number
  w: number
  h: number
  label: string
  value: string
}

function StatPanel({ x, y, w, h, label, value }: StatPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 16px',
        background: 'linear-gradient(180deg,#2b3038,#171a1f)',
        border: '1px solid #05070a',
        borderRadius: 10,
        boxShadow:
          'inset 0 2px 0 rgba(255,255,255,.12), inset 0 -3px 6px rgba(0,0,0,.6)',
      }}
    >
      <span
        style={{
          fontFamily: 'Chakra Petch, sans-serif',
          fontSize: 22,
          color: '#cfe9ff',
          letterSpacing: 1,
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 800,
          fontSize: 40,
          color: CYAN,
          textShadow: `0 0 10px ${CYAN}99`,
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
    </div>
  )
}

export const CommandoCard: React.FC<z.infer<typeof schema>> = (p) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Fonts via Google Fonts in headless Chrome */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&family=Orbitron:wght@700;800;900&display=swap');
      `}</style>

      {/* Template video background */}
      <OffthreadVideo src={p.templateUrl} muted />

      {/* Stat panels — coordinates match 720×1280 safe-zone spec */}
      <StatPanel x={40} y={470} w={210} h={90}  label="KD"             value={p.kd} />
      <StatPanel x={40} y={575} w={210} h={90}  label="Precizitāte"    value={p.accuracy} />
      <StatPanel x={40} y={680} w={210} h={110} label="Izšautās lodes" value={p.shots} />

      {/* Callsign nameplate */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 1120,
          width: 480,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: 4,
          color: '#dfe9f2',
          textShadow: '0 0 12px rgba(120,200,255,.4)',
        }}
      >
        {p.callsign}
      </div>
    </AbsoluteFill>
  )
}
