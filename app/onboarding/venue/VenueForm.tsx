'use client'

import { useActionState, useEffect, useState } from 'react'
import { createVenue } from './actions'
import type { VenueActionState } from './actions'

const CATEGORIES = [
  'Lāzertags',
  'Escape Room',
  'Batutu parks',
  'VR/Arcade',
  'Boulinga centrs',
  'Katrings',
  'Sporta centrs',
  'Restorāns/Bārs',
  'Cits',
]

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[āá]/g,  'a').replace(/[čĉ]/g, 'c').replace(/[ēé]/g, 'e')
    .replace(/[ģĝ]/g,  'g').replace(/[ī]/g,  'i').replace(/[ķ]/g,  'k')
    .replace(/[ļĺ]/g,  'l').replace(/[ņń]/g, 'n').replace(/[š]/g,  's')
    .replace(/[ū]/g,   'u').replace(/[žź]/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function VenueForm() {
  const [state, formAction, pending] = useActionState<VenueActionState, FormData>(createVenue, null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (!slugTouched) {
      setSlug(toSlug(name))
    }
  }, [name, slugTouched])

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Uzņēmuma informācija</h2>
      <p className="text-sm text-gray-400 mb-6">Pievienojiet sava uzņēmuma pamatdatus</p>

      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700" htmlFor="venue_name">
            Uzņēmuma nosaukums <span className="text-red-500">*</span>
          </label>
          <input
            id="venue_name"
            name="venue_name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Mans Uzņēmums"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700" htmlFor="category">
            Uzņēmuma kategorija
          </label>
          <select
            id="category"
            name="category"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800 bg-white"
          >
            <option value="">— Izvēlieties kategoriju —</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700" htmlFor="slug">
            URL adrese
          </label>
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-300">
            <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">
              spillit.lv/w/
            </span>
            <input
              id="slug"
              name="slug"
              type="text"
              value={slug}
              onChange={e => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                setSlugTouched(true)
              }}
              placeholder="mans-uznemums"
              className="flex-1 px-3 py-3 focus:outline-none text-gray-800 text-sm"
            />
          </div>
          <p className="text-xs text-gray-400">Tikai mazie latīņu burti, cipari un defises</p>
        </div>

        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="mt-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
        >
          {pending ? 'Saglabā...' : 'Turpināt → Balvas'}
        </button>
      </form>
    </div>
  )
}
