import Link from 'next/link'

const YEAR = new Date().getFullYear()

const FEATURES = [
  {
    icon: '📊',
    title: 'Privātas atsauksmes',
    body:  'Feedback un instruktoru reitingi tieši tev — bez publiskas kritikas, ar iespēju uzlabot pirms tā nonāk Google.',
  },
  {
    icon: '🎡',
    title: 'Laimes rats + balvas',
    body:  'Iesaistoša pieredze katram apmeklētājam — katrs klients aiziet ar balvas sajūtu un pozitīvu iespaidu.',
  },
  {
    icon: '💶',
    title: '€ atgriešanās kuponi',
    body:  'Klienti atgriežas un atved draugus — automātiski QR kuponi ar atlaidi nākamajai vizītei.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="text-xl font-black text-purple-950 tracking-tight">SpinReward</span>
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
      <section className="relative bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 pt-32 pb-24 px-5 overflow-hidden">
        {/* Rainbow accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
          style={{ background: 'linear-gradient(90deg,#FF3B3B,#FF8C00,#FFD700,#00CC44,#00BFFF,#7B2FFF,#FF1493)' }}
        />
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 35%, rgba(139,92,246,0.35), transparent 70%)' }}
        />

        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur text-white/75 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-white/15">
            🎡 Izklaides un servisa vietām
          </div>

          <h1
            className="text-5xl sm:text-6xl font-black text-white leading-tight mb-5"
            style={{ textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}
          >
            SpinReward
          </h1>

          <p className="text-lg sm:text-xl text-white/75 leading-relaxed mb-10 max-w-lg mx-auto">
            Apmeklētāju iesaiste, atsauksmes un atgriešanās —<br className="hidden sm:block" />
            vienā QR pieskārienā
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

      {/* ── Description ─────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-5 py-14 text-center">
        <p className="text-lg text-gray-600 leading-relaxed">
          Sistēma izklaides un servisa vietām — klients novērtē pieredzi,
          griež laimes ratu, saņem balvu un atlaides kuponu nākamajai reizei.
        </p>
      </section>

      {/* ── Feature cards ───────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-white border border-gray-100 rounded-3xl p-7 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-black text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA bottom ──────────────────────────────────── */}
      <section className="bg-gradient-to-br from-purple-950 to-indigo-900 px-5 py-20">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-3">Gatavs sākt?</h2>
          <p className="text-white/55 mb-9 leading-relaxed">
            Piesakies un uzstādi savu pirmo laimes ratu dažu minūšu laikā.
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
      <footer className="bg-purple-950 border-t border-white/5 px-5 py-6 text-center">
        <p className="text-white/25 text-xs">© SpinReward {YEAR}</p>
      </footer>

    </div>
  )
}
