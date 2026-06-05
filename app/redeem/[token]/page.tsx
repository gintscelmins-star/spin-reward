'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type RedeemStatus = 'loading' | 'redeemed' | 'already_redeemed' | 'expired' | 'not_found'

interface RedeemResult {
  result: 'redeemed' | 'already_redeemed' | 'expired' | 'not_found'
  prize_name?: string
}

const CONFIG: Record<Exclude<RedeemStatus, 'loading'>, {
  bg: string
  text: string
  label: string
  sub: string
}> = {
  redeemed: {
    bg: 'bg-green-500',
    text: 'text-white',
    label: 'IZSNIEGT',
    sub: '',
  },
  already_redeemed: {
    bg: 'bg-yellow-400',
    text: 'text-yellow-900',
    label: 'JAU IZMANTOTS',
    sub: 'Šis QR kods jau ir izmantots',
  },
  expired: {
    bg: 'bg-gray-400',
    text: 'text-white',
    label: 'TERMIŅŠ BEIDZIES',
    sub: 'Šī balva vairs nav derīga',
  },
  not_found: {
    bg: 'bg-red-500',
    text: 'text-white',
    label: 'NEDERĪGS KODS',
    sub: 'QR kods nav atpazīts',
  },
}

export default function RedeemPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [status, setStatus] = useState<RedeemStatus>('loading')
  const [prizeName, setPrizeName] = useState('')
  const called = useRef(false)

  useEffect(() => {
    // StrictMode guard — call RPC exactly once
    if (called.current) return
    called.current = true

    params.then(({ token }) => {
      supabase
        .rpc('redeem_spin', { p_qr_token: token })
        .then(({ data }) => {
          const row = (data as RedeemResult[] | null)?.[0]
          if (!row) { setStatus('not_found'); return }
          if (row.prize_name) setPrizeName(row.prize_name)
          setStatus(row.result)
        })
    })
  }, [params])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-2xl animate-pulse">Pārbauda...</p>
      </div>
    )
  }

  const cfg = CONFIG[status]

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${cfg.bg} ${cfg.text} px-8`}>
      <p className="text-6xl font-black tracking-tight text-center leading-none">
        {cfg.label}
      </p>
      {status === 'redeemed' && prizeName && (
        <p className="mt-6 text-3xl font-bold text-center">{prizeName}</p>
      )}
      {cfg.sub && (
        <p className="mt-4 text-lg text-center opacity-80">{cfg.sub}</p>
      )}
    </div>
  )
}
