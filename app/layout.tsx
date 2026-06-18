import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://spillit.lv'
const TITLE = 'Spillit — Klientu iesaiste, atsauksmes un lojalitāte'
const DESCRIPTION = 'Pārvērt katru apmeklējumu atsauksmēs, lojalitātē un labākos darbiniekos. Bezmaksas Spin Reward + darbinieku novērtējums izklaides un servisa vietām.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: '%s | Spillit',
  },
  description: DESCRIPTION,
  keywords: [
    'laimes rats', 'spin reward', 'klientu atsauksmes', 'darbinieku novērtējums',
    'lojalitāte', 'lāzertags', 'escape room', 'kartings', 'batutu parks', 'klientu iesaiste',
  ],
  authors: [{ name: 'Spillit', url: APP_URL }],
  openGraph: {
    type: 'website',
    locale: 'lv_LV',
    alternateLocale: 'en_GB',
    url: APP_URL,
    siteName: 'Spillit',
    title: TITLE,
    description: DESCRIPTION,
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'Spillit — Klientu iesaiste, atsauksmes un lojalitāte',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: APP_URL,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="lv"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
