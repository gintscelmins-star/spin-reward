'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { upsertPrize, deletePrize } from './actions'
import type { PrizeState } from './actions'

interface Prize {
  id: string
  name: string
  description: string | null
  probability_weight: number
  total_available: number | null
  remaining: number | null
  expires_days: number
  active: boolean
  code: string | null
  stock: number | null
}

interface Props {
  prizes: Prize[]
  venueId: string
  totalWeight: number
}

// Prizes where stock is tracked (stock != null) and depleted or low
function stockBadge(p: Prize): React.ReactNode {
  if (p.stock == null) return null
  const remaining = p.remaining ?? p.stock
  if (remaining === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
        🚫 Nav krājuma
      </span>
    )
  }
  if (remaining <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
        ⚠ Krājums beidzas
      </span>
    )
  }
  return null
}

export default function PrizesClient({ prizes, venueId, totalWeight }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Prize | null>(null)
  const [state, formAction, pending] = useActionState<PrizeState, FormData>(upsertPrize, null)
  const prevPendingRef = useRef(false)
  const [highlightEmpty, setHighlightEmpty] = useState(false)

  // Prizes with stock=0 that are active
  const emptyActivePrizes = prizes.filter(
    p => p.active && p.stock != null && (p.remaining ?? p.stock) === 0
  )

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

  function openEdit(p: Prize) {
    setEditing(p)
    setIsOpen(true)
  }

  return (
    <>
      {/* Empty stock warning banner */}
      {emptyActivePrizes.length > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          <span className="text-xl">⚠</span>
          <div className="flex-1">
            <strong>{emptyActivePrizes.length} balv{emptyActivePrizes.length === 1 ? 'ai' : 'ām'} ir iztukšots krājums.</strong>
            {' '}Papildini vai deaktivizē.
          </div>
          <button
            onClick={() => setHighlightEmpty(h => !h)}
            className="text-xs text-red-600 hover:underline flex-shrink-0"
          >
            {highlightEmpty ? 'Slēpt' : 'Parādīt'}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Balvas</h1>
        <button
          onClick={openAdd}
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
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Kods</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Svars / %</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Krājums</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Derīg. (d)</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Statuss</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {prizes.map(p => {
              const pct = totalWeight > 0 ? Math.round((p.probability_weight / totalWeight) * 100) : 0
              const remaining = p.remaining ?? p.stock
              const stockPct = (p.stock != null && p.stock > 0 && remaining != null)
                ? Math.max(0, Math.round((remaining / p.stock) * 100))
                : null
              const isEmptyHighlighted = highlightEmpty && p.active && p.stock != null && remaining === 0
              return (
                <tr
                  key={p.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 ${isEmptyHighlighted ? 'bg-red-50/60 ring-1 ring-red-200' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-gray-400">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.code ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {p.probability_weight}
                    <span className="text-gray-400 text-xs ml-1">({pct}%)</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.stock == null ? (
                      <span className="text-gray-400">∞</span>
                    ) : (
                      <div className="min-w-[80px]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-sm font-medium ${remaining === 0 ? 'text-red-600' : remaining != null && remaining <= 5 ? 'text-orange-600' : 'text-gray-700'}`}>
                            {remaining ?? p.stock}
                          </span>
                          <span className="text-xs text-gray-400">/ {p.stock}</span>
                        </div>
                        {stockPct !== null && (
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-20">
                            <div
                              className={`h-full rounded-full transition-all ${
                                stockPct === 0 ? 'bg-red-500' :
                                stockPct <= 25 ? 'bg-orange-400' :
                                'bg-green-400'
                              }`}
                              style={{ width: `${stockPct}%` }}
                            />
                          </div>
                        )}
                        <div className="mt-1">
                          {stockBadge(p)}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.expires_days}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.active ? 'aktīvs' : 'neaktīvs'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        Rediģēt
                      </button>
                      <form action={deletePrize}>
                        <input type="hidden" name="venueId" value={venueId} />
                        <input type="hidden" name="id" value={p.id} />
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
            {prizes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Nav nevienas balvas — pievienojiet pirmo
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
              {editing ? 'Rediģēt balvu' : 'Pievienot balvu'}
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apraksts</label>
                <input
                  name="description"
                  defaultValue={editing?.description ?? ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kods / SKU
                  </label>
                  <input
                    name="code"
                    placeholder="piem. KAFIJA-01"
                    defaultValue={editing?.code ?? ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Krājums
                  </label>
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    placeholder="tukšs = ∞"
                    defaultValue={editing?.stock ?? ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Svars *
                    <span className="text-gray-400 font-normal ml-1">(lielāks = biežāk)</span>
                  </label>
                  <input
                    name="probability_weight"
                    type="number"
                    min="1"
                    required
                    defaultValue={editing?.probability_weight ?? 10}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kopā pieejams
                  </label>
                  <input
                    name="total_available"
                    type="number"
                    min="0"
                    placeholder="tukšs = ∞"
                    defaultValue={editing?.total_available ?? ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Derīgums (dienas) *
                  </label>
                  <input
                    name="expires_days"
                    type="number"
                    min="1"
                    required
                    defaultValue={editing?.expires_days ?? 30}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
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
