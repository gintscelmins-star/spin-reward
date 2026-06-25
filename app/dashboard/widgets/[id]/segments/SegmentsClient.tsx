'use client'

import { useState, useEffect, useRef, useActionState } from 'react'
import { upsertSegment, deleteSegment } from '../../actions'
import type { ActionState } from '../../actions'

interface Segment {
  id: string
  label: string
  color: string
  prize_type: string
  prize_value: number | null
  prize_description: string | null
  prize_code: string | null
  auto_code: boolean
  probability_weight: number
  stock: number | null
  expires_days: number
  active: boolean
  sort_order: number
}

interface Props {
  wheelId: string
  segments: Segment[]
  totalWeight: number
}

const PRIZE_TYPES = [
  { value: 'discount_pct', label: 'Discount %' },
  { value: 'discount_eur', label: 'Discount €' },
  { value: 'free_product', label: 'Free Product' },
  { value: 'gift', label: 'Gift / Physical Prize' },
  { value: 'retry', label: 'Try Again (no win)' },
  { value: 'custom', label: 'Custom' },
]

function Toggle({
  name,
  label,
  defaultValue = false,
  onChange,
}: {
  name: string
  label: string
  defaultValue?: boolean
  onChange?: (v: boolean) => void
}) {
  const [on, setOn] = useState(defaultValue)
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input type="hidden" name={name} value={on ? 'true' : 'false'} />
        <button
          type="button"
          onClick={() => {
            setOn(v => {
              onChange?.(!v)
              return !v
            })
          }}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            on ? 'bg-purple-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              on ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

export default function SegmentsClient({ wheelId, segments, totalWeight }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Segment | null>(null)
  const [autoCode, setAutoCode] = useState(true)
  const [state, formAction, pending] = useActionState<ActionState, FormData>(upsertSegment, null)
  const prevPendingRef = useRef(false)

  useEffect(() => {
    if (prevPendingRef.current && !pending && !state?.error) {
      setTimeout(() => { setIsOpen(false); setEditing(null) }, 0)
    }
    prevPendingRef.current = pending
  }, [pending, state])

  function openAdd() {
    setEditing(null)
    setAutoCode(true)
    setIsOpen(true)
  }

  function openEdit(s: Segment) {
    setEditing(s)
    setAutoCode(s.auto_code)
    setIsOpen(true)
  }

  const PALETTE = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#3b82f6', '#06b6d4',
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {segments.length} segment{segments.length !== 1 ? 's' : ''} · total weight {totalWeight}
        </p>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          + Add Segment
        </button>
      </div>

      {/* Probability bar */}
      {segments.length > 0 && totalWeight > 0 && (
        <div className="mb-5">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Probability Distribution</p>
          <div className="flex h-6 rounded-full overflow-hidden gap-px bg-gray-100">
            {segments.filter(s => s.active && s.probability_weight > 0).map(s => (
              <div
                key={s.id}
                title={`${s.label}: ${Math.round((s.probability_weight / totalWeight) * 100)}%`}
                style={{
                  width: `${(s.probability_weight / totalWeight) * 100}%`,
                  backgroundColor: s.color || '#6366f1',
                  minWidth: '2px',
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {segments.filter(s => s.active).map(s => (
              <span key={s.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color || '#6366f1' }}
                />
                {s.label}
                <span className="text-gray-400 font-mono">
                  {totalWeight > 0 ? Math.round((s.probability_weight / totalWeight) * 100) : 0}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Segment</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Prize</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Code</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Weight</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Stock</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {segments.map(s => {
              const pct = totalWeight > 0 ? Math.round((s.probability_weight / totalWeight) * 100) : 0
              return (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color || '#6366f1' }}
                      />
                      <div>
                        <p className="font-medium text-gray-800">{s.label}</p>
                        {s.prize_description && (
                          <p className="text-xs text-gray-400">{s.prize_description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {PRIZE_TYPES.find(p => p.value === s.prize_type)?.label ?? s.prize_type}
                    </span>
                    {s.prize_value != null && (
                      <span className="ml-1 text-xs text-gray-500">
                        {s.prize_value}{s.prize_type === 'discount_pct' ? '%' : s.prize_type === 'discount_eur' ? '€' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {s.auto_code ? (
                      <span className="text-indigo-500">auto</span>
                    ) : (
                      s.prize_code ?? '—'
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {s.probability_weight}
                    <span className="text-gray-400 text-xs ml-1">({pct}%)</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.stock == null ? '∞' : s.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        Edit
                      </button>
                      <form action={deleteSegment}>
                        <input type="hidden" name="wheel_id" value={wheelId} />
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="text-xs text-red-400 hover:text-red-600 hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
            {segments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No segments yet — add your first prize segment
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editing ? 'Edit Segment' : 'Add Segment'}
            </h2>

            {state?.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {state.error}
              </div>
            )}

            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="wheel_id" value={wheelId} />
              {editing && <input type="hidden" name="id" value={editing.id} />}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                  <input
                    name="label"
                    required
                    defaultValue={editing?.label ?? ''}
                    placeholder="e.g. 20% OFF"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      name="color"
                      type="color"
                      defaultValue={editing?.color ?? '#6366f1'}
                      className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 p-0.5"
                    />
                    <div className="flex flex-wrap gap-1">
                      {PALETTE.slice(0, 6).map(c => (
                        <div
                          key={c}
                          className="w-5 h-5 rounded-full cursor-pointer border-2 border-white shadow-sm"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prize Type *</label>
                  <select
                    name="prize_type"
                    defaultValue={editing?.prize_type ?? 'discount_pct'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  >
                    {PRIZE_TYPES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prize Value</label>
                  <input
                    name="prize_value"
                    type="number"
                    min={0}
                    defaultValue={editing?.prize_value ?? ''}
                    placeholder="e.g. 20"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    name="prize_description"
                    defaultValue={editing?.prize_description ?? ''}
                    placeholder="Shown to user after spin"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl px-4">
                <Toggle
                  name="auto_code"
                  label="Auto-generate prize code"
                  defaultValue={editing?.auto_code ?? true}
                  onChange={v => setAutoCode(v)}
                />
              </div>

              {!autoCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prize Code</label>
                  <input
                    name="prize_code"
                    defaultValue={editing?.prize_code ?? ''}
                    placeholder="e.g. SUMMER20"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight *
                    <span className="text-gray-400 font-normal ml-1 text-xs">(higher = more likely)</span>
                  </label>
                  <input
                    name="probability_weight"
                    type="number"
                    min={1}
                    required
                    defaultValue={editing?.probability_weight ?? 10}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock
                    <span className="text-gray-400 font-normal ml-1 text-xs">(blank = ∞)</span>
                  </label>
                  <input
                    name="stock"
                    type="number"
                    min={0}
                    defaultValue={editing?.stock ?? ''}
                    placeholder="∞"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires (days)</label>
                  <input
                    name="expires_days"
                    type="number"
                    min={1}
                    defaultValue={editing?.expires_days ?? 30}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl px-4">
                <Toggle
                  name="active"
                  label="Active"
                  defaultValue={editing?.active ?? true}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  {pending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
