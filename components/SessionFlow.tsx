'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import { sendPrizeSms } from '@/app/actions'
import PrizeWheel, { type WheelSegment } from '@/components/PrizeWheel'

const DEFAULTS: Record<string, string> = {
  welcome_title:    'Paldies par apmeklējumu!',
  welcome_subtitle: 'Novērtējiet mūs un grieziet laimes ratu ar balvām!',
  welcome_button:   'Sākt',
  feedback_title:   'Kā tev patika?',
  review_button:    'Tālāk',
  prize_title:      'Tu ieguvi:',
  prize_claim_now:  'Saņemt balvu tūlīt',
  prize_show_admin: 'Parādiet šo QR administratoram',
  prize_show:       'Uzrādi šo QR pie kases',
  prize_later:      'Izmantot vēlāk vai uzdāvināt draugam',
  prize_sms_prompt: 'Ievadi telefonu — saņem SMS ar linku',
  prize_valid:      'Derīgs līdz',
  sms_send_btn:     'Sūtīt SMS',
  next_button:      'Tālāk',
  coupon_title:     'Tava atlaide nākamajai spēlei',
  coupon_valid:     'Derīgs līdz',
  tip_thanks:       'Paldies, mēs priecājamies, ka Jums patika!',
  tip_prompt:       'Vēlies pateikties',
  tip_yes:          'Jā',
  tip_no:           'Nē',
  tip_skip:         'Izlaist',
  end_title:        'Uz tikšanos!',
  google_prompt:    'Patika pie mums? Padalieties pieredzē Google',
  google_optional:  'Neobligāti — tava balva un kupons jau ir tavi',
  google_cta:       'Atvērt Google',
  screenshot_hint:  'Uztaisi ekrānšāviņu, lai nepazaudētu',
  my_prize:         'Tava balva',
}

type Phase = 'idle' | 'welcome' | 'review' | 'spin' | 'reveal' | 'coupon' | 'tip' | 'google' | 'done'

interface SessionCtx {
  venue_id: string
  venue_slug: string
  venue_name: string
  google_place_id: string | null
  logo_url: string | null
  brand_name: string | null
  fixed_discount_enabled: boolean | null
  fixed_discount_eur: number | null
  fixed_discount_min_spend: number | null
  fixed_discount_days: number | null
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

function Thumbs({ value, onChange }: { value: number | null; onChange(n: number): void }) {
  return (
    <div className="flex justify-center gap-8">
      <button onClick={() => onChange(5)} className={`text-5xl transition-transform active:scale-90 ${value === 5 ? '' : 'opacity-30'}`}>👍</button>
      <button onClick={() => onChange(1)} className={`text-5xl transition-transform active:scale-90 ${value === 1 ? '' : 'opacity-30'}`}>👎</button>
    </div>
  )
}

function PrizePill({ token, label }: { token: string; label: string }) {
  return (
    <a
      href={`/prize/${token}`}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 bg-purple-700/90 backdrop-blur text-white text-sm font-bold rounded-full shadow-lg border border-purple-500/40 hover:bg-purple-600 active:scale-95 transition-all whitespace-nowrap"
    >
      🎁 {label}
    </a>
  )
}

export default function SessionFlow({ sessionId }: { sessionId: string }) {
  const [phase,       setPhase]       = useState<Phase>('idle')
  const [ctx,         setCtx]         = useState<SessionCtx | null>(null)
  const [invalid,     setInvalid]     = useState(false)
  const [usedSession, setUsedSession] = useState(false)
  const [questions,   setQuestions]   = useState<ReviewQuestion[]>([])
  const [answers,     setAnswers]     = useState<Record<string, number>>({})
  const [saving,      setSaving]      = useState(false)
  const [reviewId,    setReviewId]    = useState<string | null>(null)
  const [prizes,      setPrizes]      = useState<Prize[]>([])
  const [spinResult,  setSpinResult]  = useState<SpinResult | null>(null)
  const [prizeQrUrl,  setPrizeQrUrl]  = useState('')
  const [couponQrUrl, setCouponQrUrl] = useState('')
  const [showQr,      setShowQr]      = useState(false)
  const [showSms,     setShowSms]     = useState(false)
  const [smsPhone,    setSmsPhone]    = useState('')
  const [smsSending,  setSmsSending]  = useState(false)
  const [smsStatus,   setSmsStatus]   = useState<'idle' | 'sent' | 'error'>('idle')
  const [smsError,      setSmsError]      = useState('')
  const [couponExpiry,  setCouponExpiry]  = useState<string | null>(null)
  const [locale,        setLocale]        = useState('lv')
  const [copy,          setCopy]          = useState<Record<string, string>>({})
  const [targetIndex,   setTargetIndex]   = useState(-1)
  const [wheelSpinning, setWheelSpinning] = useState(false)

  const spinCalled = useRef(false)

  useEffect(() => {
    if (!ctx?.fixed_discount_enabled || !ctx.fixed_discount_days) return
    const loc = locale === 'en' ? 'en-GB' : 'lv-LV'
    setCouponExpiry(new Date(Date.now() + ctx.fixed_discount_days * 86400000)
      .toLocaleDateString(loc, { day: '2-digit', month: '2-digit', year: 'numeric' }))
  }, [ctx?.fixed_discount_enabled, ctx?.fixed_discount_days, locale])

  function t(key: string) { return copy[key] ?? DEFAULTS[key] ?? key }

  const hasCoupon = !!(ctx?.fixed_discount_enabled && ctx?.fixed_discount_eur)
  const hasGoogle = !!ctx?.google_place_id

  useEffect(() => {
    async function init() {
      const { data } = await supabase.rpc('get_session_context', { p_session_id: sessionId })
      const c = (data as SessionCtx[] | null)?.[0]
      if (!c) { setInvalid(true); return }
      if (c.status !== 'active') { setUsedSession(true); return }
      setCtx(c)
      setLocale(c.default_locale ?? 'lv')
      const [{ data: qs }, { data: ps }] = await Promise.all([
        supabase.from('review_questions').select('id, label, type, sort_order')
          .eq('venue_id', c.venue_id).eq('active', true).order('sort_order'),
        supabase.rpc('get_wheel_prizes', { p_venue_slug: c.venue_slug }),
      ])
      setQuestions((qs ?? []) as ReviewQuestion[])
      setPrizes((ps ?? []) as Prize[])
      setPhase('welcome')
    }
    init()
  }, [sessionId])

  useEffect(() => {
    if (!ctx) return
    supabase.rpc('get_copy', { p_venue_id: ctx.venue_id, p_locale: locale }).then(({ data }) => {
      const map: Record<string, string> = {}
      for (const row of (data ?? []) as { key: string; value: string }[]) map[row.key] = row.value
      setCopy(map)
    })
  }, [ctx, locale])

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

  useEffect(() => {
    if (phase !== 'spin' || !spinResult || !prizes.length) return
    const idx = Math.max(0, prizes.findIndex(p => p.name === spinResult.prize_name))
    const t1 = setTimeout(() => setTargetIndex(idx), 0)
    const t2 = setTimeout(() => setWheelSpinning(true), 80)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase, spinResult, prizes])

  useEffect(() => {
    if (!spinResult) return
    const origin = window.location.origin
    const opts = { width: 220, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } }
    QRCode.toDataURL(`${origin}/redeem/${spinResult.qr_token}`, opts).then(d => setPrizeQrUrl(d))
    QRCode.toDataURL(`${origin}/prize/${spinResult.qr_token}`, opts).then(d => setCouponQrUrl(d))
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
  const showPrizePill = !!spinResult && ['coupon', 'tip', 'google', 'done'].includes(phase)
  const progressPhases: Phase[] = ['review', 'spin', 'reveal', ...(hasCoupon ? ['coupon' as Phase] : []), 'tip', ...(hasGoogle ? ['google' as Phase] : [])]
  const phaseOrder:    Phase[]  = ['review', 'spin', 'reveal', 'coupon', 'tip', 'google', 'done']

  if (usedSession) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a0533] to-[#0d0d1a] px-8">
      <div className="text-center">
        <p className="text-white text-xl font-bold mb-3">Šī sesija jau izmantota</p>
        <p className="text-purple-300 text-sm">Lūdzu, prasi jaunu QR pie darbinieka</p>
      </div>
    </div>
  )

  if (invalid) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-8">
      <p className="text-center text-gray-500 text-lg">Sesija nav atrasta vai nederīga</p>
    </div>
  )

  if (phase === 'idle') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a0533] to-[#0d0d1a]">
      <p className="text-purple-300 text-lg animate-pulse">Ielādē...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0533] to-[#0d0d1a] flex flex-col items-center">
      {showPrizePill && <PrizePill token={spinResult!.qr_token} label={t('my_prize')} />}

      <div className="w-full max-w-sm px-4 pt-4 pb-24 flex flex-col items-center gap-5">

        {phase !== 'welcome' && phase !== 'done' && (
          <div className="flex justify-center gap-2 pt-1">
            {progressPhases.map(step => (
              <div key={step} className={`w-2 h-2 rounded-full transition-colors ${
                phaseOrder.indexOf(phase) >= phaseOrder.indexOf(step) ? 'bg-purple-400' : 'bg-white/20'
              }`} />
            ))}
          </div>
        )}

        {/* ===== WELCOME ===== */}
        {phase === 'welcome' && (
          <div className="animate-fade-up w-full bg-white/5 backdrop-blur rounded-3xl shadow-xl p-8 text-center flex flex-col gap-4">
            <div className="flex justify-end gap-1 -mb-1">
              {['lv', 'en'].map(loc => (
                <button key={loc} onClick={() => setLocale(loc)}
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-md transition-colors ${locale === loc ? 'bg-purple-500 text-white' : 'text-purple-400 hover:text-purple-200'}`}>
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>
            {ctx?.logo_url && (
              <div className="flex justify-center py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ctx.logo_url} alt={ctx.brand_name ?? ctx.venue_name}
                  className="max-h-28 w-auto object-contain" />
              </div>
            )}
            <h1 className="text-2xl font-black text-white">
              {t('welcome_title')}{ctx?.customer_name ? `, ${ctx.customer_name}` : ''}
            </h1>
            <p className="text-purple-300 text-sm">{t('welcome_subtitle')}</p>
            {ctx?.activity_name && (
              <p className="text-purple-400 font-semibold text-sm bg-purple-900/30 rounded-xl py-2 px-3">
                {ctx.activity_name}
              </p>
            )}
            <button onClick={() => setPhase(questions.length ? 'review' : 'spin')}
              className="mt-2 w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xl font-black rounded-2xl shadow-lg shadow-purple-900/50 active:scale-95 transition-all">
              {t('welcome_button')}
            </button>
          </div>
        )}

        {/* ===== REVIEW — iekšējs novērtējums ===== */}
        {phase === 'review' && (
          <div className="animate-fade-up w-full bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
            <h2 className="text-xl font-black text-center text-gray-800">{t('feedback_title')}</h2>
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

        {/* ===== SPIN ===== */}
        {phase === 'spin' && (
          <div className="flex flex-col items-center gap-4 w-full">
            <PrizeWheel segments={segments} targetIndex={targetIndex} spinning={wheelSpinning} onSpinEnd={handleSpinEnd} />
            {!spinResult && (
              <p className="text-purple-300 text-sm animate-pulse">
                {locale === 'en' ? 'Preparing your spin...' : 'Gatavojas...'}
              </p>
            )}
          </div>
        )}

        {/* ===== REVEAL — QR #1: /redeem/{token} priekš personāla ===== */}
        {phase === 'reveal' && spinResult && (
          <>
            <PrizeWheel segments={segments} targetIndex={targetIndex} spinning={false} onSpinEnd={() => {}} />
            <div className="animate-pop-in w-full bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
              <p className="text-xs font-bold tracking-widest text-purple-400 uppercase text-center">{t('prize_title')}</p>
              <p className="text-3xl font-black text-purple-700 text-center leading-tight">{spinResult.prize_name}</p>
              {spinResult.expires_at && (
                <p className="text-xs text-gray-400 text-center">
                  {t('prize_valid')}: {new Date(spinResult.expires_at).toLocaleString(locale === 'en' ? 'en-GB' : 'lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <button onClick={() => setShowQr(v => !v)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-all">
                {t('prize_claim_now')}
              </button>
              {showQr && (
                <div className="flex flex-col items-center gap-3">
                  {prizeQrUrl
                    ? <Image src={prizeQrUrl} alt="QR kods" width={220} height={220} unoptimized className="rounded-2xl shadow-md" />
                    : <div className="w-[220px] h-[220px] bg-gray-100 rounded-2xl animate-pulse" />}
                  <p className="text-sm text-gray-600 font-medium text-center">{t('prize_show_admin')}</p>
                  <p className="text-xs text-gray-400 text-center">{t('screenshot_hint')}</p>
                </div>
              )}
              <button onClick={() => setShowSms(v => !v)}
                className="w-full py-3 border-2 border-purple-200 text-purple-700 font-bold rounded-xl hover:bg-purple-50 active:scale-95 transition-all">
                {t('prize_later')}
              </button>
              {showSms && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-gray-500 text-center">{t('prize_sms_prompt')}</p>
                  <div className="flex gap-2">
                    <input type="tel" inputMode="numeric" value={smsPhone} onChange={e => setSmsPhone(e.target.value)}
                      placeholder="+371 2x xxx xxx"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    <button onClick={handleSendSms} disabled={smsSending || !smsPhone.trim() || smsStatus === 'sent'}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg disabled:opacity-40 active:scale-95 transition-all whitespace-nowrap">
                      {smsSending ? '...' : smsStatus === 'sent' ? '✓' : t('sms_send_btn')}
                    </button>
                  </div>
                  {smsStatus === 'error' && <p className="text-xs text-red-400">{smsError}</p>}
                </div>
              )}
              <button onClick={() => setPhase(hasCoupon ? 'coupon' : 'tip')}
                className="mt-2 w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl active:scale-95 transition-all">
                {t('next_button')}
              </button>
            </div>
          </>
        )}

        {/* ===== COUPON — QR #2: /prize/{token} klientam ===== */}
        {phase === 'coupon' && spinResult && (
          <div className="animate-fade-up w-full bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
            <p className="text-xs font-bold tracking-widest text-green-500 uppercase text-center">BONUSS</p>
            <p className="text-2xl font-black text-gray-800 text-center">{t('coupon_title')}</p>
            {ctx?.fixed_discount_eur && (
              <p className="text-5xl font-black text-green-600 text-center">-{ctx.fixed_discount_eur}€</p>
            )}
            {ctx?.fixed_discount_min_spend && (
              <p className="text-sm text-gray-400 text-center">
                {locale === 'en' ? `Min. spend ${ctx.fixed_discount_min_spend}€` : `Min. pasūtījums ${ctx.fixed_discount_min_spend}€`}
              </p>
            )}
            {couponExpiry && (
              <p className="text-sm text-gray-400 text-center">
                {t('coupon_valid')}: {couponExpiry}
              </p>
            )}
            <div className="flex flex-col items-center gap-2">
              {couponQrUrl
                ? <Image src={couponQrUrl} alt="Kupona QR" width={200} height={200} unoptimized className="rounded-2xl shadow-md" />
                : <div className="w-[200px] h-[200px] bg-gray-100 rounded-2xl animate-pulse" />}
              <p className="text-sm text-gray-600 font-medium text-center">{t('prize_show')}</p>
              <p className="text-xs text-gray-400 text-center">{t('screenshot_hint')}</p>
            </div>
            <button onClick={() => setPhase('tip')}
              className="mt-2 w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl active:scale-95 transition-all">
              {t('next_button')}
            </button>
          </div>
        )}

        {/* ===== TIP ===== */}
        {phase === 'tip' && (
          <div className="animate-fade-up w-full bg-white rounded-3xl shadow-xl p-8 text-center flex flex-col gap-5">
            <p className="text-xl font-black text-gray-800">{t('tip_thanks')}</p>
            <p className="text-sm text-gray-500">
              {t('tip_prompt')}{ctx?.staff_name ? ` ${ctx.staff_name}` : ''}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { if (ctx?.revolut_link) window.open(ctx.revolut_link, '_blank'); setPhase(hasGoogle ? 'google' : 'done') }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-all">
                {t('tip_yes')}
              </button>
              <button
                onClick={() => setPhase(hasGoogle ? 'google' : 'done')}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
                {t('tip_no')}
              </button>
            </div>
          </div>
        )}

        {/* ===== GOOGLE — pēdējais, neitrāls, visiem vienāds ===== */}
        {phase === 'google' && ctx?.google_place_id && (
          <div className="animate-fade-up w-full bg-white rounded-3xl shadow-xl p-8 text-center flex flex-col gap-4">
            <p className="text-lg font-bold text-gray-800 leading-snug">{t('google_prompt')}</p>
            <p className="text-sm text-gray-400">{t('google_optional')}</p>
            <a
              href={`https://search.google.com/local/writereview?placeid=${ctx.google_place_id}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => { if (reviewId) supabase.from('reviews').update({ google_redirected: true }).eq('id', reviewId) }}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-black rounded-2xl shadow active:scale-95 transition-all block"
            >
              {t('google_cta')}
            </a>
            <button onClick={() => setPhase('done')}
              className="py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              {t('tip_skip')}
            </button>
          </div>
        )}

        {/* ===== DONE ===== */}
        {phase === 'done' && (
          <div className="animate-pop-in w-full bg-white rounded-3xl shadow-xl p-10 text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-3xl font-black text-gray-800">{t('end_title')}</p>
          </div>
        )}

      </div>
    </div>
  )
}
