'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createWheel } from '../actions'
import type { ActionState } from '../actions'

interface Venue {
  id: string
  name: string
}

interface Props {
  defaultVenueId: string
  venues: Venue[]
  showVenuePicker: boolean
}

function Toggle({
  name,
  label,
  defaultValue = false,
}: {
  name: string
  label: string
  defaultValue?: boolean
}) {
  const [on, setOn] = useState(defaultValue)
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input type="hidden" name={name} value={on ? 'true' : 'false'} />
        <button
          type="button"
          onClick={() => setOn(v => !v)}
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

export default function NewWheelForm({ defaultVenueId, venues, showVenuePicker }: Props) {
  const router = useRouter()
  const [triggerType, setTriggerType] = useState('delay')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createWheel, null)

  useEffect(() => {
    if (state?.id) {
      router.push(`/dashboard/widgets/${state.id}/segments`)
    }
  }, [state?.id, router])

  const showTriggerValue = triggerType === 'delay' || triggerType === 'scroll_pct'
  const triggerValueLabel = triggerType === 'delay' ? 'Delay (seconds)' : 'Scroll % (0–100)'
  const triggerValueDefault = triggerType === 'delay' ? 5 : 50

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        {!showVenuePicker && (
          <input type="hidden" name="venue_id" value={defaultVenueId} />
        )}

        {showVenuePicker && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
            <select
              name="venue_id"
              required
              defaultValue={defaultVenueId}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            >
              <option value="">— select venue —</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            name="name"
            required
            placeholder="e.g. Summer Promo 2025"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              name="type"
              defaultValue="web_widget"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            >
              <option value="web_widget">Web Widget</option>
              <option value="campaign_lp">Campaign LP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
            <select
              name="locale"
              defaultValue="lv"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            >
              <option value="lv">Latviešu</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="lt">Lietuvių</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <select
              name="style_theme"
              defaultValue="light"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="brand">Brand</option>
              <option value="festive">Festive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
            <div className="flex items-center gap-2 pt-1">
              <input
                name="brand_color"
                type="color"
                defaultValue="#6366f1"
                className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 p-0.5"
              />
              <span className="text-xs text-gray-400">Pick color</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
            <select
              name="trigger_type"
              value={triggerType}
              onChange={e => setTriggerType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            >
              <option value="delay">Delay</option>
              <option value="exit_intent">Exit Intent</option>
              <option value="scroll_pct">Scroll %</option>
              <option value="element_click">Element Click</option>
              <option value="direct_link">Direct Link</option>
              <option value="inline">Inline</option>
            </select>
          </div>
          {showTriggerValue ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {triggerValueLabel}
              </label>
              <input
                name="trigger_value"
                type="number"
                min={0}
                max={triggerType === 'scroll_pct' ? 100 : undefined}
                key={triggerType}
                defaultValue={triggerValueDefault}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          ) : (
            <input type="hidden" name="trigger_value" value="" />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display</label>
          <select
            name="display_type"
            defaultValue="popup"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          >
            <option value="popup">Popup</option>
            <option value="inline">Inline</option>
          </select>
        </div>

        <div className="bg-gray-50 rounded-xl px-4 divide-y divide-gray-100">
          <Toggle name="show_powered_by" label='Show "Powered by Spillit"' defaultValue={true} />
          <Toggle name="one_spin_per_email" label="One spin per email" defaultValue={true} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL{' '}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            name="webhook_url"
            type="url"
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
        >
          {pending ? 'Creating...' : 'Create Wheel → Configure Segments'}
        </button>
      </form>
    </div>
  )
}
