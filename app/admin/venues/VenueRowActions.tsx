'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateVenuePlan, updateVenueModule } from './actions'

const PLANS = ['free', 'starter', 'pro', 'enterprise']

interface Props {
  venueId: string
  plan: string
  moduleGoogle: boolean
  moduleTips: boolean
  moduleWhatsapp: boolean
}

export default function VenueRowActions({ venueId, plan, moduleGoogle, moduleTips, moduleWhatsapp }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function doUpdate(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn()
      router.refresh()
    })
  }

  const modules = [
    { field: 'module_google_enabled', label: 'Google', value: moduleGoogle },
    { field: 'module_tips_enabled', label: 'Tips', value: moduleTips },
    { field: 'module_whatsapp_enabled', label: 'WA', value: moduleWhatsapp },
  ]

  return (
    <div className={`flex items-center gap-2 flex-wrap ${isPending ? 'opacity-40 pointer-events-none' : ''}`}>
      <select
        value={plan}
        onChange={e => doUpdate(() => updateVenuePlan(venueId, e.target.value))}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-purple-300"
      >
        {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      {modules.map(m => (
        <button
          key={m.field}
          type="button"
          onClick={() => doUpdate(() => updateVenueModule(venueId, m.field, !m.value))}
          className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-colors ${
            m.value
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'bg-gray-100 text-gray-400 border-gray-200 hover:border-gray-300'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
