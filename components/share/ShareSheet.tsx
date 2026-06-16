'use client'

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/track'

interface Props {
  open: boolean
  onClose: () => void
  token: string
  callsign: string
  topClass: string
  shareUrl: string
  videoUrl?: string
  posterUrl?: string
}

const NETS = [
  {
    id: 'whatsapp', label: 'WhatsApp', bg: '#25D366',
    svg: '<path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.5-5.6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7 7 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.7-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1A4.9 4.9 0 0 0 8 11a11 11 0 0 0 4.2 3.7c.6.2 1 .4 1.4.5a3.3 3.3 0 0 0 1.5.1c.5-.1 1.4-.6 1.6-1.1s.2-1 .1-1.1-.2-.2-.4-.3z"/>',
    action: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
  },
  {
    id: 'facebook', label: 'Facebook', bg: '#1877F2',
    svg: '<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/>',
    action: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'messenger', label: 'Messenger', bg: '#0084FF',
    svg: '<path d="M12 2C6.3 2 2 6.2 2 11.7c0 2.9 1.2 5.4 3.1 7.1.2.1.3.3.3.6l.1 1.8c0 .6.6 1 1.1.7l2-.9c.2-.1.4-.1.6 0 .9.3 1.8.4 2.7.4 5.7 0 10-4.2 10-9.7S17.7 2 12 2zm6 7.5l-2.9 4.6c-.5.7-1.5.9-2.1.4l-2.3-1.7a.6.6 0 0 0-.7 0l-3.1 2.4c-.4.3-1-.2-.7-.6l2.9-4.6c.5-.7 1.5-.9 2.1-.4l2.3 1.7c.2.2.5.2.7 0l3.1-2.4c.4-.3 1 .2.7.6z"/>',
    action: null,
  },
  {
    id: 'instagram', label: 'Instagram', bg: '#E1306C',
    svg: '<path d="M12 8.5A3.5 3.5 0 1 0 15.5 12 3.5 3.5 0 0 0 12 8.5zm0 5.8A2.3 2.3 0 1 1 14.3 12 2.3 2.3 0 0 1 12 14.3zm4.5-6a.8.8 0 1 1-.8-.8.8.8 0 0 1 .8.8zM20 8.7a4 4 0 0 0-1.1-2.8A4 4 0 0 0 16 4.8c-1.1-.1-4.5-.1-5.6 0a4 4 0 0 0-2.8 1.1A4 4 0 0 0 6.5 8.7c-.1 1.1-.1 4.5 0 5.6a4 4 0 0 0 1.1 2.8 4 4 0 0 0 2.8 1.1c1.1.1 4.5.1 5.6 0a4 4 0 0 0 2.8-1.1 4 4 0 0 0 1.1-2.8c.1-1.1.1-4.5 0-5.6zm-1.5 6.8a2.3 2.3 0 0 1-1.3 1.3c-.9.4-3 .3-4 .3s-3.1.1-4-.3a2.3 2.3 0 0 1-1.3-1.3c-.4-.9-.3-3-.3-4s-.1-3.1.3-4A2.3 2.3 0 0 1 8 6.2c.9-.4 3-.3 4-.3s3.1-.1 4 .3a2.3 2.3 0 0 1 1.3 1.3c.4.9.3 3 .3 4s.1 3.1-.4 4z"/>',
    action: null,
  },
  {
    id: 'twitter', label: 'X', bg: '#000000',
    svg: '<path d="M17.5 3h3l-6.6 7.6L21.7 21h-5.6l-4.4-5.8L6.7 21H3.6l7-8.1L2.7 3h5.7l4 5.3zm-1 16h1.7L7.6 4.8H5.8z"/>',
    action: (url: string, text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'tiktok', label: 'TikTok', bg: '#111111',
    svg: '<path d="M16.5 3c.3 2.1 1.5 3.4 3.5 3.6v2.4c-1.2.1-2.4-.3-3.5-1v5.6c0 3.6-2.8 5.9-6 5.4-3.6-.6-4.8-4.7-2.6-7.2 1.1-1.2 2.8-1.6 4.4-1.2v2.6c-.4-.1-.8-.2-1.2-.1-1.1.1-1.9 1-1.8 2.1.1 1.3 1.5 2 2.7 1.4.8-.4 1.1-1.1 1.1-2V3z"/>',
    action: null,
  },
  {
    id: 'telegram', label: 'Telegram', bg: '#2AABEE',
    svg: '<path d="M21.8 4.3 2.9 11.6c-1 .4-1 1.4 0 1.7l4.6 1.4 1.8 5.6c.2.6.5.7 1 .4l2.6-2 4.8 3.5c.5.3 1 .1 1.1-.5l3-14c.2-.8-.3-1.2-1-.9zM9.4 14.5l8-5c.3-.2.6.1.4.4l-6.6 6c-.2.2-.3.5-.4.8l-.3 2.2z"/>',
    action: (url: string, text: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'linkedin', label: 'LinkedIn', bg: '#0A66C2',
    svg: '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.3 18H5.7V9.8h2.6zM7 8.6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM18.3 18h-2.6v-4c0-1-.4-1.6-1.3-1.6s-1.4.6-1.4 1.6v4h-2.6V9.8H13v1.1a2.8 2.8 0 0 1 2.5-1.3c1.8 0 2.8 1.1 2.8 3.4z"/>',
    action: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'copy', label: 'Kopēt', bg: '#3a4150',
    svg: '<path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12zm3 4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H8V7h11z"/>',
    action: 'copy' as const,
  },
  {
    id: 'download', label: 'Lejupielādēt', bg: '#3a4150',
    svg: '<path d="M19 13v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5h2v5h10v-5zM12 3v9.2l3-3 1.4 1.4-5.4 5.4-5.4-5.4L7 9.2l3 3V3z"/>',
    action: 'download' as const,
  },
]

export default function ShareSheet({ open, onClose, token, callsign, topClass, shareUrl, videoUrl, posterUrl }: Props) {
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const shareText = `Mans ${topClass} rezultāts @ GUNSnLASERS 🔥`

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function showToast(msg: string) {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2200)
  }

  function track(network: string) {
    trackEvent({ token, event: 'share_click', network })
  }

  async function handleNative() {
    try {
      if (videoUrl && typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const resp = await fetch(videoUrl)
          const blob = await resp.blob()
          const file = new File([blob], `${callsign.toLowerCase()}.mp4`, { type: 'video/mp4' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: topClass, text: shareText })
            track('native')
            return
          }
        } catch {}
      }
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: topClass, text: shareText, url: shareUrl })
        track('native')
      }
    } catch {}
  }

  async function handleNet(net: typeof NETS[number]) {
    const action = net.action
    if (action === 'copy') {
      await navigator.clipboard?.writeText(shareUrl).catch(() => {})
      showToast('Saite nokopēta')
      track('copy')
      return
    }
    if (action === 'download') {
      if (videoUrl) {
        const a = document.createElement('a')
        a.href = videoUrl
        a.download = `${callsign.toLowerCase()}-${topClass.toLowerCase()}.mp4`
        document.body.appendChild(a); a.click(); a.remove()
        showToast('Video lejupielādēts')
      }
      track('download')
      return
    }
    if (action === null) {
      // Instagram / TikTok / Messenger — share file or fallback download
      if (videoUrl && typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const resp = await fetch(videoUrl)
          const blob = await resp.blob()
          const file = new File([blob], `${callsign.toLowerCase()}.mp4`, { type: 'video/mp4' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text: shareText })
            track(net.id)
            return
          }
        } catch {}
      }
      if (videoUrl) {
        const a = document.createElement('a')
        a.href = videoUrl
        a.download = `${callsign.toLowerCase()}.mp4`
        document.body.appendChild(a); a.click(); a.remove()
        showToast(`Video lejupielādēts — augšupielādē ${net.label}`)
      }
      track(net.id)
      return
    }
    track(net.id)
    window.open(action(shareUrl, shareText), '_blank', 'noopener,noreferrer,width=600,height=500')
  }

  if (!open) return null

  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <>
      <style>{`
        .gnl-sheet-back{position:fixed;inset:0;z-index:200;background:rgba(2,4,9,.66);backdrop-filter:blur(3px);animation:sfade .2s ease}
        @keyframes sfade{from{opacity:0}to{opacity:1}}
        .gnl-panel{
          position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:201;
          width:min(460px,100%);
          background:linear-gradient(180deg,#13151f,#0c0e15);
          border:1px solid rgba(255,255,255,.06);border-bottom:0;
          border-radius:20px 20px 0 0;padding:10px 20px 26px;
          box-shadow:0 -20px 60px rgba(0,0,0,.7);animation:gnl-rise .26s cubic-bezier(.2,.8,.2,1)
        }
        @keyframes gnl-rise{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}
        @media(min-width:620px){
          .gnl-panel{bottom:auto;top:50%;transform:translate(-50%,-50%);border-radius:18px;border:1px solid rgba(255,255,255,.06);animation:sfade .2s ease}
        }
        .gnl-grip{width:42px;height:4px;border-radius:4px;background:#2a2f3c;margin:4px auto 14px}
        .gnl-sh-head{display:flex;align-items:center;gap:13px;margin-bottom:16px}
        .gnl-sh-thumb{position:relative;width:48px;height:62px;border-radius:8px;overflow:hidden;flex:0 0 auto;border:1px solid rgba(34,220,255,.3)}
        .gnl-sh-thumb img{width:100%;height:100%;object-fit:cover}
        .gnl-sh-t b{font-size:16px;font-weight:700;letter-spacing:.5px;display:block;color:#e7ecf3}
        .gnl-sh-t span{font-size:12.5px;color:#7c8593;letter-spacing:1px}
        .gnl-sh-close{margin-left:auto;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.06);background:#181b25;color:#aeb6c2;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}

        .gnl-native{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:13px;border-radius:11px;cursor:pointer;
          font-family:'Chakra Petch',sans-serif;font-size:14.5px;font-weight:700;letter-spacing:1.5px;color:#fff;border:0;margin-bottom:16px;
          background:linear-gradient(120deg,#1f8fff,#22dcff);box-shadow:0 8px 20px rgba(34,160,255,.32)}
        .gnl-native svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2}

        .gnl-nets{display:grid;grid-template-columns:repeat(5,1fr);gap:14px 8px}
        .gnl-net{display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer;background:none;border:0;padding:0;font-family:'Chakra Petch',sans-serif}
        .gnl-net .circ{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:.15s}
        .gnl-net:hover .circ{transform:translateY(-2px);filter:brightness(1.08)}
        .gnl-net .circ svg{width:24px;height:24px;fill:#fff}
        .gnl-net .nl{font-size:10.5px;color:#aab2bf;letter-spacing:.3px}

        .gnl-toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:300;
          background:#1b2433;color:#dff;border:1px solid rgba(34,220,255,.35);
          padding:11px 18px;border-radius:10px;font-size:13.5px;font-weight:600;
          box-shadow:0 10px 30px rgba(0,0,0,.5);
          opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;
          font-family:'Chakra Petch',sans-serif}
        .gnl-toast.show{opacity:1;transform:translateX(-50%) translateY(-4px)}
      `}</style>

      <div className="gnl-sheet-back" onClick={onClose} />
      <div className="gnl-panel" ref={panelRef} role="dialog" aria-label="Dalīties ar video">
        <div className="gnl-grip" />

        <div className="gnl-sh-head">
          {posterUrl && (
            <div className="gnl-sh-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl} alt={callsign} />
            </div>
          )}
          <div className="gnl-sh-t">
            <b>{topClass} · {callsign}</b>
            <span>Video · GUNSnLASERS</span>
          </div>
          <button className="gnl-sh-close" onClick={onClose} aria-label="Aizvērt">✕</button>
        </div>

        {hasNativeShare && (
          <button className="gnl-native" onClick={handleNative}>
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            DALĪTIES IERĪCĒ…
          </button>
        )}

        <div className="gnl-nets">
          {NETS.map(net => (
            <button key={net.id} className="gnl-net" onClick={() => handleNet(net)}>
              <span className="circ" style={{ background: net.bg }}>
                <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: net.svg }} />
              </span>
              <span className="nl">{net.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`gnl-toast${toastVisible ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
