'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'

// Copy strings (LV) — rediģējamie; EN nāk V1.4c
const T = {
  loading:      'Ielādē...',
  invalid:      'Šī sesija jau izmantota vai nederīga',
  welcome_sub:  'Novērtējiet mūs un grieziet laimes ratu ar balvām!',
  start:        'Sākt',
  review_title: 'Kā bija?',
  submit:       'Atklāt balvu',
  saving:       'Saglabā...',
  google_title: 'Paldies!',
  google_sub:   'Tavs viedoklis palīdz citiem atrast labākās vietas',
  google_cta:   'Atstāt atsauksmi Google',
  skip:         'Izlaist',
  you_won:      'Tu ieguvi:',
  valid_until:  'Derīgs līdz',
  show_qr:      'Uzrādi šo QR pie kases',
  next:         'Tālāk',
  tip_sub:      'Izvēlies dzeramnaudu',
  custom:       'Cita',
  confirm:      'Apstiprināt',
  back:         'Atpakaļ',
  bye:          'Uz tikšanos!',
  bye_sub:      'Paldies par apmeklējumu',
  greeting:     (name: string | null) =>
    `Paldies par apmeklējumu${name ? `, ${name}` : ''}!`,
  tip_title:    (name: string) => `Pateikties ${name}?`,
}

type Phase = 'idle' | 'welcome' | 'review' | 'google' | 'spin' | 'reveal' | 'tip'

interface SessionCtx {
  venue_id: string
  venue_slug: string
  venue_name: string
  google_place_id: string | null
  customer_name: string | null
  activity_name: string | null
  staff_name: string | null
  staff_id: string | null
  activity_id: string | null
  revolut_link: string | null
}

interface ReviewQuestion {
  id: string
  question_text: string
  type: 'stars' | 'thumbs'
  sort_order: number
}

interface Prize {
  id: string
  name: string
  color?: string
}

interface SpinResult {
  prize_name: string
  qr_token: string
  expires_at: string
}

const PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
]

// ---- WheelSvg ----

function WheelSvg({ prizes, rotation, spinning, onSpinEnd }: {
  prizes: Prize[]
  rotation: number
  spinning: boolean
  onSpinEnd(): void
}) {
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 -translate-y-0.5">
        <svg width="20" height="24" viewBox="0 0 20 24">
          <polygon points="0,0 20,0 10,24" fill="#1a1a2e" />
        </svg>
      </div>
      <div
        ref={wrapRef}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
          transformOrigin: 'center',
          willChange: spinning ? 'transform' : 'auto',
        }}
      >
        <svg width="300" height="300" viewBox="0 0 300 300" className="drop-shadow-xl">
          {segments.map((s, i) => (
            <g key={i}>
              <path d={s.d} fill={s.fill} stroke="white" strokeWidth="1.5" />
              <text
                x={s.tx} y={s.ty}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fontWeight="700" fill="white"
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

// ---- Stars ----

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

// ---- Thumbs ----

function Thumbs({ value, onChange }: { value: number | null; onChange(n: number): void }) {
  return (
    <div className="flex justify-center gap-8">
      <button
        onClick={() => onChange(5)}
        className={`text-5xl transition-transform active:scale-90 ${value === 5 ? '' : 'opacity-30'}`}
      >
        👍
      </button>
      <button
        onClick={() => onChange(1)}
        className={`text-5xl transition-transform active:scale-90 ${value === 1 ? '' : 'opacity-30'}`}
      >
        👎
      </button>
    </div>
  )
}

// ---- Main ----

export default function SessionFlow({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [ctx, setCtx] = useState<SessionCtx | null>(null)
  const [invalid, setInvalid] = useState(false)

  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [reviewId, setReviewId] = useState<string | null>(null)

  const [prizes, setPrizes] = useState<Prize[]>([])
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const [tipDone, setTipDone] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customAmt, setCustomAmt] = useState('')

  const spinCalled = useRef(false)

  // Mount: load session context, questions, prizes
  useEffect(() => {
    async function init() {
      const { data } = await supabase.rpc('get_session_context', { p_session_id: sessionId })
      const c = (data as SessionCtx[] | null)?.[0]
      if (!c) { setInvalid(true); return }
      setCtx(c)

      const [{ data: qs }, { data: ps }] = await Promise.all([
        supabase
          .from('review_questions')
          .select('id, question_text, type, sort_order')
          .eq('venue_id', c.venue_id)
          .eq('active', true)
          .order('sort_order'),
        supabase.rpc('get_wheel_prizes', { p_venue_slug: c.venue_slug }),
      ])

      setQuestions((qs ?? []) as ReviewQuestion[])
      setPrizes((ps ?? []) as Prize[])
      setPhase('welcome')
    }
    init()
  }, [sessionId])

  // Enter spin: call RPC once (ref guards StrictMode double-invoke)
  useEffect(() => {
    if (phase !== 'spin' || spinCalled.current) return
    spinCalled.current = true
    supabase.rpc('spin_wheel_session', { p_session_id: sessionId }).then(({ data }) => {
      const result: SpinResult = (data as SpinResult[] | null)?.[0] ?? {
        prize_name: prizes[Math.floor(Math.random() * prizes.length)]?.name ?? 'Balva',
        qr_token: crypto.randomUUID().slice(0, 8).toUpperCase(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      }
      setSpinResult(result)
    })
  }, [phase, sessionId, prizes])

  // Start wheel animation once result arrives
  useEffect(() => {
    if (phase !== 'spin' || !spinResult || !prizes.length) return
    const idx = Math.max(0, prizes.findIndex(p => p.name === spinResult.prize_name))
    const n = prizes.length
    const segCenter = idx * (360 / n) + 360 / (2 * n)
    const landing = (360 - segCenter + 360) % 360
    const total = 5 * 360 + landing
    const t1 = setTimeout(() => setSpinning(true), 0)
    const t2 = setTimeout(() => setRotation(total), 50)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase, spinResult, prizes])

  // Generate QR as soon as token is known
  useEffect(() => {
    if (!spinResult) return
    QRCode.toDataURL(
      `${window.location.origin}/redeem/${spinResult.qr_token}`,
      { width: 220, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } }
    ).then(d => setQrDataUrl(d))
  }, [spinResult])

  const handleSpinEnd = useCallback(() => {
    setSpinning(false)
    setPhase('reveal')
  }, [])

  async function handleReviewSubmit() {
    if (!ctx) return
    const answered = questions.filter(q => answers[q.id] != null)
    if (!answered.length) return
    setSaving(true)

    const avg = answered.reduce((s, q) => s + answers[q.id], 0) / answered.length

    const { data: rv } = await supabase
      .from('reviews')
      .insert({
        venue_id: ctx.venue_id,
        session_id: sessionId,
        rating: avg,
        staff_id: ctx.staff_id,
        activity_id: ctx.activity_id,
        google_redirected: false,
      })
      .select('id')
      .single()

    const rid = (rv as { id: string } | null)?.id ?? null
    if (rid) {
      setReviewId(rid)
      await supabase.from('review_answers').insert(
        answered.map(q => ({
          review_id: rid,
          question_id: q.id,
          venue_id: ctx.venue_id,
          rating: answers[q.id],
        }))
      )
    }

    setSaving(false)
    setPhase(avg >= 4 && ctx.google_place_id ? 'google' : 'spin')
  }

  async function handleGoogleReview() {
    if (reviewId) {
      await supabase.from('reviews').update({ google_redirected: true }).eq('id', reviewId)
    }
    window.open(
      `https://search.google.com/local/writereview?placeid=${ctx!.google_place_id}`,
      '_blank'
    )
    setPhase('spin')
  }

  function handleTip(_amountCents: number) {
    if (ctx?.revolut_link) window.open(ctx.revolut_link, '_blank')
    setTipDone(true)
  }

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] != null)

  // ---- Invalid session ----

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-8">
        <p className="text-center text-gray-500 text-lg">{T.invalid}</p>
      </div>
    )
  }

  // ---- Loading (idle = context fetch in progress) ----

  if (phase === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-lg animate-pulse">{T.loading}</p>
      </div>
    )
  }

  // ---- Main render ----

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center">
      <div className="w-full max-w-sm px-4 pt-10 pb-8 flex flex-col items-center gap-6">

        {/* ===== WELCOME ===== */}
        {phase === 'welcome' && (
          <div className="w-full bg-white rounded-3xl shadow-xl p-8 text-center flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {T.greeting(ctx?.customer_name ?? null)}
            </h1>
            <p className="text-gray-500 text-sm">{T.welcome_sub}</p>
            {ctx?.activity_name && (
              <p className="text-purple-600 font-semibold text-sm">{ctx.activity_name}</p>
            )}
            <button
              onClick={() => setPhase(questions.length ? 'review' : 'spin')}
              className="mt-2 w-full py-4 bg-purple-600 hover:bg-purple-700 text-white text-xl font-extrabold rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              {T.start}
            </button>
          </div>
        )}

        {/* ===== REVIEW ===== */}
        {phase === 'review' && (
          <div className="w-full bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
            <h2 className="text-xl font-bold text-center text-gray-800">{T.review_title}</h2>
            {questions.map(q => (
              <div key={q.id} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-600 text-center">{q.question_text}</p>
                {q.type === 'stars' ? (
                  <Stars
                    value={answers[q.id] ?? 0}
                    onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
                  />
                ) : (
                  <Thumbs
                    value={answers[q.id] ?? null}
                    onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
                  />
                )}
              </div>
            ))}
            <button
              onClick={handleReviewSubmit}
              disabled={!allAnswered || saving}
              className="mt-2 w-full py-3 bg-purple-600 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
            >
              {saving ? T.saving : T.submit}
            </button>
          </div>
        )}

        {/* ===== GOOGLE ===== */}
        {phase === 'google' && (
          <div className="w-full bg-white rounded-3xl shadow-xl p-8 text-center flex flex-col gap-4">
            <p className="text-xl font-bold text-gray-800">{T.google_title}</p>
            <p className="text-sm text-gray-400">{T.google_sub}</p>
            <button
              onClick={handleGoogleReview}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all"
            >
              {T.google_cta}
            </button>
            <button
              onClick={() => setPhase('spin')}
              className="py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {T.skip}
            </button>
          </div>
        )}

        {/* ===== SPIN ===== */}
        {phase === 'spin' && (
          <>
            <WheelSvg
              prizes={prizes}
              rotation={rotation}
              spinning={spinning}
              onSpinEnd={handleSpinEnd}
            />
            {!spinResult && (
              <p className="text-gray-400 animate-pulse">{T.loading}</p>
            )}
          </>
        )}

        {/* ===== REVEAL ===== */}
        {phase === 'reveal' && spinResult && (
          <>
            <WheelSvg
              prizes={prizes}
              rotation={rotation}
              spinning={false}
              onSpinEnd={() => {}}
            />
            <div className="w-full bg-white rounded-3xl shadow-xl p-6 text-center">
              <p className="text-sm text-gray-400">{T.you_won}</p>
              <p className="text-2xl font-extrabold text-purple-700 mt-1">{spinResult.prize_name}</p>
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
                {T.show_qr}
                {spinResult.expires_at && (
                  <>
                    {' '}· {T.valid_until}{' '}
                    {new Date(spinResult.expires_at).toLocaleString('lv-LV', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </>
                )}
              </p>
              <button
                onClick={() => setPhase('tip')}
                className="mt-5 w-full py-3 bg-purple-600 text-white font-bold rounded-xl active:scale-95 transition-all"
              >
                {T.next}
              </button>
            </div>
          </>
        )}

        {/* ===== TIP ===== */}
        {phase === 'tip' && (
          <>
            {ctx?.staff_name && !tipDone ? (
              <div className="w-full bg-white rounded-3xl shadow-xl p-6 text-center flex flex-col gap-4">
                <p className="text-xl font-bold text-gray-800">{T.tip_title(ctx.staff_name)}</p>
                <p className="text-sm text-gray-400">{T.tip_sub}</p>

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
                      {T.custom}
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
                      {T.confirm}
                    </button>
                    <button
                      onClick={() => setShowCustom(false)}
                      className="py-2 text-sm text-gray-400"
                    >
                      {T.back}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setTipDone(true)}
                  className="py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {T.skip}
                </button>
              </div>
            ) : (
              <div className="w-full bg-white rounded-3xl shadow-xl p-10 text-center">
                <p className="text-3xl font-extrabold text-gray-800">{T.bye}</p>
                <p className="text-gray-400 mt-2 text-sm">{T.bye_sub}</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
