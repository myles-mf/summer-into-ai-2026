import type { Metadata, Viewport } from 'next'
import './globals.css'
import DebugHarness from './components/DebugHarness'

export const metadata: Metadata = {
  title: 'Palace Radio — Summer Into AI, Week 4: Built on Yesterday',
  description:
    'A Method-of-Loci memory palace, rebuilt: an explorable 3D signal station of glowing beacons, a real broadcast voice you can download and share, and a numbers-station cipher mode. Built on our own Spring Into AI submission.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DebugHarness />
        {children}
      </body>
    </html>
  )
}
