'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ERROR_MESSAGES: Record<string, string> = {
  link_invalid: 'Saite ir novecojusi vai jau izmantota. Lūdzu piesakies vēlreiz.',
}

type Mode = 'login' | 'forgot'

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(initialError ? (ERROR_MESSAGES[initialError] ?? initialError) : '')
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Nepareizs e-pasts vai parole')
      setLoading(false)
      return
    }
    window.location.assign('/admin')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    })
    setLoading(false)
    if (resetError) {
      setError(`Kļūda: ${resetError.message}`)
      return
    }
    setSent(true)
  }

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-3">📧</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Pārbaudi e-pastu</h2>
              <p className="text-sm text-gray-500">
                Nosūtījām atjaunošanas saiti uz <strong>{email}</strong>.
              </p>
              <p className="text-xs text-gray-400 mt-3">
                Ja nesaņem e-pastu — uzgaidi ~60 sekundes pirms pieprasīt vēlreiz.
              </p>
              <button
                onClick={() => { setSent(false); setMode('login') }}
                className="mt-5 text-sm text-purple-600 hover:underline"
              >
                ← Atpakaļ uz pieslēgšanos
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Atjaunot paroli</h1>
              <p className="text-sm text-gray-400 text-center mb-6">
                Ievadi e-pastu — nosūtīsim atjaunošanas saiti
              </p>
              <form onSubmit={handleForgot} className="flex flex-col gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="E-pasts"
                  required
                  autoComplete="email"
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
                />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >
                  {loading ? 'Sūta...' : 'Sūtīt atjaunošanas saiti'}
                </button>
              </form>
              <button
                onClick={() => { setMode('login'); setError('') }}
                className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 text-center"
              >
                ← Atpakaļ
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Pieslēgties</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="E-pasts"
            required
            autoComplete="email"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Parole"
            required
            autoComplete="current-password"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
          >
            {loading ? 'Pieslēdzas...' : 'Pieslēgties'}
          </button>
        </form>
        <button
          onClick={() => { setMode('forgot'); setError('') }}
          className="w-full mt-4 text-sm text-gray-400 hover:text-purple-600 text-center transition-colors"
        >
          Aizmirsi paroli?
        </button>
      </div>
    </div>
  )
}
