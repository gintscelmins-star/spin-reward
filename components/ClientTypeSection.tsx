'use client'

import { useState } from 'react'

type Lang = 'lv' | 'en'

interface ClientType {
  id: string
  icon: string
  label: string
  tagline: string
  benefits: string[]
  recommended: string[]
  extra: string[]
}

const DATA: Record<Lang, ClientType[]> = {
  lv: [
    {
      id: 'lazertags',
      icon: '🎯',
      label: 'Lāzertags',
      tagline: 'Pārvērt katru spēli iemeslā atgriezties',
      benefits: [
        'Shareable rezultātu karte pēc katras spēles (AuraTag)',
        'Automātisks WOW moments ar balvu pēc sesijas',
        'Google atsauksmes tikai no apmierinātiem spēlētājiem',
        'Retargetinga auditorija no faktiskajiem apmeklētājiem',
        'Darbinieku reitings pa sesijām bez publiskas kritikas',
      ],
      recommended: [
        '🎡 Spin Reward — bezmaksas',
        '⭐ Darbinieku novērtējums — bezmaksas',
        '🏷️ AuraTag — individuāli',
        '🔍 Google atgādinājums — no €11/mēn',
      ],
      extra: ['📣 Spin+Meta', '📋 Lead Capture', '🎫 Digital Stamps'],
    },
    {
      id: 'escape',
      icon: '🔐',
      label: 'Escape Room',
      tagline: 'Emocija pēc spēles = labākais brīdis atsauksmei',
      benefits: [
        'Google atsauksme tiek lūgta tieši pēc uzvaras brīža',
        'Privāts feedback pirms tas nonāk internetā',
        'E-pasta vākšana apmaiņā pret nākamās rezervācijas atlaidi',
        'Automātisks atgādinājums grupai gadu vēlāk',
        'Darbinieka (game master) novērtējums pa sesijām',
      ],
      recommended: [
        '🎡 Spin Reward — bezmaksas',
        '⭐ Darbinieku novērtējums — bezmaksas',
        '🔍 Google atgādinājums — no €11/mēn',
      ],
      extra: ['📋 Lead Capture', '🎂 Leads sildīšana', '📅 Rezervāciju sistēma'],
    },
    {
      id: 'trampolins',
      icon: '🤸',
      label: 'Batutu parks',
      tagline: 'No vienreizējas ballītes uz atkārtotu ģimenes apmeklējumu',
      benefits: [
        'Lojalitātes kartīte — 10 apmeklējumi = bezmaksas sesija',
        'Bērna dzimšanas dienas atgādinājums automātiski',
        'Ģimenes e-pasta bāze ar GDPR piekrišanu',
        'Balvas pēc katras vizītes = iemesls atgriezties',
        'Google atsauksmes tikai no laimīgiem vecākiem',
      ],
      recommended: [
        '🎡 Spin Reward — bezmaksas',
        '⭐ Darbinieku novērtējums — bezmaksas',
        '🎫 Digital Stamps — no €10/mēn',
        '🎂 Leads sildīšana — no €7/mēn',
      ],
      extra: ['📋 Lead Capture', '🔍 Google atgādinājums', '📅 Rezervāciju sistēma'],
    },
    {
      id: 'vr',
      icon: '🥽',
      label: 'VR / Arcade',
      tagline: 'No spontāna apmeklējuma uz mērķauditoriju Meta reklāmās',
      benefits: [
        'Meta pikselis aktivizējas tikai faktiskajiem apmeklētājiem',
        'Retargetings darbojas daudz precīzāk nekā mājaslapas pikselis',
        'E-pasta vākšana apmaiņā pret bonusu nākamajai vizītei',
        'Lojalitātes stamps sistēma regulārajiem apmeklētājiem',
        'Darbinieku novērtējums pa sesijām',
      ],
      recommended: [
        '🎡 Spin Reward — bezmaksas',
        '⭐ Darbinieku novērtējums — bezmaksas',
        '📣 Spin+Meta — no €11/mēn',
      ],
      extra: ['📋 Lead Capture', '🎫 Digital Stamps', '🔍 Google atgādinājums'],
    },
    {
      id: 'boulings',
      icon: '🎳',
      label: 'Boulings / Minigolfs',
      tagline: 'Papildu konversija tieši pēc labas spēles',
      benefits: [
        'Automātisks Google atsauksmes piedāvājums pēc spēles',
        'Lojalitātes stamps regulārajiem spēlētājiem',
        'Darbinieka instruktora/admina novērtējums',
        'Meta retargetings faktiskajiem apmeklētājiem',
        'Rezervāciju sistēma ar kalendāru un CSV importu',
      ],
      recommended: [
        '🎡 Spin Reward — bezmaksas',
        '⭐ Darbinieku novērtējums — bezmaksas',
        '🔍 Google atgādinājums — no €11/mēn',
        '🎫 Digital Stamps — no €10/mēn',
      ],
      extra: ['📣 Spin+Meta', '📅 Rezervāciju sistēma', '📋 Lead Capture'],
    },
    {
      id: 'family',
      icon: '👨‍👩‍👧',
      label: 'Family Entertainment',
      tagline: 'Viena platforma visam — no booking līdz lojalitātei',
      benefits: [
        'Centralizēta rezervāciju sistēma ar weekly skatu',
        'Lojalitātes stamps visām aktivitātēm vienā kartītē',
        'Dzimšanas dienu atgādinājumi bērniem automātiski',
        'Darbinieku reitings un maiņu grafiks vienā vietā',
        'E-pasta bāzes veidošana no katra apmeklējuma',
      ],
      recommended: [
        '🎡 Spin Reward — bezmaksas',
        '⭐ Darbinieku novērtējums — bezmaksas',
        '🎫 Digital Stamps — no €10/mēn',
        '📅 Rezervāciju sistēma',
        '🎂 Leads sildīšana — no €7/mēn',
      ],
      extra: ['📣 Spin+Meta', '🎓 Onboarding', '📅 Maiņu grafiks'],
    },
    {
      id: 'kartings',
      icon: '🏎️',
      label: 'Kartings',
      tagline: 'Adrenalīns pēc finiša = ideāls brīdis atsauksmei',
      benefits: [
        'Shareable rezultātu karte pēc katras sacensības',
        'Google atsauksme tieši pēc labas braukšanas',
        'Grupas e-pasta vākšana pirms sacensībām',
        'Korporatīvo klientu retargetings Meta',
        'Darbinieku (instruktoru) novērtējums pa sesijām',
      ],
      recommended: [
        '🎡 Spin Reward — bezmaksas',
        '⭐ Darbinieku novērtējums — bezmaksas',
        '🔍 Google atgādinājums — no €11/mēn',
        '📋 Lead Capture — no €7/mēn',
      ],
      extra: ['📣 Spin+Meta', '🏷️ AuraTag', '📅 Rezervāciju sistēma'],
    },
    {
      id: 'sports',
      icon: '🏋️',
      label: 'Sporta centrs',
      tagline: 'No vienreizējas treniņa uz regulāru klientu',
      benefits: [
        'Lojalitātes stamps — 10 treniņi = bezmaksas sesija',
        'Tips trenerim caur Revolut/Stripe tieši pēc treniņa',
        'Automātiski atgādinājumi esošiem klientiem',
        'Darbinieku (treneru) novērtējums un reitings',
        'Maiņu grafiks un WhatsApp čeklists treneriem',
      ],
      recommended: [
        '🎡 Spin Reward — bezmaksas',
        '⭐ Darbinieku novērtējums — bezmaksas',
        '💛 Tips — no €9/mēn',
        '🎫 Digital Stamps — no €10/mēn',
      ],
      extra: ['📅 Maiņu grafiks', '🎂 Leads sildīšana', '🔍 Google atgādinājums'],
    },
  ],

  en: [
    {
      id: 'lazertags',
      icon: '🎯',
      label: 'Laser Tag',
      tagline: 'Turn every game into a reason to come back',
      benefits: [
        'Shareable result card after every game (AuraTag)',
        'Automatic WOW moment with a prize after each session',
        'Google reviews only from satisfied players',
        'Retargeting audience built from actual visitors',
        'Staff rating per session without public criticism',
      ],
      recommended: [
        '🎡 Spin Reward — free',
        '⭐ Staff rating — free',
        '🏷️ AuraTag — custom pricing',
        '🔍 Google reminder — from €11/mo',
      ],
      extra: ['📣 Spin+Meta', '📋 Lead Capture', '🎫 Digital Stamps'],
    },
    {
      id: 'escape',
      icon: '🔐',
      label: 'Escape Room',
      tagline: 'The emotion after the game = the best moment for a review',
      benefits: [
        'Google review requested right at the moment of victory',
        'Private feedback before it reaches the internet',
        'Email collection in exchange for next booking discount',
        'Automatic reminder to the group a year later',
        'Staff (game master) rating per session',
      ],
      recommended: [
        '🎡 Spin Reward — free',
        '⭐ Staff rating — free',
        '🔍 Google reminder — from €11/mo',
      ],
      extra: ['📋 Lead Capture', '🎂 Lead nurturing', '📅 Booking system'],
    },
    {
      id: 'trampolins',
      icon: '🤸',
      label: 'Trampoline Park',
      tagline: 'From a one-time party to repeated family visits',
      benefits: [
        'Loyalty card — 10 visits = free session',
        'Child birthday reminder sent automatically',
        'Family email base with GDPR consent',
        'Prize after every visit = a reason to return',
        'Google reviews only from happy parents',
      ],
      recommended: [
        '🎡 Spin Reward — free',
        '⭐ Staff rating — free',
        '🎫 Digital Stamps — from €10/mo',
        '🎂 Lead nurturing — from €7/mo',
      ],
      extra: ['📋 Lead Capture', '🔍 Google reminder', '📅 Booking system'],
    },
    {
      id: 'vr',
      icon: '🥽',
      label: 'VR / Arcade',
      tagline: 'From spontaneous visit to Meta retargeting audience',
      benefits: [
        'Meta pixel fires only for actual in-venue visitors',
        'Retargeting works far better than a website pixel',
        'Email collection in exchange for next visit bonus',
        'Loyalty stamp system for regular visitors',
        'Staff rating per session',
      ],
      recommended: [
        '🎡 Spin Reward — free',
        '⭐ Staff rating — free',
        '📣 Spin+Meta — from €11/mo',
      ],
      extra: ['📋 Lead Capture', '🎫 Digital Stamps', '🔍 Google reminder'],
    },
    {
      id: 'boulings',
      icon: '🎳',
      label: 'Bowling / Mini Golf',
      tagline: 'Extra conversion right after a great game',
      benefits: [
        'Automatic Google review prompt after the game',
        'Loyalty stamps for regular players',
        'Staff instructor/admin rating',
        'Meta retargeting for actual visitors',
        'Booking system with calendar and CSV import',
      ],
      recommended: [
        '🎡 Spin Reward — free',
        '⭐ Staff rating — free',
        '🔍 Google reminder — from €11/mo',
        '🎫 Digital Stamps — from €10/mo',
      ],
      extra: ['📣 Spin+Meta', '📅 Booking system', '📋 Lead Capture'],
    },
    {
      id: 'family',
      icon: '👨‍👩‍👧',
      label: 'Family Entertainment',
      tagline: 'One platform for everything — from booking to loyalty',
      benefits: [
        'Centralized booking system with weekly view',
        'Loyalty stamps for all activities in one card',
        'Automatic birthday reminders for children',
        'Staff rating and shift schedule in one place',
        'Email base built from every visit',
      ],
      recommended: [
        '🎡 Spin Reward — free',
        '⭐ Staff rating — free',
        '🎫 Digital Stamps — from €10/mo',
        '📅 Booking system',
        '🎂 Lead nurturing — from €7/mo',
      ],
      extra: ['📣 Spin+Meta', '🎓 Onboarding', '📅 Shift schedule'],
    },
    {
      id: 'kartings',
      icon: '🏎️',
      label: 'Karting',
      tagline: 'Adrenaline after the finish = perfect moment for a review',
      benefits: [
        'Shareable result card after every race',
        'Google review right after a great drive',
        'Group email collection before the race',
        'Corporate client retargeting on Meta',
        'Staff (instructor) rating per session',
      ],
      recommended: [
        '🎡 Spin Reward — free',
        '⭐ Staff rating — free',
        '🔍 Google reminder — from €11/mo',
        '📋 Lead Capture — from €7/mo',
      ],
      extra: ['📣 Spin+Meta', '🏷️ AuraTag', '📅 Booking system'],
    },
    {
      id: 'sports',
      icon: '🏋️',
      label: 'Sports Centre',
      tagline: 'From a one-time workout to a regular client',
      benefits: [
        'Loyalty stamp — 10 sessions = free session',
        'Trainer tip via Revolut/Stripe right after training',
        'Automatic reminders for existing clients',
        'Staff (trainer) rating and ranking',
        'Shift schedule and WhatsApp checklist for trainers',
      ],
      recommended: [
        '🎡 Spin Reward — free',
        '⭐ Staff rating — free',
        '💛 Tips — from €9/mo',
        '🎫 Digital Stamps — from €10/mo',
      ],
      extra: ['📅 Shift schedule', '🎂 Lead nurturing', '🔍 Google reminder'],
    },
  ],
}

const UI: Record<Lang, {
  sectionLabel: string
  heading: string
  subtext: string
  colBenefits: string
  colRecommended: string
  colExtra: string
  ctaPrimary: string
  ctaWhatsApp: string
}> = {
  lv: {
    sectionLabel: 'Tavs biznesa tips',
    heading: 'Ko Spillit iedod tieši tev?',
    subtext: 'Izvēlies savu venue veidu — redzēsi savus ieguvumus un ieteiktās pakotnes.',
    colBenefits: 'Tavs ieguvums',
    colRecommended: 'Ieteiktie moduļi',
    colExtra: 'Vari pievienot arī',
    ctaPrimary: 'Izmēģini bezmaksas →',
    ctaWhatsApp: '💬 Jautāt WhatsApp',
  },
  en: {
    sectionLabel: 'Your business type',
    heading: 'What does Spillit give you specifically?',
    subtext: 'Choose your venue type — see your benefits and recommended packages.',
    colBenefits: 'Your benefit',
    colRecommended: 'Recommended modules',
    colExtra: 'You can also add',
    ctaPrimary: 'Try for free →',
    ctaWhatsApp: '💬 Ask on WhatsApp',
  },
}

const WA_LINK = 'https://wa.me/37129320325?text=Sveiki!%20Interesē%20Spillit'

export default function ClientTypeSection() {
  const [lang, setLang] = useState<Lang>('lv')
  const [active, setActive] = useState('lazertags')
  const [visible, setVisible] = useState(true)

  const types = DATA[lang]
  const ui = UI[lang]
  const activeData = types.find(t => t.id === active)

  function handleSelect(id: string) {
    if (id === active) return
    setVisible(false)
    setTimeout(() => {
      setActive(id)
      setVisible(true)
    }, 120)
  }

  function handleLang(l: Lang) {
    if (l === lang) return
    setVisible(false)
    setTimeout(() => {
      setLang(l)
      setVisible(true)
    }, 120)
  }

  return (
    <section className="bg-white border-t border-b border-gray-100 px-5 py-20">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="relative text-center mb-10">
          {/* LV / EN toggle */}
          <div className="absolute right-0 top-0 flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5">
            {(['lv', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => handleLang(l)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  lang === l
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <p className="text-sm font-semibold text-purple-500 uppercase tracking-widest mb-2">
            {ui.sectionLabel}
          </p>
          <h2 className="text-3xl font-black text-gray-900">{ui.heading}</h2>
          <p className="text-gray-500 mt-2 text-sm">{ui.subtext}</p>
        </div>

        {/* Type buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {types.map(type => (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
                active === type.id
                  ? 'text-purple-950 shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
              }`}
              style={active === type.id ? { background: 'linear-gradient(135deg,#FFD700,#FF8C00)' } : {}}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>

        {/* Content block */}
        {activeData && (
          <div
            className={`bg-gray-50 border border-gray-100 rounded-2xl p-6 sm:p-8 transition-all duration-150 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            }`}
          >
            {/* Tagline */}
            <p className="text-center text-base font-bold text-gray-700 mb-8">
              {activeData.icon} {activeData.tagline}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

              {/* Column 1 — Benefits */}
              <div>
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-widest mb-3">
                  {ui.colBenefits}
                </p>
                <ul className="flex flex-col gap-2">
                  {activeData.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 2 — Recommended modules */}
              <div>
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-widest mb-3">
                  {ui.colRecommended}
                </p>
                <ul className="flex flex-col gap-2">
                  {activeData.recommended.map((m, i) => (
                    <li
                      key={i}
                      className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 shadow-sm"
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3 — Extra + CTA */}
              <div>
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-widest mb-3">
                  {ui.colExtra}
                </p>
                <ul className="flex flex-col gap-2 mb-6">
                  {activeData.extra.map((e, i) => (
                    <li key={i} className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="text-indigo-300">+</span> {e}
                    </li>
                  ))}
                </ul>
                <a
                  href="/login"
                  className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl text-sm font-black text-purple-950 transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg,#FFD700,#FF8C00)',
                    boxShadow: '0 4px 20px rgba(255,140,0,0.3)',
                  }}
                >
                  {ui.ctaPrimary}
                </a>
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center w-full mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-green-300 transition-colors"
                >
                  {ui.ctaWhatsApp}
                </a>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  )
}
