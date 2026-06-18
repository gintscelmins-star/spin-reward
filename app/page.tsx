'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  RotateCcw, Star, Heart, Search, Megaphone, ClipboardList,
  Bell, CreditCard, CalendarDays, GraduationCap,
} from 'lucide-react'
import ContactForm from '@/components/ContactForm'
import ClientTypeSection from '@/components/ClientTypeSection'

type Lang = 'lv' | 'en'
type LucideIcon = ComponentType<{ size?: number; className?: string }>

const YEAR = new Date().getFullYear()
const WA_LINK = 'https://wa.me/37129320325?text=Sveiki!%20Interesē%20Spillit'

// ── Translations ────────────────────────────────────────────
const T: Record<Lang, {
  nav: { modules: string; cta: string }
  hero: { badge: string; tagline: string; sub: string; cta: string; ctaWa: string }
  audience: { label: string; sub: string; items: string[] }
  modules: { label: string; h2: string; sub: string; allCta: string; free: string }
  contact: { label: string; h2: string; sub: string }
  ctaBottom: { h2: string; sub: string; cta: string; wa: string }
}> = {
  lv: {
    nav: {
      modules: 'Moduļi & Cenas',
      cta: 'Izmēģini bezmaksas!',
    },
    hero: {
      badge: '🎡 Klientu iesaiste, atsauksmes un lojalitāte',
      tagline: 'Pārvērt katru apmeklējumu atsauksmēs, lojalitātē un labākos darbiniekos',
      sub: 'Feedback un darbinieku reitingi tieši tev — bez publiskas kritikas, ar iespēju uzlabot pirms tā nonāk Google.',
      cta: 'Izmēģini bezmaksas! →',
      ctaWa: '💬 Jautājumi? WhatsApp',
    },
    audience: {
      label: 'Piemērots',
      sub: 'Izklaides un servisa vietām ar klātienes klientiem',
      items: ['Lāzertags', 'Kartings', 'Batutu parki', 'Escape rooms', 'Restorāni', 'Bāri', 'Kafejnīcas', 'Skaistumkopšana', 'Fitness'],
    },
    modules: {
      label: 'Moduļi un cenas',
      h2: 'Komplektē pēc savas vajadzības',
      sub: 'Sāc ar bezmaksas kodolu — rats + darbinieku novērtējums. Pievieno tikai to, ko vajag.',
      allCta: 'Skatīt visas cenas un detalizētu aprakstu →',
      free: 'Bezmaksas',
    },
    contact: {
      label: 'Sazinies',
      h2: 'Uzdod jautājumu',
      sub: 'Atbildēsim darba dienās 1–2 stundu laikā. Vai raksti WhatsApp →',
    },
    ctaBottom: {
      h2: 'Gatavs sākt?',
      sub: 'Uzstādi savu pirmo laimes ratu dažu minūšu laikā — bez tehniskām zināšanām.',
      cta: 'Izmēģini bezmaksas! →',
      wa: '💬 WhatsApp',
    },
  },
  en: {
    nav: {
      modules: 'Modules & Pricing',
      cta: 'Try for free!',
    },
    hero: {
      badge: '🎡 Customer engagement, reviews & loyalty',
      tagline: 'Turn every visit into reviews, loyalty and better staff performance',
      sub: 'Feedback and staff ratings delivered directly to you — no public criticism, with the ability to fix issues before they reach Google.',
      cta: 'Try for free! →',
      ctaWa: '💬 Questions? WhatsApp',
    },
    audience: {
      label: 'Built for',
      sub: 'Entertainment and service venues with walk-in customers',
      items: ['Laser Tag', 'Karting', 'Trampoline Parks', 'Escape Rooms', 'Restaurants', 'Bars', 'Cafés', 'Beauty', 'Fitness'],
    },
    modules: {
      label: 'Modules & pricing',
      h2: 'Build the package you need',
      sub: 'Start with the free core — spin wheel + staff rating. Add only what you need.',
      allCta: 'View all pricing and detailed descriptions →',
      free: 'Free',
    },
    contact: {
      label: 'Contact',
      h2: 'Ask a question',
      sub: 'We reply on business days within 1–2 hours. Or write on WhatsApp →',
    },
    ctaBottom: {
      h2: 'Ready to start?',
      sub: 'Set up your first spin wheel in minutes — no technical knowledge required.',
      cta: 'Try for free! →',
      wa: '💬 WhatsApp',
    },
  },
}

// ── Module data ─────────────────────────────────────────────
const MODULES: Record<Lang, { Icon: LucideIcon; name: string; price: string | null; free: boolean; desc: string }[]> = {
  lv: [
    { Icon: RotateCcw,     name: 'Spin Reward',            price: null,           free: true,  desc: 'Laimes rats pēc katras vizītes — automātisks WOW moments ar balvām.' },
    { Icon: Star,          name: 'Darbinieku novērtējums', price: null,           free: true,  desc: 'Privātas atsauksmes + darbinieka reitings pa sesijām. Uzlabot pirms tas nonāk Google.' },
    { Icon: Heart,         name: 'Tips',                   price: 'no €9/mēn',   free: false, desc: 'Digitālā dzeramnauda ar Revolut/Stripe. Klients pateicas viegli.' },
    { Icon: Search,        name: 'Google atgādinājums',    price: 'no €11/mēn',  free: false, desc: 'Auto-piedāvājums atstāt Google atsauksmi tikai pēc labas pieredzes.' },
    { Icon: Megaphone,     name: 'Spin+Meta',              price: 'no €11/mēn',  free: false, desc: 'Meta pikselis laimes ratā. Retargetē faktiskos apmeklētājus.' },
    { Icon: ClipboardList, name: 'Lead Capture',           price: 'no €7/mēn',   free: false, desc: 'Klients atstāj e-pastu apmaiņā pret balvu. Sava kontaktu bāze.' },
    { Icon: Bell,          name: 'Leads sildīšana',        price: 'no €7/mēn',   free: false, desc: 'Atzīmē klienta dzimšanas dienu → nākamgad automātisks SMS ar atlaidi.' },
    { Icon: CreditCard,    name: 'Digital Stamps',         price: 'no €10/mēn',  free: false, desc: 'Digitālā lojalitātes kartīte. 10 apmeklējumi = bezmaksas balva.' },
    { Icon: CalendarDays,  name: 'Maiņu grafiks',          price: 'no €25/mēn',  free: false, desc: 'Plūstošas maiņas un WhatsApp čeklists darbinieku paveiktajam.' },
    { Icon: GraduationCap, name: 'Onboarding',             price: 'individuāli', free: false, desc: 'Kursi, testi un vadītāja pārskats jauniem darbiniekiem.' },
  ],
  en: [
    { Icon: RotateCcw,     name: 'Spin Reward',            price: null,            free: true,  desc: 'Spin wheel after every visit — automatic WOW moment with prizes.' },
    { Icon: Star,          name: 'Staff Rating',           price: null,            free: true,  desc: 'Private feedback + staff rating per session. Fix issues before they reach Google.' },
    { Icon: Heart,         name: 'Tips',                   price: 'from €9/mo',    free: false, desc: 'Digital tip via Revolut/Stripe. Customers say thank you with one tap.' },
    { Icon: Search,        name: 'Google Reminder',        price: 'from €11/mo',   free: false, desc: 'Auto-prompt to leave a Google review — only after a positive experience.' },
    { Icon: Megaphone,     name: 'Spin+Meta',              price: 'from €11/mo',   free: false, desc: 'Meta pixel inside the spin wheel. Retarget actual in-venue visitors.' },
    { Icon: ClipboardList, name: 'Lead Capture',           price: 'from €7/mo',    free: false, desc: 'Customer leaves email in exchange for a prize. Build your own contact list.' },
    { Icon: Bell,          name: 'Lead Nurturing',         price: 'from €7/mo',    free: false, desc: 'Record the customer\'s birthday → automatic discount message next year.' },
    { Icon: CreditCard,    name: 'Digital Stamps',         price: 'from €10/mo',   free: false, desc: 'Digital loyalty card. 10 visits = free reward.' },
    { Icon: CalendarDays,  name: 'Shift Schedule',         price: 'from €25/mo',   free: false, desc: 'Rotating shifts and WhatsApp checklist for staff task tracking.' },
    { Icon: GraduationCap, name: 'Onboarding',             price: 'custom pricing', free: false, desc: 'Courses, quizzes and manager dashboard for new employees.' },
  ],
}

// ── Page ────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('lv')
  const t = T[lang]
  const modules = MODULES[lang]

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="text-xl font-black text-purple-950 tracking-tight">Spillit</Link>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5">
              {(['lv', 'en'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    lang === l ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <Link
              href="/moduli"
              className="hidden sm:block text-sm font-semibold text-gray-600 hover:text-purple-700 transition-colors px-2"
            >
              {t.nav.modules}
            </Link>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold text-green-800 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
            >
              <span>💬</span> WhatsApp
            </a>
            <Link
              href="/login"
              className="px-5 py-2 rounded-full text-sm font-bold text-purple-950 transition-all active:scale-95 shadow-md"
              style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)' }}
            >
              {t.nav.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 pt-32 pb-24 px-5 overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
          style={{ background: 'linear-gradient(90deg,#FF3B3B,#FF8C00,#FFD700,#00CC44,#00BFFF,#7B2FFF,#FF1493)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 35%, rgba(139,92,246,0.35), transparent 70%)' }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur text-white/75 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-white/15">
            {t.hero.badge}
          </div>
          <h1
            className="text-5xl sm:text-6xl font-black text-white leading-tight mb-4"
            style={{ textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}
          >
            Spillit
          </h1>
          <p className="text-xl sm:text-2xl font-bold text-white/90 leading-snug mb-4 max-w-xl mx-auto">
            {t.hero.tagline}
          </p>
          <p className="text-base text-white/65 leading-relaxed mb-10 max-w-lg mx-auto">
            {t.hero.sub}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-block px-9 py-4 rounded-2xl text-lg font-black text-purple-950 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 8px 36px rgba(255,140,0,0.45)' }}
            >
              {t.hero.cta}
            </Link>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-white/90 bg-white/10 hover:bg-white/15 border border-white/20 transition-all active:scale-95"
            >
              {t.hero.ctaWa}
            </a>
          </div>
        </div>
      </section>

      {/* ── Mērķauditorija ──────────────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-100 px-5 py-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">{t.audience.label}</p>
          <p className="text-gray-600 text-base leading-relaxed mb-5">{t.audience.sub}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {t.audience.items.map(a => (
              <span
                key={a}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 font-medium shadow-sm"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      <ClientTypeSection lang={lang} />

      {/* ── Moduļi ──────────────────────────────────────── */}
      <section className="bg-gray-50 border-t border-b border-gray-100 px-5 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-purple-500 uppercase tracking-widest mb-2">{t.modules.label}</p>
            <h2 className="text-3xl font-black text-gray-900">{t.modules.h2}</h2>
            <p className="text-gray-500 mt-2 text-sm">{t.modules.sub}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {modules.map(m => (
              <div
                key={m.name}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    m.free
                      ? 'bg-green-50 border border-green-100 text-green-700'
                      : m.price === 'individuāli' || m.price === 'custom pricing'
                      ? 'bg-amber-50 border border-amber-100 text-amber-700'
                      : 'bg-indigo-50 border border-indigo-100 text-indigo-600'
                  }`}>
                    <m.Icon size={18} />
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-1 ${
                      m.free
                        ? 'bg-green-100 text-green-700'
                        : m.price === 'individuāli' || m.price === 'custom pricing'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {m.free ? t.modules.free : m.price}
                  </span>
                </div>
                <p className="font-black text-gray-900 text-sm leading-tight">{m.name}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/moduli"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors shadow-sm"
            >
              {t.modules.allCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Kontaktforma ─────────────────────────────────── */}
      <section id="kontakts" className="max-w-2xl mx-auto px-5 py-20">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-purple-500 uppercase tracking-widest mb-2">{t.contact.label}</p>
          <h2 className="text-3xl font-black text-gray-900">{t.contact.h2}</h2>
          <p className="text-gray-500 mt-2 text-sm">
            {t.contact.sub}{' '}
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="text-green-600 font-semibold hover:underline">
              +371 29320325
            </a>
          </p>
        </div>
        <ContactForm lang={lang} />
      </section>

      {/* ── CTA bottom ──────────────────────────────────── */}
      <section className="bg-gradient-to-br from-purple-950 to-indigo-900 px-5 py-20">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-3">{t.ctaBottom.h2}</h2>
          <p className="text-white/55 mb-9 leading-relaxed">{t.ctaBottom.sub}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-block px-9 py-4 rounded-2xl text-lg font-black text-purple-950 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 8px 36px rgba(255,140,0,0.4)' }}
            >
              {t.ctaBottom.cta}
            </Link>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-white/90 bg-white/10 border border-white/20 hover:bg-white/15 transition-all"
            >
              {t.ctaBottom.wa}
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="bg-purple-950 border-t border-white/5 px-5 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">© Spillit {YEAR}</p>
          <div className="flex items-center gap-4">
            <Link href="/moduli" className="text-white/30 text-xs hover:text-white/60 transition-colors">
              {lang === 'lv' ? 'Moduļi' : 'Modules'}
            </Link>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="text-white/30 text-xs hover:text-white/60 transition-colors">
              WhatsApp
            </a>
            <a href="mailto:gints@spillit.lv" className="text-white/30 text-xs hover:text-white/60 transition-colors">
              gints@spillit.lv
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}
