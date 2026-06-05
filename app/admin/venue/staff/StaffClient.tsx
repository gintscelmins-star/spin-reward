'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { upsertStaff, toggleStaffActive } from './actions'
import type { StaffState } from './actions'

interface Staff {
  id: string
  name: string
  role: string | null
  phone: string | null
  stripe_tip_link: string | null
  daily_spin_limit: number | null
  staff_code: string | null
  active: boolean
}

interface Props {
  staff: Staff[]
  venueId: string
  seats: number
  activeCount: number
}

export default function StaffClient({ staff, venueId, seats, activeCount }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [state, formAction, pending] = useActionState<StaffState, FormData>(upsertStaff, null)
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

  function openAdd() {
    setEditing(null)
    setIsOpen(true)
  }

  function openEdit(s: Staff) {
    setEditing(s)
    setIsOpen(true)
  }

  const atLimit = activeCount >= seats

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Personāls</h1>
          <p className={`text-sm mt-0.5 ${atLimit ? 'text-orange-600' : 'text-gray-400'}`}>
            {activeCount}/{seats} vietas aizņemtas
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={atLimit}
          title={atLimit ? 'Sasniegts vietu limits' : undefined}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors"
        >
          + Pievienot
        </button>
      </div>

      {atLimit && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm">
          Sasniegts apmaksāto vietu ({seats}) limits. Lai pievienotu vairāk, palielini seats vai
          sazinies ar administratoru.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Vārds</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Loma</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Kods</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Tip karte</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Spini/d</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Statuss</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-gray-500">{s.role ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600 tracking-wider">
                  {s.staff_code ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {s.stripe_tip_link ? (
                    <a
                      href={s.stripe_tip_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-600 hover:underline text-xs"
                    >
                      link
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{s.daily_spin_limit ?? '∞'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s.active ? 'aktīvs' : 'neaktīvs'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      Rediģēt
                    </button>
                    <form action={toggleStaffActive}>
                      <input type="hidden" name="venueId" value={venueId} />
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={(!s.active).toString()} />
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-gray-700 hover:underline"
                      >
                        {s.active ? 'Atslēgt' : 'Ieslēgt'}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Nav neviena darbinieka — pievienojiet pirmo
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
              {editing ? 'Rediģēt darbinieku' : 'Pievienot darbinieku'}
            </h2>

            {state?.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {state.error}
              </div>
            )}

            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="venueId" value={venueId} />
              {editing && <input type="hidden" name="id" value={editing.id} />}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vārds *</label>
                  <input
                    name="name"
                    required
                    defaultValue={editing?.name ?? ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loma</label>
                  <input
                    name="role"
                    placeholder="Viesmīlis..."
                    defaultValue={editing?.role ?? ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefons</label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={editing?.phone ?? ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tip karte (saite)
                </label>
                <input
                  name="stripe_tip_link"
                  type="url"
                  placeholder="https://revolut.me/..."
                  defaultValue={editing?.stripe_tip_link ?? ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spini/dienā
                  </label>
                  <input
                    name="daily_spin_limit"
                    type="number"
                    min="1"
                    placeholder="tukšs = ∞"
                    defaultValue={editing?.daily_spin_limit ?? ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                {editing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aktīvs</label>
                    <select
                      name="active"
                      defaultValue={String(editing.active)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                    >
                      <option value="true">Jā</option>
                      <option value="false">Nē</option>
                    </select>
                  </div>
                )}
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
