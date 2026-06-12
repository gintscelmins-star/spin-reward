'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import { sendPrizeSms, sendVoucherSms } from '@/app/actions'
import PrizeWheel, { type WheelSegment } from '@/components/PrizeWheel'

type Phase = 'idle' | 'review' | 'spin' | 'reveal' | 'done'

interface Prize {
  id: string
  name: string
  color?: string
}

interface Venue {
  id: string
  name: string
  google_place_id: string | null
  default_locale: string | null
  logo_url: string | null
  brand_name: string | null
  fixed_discount_enabled: boolean | null
  fixed_discount_eur: number | null
  fixed_discount_min_spend: number | null
  fixed_discount_days: number | null
}

interface SpinResult {
  prize_name: string
  qr_token: string
  expires_at: string
}

interface VoucherResult {
  qr_token: string
  discount_eur: number
  min_spend: number | null
  expires_at: string
}

interface ReviewQuestion {
  id: string
  label: string
  type: 'stars' | 'thumbs'
  sort_order: number
}

const DEFAULTS: Record<string, string> = {
  welcome_title:       'Paldies par apmeklējumu!',
  welcome_subtitle:    'Novērtējiet mūs un grieziet laimes ratu ar balvām!',
  welcome_button:      'Sākt',
  feedback_title:             'Kā tev patika?',
  review_comment_label:       'Atsauksme (neobligāti)',
  review_comment_placeholder: 'Dalieties savā pieredzē...',
  review_button:              'Tālāk',
  spin_button:         'GRIEZT',
  prize_title:         'Tu ieguvi:',
  prize_claim_now:     'Saņemt balvu tūlīt',
  prize_show_admin:    'Parādiet šo QR administratoram',
  prize_later:         'Izmantot vēlāk vai uzdāvināt draugam',
  prize_sms_prompt:    'Ievadi telefonu — saņem SMS ar linku',
  prize_valid:         'Derīgs līdz',
  sms_send_btn:        'Sūtīt SMS',
  next_button:         'Tālāk',
  thanks_visit:        'Paldies par apmeklējumu!',
  google_prompt:       'Neaizmirsti atstāt mums atsauksmi Google!',
  google_optional:     'Neobligāti — tava balva jau ir tava',
  coupon_phone_prompt: 'Ievadi savu numuru un saņem QR ar atlaidi nākamajam apmeklējumam',
  coupon_title:        'Tava atlaide nākamajai spēlei',
  voucher_send_btn:    'Saņemt QR',
  screenshot_hint:     'Uztaisi ekrānšāviņu, lai nepazaudētu',
  my_prize:            'Tava balva',
  reveal_wow:          'WOW! Apsveicam, tu laimēji!',
}

function getSessionId(): string {
  const KEY = 'sr_sid'
  let id = localStorage.getItem(KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id) }
  return id
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

export default function Wheel({ venueSlug, variant }: { venueSlug: string; variant?: string }) {
  const [phase,         setPhase]         = useState<Phase>('idle')
  const [loading,       setLoading]       = useState(true)
  const [prizes,        setPrizes]        = useState<Prize[]>([])
  const [venue,         setVenue]         = useState<Venue | null>(null)
  const [locale,        setLocale]        = useState('lv')
  const [copy,          setCopy]          = useState<Record<string, string>>({})
  const [questions,     setQuestions]     = useState<ReviewQuestion[]>([])
  const [answers,       setAnswers]       = useState<Record<string, number>>({})
  const [comment,       setComment]       = useState('')
  const [saving,        setSaving]        = useState(false)
  const [spinResult,    setSpinResult]    = useState<SpinResult | null>(null)
  const [prizeQrUrl,    setPrizeQrUrl]    = useState('')
  const [showQr,        setShowQr]        = useState(false)
  const [showSms,       setShowSms]       = useState(false)
  const [smsPhone,      setSmsPhone]      = useState('')
  const [smsSending,    setSmsSending]    = useState(false)
  const [smsStatus,     setSmsStatus]     = useState<'idle' | 'sent' | 'error'>('idle')
  const [smsError,      setSmsError]      = useState('')
  const [voucherResult, setVoucherResult] = useState<VoucherResult | null>(null)
  const [voucherQrUrl,  setVoucherQrUrl]  = useState('')
  const [couponPhone,   setCouponPhone]   = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponSent,    setCouponSent]    = useState(false)
  const [couponErr,     setCouponErr]     = useState('')
  const [spinLoading,   setSpinLoading]   = useState(false)
  const [targetIndex,   setTargetIndex]   = useState(-1)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [revealStage,   setRevealStage]   = useState<0 | 1 | 2>(0)
  const [flashAnim,     setFlashAnim]     = useState(false)

  const sessionIdRef  = useRef('')
  const voucherCalled = useRef(false)

  function t(key: string) { return copy[key] ?? DEFAULTS[key] ?? key }

  const hasCoupon = variant === 'B' ? true : variant === 'A' ? false : !!(venue?.fixed_discount_enabled)

  useEffect(() => {
    sessionIdRef.current = getSessionId()

    async function load() {
      const { data: v } = await supabase
        .from('venues')
        .select('id, name, google_place_id, default_locale, logo_url, brand_name, fixed_discount_enabled, fixed_discount_eur, fixed_discount_min_spend, fixed_discount_days')
        .eq('slug', venueSlug).single()

      const devVenue: Venue = {
        id: 'dev', name: venueSlug, google_place_id: 'ChIJdev', default_locale: 'lv',
        logo_url: null, brand_name: null, fixed_discount_enabled: false,
        fixed_discount_eur: null, fixed_discount_min_spend: null, fixed_discount_days: null,
      }
      const devPrizes: Prize[] = [
        { id:'1', name:'Kafija',    color:'#B91C1C' },
        { id:'2', name:'Tēja',      color:'#FFF8E7' },
        { id:'3', name:'-10%',      color:'#B91C1C' },
        { id:'4', name:'Deserts',   color:'#FFF8E7' },
        { id:'5', name:'Kokteiļi',  color:'#B91C1C' },
        { id:'6', name:'Brokastis', color:'#FFF8E7' },
        { id:'7', name:'Vēlreiz!',  color:'#B91C1C' },
        { id:'8', name:'-50%',      color:'#FFF8E7' },
      ]

      if (!v) {
        setVenue(devVenue); setPrizes(devPrizes)
        setLoading(false); return
      }

      const [{ data: p }, { data: qs }] = await Promise.all([
        supabase.rpc('get_wheel_prizes', { p_venue_slug: venueSlug }),
        supabase.from('review_questions').select('id, label, type, sort_order')
          .eq('venue_id', v.id).eq('active', true).order('sort_order'),
      ])
      setVenue(v as Venue)
      setPrizes((p ?? devPrizes) as Prize[])
      setQuestions((qs ?? []) as ReviewQuestion[])
      setLocale(v.default_locale ?? 'lv')
      setLoading(false)
    }
    load()
  }, [venueSlug])

  useEffect(() => {
    if (!venue) return
    supabase.rpc('get_copy', { p_venue_id: venue.id, p_locale: locale }).then(({ data }) => {
      const map: Record<string, string> = {}
      for (const row of (data ?? []) as { key: string; value: string }[]) map[row.key] = row.value
      setCopy(map)
    })
  }, [venue, locale])

  useEffect(() => {
    if (!spinResult) return
    const opts = { width: 220, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } }
    QRCode.toDataURL(`${window.location.origin}/redeem/${spinResult.qr_token}`, opts)
      .then(d => setPrizeQrUrl(d))
  }, [spinResult])

  async function handleSpin() {
    if (!venue || wheelSpinning || spinLoading) return
    setSpinLoading(true)
    const { data } = await supabase.rpc('spin_wheel', { p_venue_slug: venueSlug, p_session_id: sessionIdRef.current })
    const result: SpinResult = data?.[0] ?? {
      prize_name: prizes[Math.floor(Math.random() * prizes.length)]?.name ?? 'Balva',
      qr_token: crypto.randomUUID().slice(0, 8).toUpperCase(),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }
    setSpinResult(result)
    const idx = Math.max(0, prizes.findIndex(p => p.name === result.prize_name))
    setSpinLoading(false)
    setTimeout(() => setTargetIndex(idx), 0)
    setTimeout(() => setWheelSpinning(true), 80)
  }

  async function handleReviewSubmit() {
    const answered = questions.filter(q => answers[q.id] != null)
    if (!venue) { setPhase('spin'); return }
    if (answered.length) {
      setSaving(true)
      const avg = answered.reduce((s, q) => s + answers[q.id], 0) / answered.length
      const rid = crypto.randomUUID()
      await supabase.from('reviews').insert({
        id: rid, venue_id: venue.id, session_id: sessionIdRef.current,
        rating: avg, comment: comment.trim() || null, google_redirected: false,
      })
      await supabase.from('review_answers').insert(
        answered.map(q => ({ review_id: rid, question_id: q.id, venue_id: venue.id, rating: answers[q.id] }))
      )
      setSaving(false)
    }
    setPhase('spin')
  }

  const handleSpinEnd = useCallback(() => {
    const COLORS = ['#D4AF37','#FFD700','#B91C1C','#FFF8E7','#7C3AED','#FFFFFF','#FF6B6B']
    setWheelSpinning(false)
    setFlashAnim(true)
    setTimeout(() => setFlashAnim(false), 650)
    confetti({ particleCount: 110, spread: 75, origin: { x: 0.5, y: 0.55 }, colors: COLORS, scalar: 1.2 })
    setTimeout(() => confetti({ particleCount: 65, spread: 55, angle: 60,  origin: { x: 0.1, y: 0.6 }, colors: COLORS }), 160)
    setTimeout(() => confetti({ particleCount: 65, spread: 55, angle: 120, origin: { x: 0.9, y: 0.6 }, colors: COLORS }), 280)
    setTimeout(() => confetti({ particleCount: 90, spread: 100, origin: { x: 0.5, y: 0.35 }, gravity: 0.7, colors: COLORS }), 450)
    setTimeout(() => confetti({ particleCount: 45, spread: 70, origin: { x: 0.2, y: 0.4 }, colors: COLORS }), 850)
    setTimeout(() => confetti({ particleCount: 45, spread: 70, origin: { x: 0.8, y: 0.4 }, colors: COLORS }), 1050)
    setPhase('reveal')
    setRevealStage(1)
    setTimeout(() => setRevealStage(2), 700)
  }, [])

  async function handleSendSms() {
    if (!spinResult || !smsPhone.trim()) return
    setSmsSending(true)
    const { ok, error } = await sendPrizeSms(spinResult.qr_token, smsPhone.trim(), window.location.origin)
    setSmsSending(false)
    if (ok) setSmsStatus('sent')
    else { setSmsStatus('error'); setSmsError(error ?? 'SMS kļūda') }
  }

  async function handleIssueVoucher() {
    if (!couponPhone.trim() || couponLoading || voucherCalled.current) return
    voucherCalled.current = true
    setCouponLoading(true)
    const { data } = await supabase.rpc('issue_voucher_venue', { p_slug: venueSlug })
    const result = (data as VoucherResult[] | null)?.[0]
    if (result) {
      setVoucherResult(result)
      const origin = window.location.origin
      const opts = { width: 200, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } }
      QRCode.toDataURL(`${origin}/kupons/${result.qr_token}`, opts).then(d => setVoucherQrUrl(d))
      const { ok } = await sendVoucherSms(String(result.qr_token), couponPhone.trim(), origin)
      if (ok) setCouponSent(true)
    } else {
      setCouponErr('Kupons nav pieejams')
      voucherCalled.current = false
    }
    setCouponLoading(false)
  }

  const dateLocale   = locale === 'en' ? 'en-GB' : locale === 'ru' ? 'ru-RU' : 'lv-LV'
  const segments: WheelSegment[] = prizes.map(p => ({ label: p.name, color: p.color }))
  const showPrizePill = !!spinResult && phase === 'done'
  const progressPhases: Phase[] = ['review', 'spin', 'reveal']
  const phaseOrder:     Phase[] = ['review', 'spin', 'reveal', 'done']

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-950 to-indigo-950">
      <p className="text-yellow-400 text-lg font-black animate-pulse">✨ Ielādē...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-purple-950 flex flex-col items-center overflow-x-hidden">
      {showPrizePill && <PrizePill token={spinResult!.qr_token} label={t('my_prize')} />}
      {flashAnim && <div className="fixed inset-0 bg-white animate-flash z-[200]" />}
      <div className="fixed top-0 left-0 right-0 h-3 z-50 pointer-events-none animate-carnival-stripe"
           style={{ background: 'linear-gradient(90deg,#FF3B3B,#FF8C00,#FFD700,#00CC44,#00BFFF,#7B2FFF,#FF1493,#FF3B3B)', backgroundSize: '200% 100%' }} />
      <div className="fixed bottom-0 left-0 right-0 h-3 z-50 pointer-events-none animate-carnival-stripe"
           style={{ background: 'linear-gradient(90deg,#7B2FFF,#00BFFF,#00CC44,#FFD700,#FF8C00,#FF3B3B,#FF1493,#7B2FFF)', backgroundSize: '200% 100%', animationDirection: 'reverse' }} />
      <div className="fixed inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(255,120,0,0.12), transparent 70%)' }} />

      <div className="w-full max-w-sm px-4 pt-4 pb-24 flex flex-col items-center gap-5">

        {phase !== 'idle' && phase !== 'done' && (
          <div className="flex justify-center gap-2 pt-1">
            {progressPhases.map(step => (
              <div key={step} className={`w-2 h-2 rounded-full transition-colors ${
                phaseOrder.indexOf(phase) >= phaseOrder.indexOf(step) ? 'bg-yellow-400' : 'bg-white/20'
              }`} />
            ))}
          </div>
        )}

        {/* ===== IDLE / WELCOME ===== */}
        {phase === 'idle' && (
          <div className="animate-fade-up w-full flex flex-col items-center gap-5">
            <div className="flex gap-2">
              {(['lv', 'en', 'ru'] as const).map(l => (
                <button key={l} onClick={() => setLocale(l)}
                  className={`px-3 py-1 rounded-full text-sm font-bold transition-all border-2 ${locale === l ? 'bg-yellow-400 text-purple-900 border-yellow-400' : 'bg-transparent text-white border-white/40 hover:border-white/80'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black text-white leading-tight"
                  style={{ textShadow: '0 0 24px rgba(255,200,0,0.8), 0 2px 8px rgba(0,0,0,0.6)' }}>
                {venue?.brand_name ?? venue?.name ?? t('welcome_title')}
              </h1>
              <p className="text-white/70 text-sm mt-1">{t('welcome_subtitle')}</p>
            </div>
            <PrizeWheel segments={segments} targetIndex={-1} spinning={false} onSpinEnd={() => {}} theme="carnival" />
            <button onClick={() => setPhase('review')}
              className="w-full py-5 rounded-2xl text-xl font-black text-purple-950 active:scale-95 transition-all shadow-2xl"
              style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 8px 32px rgba(255,140,0,0.5)' }}>
              {t('welcome_button')}
            </button>
          </div>
        )}

        {/* ===== REVIEW ===== */}
        {phase === 'review' && (
          <div className="animate-fade-up w-full flex flex-col items-center">
            <div style={{ filter: 'brightness(0.25)' }}>
              <PrizeWheel segments={segments} targetIndex={-1} spinning={false} onSpinEnd={() => {}} theme="carnival" />
            </div>
            <div className="w-full bg-white rounded-3xl shadow-2xl p-6 -mt-10 z-10 flex flex-col gap-4">
              <h2 className="text-xl font-black text-center text-gray-800">{t('feedback_title')}</h2>
              <p className="text-sm text-center text-gray-400">
                {locale === 'ru' ? 'чтобы открыть приз' : locale === 'en' ? 'to reveal your prize' : 'lai atklātu savu balvu'}
              </p>
              {questions.map(q => (
                <div key={q.id} className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-gray-600 text-center">{q.label}</p>
                  {q.type === 'stars'
                    ? <Stars value={answers[q.id] ?? 0} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
                    : <Thumbs value={answers[q.id] ?? null} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />}
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-400">{t('review_comment_label')}</label>
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)}
                  placeholder={t('review_comment_placeholder')}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <button
                onClick={handleReviewSubmit}
                disabled={saving || (questions.length > 0 && !questions.every(q => answers[q.id] != null))}
                className="mt-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all">
                {saving ? (locale === 'ru' ? 'Сохраняем...' : locale === 'en' ? 'Saving...' : 'Saglabā...') : t('review_button')}
              </button>
            </div>
          </div>
        )}

        {/* ===== SPIN ===== */}
        {phase === 'spin' && (
          <div className="animate-fade-up w-full flex flex-col items-center gap-5">
            <PrizeWheel segments={segments} targetIndex={targetIndex} spinning={wheelSpinning} onSpinEnd={handleSpinEnd} theme="carnival" />
            <button onClick={handleSpin} disabled={wheelSpinning || spinLoading}
              className="w-full py-5 rounded-2xl text-xl font-black text-purple-950 active:scale-95 transition-all shadow-2xl disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 8px 32px rgba(255,140,0,0.5)' }}>
              {spinLoading ? (locale === 'ru' ? 'Готовимся...' : locale === 'en' ? 'Loading...' : 'Gatavojas...') : t('spin_button')}
            </button>
          </div>
        )}

        {/* ===== REVEAL — QR: /redeem/{token} ===== */}
        {phase === 'reveal' && spinResult && (
          <>
            <PrizeWheel segments={segments} targetIndex={targetIndex} spinning={false} onSpinEnd={() => {}} theme="carnival" />
            {revealStage >= 1 && (
              <div className="animate-wow-bounce w-full text-center px-2">
                <p className="text-3xl font-black text-yellow-400 leading-tight"
                   style={{ textShadow: '0 0 24px rgba(212,175,55,0.9), 0 2px 8px rgba(0,0,0,0.5)' }}>
                  {t('reveal_wow')}
                </p>
              </div>
            )}
            {revealStage >= 2 && (
              <div className="animate-pop-in animate-gold-pulse w-full bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
                <p className="text-xs font-bold tracking-widest text-purple-400 uppercase text-center">{t('prize_title')}</p>
                <p className="text-3xl font-black text-purple-700 text-center leading-tight">{spinResult.prize_name}</p>
                {spinResult.expires_at && (
                  <p className="text-xs text-gray-400 text-center">
                    {t('prize_valid')}: {new Date(spinResult.expires_at).toLocaleString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                <button onClick={() => setPhase('done')}
                  className="mt-2 w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl active:scale-95 transition-all">
                  {t('next_button')}
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== DONE — pateicība + Google teksts + kupons (B) ===== */}
        {phase === 'done' && (
          <div className="animate-pop-in w-full flex flex-col gap-4">
            {/* Pateicība */}
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-2xl font-black text-gray-800">{t('thanks_visit')}</p>
            </div>

            {/* Google — tikai teksts, bez pogas/linka */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 text-center">
              <p className="text-white font-semibold text-sm leading-relaxed">{t('google_prompt')}</p>
              <p className="text-white/60 text-xs mt-2">{t('google_optional')}</p>
            </div>

            {/* Kupons (Variant B vai production ar discount) */}
            {hasCoupon && (
              <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-4">
                <p className="text-xs font-bold tracking-widest text-green-500 uppercase text-center">BONUSS</p>
                <p className="text-lg font-black text-gray-800 text-center">{t('coupon_title')}</p>

                {!voucherResult ? (
                  <>
                    <p className="text-sm text-gray-500 text-center">{t('coupon_phone_prompt')}</p>
                    <div className="flex gap-2">
                      <input
                        type="tel" inputMode="numeric" value={couponPhone}
                        onChange={e => setCouponPhone(e.target.value)}
                        placeholder="+371 2x xxx xxx"
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                      />
                      <button
                        onClick={handleIssueVoucher}
                        disabled={couponLoading || !couponPhone.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg disabled:opacity-40 active:scale-95 transition-all whitespace-nowrap">
                        {couponLoading ? '...' : t('voucher_send_btn')}
                      </button>
                    </div>
                    {couponErr && <p className="text-xs text-red-400 text-center">{couponErr}</p>}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    {voucherResult.discount_eur && (
                      <p className="text-4xl font-black text-green-600">-{voucherResult.discount_eur}€</p>
                    )}
                    {voucherQrUrl
                      ? <Image src={voucherQrUrl} alt="Kupona QR" width={200} height={200} unoptimized className="rounded-2xl shadow-md" />
                      : <div className="w-[200px] h-[200px] bg-gray-100 rounded-2xl animate-pulse" />}
                    <p className="text-sm text-gray-600 font-medium text-center">
                      {locale === 'en' ? 'Show at the register' : 'Uzrādi pie kases'}
                    </p>
                    {couponSent && <p className="text-xs text-green-600">✓ SMS nosūtīts</p>}
                    <p className="text-xs text-gray-400 text-center">{t('screenshot_hint')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
