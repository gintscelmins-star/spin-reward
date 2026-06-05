'use client'

import { useActionState } from 'react'
import { resetClientAdminPassword, deleteClientAdmin } from '../actions'

interface ResetState {
  tempPassword?: string
  error?: string
}

interface Props {
  userId: string
  email: string
  venueId: string
}

export default function AdminActionsRow({ userId, email, venueId }: Props) {
  const [state, resetAction, pending] = useActionState<ResetState | null, FormData>(
    resetClientAdminPassword,
    null
  )

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <span className="text-sm text-gray-700 font-mono flex-1 truncate">{email}</span>

        <form action={resetAction}>
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-blue-500 hover:text-blue-700 hover:underline disabled:opacity-40 whitespace-nowrap"
          >
            {pending ? '...' : 'Atiestatīt paroli'}
          </button>
        </form>

        <form
          action={deleteClientAdmin}
          onSubmit={(e) => {
            if (!confirm(`Dzēst administratoru ${email}? Šo darbību nevar atcelt.`)) {
              e.preventDefault()
            }
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="venueId" value={venueId} />
          <button
            type="submit"
            className="text-xs text-red-400 hover:text-red-600 hover:underline"
          >
            Dzēst
          </button>
        </form>
      </div>

      {state?.tempPassword && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-0.5">
          <p className="text-sm font-medium text-blue-700">Jaunā pagaidu parole:</p>
          <p className="font-mono font-bold tracking-wider text-gray-800">{state.tempPassword}</p>
          <p className="text-xs text-gray-400">Nodod klientam drošā veidā.</p>
        </div>
      )}

      {state?.error && (
        <p className="mt-1 text-red-500 text-xs">{state.error}</p>
      )}
    </div>
  )
}
