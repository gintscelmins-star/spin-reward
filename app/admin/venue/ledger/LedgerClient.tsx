'use client'

export interface LedgerRow {
  name: string
  code: string | null
  stock: number | null
  expires_days: number
  issued: number
  pending: number
  expired: number
  remaining: number | null
}

function exportCsv(rows: LedgerRow[]) {
  const headers = [
    'Balva',
    'Kods',
    'Izsniegtas',
    'Gaida izsniegšanu',
    'Termiņš beidzies',
    'Atlikums',
    'Derīgums (dienas)',
  ]
  const csvRows = rows.map(r => [
    `"${r.name.replace(/"/g, '""')}"`,
    r.code ?? '',
    r.issued,
    r.pending,
    r.expired,
    r.remaining != null ? r.remaining : '∞',
    r.expires_days,
  ])
  const csv = [headers, ...csvRows].map(row => row.join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `balvas-ledger-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function LedgerClient({ rows }: { rows: LedgerRow[] }) {
  const totals = {
    issued:  rows.reduce((s, r) => s + r.issued,  0),
    pending: rows.reduce((s, r) => s + r.pending, 0),
    expired: rows.reduce((s, r) => s + r.expired, 0),
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <strong>Grāmatvedībai:</strong> Izsniegtās balvas ir norakstāmas kā izmaksas.
        Gaidošās ir saistība līdz QR termiņam — klients vēl var pieprasīt.
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-white rounded-xl shadow px-4 py-3 min-w-[100px]">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Izsniegtas</p>
          <p className="text-2xl font-black text-gray-800">{totals.issued}</p>
        </div>
        <div className="bg-white rounded-xl shadow px-4 py-3 min-w-[100px]">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Gaida</p>
          <p className="text-2xl font-black text-orange-500">{totals.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow px-4 py-3 min-w-[100px]">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Termiņš beidzies</p>
          <p className="text-2xl font-black text-gray-400">{totals.expired}</p>
        </div>
        <div className="ml-auto flex items-center">
          <button
            onClick={() => exportCsv(rows)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm active:scale-95 transition-all flex items-center gap-2"
          >
            <span>⬇</span> CSV eksports
          </button>
        </div>
      </div>

      {/* Ledger table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Balva</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Kods</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">
                Izsniegtas
                <span className="block text-xs font-normal text-gray-400">norakstīt</span>
              </th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">
                Gaida
                <span className="block text-xs font-normal text-gray-400">saistība</span>
              </th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">
                Beidzies
                <span className="block text-xs font-normal text-gray-400">termiņš</span>
              </th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Atlikums</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Derīg. (d)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const lowStock = r.remaining !== null && r.remaining < 10
              const zeroStock = r.remaining !== null && r.remaining === 0
              return (
                <tr
                  key={i}
                  className={`border-b border-gray-50 ${zeroStock ? 'bg-red-50' : lowStock ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.code ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{r.issued}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={r.pending > 0 ? 'text-orange-600 font-semibold' : 'text-gray-400'}>
                      {r.pending}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{r.expired}</td>
                  <td className="px-4 py-3 text-right">
                    {r.remaining == null ? (
                      <span className="text-gray-400">∞</span>
                    ) : (
                      <span className={`font-bold ${zeroStock ? 'text-red-600' : lowStock ? 'text-orange-500' : 'text-gray-800'}`}>
                        {r.remaining}
                        {lowStock && !zeroStock && (
                          <span className="ml-1 text-xs font-normal text-orange-400">zems!</span>
                        )}
                        {zeroStock && (
                          <span className="ml-1 text-xs font-normal text-red-400">0!</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{r.expires_days}</td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Nav datu — pievienojiet balvas
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kopā
                </td>
                <td className="px-4 py-3 text-right font-black text-gray-800">{totals.issued}</td>
                <td className="px-4 py-3 text-right font-black text-orange-500">{totals.pending}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-400">{totals.expired}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
