'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const COPY_KEYS = [
  'welcome_title',
  'welcome_subtitle',
  'welcome_button',
  'review_intro',
  'review_button',
  'google_prompt',
  'spin_button',
  'prize_title',
  'prize_valid',
  'prize_show',
  'tip_prompt',
  'tip_skip',
  'end_title',
] as const

type CopyKey = (typeof COPY_KEYS)[number]
type Locale = 'lv' | 'en'
type CopyMap = Record<string, Record<string, string>>

interface Props {
  venueId?: string
}

export default function TextsEditor({ venueId: paramVenueId }: Props) {
  const [ready, setReady] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [isGlobal, setIsGlobal] = useState(false)

  const [globals, setGlobals] = useState<CopyMap>({})
  const [form, setForm] = useState<CopyMap>({})
  // set of "key:locale" that have a saved venue override
  const [overridden, setOverridden] = useState<Set<string>>(new Set())

  const [defaultLocale, setDefaultLocale] = useState<Locale>('lv')
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const [resettingKey, setResettingKey] = useState<string | null>(null)
  const [localeSaving, setLocaleSaving] = useState(false)

  // ---- Auth + mode setup ----
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }

      const { data: prof } = await supabase
        .from('profiles').select('role, venue_id').eq('id', user.id).single()
      if (!prof || !['client_admin', 'super_admin'].includes(prof.role)) {
        window.location.href = '/'; return
      }
      setRole(prof.role)

      if (prof.role === 'super_admin' && !paramVenueId) {
        setIsGlobal(true)
        setVenueId(null)
      } else {
        const vid = prof.role === 'super_admin' ? (paramVenueId ?? null) : prof.venue_id
        setVenueId(vid)
        setIsGlobal(false)
      }
      setReady(true)
    }
    init()
  }, [paramVenueId])

  // ---- Load copy data ----
  useEffect(() => {
    if (!ready) return
    async function load() {
      const { data: gRows } = await supabase
        .from('copy_strings').select('key, locale, value').eq('scope', 'global')

      const g: CopyMap = {}
      for (const r of (gRows ?? []) as { key: string; locale: string; value: string }[]) {
        if (!g[r.key]) g[r.key] = {}
        g[r.key][r.locale] = r.value
      }
      setGlobals(g)

      if (isGlobal) {
        // global editor: form = current global values
        const f: CopyMap = {}
        for (const key of COPY_KEYS) {
          f[key] = { lv: g[key]?.lv ?? '', en: g[key]?.en ?? '' }
        }
        setForm(f)
        return
      }

      // venue override editor
      const { data: vRows } = await supabase
        .from('copy_strings').select('key, locale, value')
        .eq('scope', 'venue').eq('venue_id', venueId)

      const ov = new Set<string>()
      const f: CopyMap = {}
      for (const key of COPY_KEYS) f[key] = { lv: '', en: '' }

      for (const r of (vRows ?? []) as { key: string; locale: string; value: string }[]) {
        if (!f[r.key]) f[r.key] = {}
        f[r.key][r.locale] = r.value
        ov.add(`${r.key}:${r.locale}`)
      }
      setForm(f)
      setOverridden(ov)

      const { data: venue } = await supabase
        .from('venues').select('default_locale').eq('id', venueId).single()
      setDefaultLocale((venue?.default_locale ?? 'lv') as Locale)
    }
    load()
  }, [ready, isGlobal, venueId])

  // ---- Helpers ----

  async function saveCell(key: string, locale: Locale, value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    const cell = `${key}:${locale}`
    setSavingCell(cell)

    const scope = isGlobal ? 'global' : 'venue'
    const vid = isGlobal ? null : venueId

    // delete existing, then insert
    let del = supabase.from('copy_strings')
      .delete().eq('scope', scope).eq('key', key).eq('locale', locale)
    del = vid ? del.eq('venue_id', vid) : del.is('venue_id', null)
    await del
    await supabase.from('copy_strings').insert({ scope, venue_id: vid, key, locale, value: trimmed })

    if (isGlobal) {
      setGlobals(prev => ({ ...prev, [key]: { ...prev[key], [locale]: trimmed } }))
    } else {
      setOverridden(prev => new Set([...prev, cell]))
    }
    setSavingCell(null)
  }

  async function resetKey(key: CopyKey) {
    if (isGlobal || !venueId) return
    setResettingKey(key)
    await supabase.from('copy_strings')
      .delete().eq('scope', 'venue').eq('venue_id', venueId).eq('key', key)
    setForm(prev => ({ ...prev, [key]: { lv: '', en: '' } }))
    setOverridden(prev => {
      const next = new Set(prev)
      next.delete(`${key}:lv`)
      next.delete(`${key}:en`)
      return next
    })
    setResettingKey(null)
  }

  async function saveDefaultLocale(loc: Locale) {
    if (!venueId) return
    setLocaleSaving(true)
    await supabase.from('venues').update({ default_locale: loc }).eq('id', venueId)
    setDefaultLocale(loc)
    setLocaleSaving(false)
  }

  // ---- Render ----

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Ielādē...</p>
    </div>
  )

  if (!role) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">Nav piekļuves tiesību</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">

        <div className="flex items-center gap-3 mb-6">
          <a href="/admin/venue" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Atpakaļ
          </a>
          <h1 className="text-xl font-bold text-gray-800">
            {isGlobal ? 'Globālie noklusējumi' : 'Tekstu pielāgojumi'}
          </h1>
        </div>

        {/* Default locale selector */}
        {!isGlobal && venueId && (
          <div className="bg-white rounded-2xl shadow p-4 mb-5 flex items-center gap-4">
            <span className="text-sm text-gray-600 font-medium">Noklusētā valoda:</span>
            {(['lv', 'en'] as Locale[]).map(loc => (
              <button
                key={loc}
                onClick={() => saveDefaultLocale(loc)}
                disabled={localeSaving}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  defaultLocale === loc
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Key rows */}
        <div className="flex flex-col gap-3">
          {COPY_KEYS.map(key => {
            const hasOverride = overridden.has(`${key}:lv`) || overridden.has(`${key}:en`)

            return (
              <div
                key={key}
                className={`bg-white rounded-2xl shadow p-5 ${
                  !isGlobal && hasOverride ? 'ring-1 ring-purple-200' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <code className="text-sm text-purple-700 font-bold">{key}</code>
                  {!isGlobal && (
                    <button
                      onClick={() => resetKey(key)}
                      disabled={!hasOverride || resettingKey === key}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                    >
                      {resettingKey === key ? 'Dzēš...' : 'Atiestatīt'}
                    </button>
                  )}
                </div>

                {(['lv', 'en'] as Locale[]).map(locale => {
                  const globalVal = globals[key]?.[locale] ?? ''
                  const cell = `${key}:${locale}`
                  const isSaving = savingCell === cell
                  const isOv = overridden.has(cell)

                  return (
                    <div key={locale} className="mb-3 last:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase w-5">{locale}</span>
                        {!isGlobal && globalVal && (
                          <span
                            className="text-xs text-gray-300 truncate max-w-[240px]"
                            title={globalVal}
                          >
                            ↳ {globalVal}
                          </span>
                        )}
                        <span className="ml-auto text-xs">
                          {isSaving
                            ? <span className="text-purple-400">Saglabā...</span>
                            : isOv && !isGlobal
                              ? <span className="text-green-500">Saglabāts</span>
                              : null}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={form[key]?.[locale] ?? ''}
                        onChange={e =>
                          setForm(prev => ({
                            ...prev,
                            [key]: { ...prev[key], [locale]: e.target.value },
                          }))
                        }
                        onBlur={e => {
                          const v = e.target.value
                          const baseline = isGlobal ? (globals[key]?.[locale] ?? '') : ''
                          if (v !== baseline) saveCell(key, locale, v)
                        }}
                        placeholder={!isGlobal ? globalVal : undefined}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
