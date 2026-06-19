'use client'

import { useActionState, useState } from 'react'
import { savePrizes } from './actions'
import type { PrizesActionState } from './actions'

interface PrizeRow {
  name:   string
  weight: number
}

const DEFAULT_PRIZES: PrizeRow[] = [
  { name: 'Bezmaksas dzēriens',       weight: 30 },
  { name: '10% atlaide',              weight: 30 },
  { name: 'Bezmaksas porcija',        weight: 20 },
  { name: 'Labāk veiksmes nākamreiz', weight: 20 },
]

interface Props {
  initialPrizes?: PrizeRow[]
}

export default function PrizesForm({ initialPrizes }: Props) {
  const [state, formAction, pending] = useActionState<PrizesActionState, FormData>(savePrizes, null)
  const [prizes, setPrizes] = useState<PrizeRow[]>(
    initialPrizes && initialPrizes.length > 0 ? initialPrizes : DEFAULT_PRIZES
  )

  const total = prizes.reduce((s, p) => s + (p.weight || 0), 0)
  const totalOk = total === 100

  function updatePrize(i: number, field: keyof PrizeRow, value: string) {
    setPrizes(prev => prev.map((p, idx) =>
      idx === i
        ? { ...p, [field]: field === 'weight' ? (parseInt(value, 10) || 0) : value }
        : p
    ))
  }

  function addPrize() {
    if (prizes.length >= 8) return
    setPrizes(prev => [...prev, { name: '', weight: 0 }])
  }

  function removePrize(i: number) {
    if (prizes.length <= 2) return
    setPrizes(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Balvas</h2>
      <p className="text-sm text-gray-400 mb-6">
        Pievienojiet laimes rata balvas. Svaru summai jābūt 100%.
      </p>

      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        {/* Hidden fields for form submission */}
        {prizes.map((p, i) => (
          <input key={`hn-${i}`} type="hidden" name="prize_name"   value={p.name} />
        ))}
        {prizes.map((p, i) => (
          <input key={`hw-${i}`} type="hidden" name="prize_weight" value={String(p.weight)} />
        ))}

        {/* Prize rows */}
        <div className="flex flex-col gap-2">
          {prizes.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={p.name}
                onChange={e => updatePrize(i, 'name', e.target.value)}
                placeholder={`Balva ${i + 1}`}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm text-gray-800"
              />
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={p.weight || ''}
                  onChange={e => updatePrize(i, 'weight', e.target.value)}
                  className="w-16 px-2 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm text-center text-gray-800"
                />
                <span className="text-gray-400 text-sm">%</span>
              </div>
              <button
                type="button"
                onClick={() => removePrize(i)}
                disabled={prizes.length <= 2}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-20 transition-colors"
                aria-label="Noņemt balvu"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Total indicator */}
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium ${
          totalOk ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <span>Kopā:</span>
          <span className="font-bold">{total}% {totalOk ? '✓' : `(trūkst ${100 - total}%)`}</span>
        </div>

        {/* Add prize button */}
        {prizes.length < 8 && (
          <button
            type="button"
            onClick={addPrize}
            className="py-2.5 border-2 border-dashed border-purple-200 text-purple-600 text-sm font-medium rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors"
          >
            + Pievienot balvu
          </button>
        )}

        <button
          type="submit"
          disabled={pending || !totalOk || prizes.some(p => !p.name.trim())}
          className="mt-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
        >
          {pending ? 'Saglabā...' : 'Turpināt → Rats'}
        </button>
      </form>
    </div>
  )
}
