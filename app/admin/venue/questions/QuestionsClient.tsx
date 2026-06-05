'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { upsertQuestion, deleteQuestion, addPreset, reorderQuestion } from './actions'
import type { QuestionState } from './actions'

interface Question {
  id: string
  label: string
  type: string
  sort_order: number
  active: boolean
}

interface Props {
  questions: Question[]
  venueId: string
}

const PRESETS = [
  { label: 'Apkalpošana', type: 'stars' },
  { label: 'Atmosfēra', type: 'stars' },
  { label: 'Ēdiens', type: 'stars' },
  { label: 'Spēle', type: 'stars' },
  { label: 'Instruktors', type: 'stars' },
]

export default function QuestionsClient({ questions, venueId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)
  const [state, formAction, pending] = useActionState<QuestionState, FormData>(upsertQuestion, null)
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

  const nextSortOrder =
    questions.length > 0 ? Math.max(...questions.map(q => q.sort_order)) + 1 : 1

  return (
    <>
      {/* Presets — quick add */}
      <div className="mb-5">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Atrā pievienošana</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <form key={p.label} action={addPreset}>
              <input type="hidden" name="venueId" value={venueId} />
              <input type="hidden" name="label" value={p.label} />
              <input type="hidden" name="type" value={p.type} />
              <button
                type="submit"
                className="px-3 py-1.5 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-sm text-gray-700 rounded-xl transition-colors"
              >
                + {p.label}
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Novērtējumu jautājumi</h1>
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
              <th className="text-left px-4 py-3 text-gray-500 font-medium w-20">Kārtība</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Jautājums</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Tips</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Statuss</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => (
              <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <form action={reorderQuestion}>
                        <input type="hidden" name="venueId" value={venueId} />
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={i === 0}
                          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none px-0.5"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={reorderQuestion}>
                        <input type="hidden" name="venueId" value={venueId} />
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={i === questions.length - 1}
                          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none px-0.5"
                        >
                          ↓
                        </button>
                      </form>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{q.sort_order}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{q.label}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {q.type === 'stars' ? 'Zvaigznes' : 'Ikšķi'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      q.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {q.active ? 'aktīvs' : 'neaktīvs'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setEditing(q); setIsOpen(true) }}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      Rediģēt
                    </button>
                    <form action={deleteQuestion}>
                      <input type="hidden" name="venueId" value={venueId} />
                      <input type="hidden" name="id" value={q.id} />
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
            {questions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Nav jautājumu — pievienojiet no presetiem vai manuāli
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
              {editing ? 'Rediģēt jautājumu' : 'Pievienot jautājumu'}
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
                  Jautājums *
                </label>
                <input
                  name="label"
                  required
                  defaultValue={editing?.label ?? ''}
                  placeholder="Apkalpošana, Atmosfēra..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tips</label>
                  <select
                    name="type"
                    defaultValue={editing?.type ?? 'stars'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  >
                    <option value="stars">Zvaigznes (1–5)</option>
                    <option value="thumbs">Ikšķi (Jā/Nē)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kārtība</label>
                  <input
                    name="sort_order"
                    type="number"
                    min="0"
                    required
                    defaultValue={editing?.sort_order ?? nextSortOrder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aktīvs</label>
                <select
                  name="active"
                  defaultValue={String(editing?.active ?? true)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                >
                  <option value="true">Jā</option>
                  <option value="false">Nē</option>
                </select>
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
