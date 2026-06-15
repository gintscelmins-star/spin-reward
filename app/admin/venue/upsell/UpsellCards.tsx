'use client'

import { useState } from 'react'

const CONTACT_EMAIL = 'gints.celmins@gmail.com'

type Status = 'active' | 'paid' | 'custom'

interface Module {
  icon: string
  name: string
  price: string
  status: Status
  how: string
  benefit: string
  features: string[]
}

const MODULES: Module[] = [
  {
    icon: '🎡',
    name: 'Spin Reward',
    price: 'Bezmaksas',
    status: 'active',
    how: 'Pēc katras sesijas klients skenē QR un griež laimes ratu. Uzvar vienu no tavām balvām.',
    benefit: 'Katrs klients aiziet ar WOW sajūtu un pozitīvu iespaidu — bez papildu izmaksām.',
    features: [
      'Pielāgojams laimes rats ar savām balvām un svara koeficientiem',
      'QR balvas kods ar termiņu un grāmatvedības uzskaiti',
      'Privāta atsauksme (zvaigznes/īkšķi) pirms rata griešanas',
    ],
  },
  {
    icon: '💛',
    name: 'Tips',
    price: '€19/mēn',
    status: 'paid',
    how: 'Pēc balvas saņemšanas klients redz "Vai pateikties {darbiniekam}?" — poga ved uz Revolut/Stripe linku.',
    benefit: 'Darbinieki saņem digitālas dzeramnaudas bez fiziskas naudas — motivācija un klientu apmierinātība aug.',
    features: [
      'Katram darbiniekam savs Revolut/Stripe tip links',
      'Tips solis rādās tikai tad, ja darbiniekam ir aktīvs links',
      'Modulis ieslēdzams/izslēdzams katram darbiniekam atsevišķi',
    ],
  },
  {
    icon: '⭐',
    name: 'Darbinieku novērtējums',
    price: '€29/mēn',
    status: 'paid',
    how: 'Atsauksmes tiek saistītas ar konkrēto darbinieku un aktivitāti. Vadītājs redz reitingus pa personām.',
    benefit: 'Privāts feedbacks, kas nenonāk Google — tikai tev. Uzzini, kurš darbinieks pelna cik zvaigznes.',
    features: [
      'Atsauksmes pa darbiniekam un aktivitātes veidam',
      'Reitinga statistika: vidējā zvaigzne, tendenču grafiks',
      'Negatīvs feedbacks paliek pie tevis — pozitīvs iet uz Google',
    ],
  },
  {
    icon: '🔍',
    name: 'Google atgādinājums',
    price: '€29/mēn',
    status: 'paid',
    how: 'Pēc pozitīvas sesijas done ekrānā parādās "Neaizmirsti atstāt Google atsauksmi!" — neobligāts teksts.',
    benefit: 'Tikai apmierināti klienti redz Google piedāvājumu — kritika paliek pie tevis.',
    features: [
      'Redzams tikai "done" ekrānā, netraucē spēles plūsmu',
      'Ieslēdzams/izslēdzams no Moduļi iestatījumiem',
      'Nav obligāts — klients var ignorēt un iet prom',
    ],
  },
  {
    icon: '📣',
    name: 'Spin+Meta',
    price: '€39/mēn',
    status: 'paid',
    how: 'Meta pikselis tiek aktivizēts brīdī, kad klients skenē QR un griež ratu — reāls apmeklētājs, ne reklāmas klikšķis.',
    benefit: 'Retargetē cilvēkus, kuri fiziski bijuši tavā vietā. Labākā Custom Audience kvalitāte.',
    features: [
      'Meta pikseļa ID konfigurācija admin panelī',
      'Aktivizējas pie katras sesijas sākuma',
      'Papildus standarta Custom Audience events',
    ],
  },
  {
    icon: '📋',
    name: 'Lead Capture',
    price: '€79/mēn',
    status: 'paid',
    how: 'Klients ievada e-pastu/telefonu apmaiņā pret bonusu (balvu vai kuponu). Kontakti nonāk tavā DB vai integrētā e-pasta sistēmā.',
    benefit: 'Veido savu klientu sarakstu katru dienu — bez reklāmas izmaksām.',
    features: [
      'Pielāgojams "Saņem bonusu" aicināms teksts un forma',
      'Eksports uz CSV vai integrācija ar Mailchimp/Brevo',
      'GDPR piekrišanas čekbokss iekļauts formā',
    ],
  },
  {
    icon: '🎓',
    name: 'Onboarding',
    price: 'Individuāli',
    status: 'custom',
    how: 'Jaunam darbiniekam pieejami kursi, video, testi tieši lietotnē. Vadītājs izseko izpildi un saņem nedēļas pārskatu.',
    benefit: 'Jauns darbinieks kļūst produktīvs 2× ātrāk. Visi standarti dokumentēti vienā vietā.',
    features: [
      'Moduļu kursi ar video, tekstu un pārbaudes testiem',
      'Progresa izsekošana pa darbiniekam un kursam',
      'Automātisks iknedēļas progress reports vadītājam uz e-pastu',
    ],
  },
  {
    icon: '🎫',
    name: 'Digital Stamps',
    price: '€29/mēn',
    status: 'paid',
    how: 'Katrs apmeklējums = 1 zīmogs. Pēc N apmeklējumiem klients automātiski saņem balvas QR kodu.',
    benefit: 'Digitālā lojalitātes kartīte, kas darbojas bez fiziskas kartiņas vai aplikācijas lejupielādes.',
    features: [
      'Pielāgojams apmeklējumu skaits līdz balvai (piem. 10)',
      'Klients redz savu progresu QR skenēšanas ekrānā',
      'Balva tiek izsniegta automātiski — bez manuāla darba',
    ],
  },
]

function StatusBadge({ status, price }: { status: Status; price: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        Aktīvs • Bezmaksas
      </span>
    )
  }
  if (status === 'custom') {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-100 text-indigo-700">
        {price}
      </span>
    )
  }
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">
      Maksas • {price}
    </span>
  )
}

function ActionButton({ status, name }: { status: Status; name: string }) {
  const [shown, setShown] = useState(false)

  if (status === 'active') {
    return (
      <div className="mt-auto pt-3 text-center">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
          <span className="text-base">✓</span> Ieslēgts
        </span>
      </div>
    )
  }

  if (shown) {
    return (
      <div className="mt-auto pt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
        <p className="text-xs font-bold text-indigo-800 mb-0.5">Sazinies par &ldquo;{name}&rdquo;</p>
        <a href={`mailto:${CONTACT_EMAIL}?subject=Interesē: ${name}`}
           className="text-xs text-indigo-600 hover:underline font-medium break-all">
          {CONTACT_EMAIL}
        </a>
        <p className="text-[10px] text-indigo-400 mt-1">Atbildēsim 24h laikā</p>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShown(true)}
      className="mt-auto pt-3 w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-sm active:scale-95 transition-all"
    >
      {status === 'custom' ? 'Pieprasīt →' : 'Interesē →'}
    </button>
  )
}

function ModuleCard({ m }: { m: Module }) {
  return (
    <div className={`bg-white rounded-2xl border flex flex-col overflow-hidden ${
      m.status === 'active'
        ? 'border-green-200 shadow'
        : 'border-gray-100 shadow'
    }`}>
      <div className={`h-1 ${m.status === 'active' ? 'bg-green-400' : 'bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400'}`} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-3xl">{m.icon}</span>
          <StatusBadge status={m.status} price={m.price} />
        </div>
        <div>
          <h3 className="text-base font-black text-gray-900">{m.name}</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{m.how}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-600 border border-gray-100">
          <span className="font-semibold text-gray-700">Ieguvums: </span>{m.benefit}
        </div>
        <ul className="space-y-1">
          {m.features.map(f => (
            <li key={f} className="flex gap-1.5 text-xs text-gray-600">
              <span className={`flex-shrink-0 mt-0.5 font-bold ${m.status === 'active' ? 'text-green-500' : 'text-indigo-400'}`}>✦</span>
              {f}
            </li>
          ))}
        </ul>
        <ActionButton status={m.status} name={m.name} />
      </div>
    </div>
  )
}

export default function UpsellCards() {
  const free    = MODULES.filter(m => m.status === 'active')
  const paid    = MODULES.filter(m => m.status === 'paid')
  const custom  = MODULES.filter(m => m.status === 'custom')

  return (
    <div className="space-y-8">
      {/* Free / active */}
      <div>
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-3">
          Iekļauts — bezmaksas
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {free.map(m => <ModuleCard key={m.name} m={m} />)}
        </div>
      </div>

      {/* Paid modules */}
      <div>
        <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">
          Maksas moduļi — aktivizē pēc vajadzības
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paid.map(m => <ModuleCard key={m.name} m={m} />)}
        </div>
      </div>

      {/* Custom / enterprise */}
      <div>
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">
          Individuāli
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {custom.map(m => <ModuleCard key={m.name} m={m} />)}
        </div>
      </div>
    </div>
  )
}
