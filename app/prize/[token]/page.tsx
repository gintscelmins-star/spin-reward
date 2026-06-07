'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'

type CheckResult = 'active' | 'already_redeemed' | 'expired' | 'not_found'
type PageStatus = 'loading' | CheckResult

interface CheckRow {
  result: CheckResult
  prize_name: string | null
  expires_at: string | null
}

export default function PrizePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [status, setStatus] = useState<PageStatus>('loading')
  const [prizeName, setPrizeName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [token, setToken] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    params.then(({ token: t }) => {
      setToken(t)
      supabase.rpc('check_spin', { p_qr_token: t }).then(({ data }) => {
        const row = (data as CheckRow[] | null)?.[0]
        if (!row) { setStatus('not_found'); return }
        if (row.prize_name) setPrizeName(row.prize_name)
        if (row.expires_at) setExpiresAt(row.expires_at)
        setStatus(row.result)

        if (row.result === 'active') {
          const origin = window.location.origin
          QRCode.toDataURL(`${origin}/redeem/${t}`, {
            width: 240, margin: 2,
            color: { dark: '#1a1a2e', light: '#ffffff' },
          }).then(d => setQrDataUrl(d))
        }
      })
    })
  }, [params])

  // ---- Loading ----
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-xl animate-pulse">Pārbauda...</p>
      </div>
    )
  }

  // ---- Active ----
  if (status === 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center px-6 py-12 gap-6">
        <div className="text-center">
          <p className="text-sm text-gray-400 font-medium tracking-wide uppercase">Tava balva</p>
          <p className="text-4xl font-black text-purple-700 mt-2 leading-tight">{prizeName}</p>
          {expiresAt && (
            <p className="mt-2 text-sm text-gray-400">
              Derīgs līdz{' '}
              {new Date(expiresAt).toLocaleString('lv-LV', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>

        {qrDataUrl ? (
          <Image
            src={qrDataUrl}
            alt="QR kods"
            width={240}
            height={240}
            unoptimized
            className="rounded-2xl shadow-lg"
          />
        ) : (
          <div className="w-[240px] h-[240px] bg-gray-100 rounded-2xl animate-pulse" />
        )}

        <div className="w-full max-w-xs bg-white rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-gray-600 font-medium">
            Uzrādi šo QR pie kases.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Saglabā šo lapu vai uztaisi ekrānšāviņu.
          </p>
        </div>
      </div>
    )
  }

  // ---- Terminal states ----
  const STATES = {
    already_redeemed: {
      bg: 'bg-yellow-400', text: 'text-yellow-900',
      label: 'JAU IZMANTOTA', sub: 'Šī balva jau ir izmantota',
    },
    expired: {
      bg: 'bg-gray-400', text: 'text-white',
      label: 'TERMIŅŠ BEIDZIES', sub: 'Šī balva vairs nav derīga',
    },
    not_found: {
      bg: 'bg-red-500', text: 'text-white',
      label: 'NEDERĪGS KODS', sub: 'QR kods nav atpazīts',
    },
  } as const

  const cfg = STATES[status as keyof typeof STATES]

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${cfg.bg} ${cfg.text} px-8 gap-4`}>
      <p className="text-5xl font-black tracking-tight text-center leading-none">{cfg.label}</p>
      <p className="text-xl font-semibold text-center opacity-90">{cfg.sub}</p>
    </div>
  )
}
