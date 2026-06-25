import Link from 'next/link'
import OnboardingProgress from './OnboardingProgress'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-5 h-14 flex items-center justify-between">
        <span className="text-lg font-black text-purple-700">🎡 Spillit</span>

        <OnboardingProgress />

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
