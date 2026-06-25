'use client'

import { usePathname } from 'next/navigation'

const STEPS = [
  { label: '1. Uzņēmums', path: '/onboarding/venue' },
  { label: '2. Balvas',   path: '/onboarding/prizes' },
  { label: '3. Rats',     path: '/onboarding/wheel' },
]

export default function OnboardingProgress() {
  const pathname = usePathname()
  const activeIndex = STEPS.findIndex(s => pathname.startsWith(s.path))

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {STEPS.map((step, i) => (
        <div key={step.path} className="flex items-center gap-1">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
              i === activeIndex
                ? 'bg-purple-600 text-white'
                : i < activeIndex
                ? 'bg-purple-100 text-purple-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <span className="text-gray-200 text-xs hidden sm:inline">→</span>
          )}
        </div>
      ))}
    </div>
  )
}
