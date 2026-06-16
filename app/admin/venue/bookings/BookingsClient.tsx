'use client'

import { useState, useTransition, useEffect, useRef, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertBooking, deleteBooking, importBookingsCsv } from './actions'
import { activateBooking } from '@/app/admin/today/actions'
import { fmtDate, fmtTime, fmtDateTime } from '@/lib/fmt'
import type { BookingState, CsvImportResult } from './actions'

export interface BookingRpc {
  booking_id: string
  booking_ref: string | null
  customer_name: string | null
  customer_phone: string | null
  starts_at: string | null
  ends_at: string | null
  activity_id: string | null
  activity_name: string | null
  staff_id: string | null
  staff_name: string | null
  player_count: number | null
  player_age_group: string | null
  occasion: string | null
  advance_paid: boolean | null
  advance_amount: number | null
  status: string | null
  has_spin: boolean | null
  notes: string | null
}

interface Activity { id: string; name: string }
interface Staff { id: string; name: string }

interface Props {
  bookings: BookingRpc[]
  activities: Activity[]
  staff: Staff[]
  venueId: string
  from: string
  to: string
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled', 'completed'] as const
const STATUS_LABELS: Record<string, string> = {
  pending: 'Gaida',
  confirmed: 'Apstiprināts',
  cancelled: 'Atcelts',
  completed: 'Pabeigts',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
}
const AGE_OPTIONS = ['Bērni', 'Pieaugušie', 'Jaukts']
const OCCASION_OPTIONS = ['Dzimšanas diena', 'Korporatīvs', 'Atpūta', 'Vecpuišu ballīte', 'Cits']

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_āčēģīķļņšūž]/gi, '').trim())
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim().replace(/^"|"$/g, '') })
    return row
  })
}

// ── CsvImportModal ───────────────────────────────────────────────────────────

function CsvImportModal({ venueId, date, onClose }: { venueId: string; date: string; onClose: () => void }) {
  const [preview, setPreview] = useState<Array<Record<string, string>>>([])
  const [allRows, setAllRows] = useState<Array<Record<string, string>>>([])
  const [result, formAction, pending] = useActionState<CsvImportResult | null, FormData>(importBookingsCsv, null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const rows = parseCsv(ev.target?.result as string)
      setAllRows(rows)
      setPreview(rows.slice(0, 5))
    }
    reader.readAsText(file, 'UTF-8')
  }

  const done = result && !('error' in result) && result.imported !== undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Importēt CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {!done ? (
          <>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 mb-4">
              <p className="font-semibold text-gray-700 mb-1">Sagaidāmās CSV kolonnas:</p>
              <p className="font-mono">vards, talrunis, aktivitate, sakums, beigas, speletaji</p>
              <p className="mt-1 text-gray-400">Laiks: <code>2025-06-20T14:00</code> vai tikai <code>14:00</code></p>
            </div>
            <label className="block mb-4">
              <span className="text-sm font-medium text-gray-700 block mb-1">CSV fails</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </label>
            {preview.length > 0 && (
              <div className="mb-4 overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>{Object.keys(preview[0]).map(h => <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-gray-700">{v || '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {'error' in (result ?? {}) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {(result as { error: string }).error}
              </div>
            )}
            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="venueId" value={venueId} />
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="rows" value={JSON.stringify(allRows)} />
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">Atcelt</button>
                <button type="submit" disabled={pending || allRows.length === 0} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm">
                  {pending ? 'Importē...' : `Importēt ${allRows.length} rezervācijas`}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4">
              <p className="font-bold text-green-800 text-lg">
                {(result as { imported: number }).imported} importētas
                {(result as { errors: number }).errors > 0 && (
                  <span className="text-red-600 ml-2">· {(result as { errors: number }).errors} kļūdas</span>
                )}
              </p>
            </div>
            {((result as { errorDetails?: string[] }).errorDetails?.length ?? 0) > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 space-y-1">
                {(result as { errorDetails: string[] }).errorDetails.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <button onClick={onClose} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm">Aizvērt</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── EditModal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  editing: BookingRpc | null
  activities: Activity[]
  staff: Staff[]
  venueId: string
  defaultDate: string
  onClose: () => void
  onSuccess: () => void
}

function EditModal({ editing, activities, staff, venueId, defaultDate, onClose, onSuccess }: EditModalProps) {
  const [state, formAction, pending] = useActionState<BookingState, FormData>(upsertBooking, null)
  const [advancePaid, setAdvancePaid] = useState(editing?.advance_paid ?? false)
  const prevPendingRef = useRef(false)

  useEffect(() => {
    if (prevPendingRef.current && !pending && !state?.error) onSuccess()
    prevPendingRef.current = pending
  }, [pending, state, onSuccess])

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm bg-white'
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {editing ? 'Rediģēt rezervāciju' : 'Pievienot rezervāciju'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form action={formAction} className="p-5 grid grid-cols-2 gap-3">
          <input type="hidden" name="venueId" value={venueId} />
          {editing && <input type="hidden" name="id" value={editing.booking_id} />}

          {state?.error && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {state.error}
            </div>
          )}

          <div className="col-span-2">
            <label className={labelCls}>Klienta vārds *</label>
            <input name="customer_name" required defaultValue={editing?.customer_name ?? ''} placeholder="Jānis Bērziņš" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Tālrunis</label>
            <input name="customer_phone" type="tel" defaultValue={editing?.customer_phone ?? ''} placeholder="+371 2000 0000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Spēlētāji</label>
            <input name="player_count" type="number" min="1" max="999" defaultValue={editing?.player_count ?? ''} placeholder="—" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Aktivitāte</label>
            <select name="activity_id" defaultValue={editing?.activity_id ?? ''} className={inputCls}>
              <option value="">— Nav norādīta —</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Instruktors</label>
            <select name="staff_id" defaultValue={editing?.staff_id ?? ''} className={inputCls}>
              <option value="">— Nav norādīts —</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Sākums *</label>
            <input
              name="starts_at"
              type="datetime-local"
              required
              defaultValue={editing?.starts_at ? toLocalDatetime(editing.starts_at) : `${defaultDate}T10:00`}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Beigas</label>
            <input name="ends_at" type="datetime-local" defaultValue={toLocalDatetime(editing?.ends_at)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Vecuma grupa</label>
            <select name="player_age_group" defaultValue={editing?.player_age_group ?? ''} className={inputCls}>
              <option value="">—</option>
              {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Gadījums</label>
            <select name="occasion" defaultValue={editing?.occasion ?? ''} className={inputCls}>
              <option value="">—</option>
              {OCCASION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Statuss</label>
            <select name="status" defaultValue={editing?.status ?? 'pending'} className={inputCls}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-center gap-2 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                name="advance_paid"
                type="checkbox"
                defaultChecked={editing?.advance_paid ?? false}
                onChange={e => setAdvancePaid(e.target.checked)}
                className="accent-purple-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">Avanss samaksāts</span>
            </label>
          </div>

          {advancePaid && (
            <div className="col-span-2">
              <label className={labelCls}>Avansa summa (€)</label>
              <input name="advance_amount" type="number" step="0.01" min="0" defaultValue={editing?.advance_amount ?? ''} placeholder="0.00" className={inputCls} />
            </div>
          )}

          <div className="col-span-2">
            <label className={labelCls}>Piezīmes</label>
            <textarea name="notes" rows={2} defaultValue={editing?.notes ?? ''} placeholder="Papildu informācija..." className={`${inputCls} resize-none`} />
          </div>

          <div className="col-span-2 flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm">Atcelt</button>
            <button type="submit" disabled={pending} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm">
              {pending ? 'Saglabā...' : 'Saglabāt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── DetailModal ──────────────────────────────────────────────────────────────

function DetailModal({
  booking,
  onClose,
  onEdit,
  onActivate,
  activating,
}: {
  booking: BookingRpc
  onClose: () => void
  onEdit: () => void
  onActivate: () => void
  activating: boolean
}) {
  const [copied, setCopied] = useState(false)
  const copyRef = () => {
    if (!booking.booking_ref) return
    navigator.clipboard.writeText(booking.booking_ref).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value || '—'}</span>
    </div>
  )

  const statusKey = booking.status ?? 'pending'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">Rezervācija</h2>
            {booking.booking_ref && (
              <button
                onClick={copyRef}
                className="flex items-center gap-1.5 mt-0.5 text-xs font-mono text-purple-600 hover:text-purple-800"
              >
                <span>{booking.booking_ref}</span>
                <span>{copied ? '✓' : '⎘'}</span>
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4">
          {row('Statuss', (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[statusKey] ?? ''}`}>
              {STATUS_LABELS[statusKey] ?? statusKey}
            </span>
          ))}
          {row('Klients', (
            <span>
              <span className="font-medium">{booking.customer_name}</span>
              {booking.customer_phone && <span className="text-gray-500 ml-2">{booking.customer_phone}</span>}
            </span>
          ))}
          {row('Laiks', booking.starts_at ? (
            <span>
              {fmtDateTime(booking.starts_at)}
              {booking.ends_at && ` – ${fmtTime(booking.ends_at)}`}
            </span>
          ) : '—')}
          {row('Aktivitāte', booking.activity_name)}
          {row('Instruktors', booking.staff_name)}
          {row('Spēlētāji', booking.player_count ? (
            <span>
              {booking.player_count}
              {booking.player_age_group && <span className="text-gray-500 ml-1.5">({booking.player_age_group})</span>}
            </span>
          ) : booking.player_age_group)}
          {row('Gadījums', booking.occasion)}
          {row('Avanss', booking.advance_paid ? (
            <span className="text-green-700">
              Samaksāts{booking.advance_amount ? ` · €${booking.advance_amount.toFixed(2)}` : ''}
            </span>
          ) : 'Nav')}
          {row('Spin', booking.has_spin ? (
            <span className="text-green-600 font-medium">✓ Aktivizēts</span>
          ) : (
            <span className="text-gray-400">Nav aktivizēts</span>
          ))}
          {booking.notes && row('Piezīmes', <span className="italic text-gray-600">{booking.notes}</span>)}
        </div>

        <div className="p-5 pt-0 flex flex-col gap-2">
          {!booking.has_spin && (
            <button
              onClick={onActivate}
              disabled={activating}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
            >
              {activating ? 'Aktivizē...' : '▶ Aktivizēt Spin'}
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onEdit} className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm">Rediģēt</button>
            <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 text-sm">Aizvērt</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function BookingsClient({ bookings, activities, staff, venueId, from, to }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editing, setEditing] = useState<BookingRpc | null>(null)
  const [detailBooking, setDetailBooking] = useState<BookingRpc | null>(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterActivity, setFilterActivity] = useState('')
  const [filterStaff, setFilterStaff] = useState('')
  const [filterOccasion, setFilterOccasion] = useState('')

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
  const defaultDate = from <= todayStr && todayStr <= to ? todayStr : from

  const nav = (f: string, t: string) => {
    const p = new URLSearchParams({ venueId, from: f, to: t })
    router.push(`/admin/venue/bookings?${p}`)
  }

  const navWeek = (delta: number) => nav(addDays(from, delta), addDays(to, delta))

  function todayWeekBounds(): { from: string; to: string } {
    const d = new Date()
    const dow = d.getDay() || 7
    const monDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (dow - 1))
    const sunDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - dow))
    const toStr = (x: Date) => `${x.getFullYear()}-${(x.getMonth() + 1).toString().padStart(2, '0')}-${x.getDate().toString().padStart(2, '0')}`
    return { from: toStr(monDay), to: toStr(sunDay) }
  }

  const thisWeek = todayWeekBounds()
  const isCurrentWeek = from === thisWeek.from && to === thisWeek.to

  const filtered = bookings.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false
    if (filterActivity && b.activity_id !== filterActivity) return false
    if (filterStaff && b.staff_id !== filterStaff) return false
    if (filterOccasion && b.occasion !== filterOccasion) return false
    return true
  })

  function handleActivate(b: BookingRpc) {
    setActivatingId(b.booking_id)
    startTransition(async () => {
      await activateBooking(b.booking_id, venueId, b.activity_id, b.staff_id)
      setActivatingId(null)
      router.refresh()
    })
  }

  function handleEditSuccess() {
    setIsEditOpen(false)
    setEditing(null)
    router.refresh()
  }

  const fromFmt = `${from.slice(8, 10)}.${from.slice(5, 7)}`
  const toFmt = `${to.slice(8, 10)}.${to.slice(5, 7)}.${to.slice(0, 4)}`

  const selectCls = 'px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300'

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Rezervācijas</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCsvOpen(true)}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm shadow-sm"
          >
            ↑ Importēt CSV
          </button>
          <button
            onClick={() => { setEditing(null); setIsEditOpen(true) }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm"
          >
            + Pievienot
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navWeek(-7)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">←</button>
        <span className="font-mono text-gray-700 text-sm min-w-[160px] text-center">{fromFmt} – {toFmt}</span>
        <button onClick={() => navWeek(7)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">→</button>
        {!isCurrentWeek && (
          <button onClick={() => nav(thisWeek.from, thisWeek.to)} className="text-xs text-purple-600 hover:underline ml-1">Šī nedēļa</button>
        )}
        <span className="ml-auto text-xs text-gray-400">{bookings.length} rez.</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
          <option value="">Visi statusi</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {activities.length > 0 && (
          <select value={filterActivity} onChange={e => setFilterActivity(e.target.value)} className={selectCls}>
            <option value="">Visas aktivitātes</option>
            {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {staff.length > 0 && (
          <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className={selectCls}>
            <option value="">Visi instruktori</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select value={filterOccasion} onChange={e => setFilterOccasion(e.target.value)} className={selectCls}>
          <option value="">Visi gadījumi</option>
          {OCCASION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {(filterStatus || filterActivity || filterStaff || filterOccasion) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterActivity(''); setFilterStaff(''); setFilterOccasion('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            × Notīrīt
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Laiks</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Klients</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Aktivitāte / Instr.</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Spēl.</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Gadījums</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Avanss</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Statuss</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Spin</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const statusKey = b.status ?? 'pending'
              const isActivating = activatingId === b.booking_id
              return (
                <tr key={b.booking_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-mono text-gray-700 text-xs">{fmtDate(b.starts_at)}</p>
                    <p className="font-mono text-gray-500 text-xs">{b.starts_at ? fmtTime(b.starts_at) : '—'}{b.ends_at ? ` – ${fmtTime(b.ends_at)}` : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{b.customer_name ?? '—'}</p>
                    {b.customer_phone && <p className="text-xs text-gray-400">{b.customer_phone}</p>}
                    {b.booking_ref && <p className="text-xs text-gray-300 font-mono">{b.booking_ref}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{b.activity_name ?? '—'}</p>
                    {b.staff_name && <p className="text-xs text-gray-400">{b.staff_name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {b.player_count ? (
                      <span className="font-medium text-gray-700">{b.player_count}</span>
                    ) : <span className="text-gray-300">—</span>}
                    {b.player_age_group && (
                      <p className="text-xs text-gray-400">{b.player_age_group}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{b.occasion ?? '—'}</td>
                  <td className="px-4 py-3">
                    {b.advance_paid ? (
                      <span className="text-green-600 font-medium text-xs">
                        ✓{b.advance_amount ? ` €${b.advance_amount.toFixed(2)}` : ''}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[statusKey] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {STATUS_LABELS[statusKey] ?? statusKey}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {b.has_spin ? (
                      <span className="text-green-600 text-xs font-medium">✓ Spin</span>
                    ) : (
                      <button
                        onClick={() => handleActivate(b)}
                        disabled={isActivating}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        {isActivating ? '...' : '▶'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setDetailBooking(b)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                        title="Detaļas"
                      >
                        👁
                      </button>
                      <button
                        onClick={() => { setEditing(b); setIsEditOpen(true) }}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        Rediģēt
                      </button>
                      <form action={deleteBooking}>
                        <input type="hidden" name="venueId" value={venueId} />
                        <input type="hidden" name="id" value={b.booking_id} />
                        <button type="submit" className="text-xs text-red-400 hover:text-red-600 hover:underline">Dzēst</button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  {bookings.length === 0 ? 'Nav rezervāciju izvēlētajā periodā' : 'Nav rezultātu ar šiem filtriem'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {isEditOpen && (
        <EditModal
          key={editing?.booking_id ?? 'new'}
          editing={editing}
          activities={activities}
          staff={staff}
          venueId={venueId}
          defaultDate={defaultDate}
          onClose={() => { setIsEditOpen(false); setEditing(null) }}
          onSuccess={handleEditSuccess}
        />
      )}

      {detailBooking && (
        <DetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onEdit={() => { setEditing(detailBooking); setDetailBooking(null); setIsEditOpen(true) }}
          onActivate={() => {
            handleActivate(detailBooking)
            setDetailBooking(null)
          }}
          activating={activatingId === detailBooking.booking_id}
        />
      )}

      {csvOpen && (
        <CsvImportModal
          venueId={venueId}
          date={defaultDate}
          onClose={() => { setCsvOpen(false); router.refresh() }}
        />
      )}
    </>
  )
}
