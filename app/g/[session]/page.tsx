import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getSessionResults, teamLabel } from '@/lib/result'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ session: string }>
}): Promise<Metadata> {
  return { title: 'GUNSnLASERS — Rezultāti' }
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ session: string }>
}) {
  const { session } = await params
  const players = await getSessionResults(session)
  if (players.length === 0) notFound()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');
        :root{--bg:#07080e;--cyan:#22dcff;--gold:#ffc63d;--line:rgba(34,220,255,.18)}
        body{margin:0;background:var(--bg);color:#e8edf3;font-family:'Chakra Petch',sans-serif}
        .g-wrap{max-width:540px;margin:0 auto;padding:24px 16px 48px}
        .g-logo{font-family:'Orbitron',sans-serif;font-size:13px;font-weight:900;
          letter-spacing:.12em;color:var(--cyan);text-transform:uppercase;margin-bottom:24px}
        .g-title{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;
          letter-spacing:.06em;margin:0 0 6px;text-transform:uppercase}
        .g-sub{font-size:12px;color:#7a8699;margin:0 0 24px;letter-spacing:.04em}
        .g-table{width:100%;border-collapse:collapse;border-spacing:0}
        .g-table thead th{text-align:left;font-size:11px;color:#7a8699;letter-spacing:.08em;
          text-transform:uppercase;padding:0 12px 8px;border-bottom:1px solid var(--line)}
        .g-table tbody tr{border-bottom:1px solid rgba(34,220,255,.07);cursor:pointer;
          transition:background .12s}
        .g-table tbody tr:hover{background:rgba(34,220,255,.04)}
        .g-table td{padding:14px 12px;font-size:14px;vertical-align:middle}
        .g-rank{font-family:'Orbitron',sans-serif;font-weight:900;font-size:15px}
        .g-rank.gold{color:var(--gold)}
        .g-rank.silver{color:#b0b8c8}
        .g-rank.bronze{color:#cd7c3a}
        .g-callsign{font-weight:700;letter-spacing:.03em}
        .g-class{font-size:11px;color:#7a8699;margin-top:2px;letter-spacing:.06em}
        .g-rating{font-family:'Orbitron',sans-serif;font-weight:700;font-size:14px;color:var(--cyan)}
        .g-share-btn{
          display:inline-flex;align-items:center;gap:6px;
          font-family:'Chakra Petch',sans-serif;font-size:11px;font-weight:700;
          letter-spacing:.06em;color:#7a8699;text-decoration:none;
          background:#141823;border:1px solid rgba(255,255,255,.08);
          border-radius:8px;padding:5px 10px;transition:all .15s
        }
        .g-share-btn:hover{color:#fff;border-color:var(--line);background:#1a1f2c}
      `}</style>
      <div className="g-wrap">
        <div className="g-logo">GUNSnLASERS</div>
        <h1 className="g-title">Spēles rezultāti</h1>
        <p className="g-sub">{players.length} spēlētāji · Atlasi savu kaujas vārdu</p>

        <table className="g-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Kaujas vārds</th>
              <th style={{ textAlign: 'right' }}>Reitings</th>
              <th style={{ textAlign: 'right' }}>K:D</th>
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const rank = i + 1
              const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''
              const team = teamLabel(p.team)
              return (
                <tr key={p.id} onClick={() => { window.location.href = `/r/${p.share_token}` }}>
                  <td>
                    <span className={`g-rank ${rankClass}`}>{rank}</span>
                  </td>
                  <td>
                    <div className="g-callsign">{p.callsign}</div>
                    <div className="g-class">
                      <span style={{ color: team.color }}>{team.label}</span>
                      {p.top_class ? ` · ${p.top_class}` : ''}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="g-rating">{p.rating?.toFixed(2) ?? '—'}</span>
                  </td>
                  <td style={{ textAlign: 'right', color: (p.kd_ratio ?? 0) >= 1 ? '#4ade80' : '#ff4d4d', fontWeight: 600 }}>
                    {p.kd_ratio?.toFixed(2) ?? '—'}
                  </td>
                  <td>
                    <Link href={`/r/${p.share_token}`} className="g-share-btn" onClick={e => e.stopPropagation()}>
                      Dalīties
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
