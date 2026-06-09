'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import { sendPrizeSms } from '@/app/actions'
import PrizeWheel, { type WheelSegment } from '@/components/PrizeWheel'

// ---- Types ----

type Phase = 'idle' | 'review' | 'google' | 'spin' | 'reveal' | 'tip'

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

const DEFAULTS: Record<string, string> = {
  welcome_title:    'Paldies par apmeklējumu',
  welcome_subtitle: 'Novērtējiet mūs un grieziet laimes ratu ar balvām!',
  welcome_button:   'Sākt',
  review_intro:     'Kā bija?',
  review_button:    'Atklāt balvu',
  google_prompt:    'Atstāt atsauksmi Google',
  spin_button:      'Griezt!',
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

export default function Wheel({ venueSlug }: { venueSlug: string }) {
  const [phase,        setPhase]        = useState<Phase>('idle')
  const [loading,      setLoading]      = useState(true)
  const [prizes,       setPrizes]       = useState<Prize[]>([])
  const [venue,        setVenue]        = useState<Venue | null>(null)
  const [staff,        setStaff]        = useState<Staff[]>([])
  const [locale,       setLocale]       = useState('lv')
  const [copy,         setCopy]         = useState<Record<string, string>>({})
  const [smsPhone,     setSmsPhone]     = useState('')
  const [smsSending,   setSmsSending]   = useState(false)
  const [smsStatus,    setSmsStatus]    = useState<'idle' | 'sent' | 'error'>('idle')
  const [smsError,     setSmsError]     = useState('')
  const [spinResult,   setSpinResult]   = useState<SpinResult | null>(null)
  const [reviewId,     setReviewId]     = useState<string | null>(null)
  const [rating,       setRating]       = useState(0)
  const [comment,      setComment]      = useState('')
  const [saving,       setSaving]       = useState(false)
  const [qrDataUrl,    setQrDataUrl]    = useState('')
  const [tipDone,      setTipDone]      = useState(false)
  const [showQr,       setShowQr]       = useState(false)
  const [showSms,      setShowSms]      = useState(false)
  const [spinLoading,  setSpinLoading]  = useState(false)

  // Wheel animation state (passed to PrizeWheel)
  const [targetIndex,   setTargetIndex]   = useState(-1)
  const [wheelSpinning, setWheelSpinning] = useState(false)

  const sessionId = useRef('')

  function t(key: string) { return copy[key] ?? DEFAULTS[key] ?? key }

  // ---- Data loading ----
  useEffect(() => {
    sessionId.current = getSessionId()

    async function load() {
      const { data: v } = await supabase
        .from('venues').select('id, name, google_place_id, default_locale')
        .eq('slug', venueSlug).single()

      const devVenue: Venue = { id: 'dev', name: venueSlug, google_place_id: 'ChIJdev', default_locale: 'lv' }
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
        setStaff([{ id:'1', name:'Anna', stripe_tip_link:'#' }])
        setLoading(false); return
      }

      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.rpc('get_wheel_prizes', { p_venue_slug: venueSlug }),
        supabase.from('staff').select('id, name, stripe_tip_link')
          .eq('venue_id', v.id).eq('active', true),
      ])
      setVenue(v as Venue)
      setPrizes((p ?? devPrizes) as Prize[])
      setStaff((s ?? []) as Staff[])
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

  // Generate QR when reveal starts
  useEffect(() => {
    if (phase !== 'reveal' || !spinResult) return
    QRCode.toDataURL(`${window.location.origin}/redeem/${spinResult.qr_token}`,
      { width: 220, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } })
      .then(d => setQrDataUrl(d))
  }, [phase, spinResult])

  // ---- Handlers ----

  async function handleSpin() {
    if (!venue || wheelSpinning || spinLoading) return
    setSpinLoading(true)
    const { data } = await supabase.rpc('spin_wheel', {
      p_venue_slug: venueSlug, p_session_id: sessionId.current,
    })
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
    if (!rating || !venue) return
    setSaving(true)
    const rid = crypto.randomUUID()
    await supabase.from('reviews').insert({
      id: rid, venue_id: venue.id, session_id: sessionId.current,
      rating, comment: comment.trim() || null, google_redirected: false,
    })
    setReviewId(rid)
    setSaving(false)
    setPhase(rating >= 4 && venue.google_place_id ? 'google' : 'spin')
  }

  const handleSpinEnd = useCallback(() => {
    setWheelSpinning(false)
    setPhase('reveal')
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#D4AF37','#B91C1C','#FFF8E7','#7C3AED'] })
  }, [])

  async function handleSendSms() {
    if (!spinResult || !smsPhone.trim()) return
    setSmsSending(true)
    const { ok, error } = await sendPrizeSms(spinResult.qr_token, smsPhone.trim(), window.location.origin)
    setSmsSending(false)
    if (ok) setSmsStatus('sent')
    else { setSmsStatus('error'); setSmsError(error ?? 'SMS kļūda') }
  }

  async function handleGoogleReview() {
    if (reviewId) await supabase.from('reviews').update({ google_redirected: true }).eq('id', reviewId)
    window.open(`https://search.google.com/local/writereview?placeid=${venue!.google_place_id}`, '_blank')
    setPhase('spin')
  }

  // ---- Derived ----
  const segments: WheelSegment[] = prizes.map(p => ({ label: p.name, color: p.color }))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950">
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

        {/* ===== IDLE ===== */}
        {phase === 'idle' && (
          <div className="animate-fade-up w-full flex flex-col items-center gap-5">
            <div className="text-center">
              <h1 className="text-2xl font-black text-white tracking-tight">{venue?.name ?? t('welcome_title')}</h1>
              <p className="text-purple-300 text-sm mt-1">{t('welcome_subtitle')}</p>
            </div>
            <PrizeWheel segments={segments} targetIndex={-1} spinning={false} onSpinEnd={() => {}} />
            <button
              onClick={() => setPhase('review')}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xl font-black rounded-2xl shadow-lg shadow-purple-900/50 active:scale-95 transition-all"
            >
              {t('welcome_button')}
            </button>
          </div>
        )}

        {/* ===== REVIEW ===== */}
        {phase === 'review' && (
          <div className="animate-fade-up w-full flex flex-col items-center">
            <div style={{ filter: 'brightness(0.25)' }}>
              <PrizeWheel segments={segments} targetIndex={-1} spinning={false} onSpinEnd={() => {}} />
            </div>
            <div className="w-full bg-white rounded-3xl shadow-2xl p-6 -mt-10 z-10">
              <h2 className="text-xl font-black text-center text-gray-800">{t('review_intro')}</h2>
              <p className="text-sm text-center text-gray-400 mt-1 mb-5">
                {locale === 'en' ? 'to reveal your prize' : 'lai atklātu savu balvu'}
              </p>
              <Stars value={rating} onChange={setRating} />
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={locale === 'en' ? 'Comment (optional)' : 'Komentārs (nav obligāti)'}
                rows={3}
                className="w-full mt-4 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                onClick={handleReviewSubmit}
                disabled={!rating || saving}
                className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
              >
                {saving ? (locale === 'en' ? 'Saving...' : 'Saglabā...') : t('review_button')}
              </button>
            </div>
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
          <div className="animate-fade-up w-full flex flex-col items-center gap-5">
            <PrizeWheel
              segments={segments}
              targetIndex={targetIndex}
              spinning={wheelSpinning}
              onSpinEnd={handleSpinEnd}
            />
            <button
              onClick={handleSpin}
              disabled={wheelSpinning || spinLoading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xl font-black rounded-2xl shadow-lg shadow-purple-900/50 active:scale-95 transition-all disabled:opacity-60"
            >
              {spinLoading ? (locale === 'en' ? 'Loading...' : 'Gatavojas...') : t('spin_button')}
            </button>
          </div>
        )}

        {/* ===== REVEAL ===== */}
        {phase === 'reveal' && (
          <>
            <PrizeWheel
              segments={segments}
              targetIndex={targetIndex}
              spinning={false}
              onSpinEnd={() => {}}
            />
            <div className="animate-pop-in w-full bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
              <p className="text-xs font-bold tracking-widest text-purple-400 uppercase text-center">{t('prize_title')}</p>
              <p className="text-3xl font-black text-purple-700 text-center leading-tight">{spinResult?.prize_name}</p>

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
                    <Image src={qrDataUrl} alt="QR kods" width={220} height={220} unoptimized
                      className="rounded-2xl shadow-md" />
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
                    onClick={() => { if (staff[0]?.stripe_tip_link) window.open(staff[0].stripe_tip_link, '_blank'); setTipDone(true) }}
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
