'use client'

export type TrackEvent = {
  token: string
  event: 'view' | 'share_click'
  network?: string
}

export function trackEvent(payload: TrackEvent): void {
  const body = JSON.stringify(payload)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const sent = navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
    if (sent) return
  }
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}
