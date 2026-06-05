'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'

// ---- Types ----

type Phase = 'idle' | 'review' | 'reveal' | 'tip'
type TipPhase = 'picking' | 'post'

interface Prize {
  id: string
  name: string
  color?: string
}

interface Venue {
  id: string
  name: string
  google_place_id: string | null
}

interface Staff {
  id: string
  name: string
  stripe_tip_link: string
}

interface SpinResult {
  prize_name: string
  qr_token: string
  expires_at: string
}

// ---- Constants ----

const PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
]

// ---- Helpers ----

function getSessionId(): string {
  const KEY = 'sr_sid'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

// ---- WheelSvg sub-component ----

interface WheelSvgProps {
  prizes: Prize[]
  rotation: number
  spinning: boolean
  onSpinEnd(): void
}

function WheelSvg({ prizes, rotation, spinning, onSpinEnd }: WheelSvgProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const n = prizes.length || 8
  const C = 150, R = 135, r = 28
  const step = (2 * Math.PI) / n

  const segments = Array.from({ length: n }, (_, i) => {
    const a1 = i * step - Math.PI / 2
    const a2 = a1 + step
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1)
    const cos2 = Math.cos(a2), sin2 = Math.sin(a2)
    const large = step > Math.PI ? 1 : 0
    const d = [
      `M${C + r * cos1},${C + r * sin1}`,
      `L${C + R * cos1},${C + R * sin1}`,
      `A${R},${R},0,${large},1,${C + R * cos2},${C + R * sin2}`,
      `L${C + r * cos2},${C + r * sin2}`,
      `A${r},${r},0,${large},0,${C + r * cos1},${C + r * sin1}Z`,
    ].join('')
    const am = a1 + step / 2
    const tr = (R + r) / 2
    const raw = prizes[i]?.name ?? `#${i + 1}`
    return {
      d,
      fill: prizes[i]?.color ?? PALETTE[i % PALETTE.length],
      tx: C + tr * Math.cos(am),
      ty: C + tr * Math.sin(am),
      tdeg: am * (180 / Math.PI) + 90,
      label: raw.length > 9 ? raw.slice(0, 9) + '…' : raw,
    }
  })

  useEffect(() => {
    const el = wrapRef.current
    if (!el || !spinning) return
    el.addEventListener('transitionend', onSpinEnd, { once: true })
    return () => el.removeEventListener('transitionend', onSpinEnd)
  }, [spinning, onSpinEnd])

  return (
    <div className="relative flex justify-center select-none">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 -translate-y-0.5">
        <svg width="20" height="24" viewBox="0 0 20 24">
          <polygon points="0,0 20,0 10,24" fill="#1a1a2e" />
        </svg>
      </div>
      {/* Rotating wheel */}
      <div
        ref={wrapRef}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
          transformOrigin: 'center',
          willChange: spinning ? 'transform' : 'auto',
        }}
      >
        <svg
          width="300"
          height="300"
          viewBox="0 0 300 300"
          className="drop-shadow-xl"
        >
          {segments.map((s, i) => (
            <g key={i}>
              <path d={s.d} fill={s.fill} stroke="white" strokeWidth="1.5" />
              <text
                x={s.tx}
                y={s.ty}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fontWeight="700"
                fill="white"
                transform={`rotate(${s.tdeg},${s.tx},${s.ty})`}
                style={{ pointerEvents: 'none' }}
              >
                {s.label}
              </text>
            </g>
          ))}
          <circle cx={C} cy={C} r={r} fill="white" stroke="#e2e8f0" strokeWidth="2" />
          <circle cx={C} cy={C} r="10" fill="#1a1a2e" />
        </svg>
      </div>
    </div>
  )
}

// ---- Stars sub-component ----

function Stars({ value, onChange }: { value: number; onChange(n: number): void }) {
  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className="text-4xl leading-none focus:outline-none"
        >
          <span className={n <= value ? 'text-yellow-400' : 'text-gray-200'}>★</span>
        </button>
      ))}
    </div>
  )
}

// ---- Main component ----

export default function Wheel({ venueSlug }: { venueSlug: string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [loading, setLoading] = useState(true)

  // Data
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [venue, setVenue] = useState<Venue | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])

  // Spin result + review
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  // Wheel animation
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [prizeVisible, setPrizeVisible] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  // Tip state
  const [tipPhase, setTipPhase] = useState<TipPhase>('picking')
  const [showCustom, setShowCustom] = useState(false)
  const [customAmt, setCustomAmt] = useState('')
  const [showGoogle, setShowGoogle] = useState(false)
  const [finished, setFinished] = useState(false)

  const sessionId = useRef('')

  // ---- Mount: load venue, prizes, staff ----
  // Pure async fetch — no setState; all state updates happen in the .then() callback
  const fetchData = useCallback(async () => {
    const { data: v } = await supabase
      .from('venues')
      .select('id, name, google_place_id')
      .eq('slug', venueSlug)
      .single()

    if (!v) {
      // Dev fallback — no Supabase venue found
      return {
        venue: { id: 'dev', name: venueSlug, google_place_id: 'ChIJdev' } as Venue,
        prizes: [
          { id: '1', name: 'Kafija',   color: '#FF6B6B' },
          { id: '2', name: 'Tēja',     color: '#4ECDC4' },
          { id: '3', name: '-10%',     color: '#45B7D1' },
          { id: '4', name: 'Deserts',  color: '#96CEB4' },
          { id: '5', name: 'Kokteiļi', color: '#FFEAA7' },
          { id: '6', name: 'Brokastis',color: '#DDA0DD' },
          { id: '7', name: 'Vēlreiz!', color: '#98D8C8' },
          { id: '8', name: '-50%',     color: '#F7DC6F' },
        ] as Prize[],
        staff: [{ id: '1', name: 'Anna', stripe_tip_link: '#' }] as Staff[],
      }
    }

    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.rpc('get_wheel_prizes', { p_venue_slug: venueSlug }),
      supabase
        .from('staff')
        .select('id, name, stripe_tip_link')
        .eq('venue_id', v.id)
        .eq('active', true),
    ])

    return { venue: v as Venue, prizes: (p ?? []) as Prize[], staff: (s ?? []) as Staff[] }
  }, [venueSlug])

  useEffect(() => {
    sessionId.current = getSessionId()
    fetchData().then(result => {
      setVenue(result.venue)
      setPrizes(result.prizes)
      setStaff(result.staff)
      setLoading(false)
    })
  }, [fetchData])

  // ---- Trigger reveal animation when entering reveal state ----
  // All setState calls deferred to callbacks so they are not synchronous in effect body
  useEffect(() => {
    if (phase !== 'reveal' || !spinResult) return

    if (!prizes.length) {
      const t = setTimeout(() => setPrizeVisible(true), 0)
      return () => clearTimeout(t)
    }

    const idx = Math.max(0, prizes.findIndex(p => p.name === spinResult.prize_name))
    const n = prizes.length
    const segCenter = idx * (360 / n) + 360 / (2 * n)
    const landing = (360 - segCenter + 360) % 360
    const total = 5 * 360 + landing

    const t1 = setTimeout(() => setSpinning(true), 0)
    const t2 = setTimeout(() => setRotation(total), 50)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase, spinResult, prizes])

  // ---- Generate QR when reveal starts ----
  useEffect(() => {
    if (phase !== 'reveal' || !spinResult) return
    const url = `${window.location.origin}/redeem/${spinResult.qr_token}`
    QRCode.toDataURL(url, { width: 220, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } })
      .then(dataUrl => setQrDataUrl(dataUrl))
  }, [phase, spinResult])

  // ---- Handlers ----

  async function handleSpin() {
    if (!venue) return
    const { data } = await supabase.rpc('spin_wheel', {
      p_venue_slug: venueSlug,
      p_session_id: sessionId.current,
    })
    // Dev fallback — RPC not available yet, pick random local prize
    const result: SpinResult = data?.[0] ?? {
      prize_name: prizes[Math.floor(Math.random() * prizes.length)]?.name ?? 'Balva',
      qr_token: crypto.randomUUID().slice(0, 8).toUpperCase(),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }
    setSpinResult(result)
    setPhase('review')
  }

  async function handleReviewSubmit() {
    if (!rating || !venue) return
    setSaving(true)
    const { data } = await supabase
      .from('reviews')
      .insert({
        venue_id: venue.id,
        session_id: sessionId.current,
        rating,
        comment: comment.trim() || null,
        google_redirected: false,
      })
      .select('id')
      .single()
    if (data) setReviewId(data.id)
    setSaving(false)
    setPhase('reveal')
  }

  const handleSpinEnd = useCallback(() => {
    setSpinning(false)
    setPrizeVisible(true)
  }, [])

  function goToTip() {
    if (!staff.length) {
      // No staff — skip tip UI, go straight to post-tip flow
      const eligible = rating >= 4 && !!venue?.google_place_id
      setTipPhase('post')
      setShowGoogle(eligible)
      if (!eligible) setFinished(true)
    }
    setPhase('tip')
  }

  async function handleTip(amountCents: number) {
    if (!venue || !staff[0]) return
    await supabase.from('tips').insert({
      venue_id: venue.id,
      staff_id: staff[0].id,
      amount_cents: amountCents,
      currency: 'EUR',
      status: 'pending',
    })
    window.open(staff[0].stripe_tip_link, '_blank')
    afterTip()
  }

  function afterTip() {
    const eligible = rating >= 4 && !!venue?.google_place_id
    setTipPhase('post')
    setShowGoogle(eligible)
    if (!eligible) setFinished(true)
  }

  async function handleGoogleReview() {
    if (reviewId) {
      await supabase
        .from('reviews')
        .update({ google_redirected: true })
        .eq('id', reviewId)
    }
    window.open(
      `https://search.google.com/local/writereview?placeid=${venue!.google_place_id}`,
      '_blank'
    )
    setFinished(true)
  }

  // ---- Loading ----

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-lg animate-pulse">Ielādē...</p>
      </div>
    )
  }

  // ---- Render ----

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center">
      <div className="w-full max-w-sm px-4 pt-10 pb-8 flex flex-col items-center gap-6">

        {/* ========== IDLE ========== */}
        {phase === 'idle' && (
          <>
            <h1 className="text-2xl font-bold text-gray-800 text-center">
              {venue?.name ?? 'Griez un laimē!'}
            </h1>
            <WheelSvg
              prizes={prizes}
              rotation={rotation}
              spinning={false}
              onSpinEnd={() => {}}
            />
            <button
              onClick={handleSpin}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white text-xl font-extrabold rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              GRIEZT
            </button>
          </>
        )}

        {/* ========== REVIEW ========== */}
        {phase === 'review' && (
          <div className="w-full flex flex-col items-center">
            <div style={{ filter: 'brightness(0.3)', transition: 'filter 0.3s' }}>
              <WheelSvg
                prizes={prizes}
                rotation={rotation}
                spinning={false}
                onSpinEnd={() => {}}
              />
            </div>
            <div className="w-full bg-white rounded-3xl shadow-2xl p-6 -mt-10 z-10">
              <h2 className="text-xl font-bold text-center text-gray-800">
                Novērtē vizīti
              </h2>
              <p className="text-sm text-center text-gray-400 mt-1 mb-5">
                lai atklātu savu balvu
              </p>
              <Stars value={rating} onChange={setRating} />
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Komentārs (nav obligāti)"
                rows={3}
                className="w-full mt-4 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                onClick={handleReviewSubmit}
                disabled={!rating || saving}
                className="mt-4 w-full py-3 bg-purple-600 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
              >
                {saving ? 'Saglabā...' : 'Atklāt balvu'}
              </button>
            </div>
          </div>
        )}

        {/* ========== REVEAL ========== */}
        {phase === 'reveal' && (
          <>
            <WheelSvg
              prizes={prizes}
              rotation={rotation}
              spinning={spinning}
              onSpinEnd={handleSpinEnd}
            />
            {prizeVisible && (
              <div className="w-full bg-white rounded-3xl shadow-xl p-6 text-center">
                <p className="text-sm text-gray-400">Tu ieguvi:</p>
                <p className="text-2xl font-extrabold text-purple-700 mt-1">
                  {spinResult?.prize_name}
                </p>
                {qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt="QR kods"
                    width={220}
                    height={220}
                    unoptimized
                    className="mx-auto mt-4 rounded-xl"
                  />
                ) : (
                  <div className="mx-auto mt-4 w-[220px] h-[220px] bg-gray-100 rounded-xl animate-pulse" />
                )}
                <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                  Uzrādi šo QR pie kases
                  {spinResult?.expires_at && (
                    <> · Derīgs līdz{' '}
                      {new Date(spinResult.expires_at).toLocaleString('lv-LV', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </>
                  )}
                </p>
                <button
                  onClick={goToTip}
                  className="mt-5 w-full py-3 bg-purple-600 text-white font-bold rounded-xl active:scale-95 transition-all"
                >
                  Tālāk
                </button>
              </div>
            )}
          </>
        )}

        {/* ========== TIP ========== */}
        {phase === 'tip' && (
          <>
            {/* Tip picking */}
            {tipPhase === 'picking' && (
              <div className="w-full bg-white rounded-3xl shadow-xl p-6 text-center">
                <p className="text-xl font-bold text-gray-800">
                  Vēlies pateikties {staff[0]?.name}?
                </p>
                <p className="text-sm text-gray-400 mt-1 mb-6">Izvēlies dzeramnaudu</p>

                {!showCustom ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[100, 200, 500].map(cents => (
                      <button
                        key={cents}
                        onClick={() => handleTip(cents)}
                        className="py-4 text-lg font-bold border-2 border-purple-200 rounded-xl hover:bg-purple-50 hover:border-purple-500 active:scale-95 transition-all"
                      >
                        €{cents / 100}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowCustom(true)}
                      className="py-4 text-lg font-bold border-2 border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      Cita
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center border-2 border-purple-200 rounded-xl px-4 py-2">
                      <span className="text-gray-400 font-bold mr-1">€</span>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={customAmt}
                        onChange={e => setCustomAmt(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                        className="flex-1 text-xl font-bold focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const cents = Math.round(parseFloat(customAmt) * 100)
                        if (cents > 0) handleTip(cents)
                      }}
                      disabled={!customAmt || parseFloat(customAmt) <= 0}
                      className="py-3 bg-purple-600 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                    >
                      Apstiprināt
                    </button>
                    <button
                      onClick={() => setShowCustom(false)}
                      className="py-2 text-sm text-gray-400"
                    >
                      Atpakaļ
                    </button>
                  </div>
                )}

                <button
                  onClick={afterTip}
                  className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Izlaist
                </button>
              </div>
            )}

            {/* Google review prompt */}
            {tipPhase === 'post' && !finished && showGoogle && (
              <div className="w-full bg-white rounded-3xl shadow-xl p-6 text-center">
                <p className="text-xl font-bold text-gray-800">Paldies!</p>
                <p className="text-sm text-gray-400 mt-1 mb-6">
                  Tavs viedoklis palīdz citiem atrast labākās vietas
                </p>
                <button
                  onClick={handleGoogleReview}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all"
                >
                  Atstāj atsauksmi Google
                </button>
                <button
                  onClick={() => setFinished(true)}
                  className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Izlaist
                </button>
              </div>
            )}

            {/* End screen */}
            {(finished || (tipPhase === 'post' && !showGoogle)) && (
              <div className="w-full bg-white rounded-3xl shadow-xl p-10 text-center">
                <p className="text-3xl font-extrabold text-gray-800">Uz tikšanos!</p>
                <p className="text-gray-400 mt-2 text-sm">Paldies par apmeklējumu</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
