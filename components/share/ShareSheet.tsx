'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/track'

interface Props {
  open: boolean
  onClose: () => void
  token: string
  callsign: string
  shareUrl: string
  videoUrl?: string
  posterUrl?: string
}

interface Network {
  id: string
  label: string
  color: string
  icon: React.ReactNode
  href: (url: string, text: string) => string
}

const NETWORKS: Network[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877f2',
    icon: (
      <svg viewBox="0 0 24 24" fill="#fff" width="20" height="20">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
      </svg>
    ),
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    color: '#000',
    icon: (
      <svg viewBox="0 0 24 24" fill="#fff" width="20" height="20">
        <path d="M4 4l16 16M20 4L4 20" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    href: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25d366',
    icon: (
      <svg viewBox="0 0 24 24" fill="#fff" width="20" height="20">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
      </svg>
    ),
    href: (url, text) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    color: '#0088cc',
    icon: (
      <svg viewBox="0 0 24 24" fill="#fff" width="20" height="20">
        <path d="M21.198 2.433a2.242 2.242 0 00-1.022.215l-8.609 3.33c-2.068.966-4.031 2.009-5.712 3.042.691.246 1.651.541 2.62.839 1.177.365 2.363.74 3.358 1.038l-.449 2.426c-.15.826.657 1.516 1.436 1.183l2.09-.896.893 1.804a1.4 1.4 0 001.94.613l.02-.01c.51-.265.741-.875.535-1.408l-1.186-3.083 2.935-1.386c.755-.356.978-1.323.453-1.972a1.4 1.4 0 00-1.302-.49z"/>
      </svg>
    ),
    href: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#e1306c',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="20" height="20">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
    href: (url) => `https://www.instagram.com/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    color: '#010101',
    icon: (
      <svg viewBox="0 0 24 24" fill="#fff" width="20" height="20">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9a8.26 8.26 0 004.82 1.54V7.1a4.85 4.85 0 01-1.06-.41z"/>
      </svg>
    ),
    href: (url) => `https://www.tiktok.com/share?url=${encodeURIComponent(url)}`,
  },
]

export default function ShareSheet({ open, onClose, token, callsign, shareUrl, videoUrl, posterUrl }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const shareText = `${callsign} GUNSnLASERS rezultāts — skaties!`

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  async function handleNativeShare() {
    if (!navigator.share) return
    try {
      const shareData: ShareData = { title: shareText, url: shareUrl }
      if (videoUrl && navigator.canShare?.({ files: [] })) {
        try {
          const resp = await fetch(videoUrl)
          const blob = await resp.blob()
          const file = new File([blob], 'result.mp4', { type: 'video/mp4' })
          if (navigator.canShare({ files: [file] })) {
            shareData.files = [file]
          }
        } catch {}
      }
      await navigator.share(shareData)
      track('native')
    } catch {}
  }

  function track(network: string) {
    trackEvent({ token, event: 'share_click', network })
  }

  function openNetwork(net: Network) {
    track(net.id)
    const href = net.href(shareUrl, shareText)
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=500')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {}
    track('copy')
  }

  if (!open) return null

  return (
    <>
      <style>{`
        .gnl-sheet-back{position:fixed;inset:0;z-index:200;background:rgba(2,4,9,.7);backdrop-filter:blur(3px);animation:sfade .2s ease}
        @keyframes sfade{from{opacity:0}to{opacity:1}}
        .gnl-panel{
          position:fixed;left:50%;bottom:0;transform:translateX(-50%);
          width:min(460px,100%);z-index:201;
          background:#0c0e17;border:1px solid rgba(34,220,255,.15);border-bottom:none;
          border-radius:20px 20px 0 0;padding:0 0 env(safe-area-inset-bottom,0);
          animation:sup .25s cubic-bezier(.22,.68,0,1.2);
        }
        @media(min-width:620px){
          .gnl-panel{bottom:auto;top:50%;transform:translate(-50%,-50%);border-radius:18px;border:1px solid rgba(34,220,255,.15);animation:sfade .2s ease}
        }
        @keyframes sup{from{transform:translateX(-50%) translateY(60%)}to{transform:translateX(-50%) translateY(0)}}
        .gnl-grip{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.15);margin:10px auto 0}
        .gnl-sh-head{display:flex;align-items:center;padding:16px 18px 14px;border-bottom:1px solid rgba(34,220,255,.1)}
        .gnl-sh-thumb{width:42px;height:52px;border-radius:6px;overflow:hidden;flex-shrink:0;border:1px solid rgba(34,220,255,.2)}
        .gnl-sh-thumb img{width:100%;height:100%;object-fit:cover}
        .gnl-sh-info{margin-left:12px;flex:1}
        .gnl-sh-info .name{font-family:'Orbitron',sans-serif;font-size:14px;font-weight:800;color:#e8edf3;letter-spacing:.05em}
        .gnl-sh-info .sub{font-size:11px;color:#7a8699;margin-top:2px;font-family:'Chakra Petch',sans-serif}
        .gnl-sh-close{margin-left:auto;width:34px;height:34px;border-radius:50%;border:1px solid rgba(34,220,255,.2);background:#181b25;color:#aeb6c2;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
        .gnl-sh-body{padding:18px}
        .gnl-sh-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7a8699;margin-bottom:12px;font-family:'Chakra Petch',sans-serif}
        .gnl-net-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
        .gnl-net-btn{
          display:flex;flex-direction:column;align-items:center;gap:7px;
          padding:12px 8px;border-radius:12px;border:1px solid rgba(255,255,255,.08);
          background:#141823;cursor:pointer;font-family:'Chakra Petch',sans-serif;
          font-size:11px;color:#c4ccd8;font-weight:600;letter-spacing:.04em;
          transition:all .15s;
        }
        .gnl-net-btn:hover{background:#1a1f2c;color:#fff;border-color:rgba(34,220,255,.2)}
        .gnl-net-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center}
        .gnl-sh-row{display:flex;gap:10px;margin-bottom:8px}
        .gnl-sh-btn{
          flex:1;display:flex;align-items:center;justify-content:center;gap:8px;
          padding:13px;border-radius:11px;border:1px solid rgba(255,255,255,.09);
          background:#141823;cursor:pointer;font-family:'Chakra Petch',sans-serif;
          font-size:12px;font-weight:700;color:#c4ccd8;letter-spacing:.05em;transition:all .15s;
        }
        .gnl-sh-btn:hover{background:#1a1f2c;color:#fff}
        .gnl-sh-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2}
        .gnl-native-btn{
          width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
          padding:14px;border-radius:11px;border:none;
          background:linear-gradient(120deg,#6d49e6,#9b6cf7);
          color:#fff;cursor:pointer;font-family:'Chakra Petch',sans-serif;
          font-size:13px;font-weight:700;letter-spacing:.06em;margin-bottom:10px;
        }
        .gnl-native-btn svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2}
      `}</style>

      <div className="gnl-sheet-back" onClick={onClose} />
      <div className="gnl-panel" ref={panelRef} role="dialog" aria-label="Dalīties">
        <div className="gnl-grip" />

        <div className="gnl-sh-head">
          <div className="gnl-sh-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {posterUrl && <img src={posterUrl} alt={callsign} />}
          </div>
          <div className="gnl-sh-info">
            <div className="name">{callsign}</div>
            <div className="sub">GUNSnLASERS — rezultāts</div>
          </div>
          <button className="gnl-sh-close" onClick={onClose} aria-label="Aizvērt">✕</button>
        </div>

        <div className="gnl-sh-body">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button className="gnl-native-btn" onClick={handleNativeShare}>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              DALĪTIES IERĪCĒ…
            </button>
          )}

          <div className="gnl-sh-label">Izvēlies platformu</div>

          <div className="gnl-net-grid">
            {NETWORKS.map(net => (
              <button key={net.id} className="gnl-net-btn" onClick={() => openNetwork(net)}>
                <span className="gnl-net-icon" style={{ background: net.color }}>
                  {net.icon}
                </span>
                {net.label}
              </button>
            ))}
          </div>

          <div className="gnl-sh-row">
            <button className="gnl-sh-btn" onClick={copyLink}>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              Kopēt saiti
            </button>
            {videoUrl && (
              <a
                className="gnl-sh-btn"
                href={videoUrl}
                download
                onClick={() => track('download')}
              >
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Lejupielādēt
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
