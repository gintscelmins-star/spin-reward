'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import QRCode from 'qrcode'
import { activateBooking } from './actions'

export interface BookingRow {
  id: string
  customer_name: string | null
  customer_phone: string | null
  starts_at: string | null
  activity_id: string | null
  activity_name: string | null
  default_staff_id: string | null
  staff_name: string | null
  existing_session_id: string | null
  existing_session_status: string | null
}

interface Props {
  bookings: BookingRow[]
  venueId: string
}

interface ActiveState {
  sessionId: string
  qrDataUrl: string
  playUrl: string
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return ''
  return d.toLocaleDateString('lv-LV', { weekday: 'short', day: 'numeric', month: 'numeric' }) + ' '
}

export default function TodayClient({ bookings, venueId }: Props) {
  const [activated, setActivated] = useState<Record<string, ActiveState>>(() => {
    // Pre-populate existing sessions so QR can be generated on demand
    const init: Record<string, ActiveState> = {}
    return init
  })
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  async function handleActivate(b: BookingRow) {
    setLoading(l => ({ ...l, [b.id]: true }))

    const sessionId = b.existing_session_id ??
      (await activateBooking(b.id, venueId, b.activity_id, b.default_staff_id)).sessionId

    if (sessionId) {
      const playUrl = `${window.location.origin}/play?session=${sessionId}`
      const qrDataUrl = await QRCode.toDataURL(playUrl, {
        width: 220, margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      })
      setActivated(a => ({ ...a, [b.id]: { sessionId, qrDataUrl, playUrl } }))
      setExpanded(e => ({ ...e, [b.id]: true }))
    }

    setLoading(l => ({ ...l, [b.id]: false }))
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">Nav rezervāciju šodien</p>
        <p className="text-sm mt-1">Tuvākās 7 dienas ir tukšas</p>
        <Link href="/admin/venue/bookings" className="mt-4 inline-block text-sm text-purple-500 hover:underline">
          Pievienot rezervāciju →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bookings.map(b => {
        const act = activated[b.id]
        const isLoading = loading[b.id] ?? false
        const isExpanded = expanded[b.id] ?? false
        const alreadyHasSession = !!b.existing_session_id
        const sessionStatus = b.existing_session_status

        return (
          <div key={b.id} className="bg-white rounded-2xl shadow overflow-hidden">
            {/* Row */}
            <div className="flex items-center gap-3 px-4 py-4">
              {/* Time */}
              <div className="text-center min-w-[52px]">
                <p className="text-xs text-gray-400">{fmtDate(b.starts_at)}</p>
                <p className="text-base font-bold text-gray-800 leading-none">{fmtTime(b.starts_at)}</p>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">
                  {b.customer_name ?? '—'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {b.activity_name ?? 'Nav spēles'}
                  {b.staff_name ? ` · ${b.staff_name}` : ''}
                  {b.customer_phone ? ` · ${b.customer_phone}` : ''}
                </p>
              </div>

              {/* Status / Action */}
              <div className="flex items-center gap-2 shrink-0">
                {act || alreadyHasSession ? (
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [b.id]: !isExpanded }))}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                      sessionStatus === 'used'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {sessionStatus === 'used' ? 'Izmantots' : isExpanded ? 'Aizvērt' : 'QR ↓'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(b)}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    {isLoading ? '...' : 'Aktivizēt'}
                  </button>
                )}
              </div>
            </div>

            {/* QR expand panel */}
            {isExpanded && act && (
              <div className="border-t border-gray-100 px-4 py-5 flex flex-col items-center gap-3 bg-gray-50">
                <Image
                  src={act.qrDataUrl}
                  alt="QR"
                  width={200}
                  height={200}
                  unoptimized
                  className="rounded-xl shadow"
                />
                <a
                  href={act.playUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-500 hover:underline font-mono break-all text-center"
                >
                  {act.playUrl}
                </a>
                <p className="text-xs text-gray-400 text-center">
                  Parādi QR klientam pie kases
                </p>
              </div>
            )}

            {/* Already has session but not yet loaded — show load QR button */}
            {isExpanded && !act && alreadyHasSession && (
              <div className="border-t border-gray-100 px-4 py-5 flex flex-col items-center gap-3 bg-gray-50">
                <button
                  onClick={() => handleActivate(b)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl disabled:opacity-50"
                >
                  {isLoading ? 'Ielādē...' : 'Ielādēt QR'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
