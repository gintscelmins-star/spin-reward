'use client'

import { useActionState, useState } from 'react'
import { completeOnboarding } from './actions'
import type { WheelActionState } from './actions'
import type { WheelSegment } from '@/components/PrizeWheel'
import dynamic from 'next/dynamic'

// Lazy-load PrizeWheel to avoid SSR issues
const PrizeWheel = dynamic(() => import('@/components/PrizeWheel'), { ssr: false })

interface Prize { name: string; probability_weight: number }

interface Props {
  venueName: string
  prizes:    Prize[]
}

const SEGMENT_COLORS = [
  '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95',
  '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE',
]

export default function WheelForm({ venueName, prizes }: Props) {
  const [state, formAction, pending] = useActionState<WheelActionState, FormData>(completeOnboarding, null)
  const [wheelName, setWheelName] = useState(`${venueName} laimes rats`)

  const segments: WheelSegment[] = prizes.map((p, i) => ({
    label: p.name,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }))

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Priekšskatījums</h2>
      <p className="text-sm text-gray-400 mb-6">Tā izskatīsies jūsu laimes rats</p>

      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      {/* Wheel preview */}
      <div className="flex justify-center mb-6">
        <PrizeWheel
          segments={segments}
          targetIndex={-1}
          spinning={false}
          onSpinEnd={() => {}}
          theme="default"
        />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700" htmlFor="wheel_name">
            Rata nosaukums
          </label>
          <input
            id="wheel_name"
            name="wheel_name"
            type="text"
            value={wheelName}
            onChange={e => setWheelName(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
          />
        </div>

        {/* Prize summary */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Balvas</p>
          <div className="flex flex-col gap-1">
            {prizes.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{p.name}</span>
                <span className="text-gray-400 font-mono">{p.probability_weight}%</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all text-base"
        >
          {pending ? 'Izveido...' : 'Pabeigt un iet uz dashboard →'}
        </button>
      </form>
    </div>
  )
}
