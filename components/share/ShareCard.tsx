'use client'

import { useEffect, useRef, useState } from 'react'
import type { GameResult } from '@/lib/result'
import { resultVideo, classMedia, teamLabel, fmt } from '@/lib/result'
import { trackEvent } from '@/lib/track'

const CLASSES = [
  ['COMMANDO',    '<circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="2.5"/>'],
  ['KAMIKAZE',   '<path d="M12 2l2.4 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.6-.5z"/>'],
  ['SNIPER',     '<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5"/>'],
  ['DESTROYER',  '<circle cx="9" cy="10" r="5"/><circle cx="15" cy="10" r="5"/><path d="M9 19v2M15 19v2M12 19v2"/>'],
  ['WARRIOR',    '<path d="M5 5l9 9M19 5l-9 9M5 19l5-5M19 19l-5-5"/>'],
  ['CAMPER',     '<path d="M3 20h18L12 5z"/><path d="M12 5v15"/>'],
  ['PUNISHER',   '<path d="M5 7l3 5-3 5M19 7l-3 5 3 5"/><circle cx="12" cy="12" r="5"/>'],
  ['EXECUTIONER','<path d="M14 4l6 6-9 9-5 1 1-5z"/><path d="M4 20l3-3"/>'],
] as const

interface Props {
  result: GameResult
  onShare: () => void
}

export default function ShareCard({ result, onShare }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted]   = useState(true)
  const [playing, setPlaying] = useState(false)
  const [dur, setDur]       = useState('0:00')
  const videoUrl = resultVideo(result)
  const media    = classMedia(result.top_class)
  const team     = teamLabel(result.team)
  const cls      = (result.top_class ?? 'WARRIOR').toUpperCase()

  useEffect(() => {
    trackEvent({ token: result.share_token, event: 'view' })
  }, [result.share_token])

  function toggleSound() {
    const vid = videoRef.current
    if (!vid) return
    vid.muted = !vid.muted
    vid.play().catch(() => {})
    setMuted(vid.muted)
    setPlaying(true)
  }

  function onLoadedMeta() {
    const vid = videoRef.current
    if (!vid) return
    const s = Math.round(vid.duration)
    setDur(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)
  }

  const kdColor = (result.kd_ratio ?? 0) >= 1 ? 'var(--green)' : 'var(--red)'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Orbitron:wght@600;700;800;900&display=swap');
        :root{
          --bg:#07080e;--line:rgba(255,255,255,.06);
          --txt:#e7ecf3;--dim:#7c8593;--dim2:#aab2bf;
          --cyan:#22dcff;--cyan-glow:rgba(34,220,255,.5);
          --red:#ff4d4d;--gold:#ffc63d;--green:#42e08a;
          --purple-a:#6d49e6;--purple-b:#a45cff;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{background:var(--bg)}
        .gnl-page{
          font-family:'Chakra Petch',sans-serif;color:var(--txt);min-height:100vh;padding:22px 30px 44px;
          background:
            radial-gradient(90% 60% at 78% 18%,rgba(34,120,200,.10),transparent 60%),
            radial-gradient(80% 70% at 12% 8%,rgba(120,40,180,.08),transparent 55%),
            radial-gradient(120% 100% at 50% -10%,#11131d 0%,#07080e 60%,#04050a 100%);
        }
        .gnl-wrap{max-width:1480px;margin:0 auto}
        .gnl-crumb{display:inline-flex;align-items:center;gap:8px;color:#9aa0b4;font-size:15px;font-weight:500;margin-bottom:14px;opacity:.85;cursor:pointer}
        .gnl-crumb svg{width:16px;height:16px;stroke:#9aa0b4;fill:none;stroke-width:2}
        .gnl-head{display:flex;align-items:center;gap:14px;margin-bottom:22px;flex-wrap:wrap}
        .gnl-dot{width:13px;height:13px;border-radius:50%;background:#ff3b3b;box-shadow:0 0 12px rgba(255,60,60,.8);flex-shrink:0}
        .gnl-head h1{font-size:34px;font-weight:700;letter-spacing:.5px;line-height:1}
        .gnl-pill{font-size:13px;font-weight:600;letter-spacing:1px;padding:5px 11px;border-radius:7px}
        .gnl-pill.num{background:#1b1f2b;color:#c4ccd8}
        .gnl-pill.cls{background:rgba(255,198,61,.08);color:var(--gold);border:1px solid rgba(255,198,61,.5);letter-spacing:2px}

        /* TABS */
        .gnl-tabs{display:flex;gap:26px;margin-bottom:26px;flex-wrap:wrap}
        .gnl-tab{display:flex;flex-direction:column;align-items:center;gap:7px;width:74px;cursor:pointer;user-select:none}
        .gnl-tab .ic{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          background:radial-gradient(circle at 50% 38%,#1a1d27,#0c0e15);border:1px solid rgba(255,255,255,.07);transition:.2s}
        .gnl-tab .ic svg{width:26px;height:26px;stroke:#5a6171;fill:none;stroke-width:1.7}
        .gnl-tab .lbl{font-size:10px;letter-spacing:1.5px;color:#5a6171;font-weight:600}
        .gnl-tab.active .ic{background:radial-gradient(circle at 50% 38%,#2a2410,#11140d);border:2px solid var(--gold);
          box-shadow:0 0 22px rgba(255,198,61,.45),inset 0 0 14px rgba(255,198,61,.25)}
        .gnl-tab.active .ic svg{stroke:var(--gold);filter:drop-shadow(0 0 4px rgba(255,198,61,.7))}
        .gnl-tab.active .lbl{color:var(--gold);text-shadow:0 0 8px rgba(255,198,61,.5)}
        .gnl-tab:not(.active):hover .ic{border-color:rgba(255,255,255,.18)}
        .gnl-tab:not(.active):hover .ic svg{stroke:#8b93a3}

        /* GRID */
        .gnl-grid{display:grid;grid-template-columns:1fr 460px;gap:30px;align-items:start}
        .gnl-stats{background:linear-gradient(180deg,rgba(255,255,255,.022),rgba(255,255,255,0));
          border:1px solid var(--line);border-radius:14px;padding:8px 4px 12px}
        .gnl-stats h2{font-size:12px;letter-spacing:4px;color:var(--dim);font-weight:600;padding:14px 22px 10px}
        .gnl-srow{display:flex;justify-content:space-between;align-items:center;padding:13px 22px;
          border-top:1px solid rgba(255,255,255,.04)}
        .gnl-srow .k{color:var(--dim2);font-size:15.5px;font-weight:500}
        .gnl-srow .v{font-size:16px;font-weight:700;font-variant-numeric:tabular-nums}
        .gnl-srow .v.gold{color:var(--gold)}
        .gnl-srow .v.red{color:var(--red)}
        .gnl-srow .v.green{color:var(--green)}

        /* CARD COLUMN */
        .gnl-cardcol{display:flex;flex-direction:column;gap:18px;align-items:center}
        .gnl-vcard{
          position:relative;width:100%;max-width:384px;aspect-ratio:9/16;border-radius:18px;overflow:hidden;cursor:pointer;
          background:#04050a;border:1px solid rgba(34,220,255,.22);
          box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 30px rgba(34,220,255,.12),0 22px 50px rgba(0,0,0,.7);
        }
        .gnl-vcard video{width:100%;height:100%;object-fit:cover;display:block}
        .gnl-vbadge{position:absolute;top:12px;left:12px;z-index:4;display:flex;align-items:center;gap:7px;
          background:rgba(6,9,16,.66);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.14);
          border-radius:30px;padding:6px 12px 6px 9px;font-size:11px;font-weight:700;letter-spacing:2px;color:#eef6fe}
        .gnl-tri{width:0;height:0;border-left:9px solid var(--cyan);border-top:6px solid transparent;border-bottom:6px solid transparent;filter:drop-shadow(0 0 4px var(--cyan-glow))}
        .gnl-vdur{position:absolute;bottom:12px;right:12px;z-index:4;background:rgba(6,9,16,.66);backdrop-filter:blur(4px);
          border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:5px 9px;font-size:11px;font-weight:700;letter-spacing:1px;color:#cfd6de}
        .gnl-sound{position:absolute;bottom:12px;left:12px;z-index:5;width:38px;height:38px;border-radius:50%;
          border:1px solid rgba(255,255,255,.16);background:rgba(6,9,16,.66);backdrop-filter:blur(4px);
          display:flex;align-items:center;justify-content:center;cursor:pointer}
        .gnl-sound svg{width:18px;height:18px;stroke:#eaf6ff;fill:none;stroke-width:1.8}
        .gnl-playring{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;pointer-events:none;transition:opacity .6s .4s}
        .gnl-playring.hidden{opacity:0}
        .gnl-ring{width:74px;height:74px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          background:rgba(8,12,20,.42);border:2px solid rgba(255,255,255,.85);
          box-shadow:0 0 24px rgba(34,220,255,.45);animation:gnl-breathe 2.4s ease-in-out infinite}
        .gnl-ring::after{content:"";width:0;height:0;margin-left:5px;
          border-left:20px solid #fff;border-top:13px solid transparent;border-bottom:13px solid transparent}
        @keyframes gnl-breathe{0%,100%{transform:scale(1);opacity:.92}50%{transform:scale(1.08);opacity:.65}}

        /* ACTIONS */
        .gnl-actions{display:flex;gap:14px;width:100%;max-width:384px}
        .gnl-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:10px;padding:15px 16px;border-radius:11px;
          font-size:15px;font-weight:700;letter-spacing:2px;cursor:pointer;border:0;font-family:'Chakra Petch',sans-serif;transition:.15s}
        .gnl-btn svg{width:18px;height:18px;fill:none;stroke-width:2}
        .gnl-btn.share{color:#fff;background:linear-gradient(120deg,var(--purple-a),var(--purple-b));
          box-shadow:0 8px 22px rgba(120,70,230,.4),inset 0 1px 0 rgba(255,255,255,.25)}
        .gnl-btn.share:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .gnl-btn.share svg{stroke:#fff}
        .gnl-btn.ghost{color:#c4ccd8;background:#141823;border:1px solid rgba(255,255,255,.09)}
        .gnl-btn.ghost:hover{background:#1a1f2c;color:#fff}
        .gnl-subhint{font-size:12.5px;color:var(--dim);text-align:center;letter-spacing:.4px;margin-top:-4px;max-width:384px}
        .gnl-subhint b{color:#b9c2d0;font-weight:600}

        @media(max-width:1040px){.gnl-grid{grid-template-columns:1fr}.gnl-cardcol{max-width:420px;margin:0 auto;width:100%}}
        @media(max-width:560px){.gnl-page{padding:18px 14px 32px}.gnl-head h1{font-size:27px}.gnl-tabs{gap:14px}.gnl-tab{width:64px}.gnl-tab .ic{width:52px;height:52px}}
        @media(prefers-reduced-motion:reduce){.gnl-ring{animation:none}}
      `}</style>

      <div className="gnl-page">
        <div className="gnl-wrap">

          {/* Breadcrumb */}
          <div className="gnl-crumb" onClick={() => history.length > 1 ? history.back() : null}>
            <svg viewBox="0 0 24 24" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Leaderboard
          </div>

          {/* Header */}
          <div className="gnl-head">
            <span className="gnl-dot" />
            <h1>{result.callsign}</h1>
            <span className="gnl-pill cls">{cls}</span>
          </div>

          {/* Class tabs */}
          <div className="gnl-tabs">
            {CLASSES.map(([name, svg]) => (
              <div key={name} className={`gnl-tab${name === cls ? ' active' : ''}`}>
                <div className="ic">
                  <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: svg }} />
                </div>
                <div className="lbl">{name}</div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="gnl-grid">

            {/* Stats */}
            <section className="gnl-stats">
              <h2>STATISTIKA</h2>
              <div className="gnl-srow"><span className="k">Komanda</span><span className="v" style={{ color: team.color }}>{team.label}</span></div>
              <div className="gnl-srow"><span className="k">Reitings</span><span className="v">{fmt(result.rating)}</span></div>
              <div className="gnl-srow"><span className="k">Trāpījumi</span><span className="v">{result.hits ?? '—'}</span></div>
              <div className="gnl-srow"><span className="k">Ievainojumi</span><span className="v">{result.injuries ?? '—'}</span></div>
              <div className="gnl-srow">
                <span className="k">K:D ratio</span>
                <span className="v" style={{ color: kdColor }}>{fmt(result.kd_ratio)}</span>
              </div>
              <div className="gnl-srow">
                <span className="k">K:D +/-</span>
                <span className="v" style={{ color: kdColor }}>
                  {result.kd_plusminus != null ? (result.kd_plusminus >= 0 ? '+' : '') + result.kd_plusminus : '—'}
                </span>
              </div>
              <div className="gnl-srow"><span className="k">Precizitāte</span><span className="v">{fmt(result.accuracy, 2, '%')}</span></div>
              <div className="gnl-srow"><span className="k">Izšautās lodes</span><span className="v">{result.shots_fired?.toLocaleString('lv') ?? '—'}</span></div>
              <div className="gnl-srow"><span className="k">Trāp. komandā %</span><span className="v">{fmt(result.team_hit_pct, 2, '%')}</span></div>
            </section>

            {/* Card column */}
            <div className="gnl-cardcol">
              <div
                className="gnl-vcard"
                title="Pieskaries, lai ieslēgtu skaņu"
                onClick={e => { if ((e.target as HTMLElement).closest('.gnl-sound')) return; toggleSound() }}
              >
                {/* Poster */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={media.poster}
                  alt={cls}
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display: playing ? 'none' : 'block' }}
                />
                <video
                  ref={videoRef}
                  src={videoUrl}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={onLoadedMeta}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />

                {/* VIDEO badge */}
                <div className="gnl-vbadge">
                  <span className="gnl-tri" />
                  VIDEO
                </div>

                {/* Duration */}
                <div className="gnl-vdur">{dur}</div>

                {/* Sound toggle */}
                <button
                  className="gnl-sound"
                  onClick={e => { e.stopPropagation(); toggleSound() }}
                  aria-label={muted ? 'Ieslēgt skaņu' : 'Izslēgt skaņu'}
                >
                  <svg viewBox="0 0 24 24" strokeLinecap="round">
                    {muted ? (
                      <>
                        <path d="M11 5L6 9H3v6h3l5 4V5z"/>
                        <line x1="23" y1="9" x2="17" y2="15"/>
                        <line x1="17" y1="9" x2="23" y2="15"/>
                      </>
                    ) : (
                      <>
                        <path d="M11 5L6 9H3v6h3l5 4V5z"/>
                        <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
                        <path d="M18.5 5.5a9 9 0 0 1 0 13"/>
                      </>
                    )}
                  </svg>
                </button>

                {/* Play ring */}
                <div className={`gnl-playring${playing ? ' hidden' : ''}`}>
                  <div className="gnl-ring" />
                </div>
              </div>

              {/* Actions */}
              <div className="gnl-actions">
                <button className="gnl-btn share" onClick={onShare}>
                  <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/>
                    <line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>
                  </svg>
                  DALĪTIES
                </button>
                <button className="gnl-btn ghost" onClick={() => history.length > 1 ? history.back() : null}>
                  ← SARAKSTS
                </button>
              </div>

              <div className="gnl-subhint">
                Dalies ar savu <b>{cls} video</b> jebkurā soctīklā — WhatsApp, Instagram, Facebook, TikTok u.c.
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
