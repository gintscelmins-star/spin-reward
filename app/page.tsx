import Link from 'next/link'

const YEAR = new Date().getFullYear()
const CONTACT = 'gints.celmins@gmail.com'

/* ── Data ──────────────────────────────────────────────────────── */

const MODULES = [
  { icon: '🎡', name: 'Spin Reward',            price: 'Bezmaksas', free: true,
    desc: 'Laimes rats pēc katras vizītes — automātisks WOW moments.' },
  { icon: '💛', name: 'Tips',                    price: '€19/mēn',  free: false,
    desc: 'Digitālā dzeramnauda ar Revolut/Stripe. Klients pateicas viegli.' },
  { icon: '⭐', name: 'Darbinieku novērtējums',  price: '€29/mēn',  free: false,
    desc: 'Privātas atsauksmes + darbinieka reitings pa sesijām.' },
  { icon: '🔍', name: 'Google atgādinājums',     price: '€29/mēn',  free: false,
    desc: 'Auto-piedāvājums atstāt Google atsauksmi pēc labas pieredzes.' },
  { icon: '📣', name: 'Spin+Meta',               price: '€39/mēn',  free: false,
    desc: 'Meta pikselis laimes ratā. Retargetē faktiskos apmeklētājus.' },
  { icon: '📋', name: 'Lead Capture',            price: '€79/mēn',  free: false,
    desc: 'Klients atstāj e-pastu apmaiņā pret balvu. Sava kontaktu DB.' },
  { icon: '🎓', name: 'Onboarding',              price: 'Individuāli', free: false,
    desc: 'Kursi, testi un vadītāja pārskats. Cena pēc komandas lieluma.' },
  { icon: '🎫', name: 'Digital Stamps',          price: '€29/mēn',  free: false,
    desc: 'Digitālā lojalitātes kartīte. 10 apmeklējumi = bezmaksas balva.' },
]

const PLANS = [
  {
    name: 'Sākums',
    price: 'Bezmaksas',
    sub: 'uz visiem laikiem',
    highlight: false,
    modules: ['Spin Reward'],
    cta: 'Sākt bezmaksas',
    href: '/login',
  },
  {
    name: 'Atsauksmes',
    price: '€49',
    sub: 'mēnesī',
    highlight: false,
    modules: ['Spin Reward', 'Google atgādinājums', 'Digital Stamps'],
    cta: 'Sākt izmēģinājumu',
    href: '/login',
  },
  {
    name: 'Komanda',
    price: '€99',
    sub: 'mēnesī',
    highlight: true,
    modules: ['Spin Reward', 'Google atgādinājums', 'Digital Stamps', 'Tips', 'Darbinieku novērtējums'],
    cta: 'Sākt izmēģinājumu',
    href: '/login',
  },
  {
    name: 'Pro',
    price: '€169',
    sub: 'mēnesī',
    highlight: false,
    modules: ['Spin Reward', 'Google atgādinājums', 'Digital Stamps', 'Tips', 'Darbinieku novērtējums', 'Spin+Meta', 'Lead Capture'],
    cta: 'Pieprasīt',
    href: `mailto:${CONTACT}`,
  },
]

const AUDIENCE = [
  'Lāzertags', 'Kartings', 'Batutu parki', 'Escape rooms',
  'Restorāni', 'Bāri', 'Kafejnīcas', 'Skaistumkopšana', 'Fitness',
]

/* ── Component ─────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="text-xl font-black text-purple-950 tracking-tight">Spillit</span>
          <Link
            href="/login"
            className="px-5 py-2 rounded-full text-sm font-bold text-purple-950 transition-all active:scale-95 shadow-md"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)' }}
          >
            Pieslēgties
          </Link>
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
            🎡 Klientu iesaiste, atsauksmes un lojalitāte
          </div>

          <h1
            className="text-5xl sm:text-6xl font-black text-white leading-tight mb-4"
            style={{ textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}
          >
            Spillit
          </h1>

          <p className="text-xl sm:text-2xl font-bold text-white/90 leading-snug mb-4 max-w-xl mx-auto">
            Pārvērt katru apmeklējumu atsauksmēs, lojalitātē un labākos darbiniekos
          </p>

          <p className="text-base text-white/65 leading-relaxed mb-10 max-w-lg mx-auto">
            Feedback un darbinieku reitingi tieši tev — bez publiskas kritikas,
            ar iespēju uzlabot pirms tā nonāk Google.
          </p>

          <Link
            href="/login"
            className="inline-block px-9 py-4 rounded-2xl text-lg font-black text-purple-950 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 8px 36px rgba(255,140,0,0.45)' }}
          >
            Pieslēgties →
          </Link>
        </div>
      </section>

      {/* ── Mērķauditorija ──────────────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-100 px-5 py-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Piemērots</p>
          <p className="text-gray-600 text-base leading-relaxed mb-5">
            Izklaides un servisa vietām ar klātienes klientiem
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {AUDIENCE.map(a => (
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

      {/* ── Moduļi ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-20">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-purple-500 uppercase tracking-widest mb-2">Moduļi</p>
          <h2 className="text-3xl font-black text-gray-900">Komplektē pēc savas vajadzības</h2>
          <p className="text-gray-500 mt-2 text-sm">Sāc ar bezmaksas kodolu, pievieno tikai to, ko vajag</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MODULES.map(m => (
            <div
              key={m.name}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-2xl">{m.icon}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-1 ${
                    m.free
                      ? 'bg-green-100 text-green-700'
                      : m.price === 'Individuāli'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {m.price}
                </span>
              </div>
              <p className="font-black text-gray-900 text-sm leading-tight">{m.name}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          * Onboarding — individuāla cena pēc komandas lieluma
        </p>
      </section>

      {/* ── Plāni ───────────────────────────────────────── */}
      <section className="bg-gray-50 border-t border-gray-100 px-5 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-purple-500 uppercase tracking-widest mb-2">Cenas</p>
            <h2 className="text-3xl font-black text-gray-900">Izvēlies plānu</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`bg-white rounded-3xl flex flex-col overflow-hidden ${
                  plan.highlight
                    ? 'shadow-xl ring-2 ring-purple-500'
                    : 'shadow border border-gray-100'
                }`}
              >
                {plan.highlight && (
                  <div className="bg-purple-600 text-white text-center text-xs font-bold py-1.5 tracking-wider">
                    POPULĀRĀKAIS
                  </div>
                )}
                <div className="p-6 flex flex-col gap-4 flex-1">
                  <div>
                    <p className="text-base font-black text-gray-900">{plan.name}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-purple-700">{plan.price}</span>
                      <span className="text-sm text-gray-400">{plan.sub}</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 flex-1">
                    {plan.modules.map(mod => (
                      <li key={mod} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                        {mod}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`block w-full py-3 rounded-xl text-center text-sm font-bold transition-all active:scale-95 ${
                      plan.highlight
                        ? 'text-purple-950'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                    style={plan.highlight ? { background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 4px 20px rgba(255,140,0,0.35)' } : {}}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Onboarding modulis — individuāla cena. Sazinies:{' '}
            <a href={`mailto:${CONTACT}`} className="underline hover:text-gray-600">{CONTACT}</a>
          </p>
        </div>
      </section>

      {/* ── CTA bottom ──────────────────────────────────── */}
      <section className="bg-gradient-to-br from-purple-950 to-indigo-900 px-5 py-20">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-3">Gatavs sākt?</h2>
          <p className="text-white/55 mb-9 leading-relaxed">
            Uzstādi savu pirmo laimes ratu dažu minūšu laikā — bez tehniskām zināšanām.
          </p>
          <Link
            href="/login"
            className="inline-block px-9 py-4 rounded-2xl text-lg font-black text-purple-950 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', boxShadow: '0 8px 36px rgba(255,140,0,0.4)' }}
          >
            Pieslēgties →
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="bg-purple-950 border-t border-white/5 px-5 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/25 text-xs">© Spillit {YEAR}</p>
          <a href={`mailto:${CONTACT}`} className="text-white/30 text-xs hover:text-white/60 transition-colors">
            {CONTACT}
          </a>
        </div>
      </footer>

    </div>
  )
}
