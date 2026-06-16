import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getResult, resultVideo } from '@/lib/result'
import ResultClient from './ResultClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const result = await getResult(token)
  if (!result) return { title: 'GUNSnLASERS' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const videoUrl = resultVideo(result)
  const title = `${result.callsign} — ${result.top_class ?? 'WARRIOR'} | GUNSnLASERS`
  const description = `Reitings: ${result.rating?.toFixed(2) ?? '—'} · K:D: ${result.kd_ratio?.toFixed(2) ?? '—'} · Precizitāte: ${result.accuracy?.toFixed(2) ?? '—'}%`
  const ogImageUrl = `${siteUrl}/r/${token}/opengraph-image`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/r/${token}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      videos: [{ url: videoUrl, type: 'video/mp4' }],
    },
    twitter: {
      card: 'player',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await getResult(token)
  if (!result) notFound()

  return <ResultClient result={result} />
}
