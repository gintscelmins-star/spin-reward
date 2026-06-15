'use client'

import { useState } from 'react'

const ALL_MODULES = [
  'Spin Reward',
  'Darbinieku novērtējums',
  'Google atgādinājums',
  'Tips',
  'Lead Capture',
  'Leads sildīšana',
  'Spin+Meta',
  'Digital Stamps',
  'Onboarding',
]

interface Props {
  showModules?: boolean
  preselected?: string[]
}

export default function ContactForm({ showModules = false, preselected = [] }: Props) {
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', message: '' })
  const [modules, setModules] = useState<string[]>(preselected)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function toggleMod(m: string) {
    setModules(ms => ms.includes(m) ? ms.filter(x => x !== m) : [...ms, m])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, modules: showModules ? modules : [] }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-xl font-black text-green-800">Paldies!</p>
        <p className="text-sm text-green-600 mt-1">Sazināsimies ar tevi tuvākajā laikā.</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl shadow border border-gray-100 p-6 sm:p-8 flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vārds *</label>
          <input
            required
            value={form.name}
            onChange={field('name')}
            placeholder="Jānis Bērziņš"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Uzņēmums</label>
          <input
            value={form.company}
            onChange={field('company')}
            placeholder="SIA ..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefons</label>
          <input
            type="tel"
            value={form.phone}
            onChange={field('phone')}
            placeholder="+371 2x xxx xxx"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-pasts *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={field('email')}
            placeholder="jums@uznemums.lv"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
      </div>

      {showModules && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Interesējošie moduļi</p>
          <div className="flex flex-wrap gap-2">
            {ALL_MODULES.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMod(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  modules.includes(m)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ziņa *</label>
        <textarea
          required
          value={form.message}
          onChange={field('message')}
          rows={4}
          placeholder="Pastāstiet par savu uzņēmumu un ko vēlaties sasniegt..."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">
          Kļūda. Mēģiniet vēlreiz vai rakstiet uz{' '}
          <a href="mailto:gints@spillit.lv" className="underline">gints@spillit.lv</a>
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full py-4 rounded-xl font-black text-purple-950 disabled:opacity-60 transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 4px 20px rgba(255,140,0,0.3)' }}
      >
        {status === 'sending' ? 'Sūta...' : 'Nosūtīt pieprasījumu'}
      </button>
    </form>
  )
}
