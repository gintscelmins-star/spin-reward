'use client'

import { useState } from 'react'

type Lang = 'lv' | 'en'

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

const CF: Record<Lang, {
  labelName: string
  labelCompany: string
  labelPhone: string
  labelEmail: string
  labelModules: string
  labelMessage: string
  placeholderName: string
  placeholderCompany: string
  placeholderPhone: string
  placeholderEmail: string
  placeholderMessage: string
  success: string
  successSub: string
  error: string
  errorEmail: string
  btnSending: string
  btnSubmit: string
}> = {
  lv: {
    labelName: 'Vārds *',
    labelCompany: 'Uzņēmums',
    labelPhone: 'Telefons',
    labelEmail: 'E-pasts *',
    labelModules: 'Interesējošie moduļi',
    labelMessage: 'Ziņa *',
    placeholderName: 'Jānis Bērziņš',
    placeholderCompany: 'SIA ...',
    placeholderPhone: '+371 2x xxx xxx',
    placeholderEmail: 'jums@uznemums.lv',
    placeholderMessage: 'Pastāstiet par savu uzņēmumu un ko vēlaties sasniegt...',
    success: 'Paldies!',
    successSub: 'Sazināsimies ar tevi tuvākajā laikā.',
    error: 'Kļūda. Mēģiniet vēlreiz vai rakstiet uz',
    errorEmail: 'gints@spillit.lv',
    btnSending: 'Sūta...',
    btnSubmit: 'Nosūtīt pieprasījumu',
  },
  en: {
    labelName: 'Name *',
    labelCompany: 'Company',
    labelPhone: 'Phone',
    labelEmail: 'Email *',
    labelModules: 'Modules of interest',
    labelMessage: 'Message *',
    placeholderName: 'John Smith',
    placeholderCompany: 'Company name',
    placeholderPhone: '+1 xxx xxx xxxx',
    placeholderEmail: 'you@company.com',
    placeholderMessage: 'Tell us about your business and what you want to achieve...',
    success: 'Thank you!',
    successSub: "We'll be in touch shortly.",
    error: 'Error. Please try again or write to',
    errorEmail: 'gints@spillit.lv',
    btnSending: 'Sending...',
    btnSubmit: 'Send request',
  },
}

interface Props {
  showModules?: boolean
  preselected?: string[]
  lang?: Lang
}

export default function ContactForm({ showModules = false, preselected = [], lang = 'lv' }: Props) {
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', message: '' })
  const [modules, setModules] = useState<string[]>(preselected)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const c = CF[lang]

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
        <p className="text-xl font-black text-green-800">{c.success}</p>
        <p className="text-sm text-green-600 mt-1">{c.successSub}</p>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">{c.labelName}</label>
          <input
            required
            value={form.name}
            onChange={field('name')}
            placeholder={c.placeholderName}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{c.labelCompany}</label>
          <input
            value={form.company}
            onChange={field('company')}
            placeholder={c.placeholderCompany}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{c.labelPhone}</label>
          <input
            type="tel"
            value={form.phone}
            onChange={field('phone')}
            placeholder={c.placeholderPhone}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{c.labelEmail}</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={field('email')}
            placeholder={c.placeholderEmail}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
      </div>

      {showModules && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">{c.labelModules}</p>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">{c.labelMessage}</label>
        <textarea
          required
          value={form.message}
          onChange={field('message')}
          rows={4}
          placeholder={c.placeholderMessage}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">
          {c.error}{' '}
          <a href={`mailto:${c.errorEmail}`} className="underline">{c.errorEmail}</a>
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full py-4 rounded-xl font-black text-purple-950 disabled:opacity-60 transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 4px 20px rgba(255,140,0,0.3)' }}
      >
        {status === 'sending' ? c.btnSending : c.btnSubmit}
      </button>
    </form>
  )
}
