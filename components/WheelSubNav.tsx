import Link from 'next/link'

type Tab = 'segments' | 'form' | 'preview' | 'embed' | 'analytics'

interface Props {
  wheelId: string
  wheelName: string
  active: Tab
}

const TABS: { id: Tab; label: string; href: (id: string) => string }[] = [
  { id: 'segments', label: 'Segmenti',  href: id => `/dashboard/widgets/${id}/segments` },
  { id: 'form',     label: 'Forma',     href: id => `/dashboard/widgets/${id}/form` },
  { id: 'preview',  label: 'Preview',   href: id => `/dashboard/widgets/${id}/preview` },
  { id: 'embed',    label: 'Embed',     href: id => `/dashboard/widgets/${id}/embed` },
  { id: 'analytics',label: 'Analytics', href: id => `/dashboard/widgets/${id}/analytics` },
]

export default function WheelSubNav({ wheelId, wheelName, active }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
        <Link href="/dashboard/widgets" className="hover:text-gray-600">Wheels</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{wheelName}</span>
      </div>
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <Link
            key={tab.id}
            href={tab.href(wheelId)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              active === tab.id
                ? 'text-purple-700 border-b-2 border-purple-600 -mb-px bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
