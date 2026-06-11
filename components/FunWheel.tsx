'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import PrizeWheel, { type WheelSegment } from '@/components/PrizeWheel'

type Phase = 'welcome' | 'spinning' | 'reveal'

interface FunPrize {
  name: string
  probability_weight: number
  media_url: string | null
  prize_type: string | null
  color: string | null
}

const CARNIVAL_COLORS = ['#FF3B3B','#FF8C00','#FFD700','#00CC44','#00BFFF','#7B2FFF','#FF1493','#FF6B35']

const FALLBACK_PRIZES: FunPrize[] = [
  { name: 'Brīnums!',    probability_weight: 1, media_url: null, prize_type: null, color: '#FF3B3B' },
  { name: 'Pārsteigums!',probability_weight: 1, media_url: null, prize_type: null, color: '#FF8C00' },
  { name: 'Dāvana!',     probability_weight: 1, media_url: null, prize_type: null, color: '#FFD700' },
  { name: 'Laime!',      probability_weight: 1, media_url: null, prize_type: null, color: '#00CC44' },
  { name: 'Jautrība!',   probability_weight: 1, media_url: null, prize_type: null, color: '#00BFFF' },
  { name: 'Prieks!',     probability_weight: 1, media_url: null, prize_type: null, color: '#7B2FFF' },
]

function pickWeighted(prizes: FunPrize[]): number {
  const total = prizes.reduce((s, p) => s + (p.probability_weight ?? 1), 0)
  let r = Math.random() * total
  for (let i = 0; i < prizes.length; i++) {
    r -= prizes[i].probability_weight ?? 1
    if (r <= 0) return i
  }
  return prizes.length - 1
}

export default function FunWheel({ venueSlug }: { venueSlug: string }) {
  const [loading,       setLoading]       = useState(true)
  const [prizes,        setPrizes]        = useState<FunPrize[]>([])
  const [venueName,     setVenueName]     = useState('')
  const [locale,        setLocale]        = useState('lv')
  const [phase,         setPhase]         = useState<Phase>('welcome')
  const [targetIndex,   setTargetIndex]   = useState(-1)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [wonPrize,      setWonPrize]      = useState<FunPrize | null>(null)
  const [revealStage,   setRevealStage]   = useState<0 | 1 | 2>(0)
  const [flashAnim,     setFlashAnim]     = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: funPrizes }, { data: v }] = await Promise.all([
        supabase.rpc('get_fun_wheel', { p_slug: venueSlug }),
        supabase.from('venues').select('brand_name, default_locale').eq('slug', venueSlug).single(),
      ])
      setVenueName(v?.brand_name ?? venueSlug)
      setLocale(v?.default_locale ?? 'lv')
      setPrizes(((funPrizes as FunPrize[]) ?? []).length > 0 ? (funPrizes as FunPrize[]) : FALLBACK_PRIZES)
      setLoading(false)
    }
    load()
  }, [venueSlug])

  function handleSpin() {
    if (wheelSpinning || prizes.length === 0) return
    const idx = pickWeighted(prizes)
    setWonPrize(prizes[idx])
    setTargetIndex(idx)
    setRevealStage(0)
    setPhase('spinning')
    setTimeout(() => setWheelSpinning(true), 80)
  }

  const handleSpinEnd = useCallback(() => {
    const COLORS = ['#FF3B3B','#FF8C00','#FFD700','#00CC44','#00BFFF','#7B2FFF','#FF1493','#FF6B35','#FFFFFF']
    setWheelSpinning(false)
    setFlashAnim(true)
    setTimeout(() => setFlashAnim(false), 650)
    confetti({ particleCount: 200, spread: 100, origin: { x: 0.5, y: 0.55 }, colors: COLORS, scalar: 1.5 })
    setTimeout(() => confetti({ particleCount: 120, spread: 80, angle: 60,  origin: { x: 0.0, y: 0.6 }, colors: COLORS }), 100)
    setTimeout(() => confetti({ particleCount: 120, spread: 80, angle: 120, origin: { x: 1.0, y: 0.6 }, colors: COLORS }), 200)
    setTimeout(() => confetti({ particleCount: 160, spread: 120, origin: { x: 0.5, y: 0.3 },  gravity: 0.45, colors: COLORS }), 400)
    setTimeout(() => confetti({ particleCount: 90,  spread: 90,  origin: { x: 0.15, y: 0.5 }, colors: COLORS }), 700)
    setTimeout(() => confetti({ particleCount: 90,  spread: 90,  origin: { x: 0.85, y: 0.5 }, colors: COLORS }), 900)
    setTimeout(() => confetti({ particleCount: 140, spread: 110, origin: { x: 0.5, y: 0.6 },  gravity: 0.6,  colors: COLORS }), 1200)
    setTimeout(() => confetti({ particleCount: 70,  spread: 80,  origin: { x: 0.3, y: 0.4 },  colors: COLORS }), 1600)
    setTimeout(() => confetti({ particleCount: 70,  spread: 80,  origin: { x: 0.7, y: 0.4 },  colors: COLORS }), 1900)
    setPhase('reveal')
    setRevealStage(1)
    setTimeout(() => setRevealStage(2), 700)
  }, [])

  function handlePlayAgain() {
    setPhase('welcome')
    setRevealStage(0)
    setWonPrize(null)
    setTargetIndex(-1)
  }

  const carnivalSegments: WheelSegment[] = prizes.map((p, i) => ({
    label: p.name,
    color: p.color ?? CARNIVAL_COLORS[i % CARNIVAL_COLORS.length],
  }))

  const spinLabel   = locale === 'ru' ? '🎰 КРУТИТЬ!'      : locale === 'en' ? '🎰 SPIN!'        : '🎰 GRIEZT!'
  const againLabel  = locale === 'ru' ? '🎡 Крутить снова!' : locale === 'en' ? '🎡 Spin again!'  : '🎡 Griez vēlreiz!'
  const wonLabel    = wonPrize
    ? (locale === 'ru' ? `🎉 Ты выиграл: ${wonPrize.name}!`
      : locale === 'en' ? `🎉 You won: ${wonPrize.name}!`
      : `🎉 Tu ieguvi: ${wonPrize.name}!`)
    : ''
  const downloadLabel = locale === 'ru' ? '⬇ Скачать' : locale === 'en' ? '⬇ Download' : '⬇ Lejupielādēt'
  const loadingLabel  = locale === 'ru' ? 'Загружаем...' : locale === 'en' ? 'Loading...' : 'Gatavojas...'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-950 to-indigo-950">
      <p className="text-yellow-400 text-xl font-black animate-pulse">✨ {loadingLabel}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-purple-950 flex flex-col items-center px-4 pb-10 overflow-x-hidden">
      {flashAnim && <div className="fixed inset-0 bg-white animate-flash z-[200]" />}

      {/* Carnival stripe borders */}
      <div className="fixed top-0 left-0 right-0 h-3 z-50 pointer-events-none animate-carnival-stripe"
           style={{ background: 'linear-gradient(90deg,#FF3B3B,#FF8C00,#FFD700,#00CC44,#00BFFF,#7B2FFF,#FF1493,#FF3B3B)', backgroundSize: '200% 100%' }} />
      <div className="fixed bottom-0 left-0 right-0 h-3 z-50 pointer-events-none animate-carnival-stripe"
           style={{ background: 'linear-gradient(90deg,#7B2FFF,#00BFFF,#00CC44,#FFD700,#FF8C00,#FF3B3B,#FF1493,#7B2FFF)', backgroundSize: '200% 100%', animationDirection: 'reverse' }} />

      {/* Radial glow */}
      <div className="fixed inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(255,120,0,0.12), transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-sm pt-10 flex flex-col items-center gap-5">

        {/* Venue title */}
        <div className="text-center animate-fade-up">
          <p className="text-5xl mb-2">🎡</p>
          <h1 className="text-3xl font-black text-white leading-tight"
              style={{ textShadow: '0 0 24px rgba(255,200,0,0.8), 0 2px 8px rgba(0,0,0,0.6)' }}>
            {venueName}
          </h1>
        </div>

        {/* Language picker */}
        <div className="flex gap-2">
          {(['lv','en','ru'] as const).map(l => (
            <button key={l} onClick={() => setLocale(l)}
              className={`px-3 py-1 rounded-full text-sm font-bold transition-all border-2 ${
                locale === l
                  ? 'bg-yellow-400 text-purple-900 border-yellow-400'
                  : 'bg-transparent text-white border-white/40 hover:border-white/80'
              }`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Wheel — always mounted so rotation persists across phases */}
        <PrizeWheel
          segments={carnivalSegments}
          targetIndex={targetIndex}
          spinning={wheelSpinning}
          onSpinEnd={handleSpinEnd}
          theme="carnival"
        />

        {/* WELCOME: spin button */}
        {phase === 'welcome' && (
          <button
            onClick={handleSpin}
            disabled={prizes.length === 0}
            className="w-full py-5 rounded-2xl text-2xl font-black text-purple-950 active:scale-95 transition-all shadow-2xl disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 8px 32px rgba(255,140,0,0.5)' }}>
            {spinLabel}
          </button>
        )}

        {/* REVEAL: WOW title + prize card */}
        {phase === 'reveal' && wonPrize && (
          <>
            {revealStage >= 1 && (
              <div className="animate-wow-bounce w-full text-center px-2">
                <p className="text-3xl font-black leading-tight"
                   style={{ color: '#FFD700', textShadow: '0 0 30px rgba(255,200,0,1), 0 0 60px rgba(255,100,0,0.8), 0 2px 8px rgba(0,0,0,0.8)' }}>
                  {wonLabel}
                </p>
              </div>
            )}
            {revealStage >= 2 && (
              <div className="animate-pop-in w-full flex flex-col gap-4">
                {wonPrize.prize_type === 'virtual' && wonPrize.media_url && (
                  <div className="animate-gold-pulse bg-white rounded-3xl shadow-2xl p-4 flex flex-col items-center gap-3">
                    <Image
                      src={wonPrize.media_url}
                      alt={wonPrize.name}
                      width={260} height={260}
                      unoptimized
                      className="object-contain rounded-2xl"
                    />
                    <a href={wonPrize.media_url} download
                       className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-center active:scale-95 transition-all">
                      {downloadLabel}
                    </a>
                  </div>
                )}
                <button
                  onClick={handlePlayAgain}
                  className="w-full py-5 rounded-2xl text-2xl font-black text-purple-950 active:scale-95 transition-all shadow-2xl"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 8px 32px rgba(255,140,0,0.5)' }}>
                  {againLabel}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
