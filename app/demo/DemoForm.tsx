'use client'

import { useState } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  session_expired: 'Demo sesija ir beigusies. Lūdzu pieprasi jaunu saiti.',
  expired: 'Saite ir novecojusi vai jau izmantota.',
  no_token: 'Nepareiza piekļuves saite.',
}

export default function DemoForm({ error }: { error?: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/demo/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus('sent')
      } else {
        const data = (await res.json()) as { error?: string }
        setErrMsg(data.error ?? 'Kļūda. Mēģini vēlreiz.')
        setStatus('error')
      }
    } catch {
      setStatus('error')
      setErrMsg('Savienojuma kļūda. Mēģini vēlreiz.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <div className="mb-10 text-center">
        <span className="text-3xl font-black text-purple-700 tracking-tight">spillit</span>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Admin Demo</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-purple-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Izmēģini demo</h1>
        <p className="text-gray-500 text-sm mb-6">
          Ievadi savu e-pastu un saņemsi saiti uz Spillit admin paneļa demo versiju.
        </p>

        {/* Feature bullets */}
        <ul className="space-y-2 mb-7">
          {[
            'Reālistiski spinu un atsauksmju dati',
            'Pilna darbinieku statistikas pārlūkošana',
            'Balvu un krājumu pārvaldības skats',
          ].map(item => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
              <span className="text-purple-500 mt-0.5 flex-shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>

        {/* Error from URL */}
        {error && ERROR_MESSAGES[error] && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {ERROR_MESSAGES[error]}
          </div>
        )}

        {status === 'sent' ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">📬</div>
            <p className="font-semibold text-gray-800 mb-1">Pārbaudi savu pastu!</p>
            <p className="text-sm text-gray-400">
              Nosūtījām saiti uz <strong>{email}</strong>.<br />Tā ir derīga 1 stundu.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tavs@epasts.lv"
              required
              disabled={status === 'loading'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-60"
            />
            {status === 'error' && errMsg && (
              <p className="text-xs text-red-500">{errMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors active:scale-95 disabled:opacity-60"
            >
              {status === 'loading' ? 'Sūta...' : 'Saņemt demo piekļuvi →'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400 text-center max-w-xs">
        Interesē pilna versija?{' '}
        <a href="https://spillit.lv" className="text-purple-500 hover:underline">
          spillit.lv
        </a>
      </p>
    </div>
  )
}
