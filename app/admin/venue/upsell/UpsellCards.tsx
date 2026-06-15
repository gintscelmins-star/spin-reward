'use client'

import { useState } from 'react'

const CONTACT_EMAIL = 'gints.celmins@gmail.com'

function InterestButton() {
  const [shown, setShown] = useState(false)
  if (shown) {
    return (
      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center animate-fade-up">
        <p className="text-sm font-bold text-indigo-800 mb-1">Sazinies ar Gints</p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-sm text-indigo-600 hover:underline font-medium"
        >
          {CONTACT_EMAIL}
        </a>
        <p className="text-xs text-indigo-400 mt-1">Atbildēsim 24h laikā</p>
      </div>
    )
  }
  return (
    <button
      onClick={() => setShown(true)}
      className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm active:scale-95 transition-all"
    >
      Interesē →
    </button>
  )
}

function ChatMockup() {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-2 border border-gray-100">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
        <span className="text-base">📱</span>
        <div>
          <p className="font-semibold text-gray-700">Neatbildēts zvans</p>
          <p className="text-gray-400">+371 26 123 456</p>
        </div>
      </div>
      <div className="flex gap-2">
        <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px]">🤖</span>
        <div className="bg-indigo-100 rounded-xl rounded-tl-none px-3 py-1.5 text-indigo-800 max-w-[80%]">
          Labdien! Vai varu palīdzēt rezervēt?
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <div className="bg-white border border-gray-200 rounded-xl rounded-tr-none px-3 py-1.5 text-gray-700 max-w-[80%]">
          Jā, otrdien 14:00 🙏
        </div>
      </div>
      <div className="flex gap-2">
        <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px]">🤖</span>
        <div className="bg-green-100 rounded-xl rounded-tl-none px-3 py-1.5 text-green-800 max-w-[80%]">
          ✅ Rezervēts! Apstiprinājums SMS.
        </div>
      </div>
      <div className="pt-2 border-t border-gray-200 grid grid-cols-7 gap-0.5 text-center">
        {['P','O','T','C','P','S','Sv'].map(d => (
          <span key={d} className="text-[10px] text-gray-400 font-medium">{d}</span>
        ))}
        {[...Array(7)].map((_, i) => (
          <span key={i} className={`text-[10px] rounded-full py-0.5 font-medium ${
            i === 1 ? 'bg-indigo-600 text-white' :
            i === 3 ? 'bg-green-500 text-white' :
            i === 5 ? 'bg-orange-200 text-orange-700' :
            'text-gray-500'
          }`}>{i + 9}</span>
        ))}
      </div>
    </div>
  )
}

function StaffMockup() {
  const skills = [
    { label: 'Onboarding tests',  pct: 100, color: 'bg-green-500' },
    { label: 'Klientu atsauksmes', pct: 84,  color: 'bg-indigo-500' },
    { label: 'Punktualitāte',      pct: 70,  color: 'bg-yellow-400' },
    { label: 'Tips gūšana',        pct: 60,  color: 'bg-orange-400' },
  ]
  return (
    <div className="bg-gray-50 rounded-2xl p-4 text-xs border border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700">
            AK
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Anna K.</p>
            <p className="text-gray-400">Viesmīle</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-yellow-500 text-sm">★ 4.8</p>
          <p className="text-gray-400">47 spini</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {skills.map(s => (
          <div key={s.label}>
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-500">{s.label}</span>
              <span className="font-medium text-gray-700">{s.pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1 border-t border-gray-200">
        <div className="flex-1 bg-white rounded-xl p-2 text-center border border-gray-100">
          <p className="font-bold text-gray-800">47</p>
          <p className="text-gray-400">Spini</p>
        </div>
        <div className="flex-1 bg-white rounded-xl p-2 text-center border border-gray-100">
          <p className="font-bold text-gray-800">12</p>
          <p className="text-gray-400">Tips</p>
        </div>
        <div className="flex-1 bg-white rounded-xl p-2 text-center border border-gray-100">
          <p className="font-bold text-green-600">A+</p>
          <p className="text-gray-400">Līmenis</p>
        </div>
      </div>
    </div>
  )
}

const CARDS = [
  {
    badge: 'Drīzumā • Papildu maksa',
    badgeClass: 'bg-indigo-100 text-indigo-700',
    icon: '📲',
    title: 'Klientu atgūšana & atkārtotie apmeklējumi',
    desc: 'AI automātiski seko līdzi klientiem — no neatbildētiem zvaniem līdz gadadienas uzaicinājumiem.',
    features: [
      'AI pārtver neatbildētos zvanus → SMS saruna → rezervācija vai atzvanīšana',
      'Dzimšanas dienu & gadadienas atkārtoto apmeklējumu ģenerators',
      'Segmentēti SMS/e-pasta piedāvājumi pēc klienta tipa vai pēdējās spēles',
      'Auto follow-up 7 dienas pēc pieredzes — neļauj klientam aizmirst',
    ],
    Mockup: ChatMockup,
  },
  {
    badge: 'Drīzumā • Papildu maksa',
    badgeClass: 'bg-indigo-100 text-indigo-700',
    icon: '🏅',
    title: 'Darbinieku onboarding & vadība',
    desc: 'Strukturēta jauno darbinieku apmācība un komandas reitinga sistēma vienā vietā.',
    features: [
      'Onboarding kursi + quiz ar izpildes izsekošanu pa darbiniekam',
      'Tips & tricks zināšanu bāze — pieejama tieši lietotnē',
      'Darbinieka reitings: spēles, atsauksmes, darbi, vadītāja piezīmes',
      'Iknedēļas progress reports vadītājam — automātiski uz e-pastu',
    ],
    Mockup: StaffMockup,
  },
]

export default function UpsellCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {CARDS.map(card => (
        <div
          key={card.title}
          className="bg-white rounded-2xl shadow border border-gray-100 flex flex-col overflow-hidden"
        >
          {/* Header stripe */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          <div className="p-6 flex flex-col gap-4 flex-1">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-3xl">{card.icon}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${card.badgeClass}`}>
                  {card.badge}
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-900 leading-snug">{card.title}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{card.desc}</p>
            </div>

            {/* Mock UI */}
            <card.Mockup />

            {/* Features */}
            <ul className="space-y-1.5">
              {card.features.map(f => (
                <li key={f} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-indigo-400 flex-shrink-0 mt-0.5">✦</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto">
              <InterestButton />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
