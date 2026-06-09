'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import { sendPrizeSms } from '@/app/actions'
import PrizeWheel, { type WheelSegment } from '@/components/PrizeWheel'

// ---- Copy fallbacks (LV) ----
const DEFAULTS: Record<string, string> = {
  welcome_title:    'Paldies par apmeklējumu',
  welcome_subtitle: 'Novērtējiet mūs un grieziet laimes ratu ar balvām!',
  welcome_button:   'Sākt',
  review_intro:     'Kā bija?',
  review_button:    'Atklāt balvu',
  google_prompt:    'Atstāt atsauksmi Google',
  prize_title:      'Tu ieguvi:',
  prize_claim_now:  'Saņemt balvu tūlīt',
  prize_show_admin: 'Parādiet šo QR administratoram',
  prize_later:      'Izmantot vēlāk vai uzdāvināt draugam',
  prize_sms_prompt: 'Sūtīt QR saiti uz telefonu',
  sms_send_btn:     'Sūtīt SMS',
  next_button:      'Tālāk',
  tip_thanks:       'Paldies, mēs priecājamies, ka Jums patika!',
  tip_ask:          'Vai vēlaties atstāt pateicību instruktoram?',
  tip_yes:          'Jā',
  tip_no:           'Nē',
  end_title:        'Uz tikšanos!',
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
  default_locale: string | null
  status: string
}

interface ReviewQuestion {
  id: string
  label: string
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

// ---- Stars ----
function Stars({ value, onChange }: { value: number; onChange(n: number): void }) {
  return (
    <div className="flex justify-center gap-3">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} className="focus:outline-none">
          <span className={`text-4xl transition-transform ${n <= value ? 'text-yellow-400 scale-110' : 'text-gray-200'}`}>★</span>
        </button>
      ))}
    </div>
  )
}

// ---- Thumbs ----
function Thumbs({ value, onChange }: { value: number | null; onChange(n: number): void }) {
  return (
    <div className="flex justify-center gap-8">
      <button onClick={() => onChange(5)}
        className={`text-5xl transition-transform active:scale-90 ${value === 5 ? '' : 'opacity-30'}`}>👍</button>
      <button onClick={() => onChange(1)}
        className={`text-5xl transition-transform active:scale-90 ${value === 1 ? '' : 'opacity-30'}`}>👎</button>
    </div>
  )
}

// ---- Main ----
export default function SessionFlow({ sessionId }: { sessionId: string }) {
  const [phase,    setPhase]    = useState<Phase>('idle')
  const [ctx,      setCtx]      = useState<SessionCtx | null>(null)
  const [invalid,  setInvalid]  = useState(false)
  const [usedSession, setUsedSession] = useState(false)
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [answers,  setAnswers]  = useState<Record<string, number>>({})
  const [saving,   setSaving]   = useState(false)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [prizes,   setPrizes]   = useState<Prize[]>([])
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null)
  const [qrDataUrl, setQrDataUrl]  = useState('')
  const [tipDone,   setTipDone]    = useState(false)
  const [showQr,    setShowQr]     = useState(false)
  const [showSms,   setShowSms]    = useState(false)
  const [smsPhone,  setSmsPhone]   = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsStatus, setSmsStatus]  = useState<'idle' | 'sent' | 'error'>('idle')
  const [smsError,  setSmsError]   = useState('')
  const [locale,    setLocale]     = useState('lv')
  const [copy,      setCopy]       = useState<Record<string, string>>({})

  // Wheel animation state
  const [targetIndex,   setTargetIndex]   = useState(-1)
  const [wheelSpinning, setWheelSpinning] = useState(false)

  const spinCalled = useRef(false)

  function t(key: string) { return copy[key] ?? DEFAULTS[key] ?? key }

  // ---- Init: load session context ----
  useEffect(() => {
    async function init() {
      const { data } = await supabase.rpc('get_session_context', { p_session_id: sessionId })
      const c = (data as SessionCtx[] | null)?.[0]
      if (!c) { setInvalid(true); return }
      if (c.status !== 'active') { setUsedSession(true); return }
      setCtx(c)
      setLocale(c.default_locale ?? 'lv')

      const [{ data: qs }, { data: ps }] = await Promise.all([
        supabase.from('review_questions')
          .select('id, label, type, sort_order')
          .eq('venue_id', c.venue_id).eq('active', true).order('sort_order'),
        supabase.rpc('get_wheel_prizes', { p_venue_slug: c.venue_slug }),
      ])
      setQuestions((qs ?? []) as ReviewQuestion[])
      setPrizes((ps ?? []) as Prize[])
      setPhase('welcome')
    }
    init()
  }, [sessionId])

  // Load copy strings
  useEffect(() => {
    if (!ctx) return
    supabase.rpc('get_copy', { p_venue_id: ctx.venue_id, p_locale: locale }).then(({ data }) => {
      const map: Record<string, string> = {}
      for (const row of (data ?? []) as { key: string; value: string }[]) map[row.key] = row.value
      setCopy(map)
    })
  }, [ctx, locale])

  // RPC spin once when entering spin phase
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

  // Start wheel animation when spinResult arrives
  useEffect(() => {
    if (phase !== 'spin' || !spinResult || !prizes.length) return
    const idx = Math.max(0, prizes.findIndex(p => p.name === spinResult.prize_name))
    const t1 = setTimeout(() => setTargetIndex(idx), 0)
    const t2 = setTimeout(() => setWheelSpinning(true), 80)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase, spinResult, prizes])

  // Generate QR when token is known
  useEffect(() => {
    if (!spinResult) return
    QRCode.toDataURL(`${window.location.origin}/redeem/${spinResult.qr_token}`,
      { width: 220, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } })
      .then(d => setQrDataUrl(d))
  }, [spinResult])

  const handleSpinEnd = useCallback(() => {
    setWheelSpinning(false)
    setPhase('reveal')
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#D4AF37','#B91C1C','#FFF8E7','#7C3AED'] })
  }, [])

  async function handleReviewSubmit() {
    if (!ctx) return
    const answered = questions.filter(q => answers[q.id] != null)
    if (!answered.length) return
    setSaving(true)
    const avg = answered.reduce((s, q) => s + answers[q.id], 0) / answered.length
    const rid = crypto.randomUUID()
    await supabase.from('reviews').insert({
      id: rid, venue_id: ctx.venue_id, session_id: sessionId, rating: avg,
      staff_id: ctx.staff_id, activity_id: ctx.activity_id, google_redirected: false,
    })
    setReviewId(rid)
    await supabase.from('review_answers').insert(
      answered.map(q => ({ review_id: rid, question_id: q.id, venue_id: ctx.venue_id, rating: answers[q.id] }))
    )
    setSaving(false)
    setPhase(avg >= 4 && ctx.google_place_id ? 'google' : 'spin')
  }

  async function handleGoogleReview() {
    if (reviewId) await supabase.from('reviews').update({ google_redirected: true }).eq('id', reviewId)
    window.open(`https://search.google.com/local/writereview?placeid=${ctx!.google_place_id}`, '_blank')
    setPhase('spin')
  }

  async function handleSendSms() {
    if (!spinResult || !smsPhone.trim()) return
    setSmsSending(true)
    const { ok, error } = await sendPrizeSms(spinResult.qr_token, smsPhone.trim(), window.location.origin)
    setSmsSending(false)
    if (ok) setSmsStatus('sent')
    else { setSmsStatus('error'); setSmsError(error ?? 'SMS kļūda') }
  }

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] != null)
  const segments: WheelSegment[] = prizes.map(p => ({ label: p.name, color: p.color }))

  // ---- Used session ----
  if (usedSession) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a0533] to-[#0d0d1a] px-8">
      <div className="text-center">
        <p className="text-white text-xl font-bold mb-3">Šī sesija jau izmantota</p>
        <p className="text-purple-300 text-sm">Lūdzu, prasi jaunu QR pie darbinieka</p>
      </div>
    </div>
  )

  // ---- Invalid ----
  if (invalid) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-8">
      <p className="text-center text-gray-500 text-lg">Sesija nav atrasta vai nederīga</p>
    </div>
  )

  // ---- Loading ----
  if (phase === 'idle') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a0533] to-[#0d0d1a]">
      <p className="text-purple-300 text-lg animate-pulse">Ielādē...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0533] to-[#0d0d1a] flex flex-col items-center">

      {/* Locale toggle */}
      <div className="w-full max-w-sm px-4 pt-4 flex justify-end gap-1">
        {['lv', 'en'].map(loc => (
          <button key={loc} onClick={() => setLocale(loc)}
            className={`px-2.5 py-0.5 text-xs font-bold rounded-md transition-colors ${
              locale === loc ? 'bg-purple-500 text-white' : 'text-purple-400 hover:text-purple-200'
            }`}>
            {loc.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm px-4 pt-4 pb-10 flex flex-col items-center gap-5">

        {/* ===== WELCOME ===== */}
        {phase === 'welcome' && (
          <div className="animate-fade-up w-full bg-white/5 backdrop-blur rounded-3xl shadow-xl p-8 text-center flex flex-col gap-4">
            <h1 className="text-2xl font-black text-white">
              {t('welcome_title')}{ctx?.customer_name ? `, ${ctx.customer_name}` : ''}!
            </h1>
            <p className="text-purple-300 text-sm">{t('welcome_subtitle')}</p>
            {ctx?.activity_name && (
              <p className="text-purple-400 font-semibold text-sm bg-purple-900/30 rounded-xl py-2 px-3">
                {ctx.activity_name}
              </p>
            )}
            <button
              onClick={() => setPhase(questions.length ? 'review' : 'spin')}
              className="mt-2 w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xl font-black rounded-2xl shadow-lg shadow-purple-900/50 active:scale-95 transition-all"
            >
              {t('welcome_button')}
            </button>
          </div>
        )}

        {/* ===== REVIEW ===== */}
        {phase === 'review' && (
          <div className="animate-fade-up w-full bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
            <h2 className="text-xl font-black text-center text-gray-800">{t('review_intro')}</h2>
            {questions.map(q => (
              <div key={q.id} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-600 text-center">{q.label}</p>
                {q.type === 'stars'
                  ? <Stars value={answers[q.id] ?? 0} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
                  : <Thumbs value={answers[q.id] ?? null} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />}
              </div>
            ))}
            <button onClick={handleReviewSubmit} disabled={!allAnswered || saving}
              className="mt-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all">
              {saving ? (locale === 'en' ? 'Saving...' : 'Saglabā...') : t('review_button')}
            </button>
          </div>
        )}

        {/* ===== GOOGLE ===== */}
        {phase === 'google' && (
          <div className="animate-fade-up w-full bg-white rounded-3xl shadow-xl p-8 text-center flex flex-col gap-5">
            <p className="text-xl font-black text-gray-800">{locale === 'en' ? 'Thank you!' : 'Paldies!'}</p>
            <p className="text-sm text-gray-400">
              {locale === 'en' ? 'Your review helps others find the best places' : 'Tavs viedoklis palīdz citiem atrast labākās vietas'}
            </p>
            <button onClick={handleGoogleReview}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-black rounded-2xl shadow-md active:scale-95 transition-all">
              {t('google_prompt')}
            </button>
            <button onClick={() => setPhase('spin')}
              className="w-full py-2.5 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              {locale === 'en' ? 'Continue to wheel' : 'Turpināt uz ratu'}
            </button>
          </div>
        )}

        {/* ===== SPIN ===== */}
        {phase === 'spin' && (
          <div className="flex flex-col items-center gap-4 w-full">
            <PrizeWheel
              segments={segments}
              targetIndex={targetIndex}
              spinning={wheelSpinning}
              onSpinEnd={handleSpinEnd}
            />
            {!spinResult && (
              <p className="text-purple-300 text-sm animate-pulse">
                {locale === 'en' ? 'Preparing your spin...' : 'Gatavojas...'}
              </p>
            )}
          </div>
        )}

        {/* ===== REVEAL ===== */}
        {phase === 'reveal' && spinResult && (
          <>
            <PrizeWheel segments={segments} targetIndex={targetIndex} spinning={false} onSpinEnd={() => {}} />
            <div className="animate-pop-in w-full bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
              <p className="text-xs font-bold tracking-widest text-purple-400 uppercase text-center">{t('prize_title')}</p>
              <p className="text-3xl font-black text-purple-700 text-center leading-tight">{spinResult.prize_name}</p>

              {/* A: Saņemt tūlīt → QR */}
              <button
                onClick={() => setShowQr(v => !v)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-all"
              >
                {t('prize_claim_now')}
              </button>
              {showQr && (
                <div className="flex flex-col items-center gap-3">
                  {qrDataUrl ? (
                    <Image src={qrDataUrl} alt="QR kods" width={220} height={220}
                      unoptimized className="rounded-2xl shadow-md" />
                  ) : (
                    <div className="w-[220px] h-[220px] bg-gray-100 rounded-2xl animate-pulse" />
                  )}
                  <p className="text-sm text-gray-600 font-medium text-center">{t('prize_show_admin')}</p>
                </div>
              )}

              {/* B: Izmantot vēlāk → SMS */}
              <button
                onClick={() => setShowSms(v => !v)}
                className="w-full py-3 border-2 border-purple-200 text-purple-700 font-bold rounded-xl hover:bg-purple-50 active:scale-95 transition-all"
              >
                {t('prize_later')}
              </button>
              {showSms && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-gray-500 text-center">{t('prize_sms_prompt')}</p>
                  <div className="flex gap-2">
                    <input type="tel" value={smsPhone} onChange={e => setSmsPhone(e.target.value)}
                      placeholder="+371 2x xxx xxx"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    <button onClick={handleSendSms}
                      disabled={smsSending || !smsPhone.trim() || smsStatus === 'sent'}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg disabled:opacity-40 active:scale-95 transition-all whitespace-nowrap">
                      {smsSending ? '...' : smsStatus === 'sent' ? '✓' : t('sms_send_btn')}
                    </button>
                  </div>
                  {smsStatus === 'error' && <p className="text-xs text-red-400">{smsError}</p>}
                </div>
              )}

              <button onClick={() => setPhase('tip')}
                className="mt-2 w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl active:scale-95 transition-all">
                {t('next_button')}
              </button>
            </div>
          </>
        )}

        {/* ===== TIP ===== */}
        {phase === 'tip' && (
          <>
            {!tipDone ? (
              <div className="animate-fade-up w-full bg-white rounded-3xl shadow-xl p-8 text-center flex flex-col gap-5">
                <p className="text-xl font-black text-gray-800">{t('tip_thanks')}</p>
                <p className="text-sm text-gray-500">{t('tip_ask')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { if (ctx?.revolut_link) window.open(ctx.revolut_link, '_blank'); setTipDone(true) }}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-all">
                    {t('tip_yes')}
                  </button>
                  <button
                    onClick={() => setTipDone(true)}
                    className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
                    {t('tip_no')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-pop-in w-full bg-white rounded-3xl shadow-xl p-10 text-center">
                <p className="text-4xl mb-2">🎉</p>
                <p className="text-3xl font-black text-gray-800">{t('end_title')}</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
