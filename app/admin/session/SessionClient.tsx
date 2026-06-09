'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { createSession } from './actions'
import type { SessionState } from './actions'

interface StaffMember { id: string; name: string }
interface Activity { id: string; name: string; default_staff_id: string | null }
interface Booking { id: string; customer_name: string | null; starts_at: string | null }

interface Props {
  staffList: StaffMember[]
  activities: Activity[]
  bookings: Booking[]
  venueId: string
}

export default function SessionClient({ staffList, activities, bookings, venueId }: Props) {
  const [state, formAction, pending] = useActionState<SessionState, FormData>(createSession, null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const prevPendingRef = useRef(false)

  const actById: Record<string, Activity> = {}
  for (const a of activities) actById[a.id] = a
  const autoStaffId = selectedActivityId ? (actById[selectedActivityId]?.default_staff_id ?? null) : null
  const autoStaffName = autoStaffId ? (staffList.find(s => s.id === autoStaffId)?.name ?? null) : null

  useEffect(() => {
    if (prevPendingRef.current && !pending && state?.sessionId) {
      setTimeout(() => setActiveSessionId(state.sessionId!), 0)
    }
    prevPendingRef.current = pending
  }, [pending, state])

  useEffect(() => {
    if (!activeSessionId) {
      setTimeout(() => setQrDataUrl(null), 0)
      return
    }
    const url = `${window.location.origin}/play?session=${activeSessionId}`
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(url, { width: 300, margin: 2 }).then(dataUrl => {
        setTimeout(() => setQrDataUrl(dataUrl), 0)
      })
    })
  }, [activeSessionId])

  if (activeSessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Sesija aktīva</p>
          <p className="text-2xl font-bold text-green-600">Parādi QR klientam</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Sesijas QR kods" className="w-72 h-72" />
          ) : (
            <div className="w-72 h-72 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <a
          href={`/play?session=${activeSessionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-purple-600 hover:underline font-mono mb-8 px-4 text-center break-all"
        >
          /play?session={activeSessionId}
        </a>

        <button
          onClick={() => setActiveSessionId(null)}
          className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg rounded-2xl transition-colors shadow-lg"
        >
          Jauna sesija →
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Aktivizēt Sesiju</h1>
          <p className="text-sm text-gray-400 mt-1">
            Izvēlies instruktoru un spēli, pēc tam parādi QR klientam
          </p>
        </div>

        {state?.error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {state.error}
          </div>
        )}

        <form action={formAction} className="bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
            <input type="hidden" name="venueId" value={venueId} />

            {activities.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spēle
                </label>
                <select
                  name="activity_id"
                  value={selectedActivityId}
                  onChange={e => setSelectedActivityId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-base"
                >
                  <option value="">— Izvēlies spēli —</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instruktors
                {autoStaffName && (
                  <span className="ml-2 text-purple-500 font-normal text-xs">
                    (auto: {autoStaffName})
                  </span>
                )}
              </label>
              {autoStaffId && (
                <input type="hidden" name="staff_id" value={autoStaffId} />
              )}
              <select
                name="staff_id"
                disabled={!!autoStaffId}
                defaultValue=""
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-base disabled:opacity-50"
              >
                <option value="">— Bez instruktora —</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {bookings.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Šodienas rezervācija
                </label>
                <select
                  name="booking_id"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-base"
                >
                  <option value="">— Bez rezervācijas —</option>
                  {bookings.map(b => {
                    const time = b.starts_at
                      ? new Date(b.starts_at).toLocaleTimeString('lv-LV', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''
                    return (
                      <option key={b.id} value={b.id}>
                        {time ? `${time} — ` : ''}{b.customer_name ?? '—'}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xl rounded-xl transition-colors mt-2 shadow"
            >
              {pending ? 'Aktivizē...' : 'AKTIVIZĒT SPIN'}
            </button>
        </form>
      </div>
    </div>
  )
}
