'use client'

import { useActionState } from 'react'
import { submitStaffTasks } from '../actions'

interface Props {
  staffId: string
  venueId: string
}

export default function TasksClient({ staffId, venueId }: Props) {
  const [state, formAction, pending] = useActionState<{ error?: string } | null, FormData>(
    submitStaffTasks as unknown as (state: { error?: string } | null, payload: FormData) => Promise<{ error?: string } | null>,
    null
  )

  const tasks = [
    'Piedalīties apmācībās',
    'Atjaunot QR kodu',
    'Izlasīt feedback pārskatu',
  ]

  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Uzdevumi un ziņas</p>
      
      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="staffId" value={staffId} />
        <input type="hidden" name="venueId" value={venueId} />

        <div className="space-y-3">
          {tasks.map(task => (
            <label key={task} className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                name={`task_${task}`}
                disabled={pending}
                className="w-4 h-4 accent-purple-600"
              />
              {task}
            </label>
          ))}
        </div>

        <textarea
          name="message"
          rows={2}
          placeholder="Ziņa darbiniekam..."
          disabled={pending}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-50"
        />

        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-colors"
        >
          {pending ? 'Sūta...' : 'Nosūtīt'}
        </button>
      </form>
    </section>
  )
}
