'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtDateTime } from '@/lib/fmt'

type CheckResult = 'active' | 'already_redeemed' | 'expired' | 'not_found'
type PageStatus = 'loading' | CheckResult | 'confirming' | 'redeemed' | 'already_redeemed'

interface CheckRow {
  result: CheckResult
  prize_name: string | null
  expires_at: string | null
  booking_ref: string | null
  redeemed_at: string | null
}

interface RedeemRow {
  result: string
  booking_ref: string | null
  redeemed_at: string | null
}

export default function RedeemPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [status, setStatus] = useState<PageStatus>('loading')
  const [prizeName, setPrizeName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [bookingRef, setBookingRef] = useState('')
  const [redeemedAt, setRedeemedAt] = useState('')
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
          if (row.booking_ref) setBookingRef(row.booking_ref)
          if (row.redeemed_at) setRedeemedAt(row.redeemed_at)
          setStatus(row.result)
        })
    })
  }, [params])

  async function handleConfirm() {
    setStatus('confirming')
    const { data } = await supabase.rpc('redeem_spin', { p_qr_token: token })
    const row = (data as RedeemRow[] | null)?.[0]
    if (row?.result === 'redeemed') {
      if (row.booking_ref) setBookingRef(row.booking_ref)
      if (row.redeemed_at) setRedeemedAt(row.redeemed_at)
      setStatus('redeemed')
    } else {
      setStatus('already_redeemed')
    }
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

  // ---- Redeemed: persistent confirmation ----
  if (status === 'redeemed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-500 px-8 gap-6">
        <div className="text-white text-center">
          <p className="text-8xl font-black mb-4">✓</p>
          <p className="text-5xl font-black mb-6">IZSNIEGTS</p>
          <p className="text-3xl font-bold mb-4">{prizeName}</p>
          {redeemedAt && (
            <div className="bg-white/20 rounded-xl px-4 py-3 inline-block mb-4">
              <p className="text-sm opacity-90">Izsniegts: {fmtDateTime(redeemedAt)}</p>
              {bookingRef && <p className="text-sm opacity-90">Rēf: {bookingRef}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- Already redeemed ----
  if (status === 'already_redeemed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-400 text-yellow-900 px-8 gap-6">
        <div className="text-center">
          <p className="text-8xl font-black mb-4">⚠</p>
          <p className="text-4xl font-black mb-6">JAU IZSNIEGTS</p>
          {redeemedAt && (
            <div className="bg-white/30 rounded-xl px-4 py-3 inline-block">
              <p className="text-sm font-semibold">Izsniegts: {fmtDateTime(redeemedAt)}</p>
              {bookingRef && <p className="text-sm">{bookingRef}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- Expired ----
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-400 text-white px-8 gap-4">
        <p className="text-8xl font-black">⌛</p>
        <p className="text-5xl font-black">TERMIŅŠ BEIDZIES</p>
        <p className="text-2xl opacity-90">Šī balva vairs nav derīga</p>
      </div>
    )
  }

  // ---- Not found ----
  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-500 text-white px-8 gap-4">
        <p className="text-8xl font-black">❌</p>
        <p className="text-5xl font-black">NEDERĪGS KODS</p>
        <p className="text-2xl opacity-90">QR kods nav atpazīts</p>
      </div>
    )
  }

  return null
}
