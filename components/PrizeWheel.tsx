'use client'

import { useEffect, useRef, useState } from 'react'

export interface WheelSegment {
  label: string
  color?: string
}

interface PrizeWheelProps {
  segments: WheelSegment[]
  targetIndex: number   // which segment to land on
  spinning: boolean     // parent flips true to trigger
  onSpinEnd(): void
}

// Alternating red / cream palette
const PALETTE = [
  { fill: '#B91C1C', text: '#FFFFFF' },
  { fill: '#FFF8E7', text: '#7C2D12' },
]

// ---- Web Audio ----

type ACtx = AudioContext

function initAudio(): ACtx | null {
  if (typeof window === 'undefined') return null
  try {
    const Ctor = window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    return new Ctor()
  } catch { return null }
}

function tick(ctx: ACtx, vol: number) {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.value = 650 + Math.random() * 350
    const t = ctx.currentTime
    gain.gain.setValueAtTime(0.18 * vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032)
    osc.start(t); osc.stop(t + 0.032)
  } catch {}
}

function fanfare(ctx: ACtx) {
  try {
    const notes = [523, 659, 784, 1047, 1319]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'triangle'; osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.11
      gain.gain.setValueAtTime(0.22, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      osc.start(t); osc.stop(t + 0.35)
    })
  } catch {}
}

// Tick timestamps (ms) that mimic ease-out acceleration curve
function tickSchedule(): number[] {
  const gaps = [
    180, 155, 130, 110,
    95, 85, 80, 80, 80, 82, 84,
    90, 98, 110, 125, 145,
    170, 205, 255, 330, 440,
    600, 820,
  ]
  const out: number[] = []
  let t = 0
  for (const g of gaps) { t += g; if (t < 3900) out.push(t) }
  return out
}

function computeLabel(raw: string, n: number): { lines: string[]; fontSize: number } {
  const arcPx = Math.PI * (R + r) / n  // full tangential arc at mid-radius
  // Scale font up for fewer segments, floor at 11px
  const fontSize = Math.max(11, Math.min(18, Math.round(88 / n)))
  const maxC = Math.max(5, Math.floor(arcPx / (fontSize * 0.58)))

  const words = raw.split(' ')
  const lines: string[] = []
  let cur = ''
  let complete = true

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (lines.length >= 2) { complete = false; break }
    const next = cur ? `${cur} ${word}` : word
    if (next.length <= maxC) {
      cur = next
    } else {
      if (cur) { lines.push(cur); cur = word.length <= maxC ? word : word.slice(0, maxC - 1) + '…' }
      else { cur = word.slice(0, maxC - 1) + '…'; complete = false }
    }
  }
  if (cur && lines.length < 2) lines.push(cur)
  if (lines.length === 0) lines.push(raw.slice(0, maxC - 1) + '…')

  // Mark last line with ellipsis if content was cut off
  if (!complete && !lines[lines.length - 1].endsWith('…')) {
    const last = lines[lines.length - 1]
    lines[lines.length - 1] = last.length < maxC ? last + '…' : last.slice(0, maxC - 1) + '…'
  }

  return { lines, fontSize }
}

// SVG geometry constants
const C = 160, R = 136, r = 32

export default function PrizeWheel({
  segments, targetIndex, spinning, onSpinEnd,
}: PrizeWheelProps) {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const audioRef   = useRef<ACtx | null>(null)
  const timersRef  = useRef<ReturnType<typeof setTimeout>[]>([])
  const cbRef = useRef(onSpinEnd)
  useEffect(() => { cbRef.current = onSpinEnd }, [onSpinEnd])

  const [muted,     setMuted]     = useState(false)
  const [rotation,  setRotation]  = useState(0)
  const [animating, setAnimating] = useState(false)
  const rotRef = useRef(0)   // track actual degrees to avoid backwards jumps

  const n    = segments.length || 8
  const step = (2 * Math.PI) / n

  // Unlock AudioContext on first user touch/click
  useEffect(() => {
    function unlock() {
      if (!audioRef.current) audioRef.current = initAudio()
      audioRef.current?.resume?.()
    }
    document.addEventListener('click',      unlock)
    document.addEventListener('touchstart', unlock, { passive: true })
    return () => {
      document.removeEventListener('click',      unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  // Trigger animation when spinning becomes true
  useEffect(() => {
    if (!spinning || targetIndex < 0) return

    const segCenter = targetIndex * (360 / n) + 360 / (2 * n)
    const landing   = (360 - segCenter + 360) % 360
    // Always add 5 full turns on top of current normalized angle
    const base = rotRef.current % 360
    const total = rotRef.current - base + 5 * 360 + landing
    rotRef.current = total

    const timers: ReturnType<typeof setTimeout>[] = []

    // Defer state update to avoid synchronous setState in effect body
    timers.push(setTimeout(() => setAnimating(true), 0))

    // Schedule ticks
    const times = tickSchedule()
    times.forEach((ms, i) => {
      timers.push(setTimeout(() => {
        if (!muted && audioRef.current?.state === 'running') {
          tick(audioRef.current, i > times.length * 0.75 ? 0.5 : 1.0)
        }
      }, ms))
    })

    timers.push(setTimeout(() => setRotation(total), 50))

    timersRef.current = timers
    return () => { timers.forEach(clearTimeout); timersRef.current = [] }
  // spinning/targetIndex are the only meaningful triggers; other deps stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, targetIndex])

  // transitionend → fire fanfare + callback
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !animating) return
    function done() {
      setAnimating(false)
      if (!muted && audioRef.current?.state === 'running') fanfare(audioRef.current)
      cbRef.current()
    }
    el.addEventListener('transitionend', done, { once: true })
    return () => el.removeEventListener('transitionend', done)
  }, [animating, muted])

  // ---- SVG geometry ----
  const segPaths = Array.from({ length: n }, (_, i) => {
    const a1 = i * step - Math.PI / 2
    const a2 = a1 + step
    const large = step > Math.PI ? 1 : 0
    const d = [
      `M${(C + r * Math.cos(a1)).toFixed(2)},${(C + r * Math.sin(a1)).toFixed(2)}`,
      `L${(C + R * Math.cos(a1)).toFixed(2)},${(C + R * Math.sin(a1)).toFixed(2)}`,
      `A${R},${R},0,${large},1,${(C + R * Math.cos(a2)).toFixed(2)},${(C + R * Math.sin(a2)).toFixed(2)}`,
      `L${(C + r * Math.cos(a2)).toFixed(2)},${(C + r * Math.sin(a2)).toFixed(2)}`,
      `A${r},${r},0,${large},0,${(C + r * Math.cos(a1)).toFixed(2)},${(C + r * Math.sin(a1)).toFixed(2)}Z`,
    ].join('')
    const am = a1 + step / 2
    const tr = (R + r) / 2
    const src = segments[i]
    const col = src?.color
      ? { fill: src.color, text: '#FFFFFF' }
      : PALETTE[i % 2]
    const { lines, fontSize } = computeLabel(src?.label ?? `#${i + 1}`, n)
    return {
      d,
      fill:      col.fill,
      textColor: col.text,
      tx:    C + tr * Math.cos(am),
      ty:    C + tr * Math.sin(am),
      tdeg:  am * (180 / Math.PI) + 90,
      lines,
      fontSize,
    }
  })

  // 16 decorative dots on the outer frame
  const dots = Array.from({ length: 16 }, (_, i) => {
    const a = i * (2 * Math.PI / 16) - Math.PI / 2
    return { x: C + 152 * Math.cos(a), y: C + 152 * Math.sin(a) }
  })

  return (
    <div className="relative flex flex-col items-center select-none">
      <div className="relative w-[320px] h-[320px]">

        {/* === Rotating wheel === */}
        <div
          ref={wrapRef}
          className="absolute inset-0"
          style={{
            transform:       `rotate(${rotation}deg)`,
            transition:      animating ? 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
            transformOrigin: 'center',
            willChange:      animating ? 'transform' : 'auto',
          }}
        >
          <svg width="320" height="320" viewBox="0 0 320 320">
            <defs>
              <radialGradient id="pw-hub" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#7C3AED" />
                <stop offset="55%"  stopColor="#1a1a2e" />
                <stop offset="100%" stopColor="#0F0F1A" />
              </radialGradient>
            </defs>

            {/* Dark base disc */}
            <circle cx={C} cy={C} r={R + 2} fill="#0D0D18" />

            {/* Segments */}
            {segPaths.map((s, i) => (
              <g key={i}>
                <path
                  d={s.d}
                  fill={s.fill}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                />
                {s.lines.map((line, li) => (
                  <text
                    key={li}
                    x={s.tx}
                    y={s.ty + (li - (s.lines.length - 1) / 2) * (s.fontSize + 3)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={s.fontSize}
                    fontWeight="800"
                    letterSpacing="0.3"
                    fill={s.textColor}
                    transform={`rotate(${s.tdeg},${s.tx},${s.ty})`}
                    style={{ pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}
                  >
                    {line}
                  </text>
                ))}
              </g>
            ))}

            {/* Hub */}
            <circle cx={C} cy={C} r={r}   fill="url(#pw-hub)"           stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
            <circle cx={C} cy={C} r="11"  fill="#0D0D18" />
            <circle cx={C} cy={C} r="4.5" fill="#D4AF37" />
          </svg>
        </div>

        {/* === Static metallic frame (non-rotating) === */}
        <div className="absolute inset-0 pointer-events-none">
          <svg width="320" height="320" viewBox="0 0 320 320">
            <defs>
              <linearGradient id="pw-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="#7A5500" />
                <stop offset="20%"  stopColor="#F5DC6A" />
                <stop offset="50%"  stopColor="#D4AF37" />
                <stop offset="80%"  stopColor="#F5DC6A" />
                <stop offset="100%" stopColor="#7A5500" />
              </linearGradient>
              <filter id="pw-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.8" result="b" />
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Shadow behind ring */}
            <circle cx={C} cy={C} r="148" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="20" />
            {/* Gold ring */}
            <circle cx={C} cy={C} r="143" fill="none" stroke="url(#pw-ring)"    strokeWidth="14" />
            {/* Inner highlight */}
            <circle cx={C} cy={C} r="136" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            {/* Outer edge */}
            <circle cx={C} cy={C} r="150" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {/* Glow dots */}
            {dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="3.5" fill="#FFD700" filter="url(#pw-glow)" />
            ))}
          </svg>
        </div>

        {/* === Pointer arrow at 12 o'clock === */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 pointer-events-none drop-shadow-lg">
          <svg width="26" height="32" viewBox="0 0 26 32">
            <defs>
              <linearGradient id="pw-arrow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#FFF0A0" />
                <stop offset="100%" stopColor="#C8960C" />
              </linearGradient>
            </defs>
            <polygon points="1,0 25,0 13,30" fill="url(#pw-arrow)" />
            <polygon points="1,0 25,0 13,30" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
          </svg>
        </div>

        {/* === Mute toggle === */}
        <button
          onClick={() => setMuted(m => !m)}
          className="absolute bottom-2 right-2 z-20 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-xs transition-colors"
          aria-label={muted ? 'Ieslēgt skaņu' : 'Izslēgt skaņu'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  )
}
