'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerUser } from './actions'
import type { RegisterState } from './actions'

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerUser, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <p className="text-2xl font-black text-purple-700 mb-1">🎡 Spillit</p>
          <h1 className="text-xl font-bold text-gray-800">Sāciet bezmaksas izmēģinājumu</h1>
          <p className="text-sm text-gray-400 mt-1">14 dienas bez maksājuma kartītes</p>
        </div>

        {state?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600" htmlFor="full_name">
              Vārds, uzvārds
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              placeholder="Jānis Bērziņš"
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600" htmlFor="email">
              E-pasta adrese
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="janis@uznemums.lv"
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600" htmlFor="password">
              Parole (min. 8 rakstzīmes)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              placeholder="••••••••"
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
          >
            {pending ? 'Reģistrējas...' : 'Reģistrēties →'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Jau ir konts?{' '}
          <Link href="/login" className="text-purple-600 font-semibold hover:underline">
            Ielogoties
          </Link>
        </p>
      </div>
    </div>
  )
}
