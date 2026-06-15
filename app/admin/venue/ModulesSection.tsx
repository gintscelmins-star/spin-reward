'use client'

import { useState, useTransition } from 'react'
import { updateModuleToggle } from './actions'

type ModuleField = 'module_google_enabled' | 'module_tips_enabled' | 'module_whatsapp_enabled'

interface ModuleVal {
  module_google_enabled: boolean
  module_tips_enabled: boolean
  module_whatsapp_enabled: boolean
}

interface ModuleDef {
  field: ModuleField
  label: string
  badge: string
  badgeClass: string
  desc: string
}

const MODULE_DEFS: ModuleDef[] = [
  {
    field: 'module_google_enabled',
    label: 'Google atsauksmju atgādinājums',
    badge: 'Bezmaksas',
    badgeClass: 'bg-green-100 text-green-700',
    desc: 'Klients tiek aicināts atstāt Google atsauksmi pēc pieredzes',
  },
  {
    field: 'module_tips_enabled',
    label: 'Dzeramnauda (Tips)',
    badge: 'Maksas',
    badgeClass: 'bg-amber-100 text-amber-700',
    desc: 'Klientam tiek piedāvāts pateikties darbiniekam ar dzeramnaudu',
  },
  {
    field: 'module_whatsapp_enabled',
    label: 'WhatsApp apziņošana',
    badge: 'Maksas',
    badgeClass: 'bg-amber-100 text-amber-700',
    desc: 'Darbinieki saņem paziņojumu WhatsApp par jaunu sesiju',
  },
]

function Toggle({ checked, onToggle }: { checked: boolean; onToggle(): void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-purple-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function ModulesSection({
  venueId,
  initial,
}: {
  venueId: string
  initial: ModuleVal
}) {
  const [vals, setVals] = useState<ModuleVal>(initial)
  const [, startTransition] = useTransition()

  function toggle(field: ModuleField) {
    const newVal = !vals[field]
    setVals(v => ({ ...v, [field]: newVal }))
    startTransition(() => updateModuleToggle(venueId, field, newVal))
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800">Moduļi</h2>
        <span className="text-xs text-gray-400">Rats + balvas vienmēr ieslēgts</span>
      </div>
      <div>
        {MODULE_DEFS.map((m, i) => (
          <div
            key={m.field}
            className={`flex items-start justify-between gap-4 py-3 ${
              i > 0 ? 'border-t border-gray-100' : ''
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-800 text-sm">{m.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.badgeClass}`}>
                  {m.badge}
                </span>
                {!vals[m.field] && m.badge === 'Maksas' && (
                  <span className="text-xs text-blue-500 font-medium">Preview pieejams</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
            </div>
            <Toggle checked={vals[m.field]} onToggle={() => toggle(m.field)} />
          </div>
        ))}
      </div>
    </div>
  )
}
