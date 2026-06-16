import Link from 'next/link'

export default function LaserstatsBanner() {
  return (
    <Link
      href="/laserstats/"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 rounded-2xl no-underline mb-5"
      style={{
        padding: '14px 20px',
        background: 'linear-gradient(90deg,#e8193c 0%,#7b1fa2 55%,#1a8fff 100%)',
        color: '#fff',
        boxShadow: '0 8px 28px rgba(123,31,162,.35)',
        fontFamily: "'Orbitron', system-ui, sans-serif",
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderRadius: 14,
        marginBottom: 20,
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>🎯</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 15, letterSpacing: 1 }}>
          Lasertag statistikas vizualizācija
        </strong>
        <span style={{ fontSize: 12.5, opacity: .9, fontFamily: 'system-ui,sans-serif' }}>
          Apskati demo — spēles rezultāti, spēlētāja video kartiņa, dalīšanās soctīklos
        </span>
      </span>
      <span style={{
        fontSize: 12, fontWeight: 700, letterSpacing: 1,
        border: '1px solid rgba(255,255,255,.5)', borderRadius: 20, padding: '7px 14px',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        SKATĪT DEMO ↗
      </span>
    </Link>
  )
}
