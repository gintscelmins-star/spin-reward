'use client'

import { useState } from 'react'
import PrizeWheel from '@/components/PrizeWheel'
import type { WheelSegment } from '@/components/PrizeWheel'

type Phase = 'welcome' | 'form' | 'spinning' | 'reveal'

interface WheelConfig {
  id: string
  name: string
  slug: string
  style_theme: string | null
  brand_color: string | null
  logo_url: string | null
  show_powered_by: boolean | null
  form_show_name: boolean | null
  form_show_phone: boolean | null
  form_require_name: boolean | null
  form_require_phone: boolean | null
  gdpr_text: string | null
  survey_enabled: boolean | null
  locale: string | null
}

interface Segment {
  id: string
  label: string
  color: string | null
  sort_order: number
}

interface FormField {
  id: string
  field_type: string
  label: string
  placeholder: string | null
  required: boolean
}

interface SpinResult {
  segment: {
    label: string
    color: string
    prize_type: string
    prize_value: number | null
    prize_description: string | null
  }
  prize_code: string | null
  segment_index: number
}

interface Props {
  wheel: WheelConfig
  segments: Segment[]
  formFields: FormField[]
  isPopup: boolean
}

const COPY = {
  lv: {
    headline: 'Griez un uzvar!',
    sub: 'Ievadi e-pastu un griez ratu',
    email: 'E-pasts',
    name: 'Vārds',
    phone: 'Tālrunis',
    spin: 'Griezt ratu',
    spinning: 'Griežas...',
    won: 'Tu uzvarēji!',
    copy: 'Kopēt kodu',
    copied: 'Nokopēts!',
    close: 'Aizvērt',
    retry: 'Mēģini vēlreiz!',
    already: 'Tu jau esi piedalījies šajā kampaņā.',
    err: 'Kļūda. Lūdzu, mēģini vēlreiz.',
    email_err: 'Ievadi derīgu e-pasta adresi.',
    powered: 'Powered by Spillit',
  },
  en: {
    headline: 'Spin & Win!',
    sub: 'Enter your email and spin the wheel',
    email: 'Email',
    name: 'Name',
    phone: 'Phone',
    spin: 'Spin the Wheel',
    spinning: 'Spinning...',
    won: 'You Won!',
    copy: 'Copy Code',
    copied: 'Copied!',
    close: 'Close',
    retry: 'Try Again!',
    already: 'You have already participated.',
    err: 'Error. Please try again.',
    email_err: 'Please enter a valid email address.',
    powered: 'Powered by Spillit',
  },
  ru: {
    headline: 'Крути и выигрывай!',
    sub: 'Введите email и покрутите колесо',
    email: 'E-mail',
    name: 'Имя',
    phone: 'Телефон',
    spin: 'Крутить колесо',
    spinning: 'Крутится...',
    won: 'Вы выиграли!',
    copy: 'Скопировать код',
    copied: 'Скопировано!',
    close: 'Закрыть',
    retry: 'Попробуйте ещё раз!',
    already: 'Вы уже участвовали в этой кампании.',
    err: 'Ошибка. Попробуйте ещё раз.',
    email_err: 'Введите корректный email.',
    powered: 'Powered by Spillit',
  },
  lt: {
    headline: 'Sukite ir laimėkite!',
    sub: 'Įveskite el. paštą ir sukite ratą',
    email: 'El. paštas',
    name: 'Vardas',
    phone: 'Telefonas',
    spin: 'Sukti ratą',
    spinning: 'Sukasi...',
    won: 'Jūs laimėjote!',
    copy: 'Kopijuoti kodą',
    copied: 'Nukopijuota!',
    close: 'Uždaryti',
    retry: 'Bandykite dar kartą!',
    already: 'Jūs jau dalyvavote šioje kampanijoje.',
    err: 'Klaida. Bandykite dar kartą.',
    email_err: 'Įveskite teisingą el. pašto adresą.',
    powered: 'Powered by Spillit',
  },
} as const

export default function WheelPage({ wheel, segments, formFields, isPopup }: Props) {
  const locale = (wheel.locale ?? 'lv') as keyof typeof COPY
  const t = COPY[locale] ?? COPY.lv
  const brandColor = wheel.brand_color ?? '#6366f1'
  const isDark = wheel.style_theme === 'dark'
  const isFestive = wheel.style_theme === 'festive'
  const wheelTheme = isFestive ? 'carnival' : 'default'

  const wheelSegments: WheelSegment[] = segments.length > 0
    ? segments.map(s => ({ label: s.label, color: s.color ?? undefined }))
    : [{ label: '?' }]

  const [phase, setPhase] = useState<Phase>('welcome')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null)
  const [targetIndex, setTargetIndex] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleClose() {
    if (isPopup) window.parent.postMessage({ type: 'spillit:close' }, '*')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = (fd.get('email') as string).trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.email_err)
      return
    }

    setSubmitting(true)
    setError(null)

    const form_data: Record<string, string> = {}
    formFields.forEach(f => {
      const val = fd.get(`field_${f.id}`) as string | null
      if (val) form_data[f.id] = val
    })

    try {
      const res = await fetch('/api/w/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: wheel.slug,
          email,
          name: (fd.get('name') as string)?.trim() || undefined,
          phone: (fd.get('phone') as string)?.trim() || undefined,
          form_data: Object.keys(form_data).length ? form_data : undefined,
          gdpr_consent: fd.get('gdpr_consent') === 'on',
          locale: wheel.locale ?? 'lv',
          referrer_url: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
        }),
      })

      const data = await res.json()
      setSubmitting(false)

      if (!res.ok) {
        setError(data.error === 'already_spun' ? t.already : t.err)
        return
      }

      setSpinResult(data)
      setTargetIndex(data.segment_index)
      setPhase('spinning')
      setTimeout(() => setSpinning(true), 80)
    } catch {
      setError(t.err)
      setSubmitting(false)
    }
  }

  function handleSpinEnd() {
    setPhase('reveal')
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 130, spread: 70, origin: { y: 0.55 } })
    })
    try { localStorage.setItem('spillit_' + wheel.slug, String(Date.now())) } catch {}
  }

  async function copyCode() {
    if (!spinResult?.prize_code) return
    try {
      await navigator.clipboard.writeText(spinResult.prize_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const isLight = !isDark && !isFestive
  const bgClass = isDark
    ? 'bg-gray-950 text-white'
    : isFestive
    ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 text-white'
    : 'bg-gray-50 text-gray-900'
  const cardClass = isDark || isFestive
    ? 'bg-white/10 backdrop-blur-sm text-white'
    : 'bg-white text-gray-900'
  const subTextClass = isDark || isFestive ? 'text-white/60' : 'text-gray-500'
  const labelClass = isDark || isFestive ? 'text-white/80' : 'text-gray-700'

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-center p-4 gap-3 ${bgClass}`}>
      {isPopup && (
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-sm text-white/80 hover:text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      )}

      {wheel.logo_url && (
        <img src={wheel.logo_url} alt={wheel.name} className="h-9 object-contain" />
      )}

      {(phase === 'welcome' || phase === 'spinning' || phase === 'reveal') && (
        <PrizeWheel
          segments={wheelSegments}
          targetIndex={targetIndex}
          spinning={spinning}
          onSpinEnd={handleSpinEnd}
          theme={wheelTheme}
        />
      )}

      {/* Welcome */}
      {phase === 'welcome' && (
        <div className="text-center max-w-xs w-full">
          <h1 className="text-2xl font-black mb-1" style={{ color: isLight ? brandColor : undefined }}>
            {t.headline}
          </h1>
          <p className={`text-sm mb-5 ${subTextClass}`}>{t.sub}</p>
          <button
            onClick={() => setPhase('form')}
            className="w-full py-3 px-6 rounded-2xl text-white font-bold text-lg shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: brandColor }}
          >
            {t.spin}
          </button>
        </div>
      )}

      {/* Form */}
      {phase === 'form' && (
        <div className={`w-full max-w-sm rounded-2xl shadow-xl p-6 ${cardClass}`}>
          <h2 className={`text-base font-bold mb-4 ${labelClass}`}>{t.sub}</h2>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                {t.email} *
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900 bg-white"
              />
            </div>

            {wheel.form_show_name && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                  {t.name}{wheel.form_require_name ? ' *' : ''}
                </label>
                <input
                  name="name"
                  type="text"
                  required={wheel.form_require_name ?? false}
                  autoComplete="name"
                  placeholder={t.name}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900 bg-white"
                />
              </div>
            )}

            {wheel.form_show_phone && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                  {t.phone}{wheel.form_require_phone ? ' *' : ''}
                </label>
                <input
                  name="phone"
                  type="tel"
                  required={wheel.form_require_phone ?? false}
                  autoComplete="tel"
                  placeholder="+371 ..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900 bg-white"
                />
              </div>
            )}

            {wheel.survey_enabled && formFields.map(f => (
              <div key={f.id}>
                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                  {f.label}{f.required ? ' *' : ''}
                </label>
                {f.field_type === 'question_rating' ? (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <label key={n} className="cursor-pointer">
                        <input
                          type="radio"
                          name={`field_${f.id}`}
                          value={String(n)}
                          required={f.required}
                          className="sr-only peer"
                        />
                        <span className="flex w-9 h-9 items-center justify-center rounded-full border-2 border-gray-200 text-sm font-medium text-gray-700 transition-colors peer-checked:bg-purple-600 peer-checked:border-purple-600 peer-checked:text-white hover:border-purple-400 cursor-pointer">
                          {n}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    name={`field_${f.id}`}
                    required={f.required}
                    placeholder={f.placeholder ?? ''}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900 bg-white"
                  />
                )}
              </div>
            ))}

            {wheel.gdpr_text && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  name="gdpr_consent"
                  type="checkbox"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-purple-600"
                />
                <span className={`text-xs leading-relaxed ${subTextClass}`}>
                  {wheel.gdpr_text}
                </span>
              </label>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setError(null); setPhase('welcome') }}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  isDark || isFestive
                    ? 'border-white/20 text-white/70 hover:bg-white/10'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                ←
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-2xl text-white font-bold text-sm shadow transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:scale-100"
                style={{ backgroundColor: brandColor }}
              >
                {submitting ? '...' : t.spin}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Spinning */}
      {phase === 'spinning' && (
        <p className={`text-lg font-bold ${subTextClass}`}>{t.spinning}</p>
      )}

      {/* Reveal */}
      {phase === 'reveal' && spinResult && (
        <div className={`w-full max-w-sm rounded-2xl shadow-xl p-6 text-center ${cardClass}`}>
          <p className="text-3xl font-black mb-1" style={{ color: isLight ? brandColor : undefined }}>
            {spinResult.segment.prize_type === 'retry' ? t.retry : t.won}
          </p>
          <p className="text-xl font-bold mb-1">{spinResult.segment.label}</p>
          {spinResult.segment.prize_description && (
            <p className={`text-sm mb-4 ${subTextClass}`}>
              {spinResult.segment.prize_description}
            </p>
          )}

          {spinResult.prize_code && spinResult.segment.prize_type !== 'retry' && (
            <div className="mb-4">
              <div className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-dashed font-mono text-lg font-bold tracking-widest ${
                isDark || isFestive ? 'border-white/30' : 'border-gray-300 bg-gray-50 text-gray-800'
              }`}>
                <span>{spinResult.prize_code}</span>
                <button
                  onClick={copyCode}
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: copied ? '#10b981' : brandColor }}
                >
                  {copied ? t.copied : t.copy}
                </button>
              </div>
            </div>
          )}

          {isPopup && (
            <button
              onClick={handleClose}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isDark || isFestive
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {t.close}
            </button>
          )}
        </div>
      )}

      {wheel.show_powered_by !== false && (
        <p className={`text-xs ${subTextClass} opacity-50`}>{t.powered}</p>
      )}
    </div>
  )
}
