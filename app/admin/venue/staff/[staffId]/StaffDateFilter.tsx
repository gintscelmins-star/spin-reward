'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Props {
  from: string
  to: string
  venueId?: string
}

export default function StaffDateFilter({ from, to, venueId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  function navigate(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    params.set(key, value)
    if (venueId) params.set('venueId', venueId)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-xs text-gray-500 font-medium">No</label>
      <input
        type="date"
        value={from}
        onChange={e => navigate('from', e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300 text-gray-700"
      />
      <label className="text-xs text-gray-500 font-medium">Līdz</label>
      <input
        type="date"
        value={to}
        onChange={e => navigate('to', e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300 text-gray-700"
      />
    </div>
  )
}
