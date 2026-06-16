'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { createSession } from './actions'
import type { SessionState } from './actions'

interface StaffMember { id: string; name: string }
interface Activity { id: string; name: string; default_staff_id: string | null }
interface Booking { id: string; customer_name: string | null; starts_at: string | null }

interface SessionItem {
  id: string
  staff_id: string | null
  activity_id: string | null
  created_at: string
  qrDataUrl: string | null
  isNew?: boolean
}

interface Props {
  staffList: StaffMember[]
  activities: Activity[]
  venueId: string
  todaySessions: Omit<SessionItem, 'qrDataUrl' | 'isNew'>[]
}

export default function SessionClient({ staffList, activities, venueId, todaySessions }: Props) {
  const [state, formAction, pending] = useActionState<SessionState, FormData>(createSession, null)
  const [sessions, setSessions] = useState<SessionItem[]>(() =>
    todaySessions.map(s => ({ ...s, qrDataUrl: null }))
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const prevPendingRef = useRef(false)
  const submitParamsRef = useRef<{ staffId: string | null; activityId: string | null }>({
    staffId: null,
    activityId: null,
  })

  const actById: Record<string, Activity> = {}
  for (const a of activities) actById[a.id] = a
  const autoStaffId = selectedActivityId ? (actById[selectedActivityId]?.default_staff_id ?? null) : null
  const autoStaffName = autoStaffId ? (staffList.find(s => s.id === autoStaffId)?.name ?? null) : null

  useEffect(() => {
    if (prevPendingRef.current && !pending && state?.sessionId) {
      const sid = state.sessionId!
      const newItem: SessionItem = {
        id: sid,
        staff_id: submitParamsRef.current.staffId,
        activity_id: submitParamsRef.current.activityId,
        created_at: new Date().toISOString(),
        qrDataUrl: null,
        isNew: true,
      }
      setSessions(prev => [newItem, ...prev])
      setExpandedId(sid)
      generateQr(sid)
    }
    prevPendingRef.current = pending
  }, [pending, state])

  useEffect(() => {
    sessions.forEach(s => {
      if (!s.qrDataUrl) generateQr(s.id)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateQr(sessionId: string) {
    const url = `${window.location.origin}/play?session=${sessionId}`
    const QRCode = await import('qrcode')
    const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 })
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, qrDataUrl: dataUrl } : s))
  }

  function staffName(id: string | null) {
    if (!id) return null
    return staffList.find(s => s.id === id)?.name ?? null
  }

  function actName(id: string | null) {
    if (!id) return null
    return activities.find(a => a.id === id)?.name ?? null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Aktivizēt Sesiju</h1>
          <p className="text-sm text-gray-400 mt-1">
            Izvēlies instruktoru un spēli, pēc tam parādi QR klientam
          </p>
        </div>

        {state?.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {state.error}
          </div>
        )}

        <form
          action={formAction}
          onSubmit={() => {
            submitParamsRef.current = {
              staffId: autoStaffId ?? (selectedStaffId || null),
              activityId: selectedActivityId || null,
            }
          }}
          className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4"
        >
          <input type="hidden" name="venueId" value={venueId} />

          {activities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Spēle</label>
              <select
                name="activity_id"
                value={selectedActivityId}
                onChange={e => setSelectedActivityId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-sm"
              >
                <option value="">— Izvēlies spēli —</option>
                {activities.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Instruktors
              {autoStaffName && (
                <span className="ml-1.5 text-purple-500 font-normal text-xs">(auto: {autoStaffName})</span>
              )}
            </label>
            {autoStaffId && <input type="hidden" name="staff_id" value={autoStaffId} />}
            <select
              name="staff_id"
              disabled={!!autoStaffId}
              value={autoStaffId ? autoStaffId : selectedStaffId}
              onChange={e => !autoStaffId && setSelectedStaffId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-sm disabled:opacity-50"
            >
              <option value="">— Bez instruktora —</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>


          <button
            type="submit"
            disabled={pending}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition-colors shadow"
          >
            {pending ? 'Aktivizē...' : 'AKTIVIZĒT SPIN'}
          </button>
        </form>

        {/* Today's session list */}
        {sessions.length > 0 ? (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
              Šodienas sesijas ({sessions.length})
            </p>
            <div className="space-y-3">
              {sessions.map(s => {
                const sName = staffName(s.staff_id)
                const aName = actName(s.activity_id)
                const time = new Date(s.created_at).toLocaleTimeString('lv-LV', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const isExpanded = expandedId === s.id

                return (
                  <div
                    key={s.id}
                    className={`bg-white rounded-2xl shadow transition-all ${s.isNew ? 'ring-2 ring-purple-400' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left"
                    >
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {time}
                          {sName && <span className="text-gray-500 font-normal"> · {sName}</span>}
                          {aName && <span className="text-gray-500 font-normal"> · {aName}</span>}
                        </p>
                        {s.isNew && (
                          <span className="text-[10px] text-purple-500 font-semibold uppercase tracking-wider">
                            Jauna sesija
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-xs ml-3">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-gray-50 pt-4 flex flex-col items-center gap-3">
                        {s.qrDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.qrDataUrl} alt="QR kods" className="w-56 h-56 rounded-xl" />
                        ) : (
                          <div className="w-56 h-56 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <a
                          href={`/play?session=${s.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:underline font-mono break-all text-center px-2"
                        >
                          /play?session={s.id}
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-4">
            Šodien vēl nav aktivizētu sesiju
          </p>
        )}

      </div>
    </div>
  )
}
