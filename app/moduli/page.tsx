import Link from 'next/link'
import ContactForm from '@/components/ContactForm'

const WA_LINK = 'https://wa.me/37129320325?text=Sveiki!%20Interesē%20Spillit'

const MODULES = [
  {
    icon: '🎡',
    name: 'Spin Reward',
    price: null,
    free: true,
    tag: 'Bezmaksas',
    short: 'Laimes rats pēc katras vizītes',
    desc: 'Pēc katras sesijas klients griež laimes ratu un saņem balvu. Automātisks WOW moments — klients pats pierāda savu lojalitāti. Atbalsta fiziskās balvas, viedokļus un kuponu kodus.',
    features: [
      'Konfigurējams ratu sektoru skaits un balvas',
      'Balvas var būt reālas (dzēriens, atlaide, bezmaksas vizīte)',
      'SMS/QR aktivizācija — nav app lejupielādes vajadzīgas',
      'Piesaistīts konkrektam darbiniekam / instrukcijai',
    ],
  },
  {
    icon: '⭐',
    name: 'Darbinieku novērtējums',
    price: null,
    free: true,
    tag: 'Bezmaksas',
    short: 'Privātas atsauksmes par katru darbinieku',
    desc: 'Pēc sesijas klients privāti novērtē darbinieku (1–5 zvaigznes + komentārs). Tu redzi visu reāllaikā — vadītāja pārskatā pa sesijām. Uzlabo pirms tas nonāk Google vai tiek publiski izplatīts.',
    features: [
      'Reitings pa sesijām — vienmēr zini, kurš strādā labi',
      'Komentāri redzami tikai vadītājam',
      'Salīdzinājums pa darbinieku grupām',
      'Admin var pievienot vadītāja novērtējumu',
    ],
  },
  {
    icon: '⭐',
    name: 'Tips',
    price: 'no €9/mēn',
    free: false,
    tag: 'no €9/mēn',
    short: 'Digitālā dzeramnauda ar Revolut/Stripe',
    desc: 'Klients redz darbinieka vārdu un fotoattēlu un var digitāli pateikties ar dzeramnaudu — Revolut vai Stripe. Vairāk motivācijas darbiniekiem, vairāk piederības sajūtas klientam.',
    features: [
      'Integrācija ar Revolut vai Stripe',
      'Klients izvēlas summu (1€, 2€, 5€ vai brīva summa)',
      'Darbinieks saņem tieši savā kontā',
      'Var apvienot ar laimes ratu — tips pirms/pēc',
    ],
  },
  {
    icon: '🔍',
    name: 'Google atsauksmju atgādinājums',
    price: 'no €11/mēn',
    free: false,
    tag: 'no €11/mēn',
    short: 'Auto-piedāvājums Google atsauksmei',
    desc: 'Pēc pozitīvas sesijas "done" ekrānā parādās "Neaizmirsti atstāt Google atsauksmi!" — neobligāts. Ieslēdzams/izslēdzams. Nav obligāts. Google atgādinājumi tiek izsūtīti TIKAI pēc tam, kad klients fiziski pametis lokāciju.',
    features: [
      'Parādās tikai pēc labas pieredzes (konfigurējams slieksnis)',
      'Ieslēdzams/izslēdzams ar vienu pogu adminpanelī',
      'Google atgādinājums: SMS/WhatsApp tikai pēc aiziešanas no lokācijas',
      'Visi klikšķi un konversijas tiek sekots dashboardā',
    ],
  },
  {
    icon: '📣',
    name: 'Spin+Meta',
    price: 'no €11/mēn',
    free: false,
    tag: 'no €11/mēn',
    short: 'Meta pikselis un retargetings',
    desc: 'Ievieto Meta (Facebook/Instagram) pikseli laimes ratā. Retargetē faktiskos apmeklētājus — nevis tikai tīmekļa lapas apmeklētājus. Augstāka atbilstība, zemākas reklāmas izmaksas.',
    features: [
      'Meta pikselis aktivizējas pie laimes rata atvēršanas',
      'Custom Audience no faktiskiem klientiem',
      'Augstāka ROI salīdzinot ar website pikseļu',
      'Var kombinēt ar Lead Capture moduļi',
    ],
  },
  {
    icon: '📋',
    name: 'Lead Capture',
    price: 'no €7/mēn',
    free: false,
    tag: 'no €7/mēn',
    short: 'E-pasts apmaiņā pret balvu',
    desc: 'Klients atstāj e-pasta adresi apmaiņā pret papildu balvu vai ekskluzīvu piedāvājumu. Tu veido savu kontaktu bāzi — neatkarīgi no sociālajiem tīkliem.',
    features: [
      'Opt-in forma integrēta laimes ratā',
      'E-pasta verificācija — tikai reāli e-pasti',
      'Eksports CSV vai integrācija ar e-pasta mārketinga rīkiem',
      'GDPR saderīgs — consent checkbox',
    ],
  },
  {
    icon: '🎂',
    name: 'Leads sildīšana',
    price: 'no €7/mēn',
    free: false,
    tag: 'no €7/mēn',
    short: 'Auto-atgādinājums klientiem par ciklisku pasākumu',
    desc: 'Atzīmē klienta dzimšanas dienu vai citu nozīmīgu datumu → nākamgad nedēļu pirms notikuma klients automātiski saņem SMS vai e-pastu ar personalizētu atlaidi vai piedāvājumu.',
    features: [
      'Datuma atzīmēšana sesijas laikā (bērna dzimšanas diena, gadadiena u.c.)',
      'Automātiska SMS/e-pasta sūtīšana pirms notikuma',
      'Personalizēts teksts (vārds, atlaide, pakalpojums)',
      'Pilnīgi automātisks — nav manuālu darbību',
    ],
  },
  {
    icon: '🎫',
    name: 'Digital Stamps',
    price: 'no €10/mēn',
    free: false,
    tag: 'no €10/mēn',
    short: 'Digitālā lojalitātes kartīte',
    desc: 'Klients saņem digitālu zīmogu pēc katras vizītes. 10 zīmogi = bezmaksas balva. Pilnībā digitāls — nav fiziskas kartītes, nav sajūtas par papīru.',
    features: [
      'QR skenēšana zīmoga saņemšanai',
      'Konfigurējams skaits līdz balvai',
      'Push paziņojumi par progresu',
      'Analīze: kurš aktīvi izmanto, kurš "zaudēts"',
    ],
  },
  {
    icon: '📅',
    name: 'Maiņu grafiks',
    price: 'no €25/mēn',
    free: false,
    tag: 'no €25/mēn',
    short: 'Plūstošās maiņas ar WhatsApp čeklistu',
    desc: 'Plūstošās maiņas — ātri aizpildi maiņu grafiku slīdošam ritmam, izseko paveiktos darbus caur WhatsApp čeklistu.',
    features: [
      'Maiņu grafiks ar slīdošu ritmu (mainīgas nedēļas)',
      'WhatsApp čeklists katrai maiņai',
      'Darbu izsekošana reāllaikā',
      'Pārskats vadītājam par izpildi',
    ],
  },
  {
    icon: '🎓',
    name: 'Onboarding',
    price: 'individuāli',
    free: false,
    tag: 'individuāli',
    short: 'Digitāls onboarding jauniem darbiniekiem',
    desc: 'Jauns darbinieks iziet strukturētu apmācību kursu telefonā — video, testi, apstiprinājumi. Tu kā vadītājs redzi progresu un testi apstiprina, ka materiāls ir apgūts.',
    features: [
      'Kursu modulāra struktūra (video, teksts, jautājumi)',
      'Testi ar automātisko vērtēšanu',
      'Vadītāja pārskats: kurš ko ir apguvis',
      'Vienota informācijas bāze visiem darbiniekiem',
    ],
  },
]

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '€0',
    period: '',
    highlight: false,
    modules: ['Spin Reward', 'Darbinieku novērtējums'],
    desc: 'Sāc bez riska. Pilns laimes rats + atsauksmes bez maksas uz visiem laikiem.',
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '€29',
    period: '/mēn',
    highlight: false,
    modules: ['Spin Reward', 'Darbinieku novērtējums', 'Tips', 'Google atsauksmju atgādinājums'],
    desc: 'Ideāls sākumam — iekļauj dzeramnaudu un Google atsauksmes.',
  },
  {
    key: 'pamata',
    name: 'Pamata',
    price: '€59',
    period: '/mēn',
    highlight: true,
    modules: ['Spin Reward', 'Darbinieku novērtējums', 'Tips', 'Google atsauksmju atgādinājums', 'Spin+Meta', 'Digital Stamps'],
    desc: 'Meta retargetings + lojalitātes kartīte — aug kopā ar biznesu.',
  },
  {
    key: 'viss',
    name: 'Viss kopā',
    price: '€119',
    period: '/mēn',
    highlight: false,
    modules: ['Spin Reward', 'Darbinieku novērtējums', 'Tips', 'Google atsauksmju atgādinājums', 'Spin+Meta', 'Digital Stamps', 'Lead Capture', 'Leads sildīšana', 'Maiņu grafiks'],
    desc: 'Pilns arsenāls. Lead Capture, sildīšana un maiņu grafiks.',
  },
]

export default function ModuliPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="text-xl font-black text-purple-950 tracking-tight">Spillit</Link>
          <div className="flex items-center gap-2">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold text-green-800 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
            >
              <span>💬</span> WhatsApp
            </a>
            <Link
              href="/register"
              className="px-5 py-2 rounded-full text-sm font-bold text-purple-950 transition-all active:scale-95 shadow-md"
              style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)' }}
            >
              Sākt bezmaksas izmēģinājumu
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-purple-950 to-indigo-900 px-5 py-16 text-center">
        <p className="text-purple-300 text-sm font-semibold uppercase tracking-widest mb-3">Moduļi un cenas</p>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
          Komplektē Spillit<br />pēc savas vajadzības
        </h1>
        <p className="text-white/60 max-w-md mx-auto text-base leading-relaxed">
          Sāc ar bezmaksas kodolu. Pievieno tikai to, ko vajag.
          Skaidras cenas — nav slēpto maksu.
        </p>
      </div>

      {/* Plans */}
      <div className="bg-gray-50 border-b border-gray-100 px-5 py-14">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.key}
                className={`rounded-2xl border p-5 flex flex-col gap-3 ${
                  plan.highlight
                    ? 'border-purple-400 bg-purple-50 shadow-md ring-2 ring-purple-200'
                    : 'border-gray-200 bg-white shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Populārākais</span>
                )}
                <div>
                  <p className="text-lg font-black text-gray-900">{plan.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{plan.desc}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm mb-0.5">{plan.period}</span>
                </div>
                <ul className="space-y-1 flex-1">
                  {plan.modules.map(m => (
                    <li key={m} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="text-purple-500 font-bold">✓</span> {m}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full py-2 rounded-xl text-sm font-bold text-center transition-all active:scale-95 ${
                    plan.highlight
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {plan.price === '€0' ? 'Sākt bezmaksas izmēģinājumu' : 'Sākt bezmaksas izmēģinājumu'}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Onboarding — individuāla cena. <a href="#pieteikums" className="text-purple-500 hover:underline">Sazinies →</a>
          </p>
        </div>
      </div>

      {/* Badge legend */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Bezmaksas</span>
            <span className="text-gray-500">Iekļauts visos plānos bez maksas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">no €X/mēn</span>
            <span className="text-gray-500">Papildu modulis ar fiksētu sākumcenu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">individuāli</span>
            <span className="text-gray-500">Cena atkarīga no jūsu uzņēmuma apmēra</span>
          </div>
        </div>
      </div>

      {/* Module list */}
      <div className="max-w-5xl mx-auto px-5 py-16 flex flex-col gap-10">
        {MODULES.map(m => (
          <div
            key={m.name}
            id={m.name.toLowerCase().replace(/\s+/g, '-')}
            className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="text-4xl flex-shrink-0">{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h2 className="text-xl font-black text-gray-900">{m.name}</h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        m.free
                          ? 'bg-green-100 text-green-700'
                          : m.tag === 'individuāli'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {m.tag}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3 font-medium">{m.short}</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-5">{m.desc}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {m.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            {!m.free && (
              <div className="border-t border-gray-50 bg-gray-50/50 px-6 sm:px-8 py-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-gray-500">
                  {m.tag === 'individuāli'
                    ? `Interesē ${m.name}? Sazinieties ar mums individuālai cenai.`
                    : `${m.name} — ${m.tag}. Iekļauts atbilstošajos bundļos.`}
                </p>
                <a
                  href="#pieteikums"
                  className="text-sm font-bold text-purple-700 hover:text-purple-900 transition-colors"
                >
                  Pieteikties →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact form */}
      <section id="pieteikums" className="bg-gray-50 border-t border-gray-100 px-5 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-purple-500 uppercase tracking-widest mb-2">Pieteikums</p>
            <h2 className="text-3xl font-black text-gray-900">Piesakies moduļiem</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Izvēlies interesējošos moduļus un mēs sazināsimies ar individuālu piedāvājumu.
              Vai raksti WhatsApp →{' '}
              <a href={WA_LINK} target="_blank" rel="noreferrer" className="text-green-600 font-semibold hover:underline">
                +371 29320325
              </a>
            </p>
          </div>
          <ContactForm showModules />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-purple-950 border-t border-white/5 px-5 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="text-white/30 text-xs hover:text-white/60 transition-colors">← Atpakaļ uz sākumu</Link>
          <a href="mailto:gints@spillit.lv" className="text-white/30 text-xs hover:text-white/60 transition-colors">gints@spillit.lv</a>
        </div>
      </footer>

    </div>
  )
}
