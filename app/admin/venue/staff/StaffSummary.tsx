'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface StaffData {
  id: string
  name: string
}

interface SummaryRow {
  staff_id: string
  sessions_count: number
  reviews_count: number
  avg_rating: number | null
  rating_1_count: number
  rating_2_count: number
  rating_3_count: number
  rating_4_count: number
  rating_5_count: number
  comment_count: number
}

interface Props {
  staff: StaffData[]
  summary: SummaryRow[]
  venueId: string
  from: string
  to: string
  q: string
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const dd = d.getUTCDate().toString().padStart(2, '0')
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function exportCsv(rows: SummaryRow[], staff: StaffData[], from: string, to: string) {
  const headers = ['Darbinieks', 'Spēles', 'Atsauksmes', 'Vidējais', '1★', '2★', '3★', '4★', '5★', 'Ar komentāru']
  const csvRows = rows.map(row => {
    const staffName = staff.find(s => s.id === row.staff_id)?.name ?? 'Nezināms'
    return [
      `"${staffName.replace(/"/g, '""')}"`,
      row.sessions_count,
      row.reviews_count,
      row.avg_rating != null ? row.avg_rating.toFixed(1) : '—',
      row.rating_1_count,
      row.rating_2_count,
      row.rating_3_count,
      row.rating_4_count,
      row.rating_5_count,
      row.comment_count,
    ]
  })
  const csv = [headers, ...csvRows].map(row => row.join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `staff-summary-${from}-${to}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function StaffSummary({ staff, summary, venueId, from, to, q }: Props) {
  const router = useRouter()
  const [minRating, setMinRating] = useState(0)
  const [currentFrom, setCurrentFrom] = useState(from)
  const [currentTo, setCurrentTo] = useState(to)

  const summaryMap = new Map<string, SummaryRow>(
    summary.map(s => [s.staff_id, s])
  )

  const staffRows = staff.map(s => {
    const row = summaryMap.get(s.id)
    return row ?? {
      staff_id: s.id,
      sessions_count: 0,
      reviews_count: 0,
      avg_rating: null,
      rating_1_count: 0,
      rating_2_count: 0,
      rating_3_count: 0,
      rating_4_count: 0,
      rating_5_count: 0,
      comment_count: 0,
    }
  })

  const filtered = staffRows.filter(row => {
    if (minRating > 0 && (row.avg_rating ?? 0) < minRating) return false
    return true
  })

  const handleDateChange = () => {
    const p = new URLSearchParams({ from: currentFrom, to: currentTo })
    if (q) {
      // Extract venueId from q if present
      const venueMatch = q.match(/venueId=([^&]*)/)
      if (venueMatch) p.set('venueId', venueMatch[1])
    }
    router.push(`/admin/venue/staff?${p}`)
  }

  return (
    <section className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Personāla statistika</p>
          <p className="text-xs text-gray-400">{fmtDate(currentFrom)} – {fmtDate(currentTo)}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">No</label>
            <input
              type="date"
              value={currentFrom}
              onChange={e => setCurrentFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Līdz</label>
            <input
              type="date"
              value={currentTo}
              onChange={e => setCurrentTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <button
            onClick={handleDateChange}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Pievienot
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => exportCsv(staffRows, staff, currentFrom, currentTo)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              CSV eksportēt
            </button>
            <label className="text-xs font-medium text-gray-600">Min. vērtējums</label>
            <select
              value={minRating}
              onChange={e => setMinRating(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value={0}>Visi</option>
              <option value={1}>≥ 1 ★</option>
              <option value={2}>≥ 2 ★</option>
              <option value={3}>≥ 3 ★</option>
              <option value={4}>≥ 4 ★</option>
              <option value={5}>5 ★</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-400 font-medium text-xs">Darbinieks</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium text-xs">Spēles</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium text-xs">Atsauksmes</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium text-xs">Vidējais ⭐</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium text-xs">1⭐</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium text-xs">2⭐</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium text-xs">3⭐</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium text-xs">4⭐</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium text-xs">5⭐</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium text-xs">Ar komentāru</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const staffRow = staff.find(s => s.id === row.staff_id)
              const avgRating = row.avg_rating ?? 0
              return (
                <tr key={row.staff_id} className="border-t border-gray-50 hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-gray-800">{staffRow?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-700">{row.sessions_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-700">{row.reviews_count}</td>
                  <td className="px-5 py-3 text-right font-bold">
                    <span className={
                      avgRating >= 4 ? 'text-green-600' :
                      avgRating < 3 ? 'text-red-500' : 'text-yellow-600'
                    }>
                      {row.avg_rating != null ? avgRating.toFixed(1) : '—'} ★
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-600">{row.rating_1_count}</td>
                  <td className="px-5 py-3 text-right text-xs text-gray-600">{row.rating_2_count}</td>
                  <td className="px-5 py-3 text-right text-xs text-gray-600">{row.rating_3_count}</td>
                  <td className="px-5 py-3 text-right text-xs text-gray-600">{row.rating_4_count}</td>
                  <td className="px-5 py-3 text-right text-xs text-gray-600">{row.rating_5_count}</td>
                  <td className="px-5 py-3 text-right text-xs text-gray-600">{row.comment_count}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/venue/staff/${row.staff_id}?from=${currentFrom}&to=${currentTo}${q ? `&${q.slice(1)}` : ''}`}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      Detaļas →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
