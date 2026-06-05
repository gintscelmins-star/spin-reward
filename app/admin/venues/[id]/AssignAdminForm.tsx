'use client'

import { useActionState } from 'react'
import { assignClientAdmin } from '../actions'

interface State {
  tempPassword?: string
  error?: string
}

export default function AssignAdminForm({ venueId }: { venueId: string }) {
  const [state, formAction, pending] = useActionState<State | null, FormData>(
    assignClientAdmin,
    null
  )

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="venueId" value={venueId} />
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          placeholder="klients@example.com"
          required
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-colors"
        >
          {pending ? '...' : 'Piešķirt'}
        </button>
      </div>
      {state?.error && (
        <p className="text-red-500 text-sm">{state.error}</p>
      )}
      {state?.tempPassword && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
          <p className="text-sm font-medium text-green-700">Konts izveidots!</p>
          <p className="text-sm text-gray-700">
            Pagaidu parole:{' '}
            <span className="font-mono font-bold tracking-wider">{state.tempPassword}</span>
          </p>
          <p className="text-xs text-gray-400">Nodod klientam drošā veidā. Parole jāmaina pirmajā pieslēgšanās reizē.</p>
        </div>
      )}
    </form>
  )
}
