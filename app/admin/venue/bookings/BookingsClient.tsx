'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertBooking, deleteBooking } from './actions'
import type { BookingState } from './actions'

interface Activity { id: string; name: string }
interface Booking {
  id: string
  customer_name: string | null
  customer_phone: string | null
  activity_id: string | null
  starts_at: string | null
  ends_at: string | null
  source: string
}

interface Props {
  bookings: Booking[]
  activities: Activity[]
  venueId: string
  date: string
}

function toLocalDatetime(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

export default function BookingsClient({ bookings, activities, venueId, date }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Booking | null>(null)
  const [state, formAction, pending] = useActionState<BookingState, FormData>(upsertBooking, null)
  const prevPendingRef = useRef(false)

  useEffect(() => {
    if (prevPendingRef.current && !pending && !state?.error) {
      setTimeout(() => {
        setIsOpen(false)
        setEditing(null)
      }, 0)
    }
    prevPendingRef.current = pending
  }, [pending, state])

  const navToDate = (d: string) => {
    const p = new URLSearchParams({ venueId, date: d })
    router.push(`/admin/venue/bookings?${p.toString()}`)
  }

  const prevDay = new Date(date + 'T12:00:00Z')
  prevDay.setUTCDate(prevDay.getUTCDate() - 1)
  const nextDay = new Date(date + 'T12:00:00Z')
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Rezervācijas</h1>
        <button
          onClick={() => { setEditing(null); setIsOpen(true) }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          + Pievienot
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navToDate(prevDay.toISOString().split('T')[0])}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm"
        >
          ←
        </button>
        <span className="font-mono text-gray-700 text-sm">{date}</span>
        <button
          onClick={() => navToDate(nextDay.toISOString().split('T')[0])}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm"
        >
          →
        </button>
        {date !== today && (
          <button
            onClick={() => navToDate(today)}
            className="text-xs text-purple-600 hover:underline ml-2"
          >
            Šodiena
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Laiks</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Klients</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Spēle</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Avots</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => {
              const activityName = activities.find(a => a.id === b.activity_id)?.name ?? '—'
              const startTime = b.starts_at
                ? new Date(b.starts_at).toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })
                : '—'
              const endTime = b.ends_at
                ? new Date(b.ends_at).toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })
                : null
              return (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">
                    {startTime}{endTime ? ` – ${endTime}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{b.customer_name ?? '—'}</p>
                    {b.customer_phone && (
                      <p className="text-xs text-gray-400">{b.customer_phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{activityName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.source === 'manual' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {b.source === 'manual' ? 'manuāls' : b.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => { setEditing(b); setIsOpen(true) }}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        Rediģēt
                      </button>
                      <form action={deleteBooking}>
                        <input type="hidden" name="venueId" value={venueId} />
                        <input type="hidden" name="id" value={b.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-400 hover:text-red-600 hover:underline"
                        >
                          Dzēst
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Nav rezervāciju šai datumā
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editing ? 'Rediģēt rezervāciju' : 'Pievienot rezervāciju'}
            </h2>

            {state?.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {state.error}
              </div>
            )}

            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="venueId" value={venueId} />
              {editing && <input type="hidden" name="id" value={editing.id} />}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Klienta vārds *
                </label>
                <input
                  name="customer_name"
                  required
                  defaultValue={editing?.customer_name ?? ''}
                  placeholder="Jānis Bērziņš"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tālrunis
                </label>
                <input
                  name="customer_phone"
                  type="tel"
                  defaultValue={editing?.customer_phone ?? ''}
                  placeholder="+371 2000 0000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {activities.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spēle
                  </label>
                  <select
                    name="activity_id"
                    defaultValue={editing?.activity_id ?? ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  >
                    <option value="">— Nav norādīta —</option>
                    {activities.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sākums *
                  </label>
                  <input
                    name="starts_at"
                    type="datetime-local"
                    required
                    defaultValue={toLocalDatetime(editing?.starts_at ?? null) || `${date}T10:00`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beigas
                  </label>
                  <input
                    name="ends_at"
                    type="datetime-local"
                    defaultValue={toLocalDatetime(editing?.ends_at ?? null)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                >
                  Atcelt
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  {pending ? 'Saglabā...' : 'Saglabāt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
