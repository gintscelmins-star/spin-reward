'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CheckResult = 'active' | 'already_redeemed' | 'expired' | 'not_found'
type PageStatus = 'loading' | CheckResult | 'confirming' | 'redeemed'

interface CheckRow {
  result: CheckResult
  prize_name: string | null
  expires_at: string | null
}

export default function RedeemPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [status, setStatus] = useState<PageStatus>('loading')
  const [prizeName, setPrizeName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [token, setToken] = useState('')
  const called = useRef(false)

  useEffect(() => {
    // StrictMode guard — call check_spin exactly once
    if (called.current) return
    called.current = true

    params.then(({ token: t }) => {
      setToken(t)
      supabase
        .rpc('check_spin', { p_qr_token: t })
        .then(({ data }) => {
          const row = (data as CheckRow[] | null)?.[0]
          if (!row) { setStatus('not_found'); return }
          if (row.prize_name) setPrizeName(row.prize_name)
          if (row.expires_at) setExpiresAt(row.expires_at)
          setStatus(row.result)
        })
    })
  }, [params])

  async function handleConfirm() {
    setStatus('confirming')
    const { data } = await supabase.rpc('redeem_spin', { p_qr_token: token })
    const row = (data as { result: string }[] | null)?.[0]
    setStatus(row?.result === 'redeemed' ? 'redeemed' : 'already_redeemed')
  }

  // ---- Active: show prize + confirm button ----
  if (status === 'active') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-8 gap-8">
        <div className="text-center">
          <p className="text-2xl text-gray-500 font-medium">Balva</p>
          <p className="text-5xl font-black text-gray-900 mt-2 leading-tight">{prizeName}</p>
          {expiresAt && (
            <p className="mt-4 text-sm text-gray-400">
              Derīgs līdz{' '}
              {new Date(expiresAt).toLocaleString('lv-LV', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <button
          onClick={handleConfirm}
          className="w-full max-w-xs py-6 bg-green-500 hover:bg-green-600 active:scale-95 text-white text-3xl font-black rounded-3xl shadow-lg transition-all"
        >
          APSTIPRINĀT
        </button>
      </div>
    )
  }

  // ---- Confirming ----
  if (status === 'confirming') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-2xl animate-pulse">Apstrādā...</p>
      </div>
    )
  }

  // ---- Loading ----
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-2xl animate-pulse">Pārbauda...</p>
      </div>
    )
  }

  // ---- Terminal states ----
  const STATES = {
    redeemed:         { bg: 'bg-green-500',  text: 'text-white',       label: 'IZSNIEGT',          sub: prizeName },
    already_redeemed: { bg: 'bg-yellow-400', text: 'text-yellow-900',  label: 'JAU IZMANTOTS',     sub: 'Šis QR kods jau ir izmantots' },
    expired:          { bg: 'bg-gray-400',   text: 'text-white',       label: 'TERMIŅŠ BEIDZIES',  sub: 'Šī balva vairs nav derīga' },
    not_found:        { bg: 'bg-red-500',    text: 'text-white',       label: 'NEDERĪGS KODS',     sub: 'QR kods nav atpazīts' },
  } as const

  const cfg = STATES[status as keyof typeof STATES]

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${cfg.bg} ${cfg.text} px-8 gap-4`}>
      <p className="text-6xl font-black tracking-tight text-center leading-none">
        {cfg.label}
      </p>
      {cfg.sub && (
        <p className="text-2xl font-semibold text-center opacity-90">{cfg.sub}</p>
      )}
    </div>
  )
}
