'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import { sendPrizeSms } from '@/app/actions'
import PrizeWheel, { type WheelSegment } from '@/components/PrizeWheel'

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
  prize_valid:      'Derīgs līdz',
  prize_show:       'Uzrādi šo QR pie kases',
  tip_prompt:       'Izvēlies dzeramnaudu',
  tip_skip:         'Izlaist',
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
  const [prizeVisible, setPrizeVisible] = useState(false)
  const [qrDataUrl,    setQrDataUrl]    = useState('')
  const [tipPhase,     setTipPhase]     = useState<TipPhase>('picking')
  const [showCustom,   setShowCustom]   = useState(false)
  const [customAmt,    setCustomAmt]    = useState('')
  const [showGoogle,   setShowGoogle]   = useState(false)
  const [finished,     setFinished]     = useState(false)

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

  // Trigger wheel animation when entering reveal phase
  useEffect(() => {
    if (phase !== 'reveal' || !spinResult || !prizes.length) return
    const idx = Math.max(0, prizes.findIndex(p => p.name === spinResult.prize_name))
    const t1 = setTimeout(() => setTargetIndex(idx), 0)
    const t2 = setTimeout(() => setWheelSpinning(true), 80)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase, spinResult, prizes])

  // Generate QR when reveal starts
  useEffect(() => {
    if (phase !== 'reveal' || !spinResult) return
    QRCode.toDataURL(`${window.location.origin}/redeem/${spinResult.qr_token}`,
      { width: 220, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } })
      .then(d => setQrDataUrl(d))
  }, [phase, spinResult])

  // ---- Handlers ----

  async function handleSpin() {
    if (!venue) return
    const { data } = await supabase.rpc('spin_wheel', {
      p_venue_slug: venueSlug, p_session_id: sessionId.current,
    })
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
    const { data } = await supabase.from('reviews')
      .insert({ venue_id: venue.id, session_id: sessionId.current, rating, comment: comment.trim() || null, google_redirected: false })
      .select('id').single()
    if (data) setReviewId(data.id)
    setSaving(false)
    setPhase('reveal')
  }

  const handleSpinEnd = useCallback(() => {
    setWheelSpinning(false)
    setPrizeVisible(true)
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

  function goToTip() {
    if (!staff.length) {
      const eligible = rating >= 4 && !!venue?.google_place_id
      setTipPhase('post'); setShowGoogle(eligible)
      if (!eligible) setFinished(true)
    }
    setPhase('tip')
  }

  async function handleTip(amountCents: number) {
    if (!venue || !staff[0]) return
    await supabase.from('tips').insert({
      venue_id: venue.id, staff_id: staff[0].id,
      amount_cents: amountCents, currency: 'EUR', status: 'pending',
    })
    window.open(staff[0].stripe_tip_link, '_blank')
    afterTip()
  }

  function afterTip() {
    const eligible = rating >= 4 && !!venue?.google_place_id
    setTipPhase('post'); setShowGoogle(eligible)
    if (!eligible) setFinished(true)
  }

  async function handleGoogleReview() {
    if (reviewId) await supabase.from('reviews').update({ google_redirected: true }).eq('id', reviewId)
    window.open(`https://search.google.com/local/writereview?placeid=${venue!.google_place_id}`, '_blank')
    setFinished(true)
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
              onClick={handleSpin}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xl font-black rounded-2xl shadow-lg shadow-purple-900/50 active:scale-95 transition-all"
            >
              {t('spin_button')}
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

        {/* ===== REVEAL ===== */}
        {phase === 'reveal' && (
          <>
            <PrizeWheel
              segments={segments}
              targetIndex={targetIndex}
              spinning={wheelSpinning}
              onSpinEnd={handleSpinEnd}
            />
            {prizeVisible && (
              <div className="animate-pop-in w-full bg-white rounded-3xl shadow-2xl p-6 text-center">
                <p className="text-xs font-bold tracking-widest text-purple-400 uppercase">{t('prize_title')}</p>
                <p className="text-3xl font-black text-purple-700 mt-2 leading-tight">{spinResult?.prize_name}</p>
                {qrDataUrl ? (
                  <Image src={qrDataUrl} alt="QR kods" width={220} height={220} unoptimized
                    className="mx-auto mt-4 rounded-2xl shadow-md" />
                ) : (
                  <div className="mx-auto mt-4 w-[220px] h-[220px] bg-gray-100 rounded-2xl animate-pulse" />
                )}
                <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                  {t('prize_show')}
                  {spinResult?.expires_at && (
                    <> · {t('prize_valid')}{' '}
                      {new Date(spinResult.expires_at).toLocaleString(
                        locale === 'en' ? 'en-GB' : 'lv-LV',
                        { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }
                      )}
                    </>
                  )}
                </p>
                <div className="mt-4 border-t border-gray-100 pt-4 text-left">
                  <p className="text-xs font-semibold text-gray-500 mb-2 text-center">
                    {locale === 'en' ? 'Save your prize' : 'Saglabā savu balvu'}
                  </p>
                  <a href={`/prize/${spinResult?.qr_token}`} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-2.5 text-sm font-bold text-purple-600 border-2 border-purple-200 rounded-xl hover:bg-purple-50 transition-colors text-center">
                    {locale === 'en' ? 'Open prize page' : 'Atvērt balvas lapu'}
                  </a>
                  <div className="mt-2 flex gap-2">
                    <input type="tel" value={smsPhone} onChange={e => setSmsPhone(e.target.value)}
                      placeholder="+371 2x xxx xxx"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    <button onClick={handleSendSms}
                      disabled={smsSending || !smsPhone.trim() || smsStatus === 'sent'}
                      className="px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg disabled:opacity-40 active:scale-95 transition-all whitespace-nowrap">
                      {smsSending ? '...' : smsStatus === 'sent'
                        ? (locale === 'en' ? 'Sent!' : 'Nosūtīts!')
                        : (locale === 'en' ? 'Send SMS' : 'Sūtīt SMS')}
                    </button>
                  </div>
                  {smsStatus === 'error' && <p className="mt-1 text-xs text-red-400">{smsError}</p>}
                </div>
                <button onClick={goToTip}
                  className="mt-5 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-all">
                  {locale === 'en' ? 'Next' : 'Tālāk'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== TIP ===== */}
        {phase === 'tip' && (
          <>
            {tipPhase === 'picking' && (
              <div className="animate-fade-up w-full bg-white rounded-3xl shadow-xl p-6 text-center">
                <p className="text-xl font-black text-gray-800">
                  {locale === 'en' ? `Thank ${staff[0]?.name}?` : `Vēlies pateikties ${staff[0]?.name}?`}
                </p>
                <p className="text-sm text-gray-400 mt-1 mb-6">{t('tip_prompt')}</p>
                {!showCustom ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[100, 200, 500].map(cents => (
                      <button key={cents} onClick={() => handleTip(cents)}
                        className="py-4 text-lg font-bold border-2 border-purple-200 rounded-xl hover:bg-purple-50 hover:border-purple-500 active:scale-95 transition-all">
                        €{cents / 100}
                      </button>
                    ))}
                    <button onClick={() => setShowCustom(true)}
                      className="py-4 text-lg font-bold border-2 border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
                      {locale === 'en' ? 'Other' : 'Cita'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center border-2 border-purple-200 rounded-xl px-4 py-2">
                      <span className="text-gray-400 font-bold mr-1">€</span>
                      <input type="number" min="0.5" step="0.5" value={customAmt}
                        onChange={e => setCustomAmt(e.target.value)} placeholder="0.00" autoFocus
                        className="flex-1 text-xl font-bold focus:outline-none" />
                    </div>
                    <button onClick={() => { const c = Math.round(parseFloat(customAmt)*100); if (c>0) handleTip(c) }}
                      disabled={!customAmt || parseFloat(customAmt) <= 0}
                      className="py-3 bg-purple-600 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all">
                      {locale === 'en' ? 'Confirm' : 'Apstiprināt'}
                    </button>
                    <button onClick={() => setShowCustom(false)} className="py-2 text-sm text-gray-400">
                      {locale === 'en' ? 'Back' : 'Atpakaļ'}
                    </button>
                  </div>
                )}
                <button onClick={afterTip}
                  className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  {t('tip_skip')}
                </button>
              </div>
            )}

            {tipPhase === 'post' && !finished && showGoogle && (
              <div className="animate-fade-up w-full bg-white rounded-3xl shadow-xl p-6 text-center">
                <p className="text-xl font-black text-gray-800">{locale === 'en' ? 'Thank you!' : 'Paldies!'}</p>
                <p className="text-sm text-gray-400 mt-1 mb-6">
                  {locale === 'en' ? 'Your review helps others find the best places' : 'Tavs viedoklis palīdz citiem atrast labākās vietas'}
                </p>
                <button onClick={handleGoogleReview}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all">
                  {t('google_prompt')}
                </button>
                <button onClick={() => setFinished(true)}
                  className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  {t('tip_skip')}
                </button>
              </div>
            )}

            {(finished || (tipPhase === 'post' && !showGoogle)) && (
              <div className="animate-pop-in w-full bg-white rounded-3xl shadow-xl p-10 text-center">
                <p className="text-4xl mb-2">🎉</p>
                <p className="text-3xl font-black text-gray-800">{t('end_title')}</p>
                <p className="text-gray-400 mt-2 text-sm">
                  {locale === 'en' ? 'Thank you for your visit' : 'Paldies par apmeklējumu'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
