'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { fmtDateTime } from '@/lib/fmt'
import { createClient } from '@/lib/supabase/client'

export interface RedemptionRow {
  spin_id: string
  qr_token: string
  status: string
  prize_name: string | null
  prize_id: string | null
  created_at: string | null
  redeemed_at: string | null
  expires_at: string | null
  booking_ref: string | null
  staff_name: string | null
  activity_name: string | null
  customer_name: string | null
}

interface Props {
  rows: RedemptionRow[]
  prizes: { id: string; name: string }[]
  staff: { id: string; name: string }[]
  venueId: string
}

type Period = 'today' | '7d' | '30d' | 'all'

function getPeriodBounds(period: Period): { from: Date | null; to: Date | null } {
  const now = new Date()
  if (period === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { from: start, to: null }
  }
  if (period === '7d') {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: null }
  }
  if (period === '30d') {
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: null }
  }
  return { from: null, to: null }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'redeemed') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
        Izsniegts
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
        Gaida
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
      Beidzies
    </span>
  )
}

interface SlideOverProps {
  row: RedemptionRow
  onClose: () => void
  onRedeemed: () => void
}

function SlideOver({ row, onClose, onRedeemed }: SlideOverProps) {
  const [confirming, setConfirming] = useState(false)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function copyToken() {
    navigator.clipboard.writeText(row.qr_token).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleManualRedeem() {
    if (!confirming) { setConfirming(true); return }
    startTransition(async () => {
      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('manual_redeem_spin', {
        p_qr_token: row.qr_token,
      })
      if (rpcError) {
        setError(rpcError.message)
        setConfirming(false)
        return
      }
      const result = (data as { result: string }[] | null)?.[0]?.result
      if (result === 'redeemed') {
        onRedeemed()
      } else {
        setError(`Neizdevās izsniegt: ${result ?? 'nezināma kļūda'}`)
        setConfirming(false)
      }
    })
  }

  const dataRow = (label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1 min-w-0 break-all">{value ?? '—'}</span>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Balvas detaļas</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <StatusBadge status={row.status} />
          </div>

          {dataRow('Balva', (
            <span className="font-medium text-gray-900">{row.prize_name ?? '—'}</span>
          ))}
          {dataRow('QR tokens', (
            <button
              onClick={copyToken}
              className="flex items-center gap-1.5 font-mono text-xs text-purple-600 hover:text-purple-800 text-left"
            >
              <span className="break-all">{row.qr_token}</span>
              <span className="flex-shrink-0">{copied ? '✓' : '⎘'}</span>
            </button>
          ))}
          {dataRow('Izsniegts', fmtDateTime(row.created_at))}
          {dataRow('Apstiprināts', row.redeemed_at ? fmtDateTime(row.redeemed_at) : '—')}
          {dataRow('Derīgs līdz', fmtDateTime(row.expires_at))}
          {dataRow('Booking ref', row.booking_ref)}
          {dataRow('Klients', row.customer_name)}
          {dataRow('Darbinieks', row.staff_name)}
          {dataRow('Aktivitāte', row.activity_name)}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          {row.status === 'active' && (
            <button
              onClick={handleManualRedeem}
              className={`w-full py-3 font-bold rounded-xl text-sm transition-all mb-3 ${
                confirming
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {confirming ? '⚠ Apstiprināt izsniegšanu?' : '✓ Manuāli izsniegt'}
            </button>
          )}
          {confirming && (
            <button
              onClick={() => setConfirming(false)}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm mb-2"
            >
              Atcelt
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 text-sm"
          >
            Aizvērt
          </button>
        </div>
      </div>
    </>
  )
}

export default function RedemptionsClient({ rows, prizes, staff, venueId }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('30d')
  const [filterPrize, setFilterPrize] = useState('')
  const [filterStaff, setFilterStaff] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<RedemptionRow | null>(null)
  const [pageSize, setPageSize] = useState(50)

  const filtered = useMemo(() => {
    const bounds = getPeriodBounds(period)
    return rows.filter(r => {
      // Period filter
      if (bounds.from && r.created_at) {
        const d = new Date(r.created_at)
        if (d < bounds.from) return false
      }
      // Prize filter
      if (filterPrize && r.prize_id !== filterPrize) return false
      // Staff filter
      if (filterStaff && r.staff_name !== filterStaff) return false
      // Search
      if (search) {
        const q = search.toLowerCase()
        const haystack = [
          r.qr_token, r.prize_name, r.booking_ref, r.staff_name,
          r.activity_name, r.customer_name,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [rows, period, filterPrize, filterStaff, search])

  const visible = filtered.slice(0, pageSize)
  const hasMore = filtered.length > pageSize

  const selectCls = 'px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300'

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Šodien' },
    { key: '7d',    label: '7 dienas' },
    { key: '30d',   label: '30 dienas' },
    { key: 'all',   label: 'Viss' },
  ]

  function handleRedeemed() {
    setSelected(null)
    router.refresh()
  }

  // Build unique staff names from rows for filter (since staff filter is by session.staff, not spin.staff_id)
  const staffOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { id: string; name: string }[] = []
    for (const r of rows) {
      if (r.staff_name && !seen.has(r.staff_name)) {
        seen.add(r.staff_name)
        opts.push({ id: r.staff_name, name: r.staff_name })
      }
    }
    return opts
  }, [rows])

  // Suppress unused venueId lint warning — kept for future load-more RPC calls
  void venueId
  void staff

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Period chips */}
        <div className="flex gap-1 bg-white rounded-xl shadow p-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.key
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Prize filter */}
        <select
          value={filterPrize}
          onChange={e => setFilterPrize(e.target.value)}
          className={selectCls}
        >
          <option value="">Visas balvas</option>
          {prizes.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Staff filter */}
        {staffOptions.length > 0 && (
          <select
            value={filterStaff}
            onChange={e => setFilterStaff(e.target.value)}
            className={selectCls}
          >
            <option value="">Visi darbinieki</option>
            {staffOptions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Meklēt..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300 min-w-[160px]"
        />

        {(filterPrize || filterStaff || search) && (
          <button
            onClick={() => { setFilterPrize(''); setFilterStaff(''); setSearch('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            × Notīrīt
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} ierakst{filtered.length === 1 ? 's' : 'i'}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Laiks</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Balva</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Booking ref</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Darbinieks</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Aktivitāte</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Statuss</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr
                key={r.spin_id}
                onClick={() => setSelected(r)}
                className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="font-mono text-gray-700 text-xs">{fmtDateTime(r.created_at)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{r.prize_name ?? '—'}</p>
                  {r.customer_name && (
                    <p className="text-xs text-gray-400">{r.customer_name}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {r.booking_ref ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs">
                  {r.staff_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {r.activity_name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  {rows.length === 0
                    ? 'Nav datu — vēl nav neviena spina'
                    : 'Nav rezultātu ar šiem filtriem'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setPageSize(ps => ps + 50)}
            className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm"
          >
            Ielādēt vairāk ({filtered.length - pageSize} vēl)
          </button>
        </div>
      )}

      {/* Slide-over */}
      {selected && (
        <SlideOver
          row={selected}
          onClose={() => setSelected(null)}
          onRedeemed={handleRedeemed}
        />
      )}
    </>
  )
}
