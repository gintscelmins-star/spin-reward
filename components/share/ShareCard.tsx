'use client'

import { useEffect, useRef, useState } from 'react'
import type { GameResult } from '@/lib/result'
import { resultVideo, classMedia, teamLabel, fmt } from '@/lib/result'
import { trackEvent } from '@/lib/track'

interface Props {
  result: GameResult
  onShare: () => void
}

export default function ShareCard({ result, onShare }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const videoUrl = resultVideo(result)
  const media = classMedia(result.top_class)
  const team = teamLabel(result.team)

  useEffect(() => {
    trackEvent({ token: result.share_token, event: 'view' })
  }, [result.share_token])

  function togglePlay() {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) {
      vid.play().catch(() => {})
      setPlaying(true)
    } else {
      vid.pause()
      setPlaying(false)
    }
  }

  function toggleMute() {
    const vid = videoRef.current
    if (!vid) return
    vid.muted = !vid.muted
    setMuted(vid.muted)
  }

  const kdColor = (result.kd_plusminus ?? 0) >= 0 ? '#4ade80' : '#ff4d4d'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Orbitron:wght@600;700;800;900&display=swap');
        :root {
          --bg:#07080e;
          --cyan:#22dcff;
          --red:#ff4d4d;
          --gold:#ffc63d;
          --purple-a:#6d49e6;
          --line:rgba(34,220,255,.22);
        }
        .gnl-wrap {
          font-family:'Chakra Petch',sans-serif;
          background:var(--bg);
          min-height:100vh;
          color:#e8edf3;
          display:flex;
          flex-direction:column;
          align-items:center;
          padding:16px 16px 32px;
          gap:20px;
        }
        .gnl-crumb {
          align-self:flex-start;
          display:flex;
          align-items:center;
          gap:6px;
          color:#7a8699;
          font-size:13px;
          cursor:pointer;
          letter-spacing:.04em;
        }
        .gnl-crumb svg { width:16px;height:16px;stroke:#7a8699;stroke-width:2;fill:none }
        .gnl-head {
          width:100%;
          max-width:420px;
          display:flex;
          align-items:center;
          gap:10px;
        }
        .gnl-dot {
          width:10px;height:10px;border-radius:50%;
          background:var(--cyan);
          box-shadow:0 0 8px var(--cyan);
          flex-shrink:0;
        }
        .gnl-head h1 {
          font-family:'Orbitron',sans-serif;
          font-size:22px;font-weight:800;
          letter-spacing:.06em;
          text-transform:uppercase;
          margin:0;
        }
        .gnl-pill {
          padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;
          letter-spacing:.08em;text-transform:uppercase;
        }
        .gnl-pill.num { background:rgba(34,220,255,.12);color:var(--cyan);border:1px solid var(--line) }
        .gnl-pill.cls { background:rgba(255,198,61,.12);color:var(--gold);border:1px solid rgba(255,198,61,.3) }
        .gnl-grid { width:100%;max-width:420px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start }
        .gnl-stats {
          background:#0c0e17;border:1px solid var(--line);border-radius:14px;padding:14px 16px;
          display:flex;flex-direction:column;gap:6px;
        }
        .gnl-srow { display:flex;justify-content:space-between;align-items:center;font-size:13px }
        .gnl-srow .k { color:#7a8699 }
        .gnl-srow .v { font-weight:600;letter-spacing:.02em }
        .gnl-srow .v.gold { color:var(--gold) }
        .gnl-srow .v.red  { color:var(--red) }
        .gnl-srow .v.green{ color:#4ade80 }
        .gnl-srow .v.cyan { color:var(--cyan) }

        /* VIDEO CARD */
        .vcard {
          position:relative;width:140px;flex-shrink:0;
          aspect-ratio:9/16;border-radius:12px;
          overflow:hidden;cursor:pointer;
          border:1px solid var(--line);
          box-shadow:0 0 18px rgba(34,220,255,.18),0 0 50px rgba(34,220,255,.06);
        }
        .vcard video,.vcard img { position:absolute;inset:0;width:100%;height:100%;object-fit:cover }
        .vcard video { z-index:1 }
        .vbadge {
          position:absolute;top:8px;left:8px;z-index:3;
          display:flex;align-items:center;gap:5px;
          background:rgba(0,0,0,.65);backdrop-filter:blur(4px);
          border-radius:20px;padding:3px 8px 3px 6px;font-size:10px;font-weight:700;
          letter-spacing:.08em;color:#fff;
        }
        .vbadge svg{width:9px;height:9px;fill:#fff}
        .playring {
          position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;
          transition:opacity .2s;
        }
        .playring.hidden { opacity:0 }
        .ring {
          width:46px;height:46px;border-radius:50%;
          border:2px solid rgba(34,220,255,.7);
          display:flex;align-items:center;justify-content:center;
          animation:breathe 2.4s ease-in-out infinite;
          background:rgba(0,0,0,.45);
        }
        .ring svg{width:18px;height:18px;fill:#fff;margin-left:2px}
        @keyframes breathe{0%,100%{box-shadow:0 0 0 0 rgba(34,220,255,.5)}50%{box-shadow:0 0 0 10px rgba(34,220,255,0)}}
        .sound {
          position:absolute;bottom:8px;left:8px;z-index:3;
          width:28px;height:28px;border-radius:50%;
          background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.12);
          display:flex;align-items:center;justify-content:center;cursor:pointer;
        }
        .sound svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:1.8}

        /* ACTIONS */
        .gnl-actions { display:flex;gap:10px;width:100%;max-width:420px }
        .btn {
          flex:1;display:flex;align-items:center;justify-content:center;gap:10px;
          padding:14px 16px;border-radius:11px;border:none;cursor:pointer;
          font-family:'Chakra Petch',sans-serif;font-size:13px;font-weight:700;
          letter-spacing:.06em;transition:all .15s;
        }
        .btn.share {
          color:#fff;
          background:linear-gradient(120deg,var(--purple-a),#9b6cf7);
        }
        .btn.share:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .btn.share svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2}
        .btn.ghost {
          color:#c4ccd8;background:#141823;border:1px solid rgba(255,255,255,.09);
        }
        .btn.ghost:hover{background:#1a1f2c;color:#fff}
      `}</style>

      <div className="gnl-wrap">
        <div className="gnl-crumb" onClick={() => history.length > 1 ? history.back() : null}>
          <svg viewBox="0 0 24 24" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Leaderboard
        </div>

        <div className="gnl-head">
          <span className="gnl-dot" />
          <h1>{result.callsign}</h1>
          <span className="gnl-pill cls">{result.top_class ?? 'WARRIOR'}</span>
        </div>

        <div className="gnl-grid">
          {/* Stats */}
          <div className="gnl-stats">
            <div className="gnl-srow"><span className="k">Komanda</span><span className="v" style={{ color: team.color }}>{team.label}</span></div>
            <div className="gnl-srow"><span className="k">Reitings</span><span className="v cyan">{fmt(result.rating)}</span></div>
            <div className="gnl-srow"><span className="k">Trāpījumi</span><span className="v">{result.hits ?? '—'}</span></div>
            <div className="gnl-srow"><span className="k">Ievainojumi</span><span className="v">{result.injuries ?? '—'}</span></div>
            <div className="gnl-srow"><span className="k">K:D ratio</span>
              <span className="v" style={{ color: (result.kd_ratio ?? 0) >= 1 ? '#4ade80' : '#ff4d4d' }}>
                {fmt(result.kd_ratio)}
              </span>
            </div>
            <div className="gnl-srow"><span className="k">K:D +/-</span>
              <span className="v" style={{ color: kdColor }}>
                {result.kd_plusminus != null ? (result.kd_plusminus >= 0 ? '+' : '') + result.kd_plusminus : '—'}
              </span>
            </div>
            <div className="gnl-srow"><span className="k">Precizitāte</span><span className="v">{fmt(result.accuracy, 2, '%')}</span></div>
            <div className="gnl-srow"><span className="k">Izšautās lodes</span><span className="v">{result.shots_fired?.toLocaleString() ?? '—'}</span></div>
            <div className="gnl-srow"><span className="k">Trāp. komandā %</span><span className="v">{fmt(result.team_hit_pct, 2, '%')}</span></div>
          </div>

          {/* Video card */}
          <div className="vcard" onClick={togglePlay}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.poster} alt={media.label} />
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />

            <div className="vbadge">
              <svg viewBox="0 0 12 12"><polygon points="3,1 11,6 3,11"/></svg>
              VIDEO
            </div>

            <div className={`playring${playing ? ' hidden' : ''}`}>
              <div className="ring">
                <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
              </div>
            </div>

            <button
              className="sound"
              onClick={e => { e.stopPropagation(); toggleMute() }}
              aria-label={muted ? 'Ieslēgt skaņu' : 'Izslēgt skaņu'}
            >
              {muted ? (
                <svg viewBox="0 0 24 24" strokeLinecap="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <line x1="23" y1="9" x2="17" y2="15"/>
                  <line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" strokeLinecap="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <path d="M15.54 8.46a5 5 0 010 7.07"/>
                  <path d="M19.07 4.93a10 10 0 010 14.14"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="gnl-actions">
          <button className="btn share" onClick={onShare}>
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            DALĪTIES
          </button>
          <button className="btn ghost" onClick={() => history.length > 1 ? history.back() : null}>
            ← SARAKSTS
          </button>
        </div>
      </div>
    </>
  )
}
