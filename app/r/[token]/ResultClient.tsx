'use client'

import { useState } from 'react'
import type { GameResult } from '@/lib/result'
import { resultVideo, classMedia } from '@/lib/result'
import ShareCard from '@/components/share/ShareCard'
import ShareSheet from '@/components/share/ShareSheet'

interface Props {
  result: GameResult
}

export default function ResultClient({ result }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const videoUrl = resultVideo(result)
  const media = classMedia(result.top_class)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const shareUrl = `${siteUrl}/r/${result.share_token}`

  return (
    <>
      <ShareCard result={result} onShare={() => setSheetOpen(true)} />
      <ShareSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        token={result.share_token}
        callsign={result.callsign}
        shareUrl={shareUrl}
        videoUrl={videoUrl}
        posterUrl={media.poster}
      />
    </>
  )
}
