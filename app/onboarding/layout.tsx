import Link from 'next/link'
import { headers } from 'next/headers'

const STEPS = [
  { label: '1. Uzņēmums', path: '/onboarding/venue' },
  { label: '2. Balvas',   path: '/onboarding/prizes' },
  { label: '3. Rats',     path: '/onboarding/wheel' },
]

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  const activeIndex = STEPS.findIndex(s => pathname.startsWith(s.path))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-5 h-14 flex items-center justify-between">
        <span className="text-lg font-black text-purple-700">🎡 Spillit</span>

        {/* Progress steps */}
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

        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Iziet
        </Link>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-10">
        {children}
      </main>
    </div>
  )
}
