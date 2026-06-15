'use client'

const INQUIRY_URL = '/moduli#pieteikums'

interface Module {
  icon: string
  name: string
  free: boolean
  how: string
  benefit: string
  features: string[]
}

const MODULES: Module[] = [
  {
    icon: '🎡',
    name: 'Spin Reward',
    free: true,
    how: 'Pēc katras sesijas klients skenē QR un griež laimes ratu. Uzvar vienu no tavām balvām.',
    benefit: 'Katrs klients aiziet ar WOW sajūtu un pozitīvu iespaidu — bez papildu izmaksām.',
    features: [
      'Pielāgojams laimes rats ar savām balvām un svara koeficientiem',
      'QR balvas kods ar termiņu un grāmatvedības uzskaiti',
      'Privāta atsauksme (zvaigznes/īkšķi) pirms rata griešanas',
    ],
  },
  {
    icon: '⭐',
    name: 'Darbinieku novērtējums',
    free: true,
    how: 'Atsauksmes tiek saistītas ar konkrēto darbinieku un aktivitāti. Vadītājs redz reitingus pa personām.',
    benefit: 'Privāts feedbacks, kas nenonāk Google — tikai tev. Uzzini, kurš darbinieks pelna cik zvaigznes.',
    features: [
      'Atsauksmes pa darbiniekam un aktivitātes veidam',
      'Reitinga statistika: vidējā zvaigzne, tendenču grafiks',
      'Negatīvs feedbacks paliek pie tevis — pozitīvs iet uz Google',
    ],
  },
  {
    icon: '💛',
    name: 'Tips',
    free: false,
    how: 'Pēc balvas saņemšanas klients redz "Vai pateikties {darbiniekam}?" — poga ved uz Revolut/Stripe linku.',
    benefit: 'Darbinieki saņem digitālas dzeramnaudas bez fiziskas naudas — motivācija un klientu apmierinātība aug.',
    features: [
      'Katram darbiniekam savs Revolut/Stripe tip links',
      'Tips solis rādās tikai tad, ja darbiniekam ir aktīvs links',
      'Modulis ieslēdzams/izslēdzams katram darbiniekam atsevišķi',
    ],
  },
  {
    icon: '🔍',
    name: 'Google atgādinājums',
    free: false,
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
    free: false,
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
    free: false,
    how: 'Klients ievada e-pastu/telefonu apmaiņā pret bonusu (balvu vai kuponu). Kontakti nonāk tavā DB vai integrētā e-pasta sistēmā.',
    benefit: 'Veido savu klientu sarakstu katru dienu — bez reklāmas izmaksām.',
    features: [
      'Pielāgojams "Saņem bonusu" aicināms teksts un forma',
      'Eksports uz CSV vai integrācija ar Mailchimp/Brevo',
      'GDPR piekrišanas čekbokss iekļauts formā',
    ],
  },
  {
    icon: '🎂',
    name: 'Leads sildīšana',
    free: false,
    how: 'Atzīmē klienta dzimšanas dienu vai citu datumu → nākamgad automātisks SMS ar atlaidi pirms notikuma.',
    benefit: 'Klients sajūt, ka tu atceries viņu — atgriežas bez papildu reklāmas izmaksām.',
    features: [
      'Datuma atzīmēšana sesijas laikā',
      'Automātiska SMS/e-pasta sūtīšana pirms notikuma',
      'Personalizēts teksts — vārds, atlaide, pakalpojums',
    ],
  },
  {
    icon: '🎫',
    name: 'Digital Stamps',
    free: false,
    how: 'Katrs apmeklējums = 1 zīmogs. Pēc N apmeklējumiem klients automātiski saņem balvas QR kodu.',
    benefit: 'Digitālā lojalitātes kartīte, kas darbojas bez fiziskas kartiņas vai aplikācijas lejupielādes.',
    features: [
      'Pielāgojams apmeklējumu skaits līdz balvai (piem. 10)',
      'Klients redz savu progresu QR skenēšanas ekrānā',
      'Balva tiek izsniegta automātiski — bez manuāla darba',
    ],
  },
  {
    icon: '🎓',
    name: 'Onboarding',
    free: false,
    how: 'Jaunam darbiniekam pieejami kursi, video, testi tieši lietotnē. Vadītājs izseko izpildi un saņem pārskatu.',
    benefit: 'Jauns darbinieks kļūst produktīvs 2× ātrāk. Visi standarti dokumentēti vienā vietā.',
    features: [
      'Moduļu kursi ar video, tekstu un pārbaudes testiem',
      'Progresa izsekošana pa darbiniekam un kursam',
      'Automātisks progress report vadītājam uz e-pastu',
    ],
  },
]

function ModuleCard({ m }: { m: Module }) {
  return (
    <div className={`bg-white rounded-2xl border flex flex-col overflow-hidden ${
      m.free ? 'border-green-200 shadow' : 'border-gray-100 shadow'
    }`}>
      <div className={`h-1 ${m.free ? 'bg-green-400' : 'bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400'}`} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-3xl">{m.icon}</span>
          {m.free ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Bezmaksas
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Pēc pieprasījuma
            </span>
          )}
        </div>
        <div>
          <h3 className="text-base font-black text-gray-900">{m.name}</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{m.how}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-600 border border-gray-100">
          <span className="font-semibold text-gray-700">Ieguvums: </span>{m.benefit}
        </div>
        <ul className="space-y-1 flex-1">
          {m.features.map(f => (
            <li key={f} className="flex gap-1.5 text-xs text-gray-600">
              <span className={`flex-shrink-0 mt-0.5 font-bold ${m.free ? 'text-green-500' : 'text-indigo-400'}`}>✦</span>
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-3">
          {m.free ? (
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
                <span className="text-base">✓</span> Ieslēgts
              </span>
            </div>
          ) : (
            <a
              href={INQUIRY_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-sm text-center active:scale-95 transition-all"
            >
              Pieteikties →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UpsellCards() {
  const free = MODULES.filter(m => m.free)
  const paid = MODULES.filter(m => !m.free)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-3">
          Iekļauts — bezmaksas
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {free.map(m => <ModuleCard key={m.name} m={m} />)}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">
          Papildu moduļi — pēc pieprasījuma
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paid.map(m => <ModuleCard key={m.name} m={m} />)}
        </div>
      </div>
    </div>
  )
}
