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
  google_place_id: string | null
  logo_url: string | null
  brand_name: string | null
  fixed_discount_enabled: boolean | null
  fixed_discount_eur: number | null
  fixed_discount_min_spend: number | null
  fixed_discount_days: number | null
}

export default function PrizePage({ params }: { params: Promise<{ token: string }> }) {
  const [status,       setStatus]       = useState<PageStatus>('loading')
  const [prizeName,    setPrizeName]    = useState('')
  const [expiresAt,    setExpiresAt]    = useState('')
  const [qrDataUrl,    setQrDataUrl]    = useState('')
  const [row,          setRow]          = useState<CheckRow | null>(null)
  const [couponExpiry, setCouponExpiry] = useState<string | null>(null)
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    params.then(({ token: t }) => {
      supabase.rpc('check_spin', { p_qr_token: t }).then(({ data }) => {
        const r = (data as CheckRow[] | null)?.[0]
        if (!r) { setStatus('not_found'); return }
        if (r.prize_name) setPrizeName(r.prize_name)
        if (r.expires_at) setExpiresAt(r.expires_at)
        setRow(r)
        setStatus(r.result)

        if (r.fixed_discount_enabled && r.fixed_discount_days) {
          setCouponExpiry(new Date(Date.now() + r.fixed_discount_days * 86400000)
            .toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric' }))
        }

        if (r.result === 'active') {
          QRCode.toDataURL(`${window.location.origin}/redeem/${t}`, {
            width: 240, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' },
          }).then(d => setQrDataUrl(d))
        }
      })
    })
  }, [params])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-xl animate-pulse">Pārbauda...</p>
    </div>
  )

  if (status === 'active') {
    const hasCoupon = !!(row?.fixed_discount_enabled && row?.fixed_discount_eur)

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center px-6 py-10 gap-6">
        {row?.logo_url && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={row.logo_url} alt={row.brand_name ?? ''} className="max-h-20 w-auto object-contain" />
          </div>
        )}

        {/* Prize */}
        <div className="text-center">
          <p className="text-sm text-gray-400 font-medium tracking-wide uppercase">Tava balva</p>
          <p className="text-4xl font-black text-purple-700 mt-2 leading-tight">{prizeName}</p>
          {expiresAt && (
            <p className="mt-2 text-sm text-gray-400">
              Derīgs līdz{' '}
              {new Date(expiresAt).toLocaleString('lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {qrDataUrl ? (
          <Image src={qrDataUrl} alt="QR kods" width={240} height={240} unoptimized className="rounded-2xl shadow-lg" />
        ) : (
          <div className="w-[240px] h-[240px] bg-gray-100 rounded-2xl animate-pulse" />
        )}

        <div className="w-full max-w-xs bg-white rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-gray-600 font-medium">Uzrādi šo QR pie kases.</p>
          <p className="text-xs text-gray-400 mt-1">Saglabā šo lapu vai uztaisi ekrānšāviņu.</p>
        </div>

        {/* Coupon */}
        {hasCoupon && (
          <div className="w-full max-w-xs bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <p className="text-xs font-bold tracking-widest text-green-600 uppercase mb-1">BONUSS</p>
            <p className="text-lg font-black text-gray-800">Atlaide nākamajai spēlei</p>
            <p className="text-4xl font-black text-green-600 my-2">-{row!.fixed_discount_eur}€</p>
            {row?.fixed_discount_min_spend && (
              <p className="text-xs text-gray-500">Min. pasūtījums {row.fixed_discount_min_spend}€</p>
            )}
            {couponExpiry && (
              <p className="text-xs text-gray-400 mt-1">Derīgs līdz {couponExpiry}</p>
            )}
            <p className="text-xs text-gray-500 mt-2 font-medium">Uzrādi šo lapu kasē</p>
          </div>
        )}

        {/* Google — neutral, always shown if venue has place_id */}
        {row?.google_place_id && (
          <div className="w-full max-w-xs bg-white rounded-2xl shadow p-5 text-center flex flex-col gap-3">
            <p className="text-sm font-bold text-gray-700">Patika pie mums? Padalieties pieredzē Google</p>
            <p className="text-xs text-gray-400">Neobligāti — tava balva un kupons jau ir tavi</p>
            <a
              href={`https://search.google.com/local/writereview?placeid=${row.google_place_id}`}
              target="_blank" rel="noopener noreferrer"
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all block text-sm"
            >
              Atvērt Google
            </a>
          </div>
        )}
      </div>
    )
  }

  const STATES = {
    already_redeemed: { bg: 'bg-yellow-400', text: 'text-yellow-900', label: 'JAU IZMANTOTA',     sub: 'Šī balva jau ir izmantota' },
    expired:          { bg: 'bg-gray-400',   text: 'text-white',      label: 'TERMIŅŠ BEIDZIES', sub: 'Šī balva vairs nav derīga' },
    not_found:        { bg: 'bg-red-500',    text: 'text-white',      label: 'NEDERĪGS KODS',    sub: 'QR kods nav atpazīts' },
  } as const

  const cfg = STATES[status as keyof typeof STATES]

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${cfg.bg} ${cfg.text} px-8 gap-4`}>
      <p className="text-5xl font-black tracking-tight text-center leading-none">{cfg.label}</p>
      <p className="text-xl font-semibold text-center opacity-90">{cfg.sub}</p>
    </div>
  )
}
