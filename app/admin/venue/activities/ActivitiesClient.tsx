'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { upsertActivity, deleteActivity, addActivityPreset, toggleUsesSessions } from './actions'
import type { ActivityState } from './actions'

interface Activity {
  id: string
  name: string
  active: boolean
  default_staff_id: string | null
}

interface StaffMember {
  id: string
  name: string
}

interface Props {
  activities: Activity[]
  staffList: StaffMember[]
  venueId: string
  usesSessions: boolean
}

const PRESETS = ['Lasertag', 'Airsoft', 'Reball', 'Kartingi', 'VR', 'Pixeli', 'Paintball']

export default function ActivitiesClient({ activities, staffList, venueId, usesSessions }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [state, formAction, pending] = useActionState<ActivityState, FormData>(upsertActivity, null)
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

  const staffById: Record<string, string> = {}
  for (const s of staffList) staffById[s.id] = s.name

  const existingNames = new Set(activities.map(a => a.name.toLowerCase()))

  return (
    <>
      {/* Sesiju plūsmas toggle */}
      <div className="bg-white rounded-2xl shadow p-5 mb-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800">Sesiju plūsma</p>
          <p className="text-sm text-gray-400 mt-0.5">
            Ieslēdz, ja venue izmanto staff-aktivētu sesiju modeli (piem. lasertag)
          </p>
        </div>
        <form action={toggleUsesSessions}>
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="uses_sessions" value={(!usesSessions).toString()} />
          <button
            type="submit"
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
              usesSessions ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                usesSessions ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </form>
      </div>

      {/* Presets */}
      <div className="mb-5">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Ātrā pievienošana</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.filter(p => !existingNames.has(p.toLowerCase())).map(p => (
            <form key={p} action={addActivityPreset}>
              <input type="hidden" name="venueId" value={venueId} />
              <input type="hidden" name="name" value={p} />
              <button
                type="submit"
                className="px-3 py-1.5 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-sm text-gray-700 rounded-xl transition-colors"
              >
                + {p}
              </button>
            </form>
          ))}
          {PRESETS.every(p => existingNames.has(p.toLowerCase())) && (
            <span className="text-sm text-gray-400 italic">Visi preset jau pievienoti</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Spēles / Aktivitātes</h1>
        <button
          onClick={() => { setEditing(null); setIsOpen(true) }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          + Pievienot
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Nosaukums</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Instruktors</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Statuss</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {activities.map(a => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {a.default_staff_id ? (staffById[a.default_staff_id] ?? '—') : (
                    <span className="text-gray-300">nav norādīts</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    a.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {a.active ? 'aktīvs' : 'neaktīvs'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <button
                      onClick={() => { setEditing(a); setIsOpen(true) }}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      Rediģēt
                    </button>
                    <form action={deleteActivity}>
                      <input type="hidden" name="venueId" value={venueId} />
                      <input type="hidden" name="id" value={a.id} />
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
            ))}
            {activities.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                  Nav aktivitāšu — pievienojiet no presetiem vai manuāli
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editing ? 'Rediģēt aktivitāti' : 'Pievienot aktivitāti'}
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
                  Nosaukums *
                </label>
                <input
                  name="name"
                  required
                  defaultValue={editing?.name ?? ''}
                  placeholder="Lasertag, Airsoft..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instruktors (pēc noklusējuma)
                </label>
                <select
                  name="default_staff_id"
                  defaultValue={editing?.default_staff_id ?? ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                >
                  <option value="">— Nav norādīts —</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
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
