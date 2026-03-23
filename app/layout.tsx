import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'CareerPro AI — Smart Auto Apply',
  description: 'AI-powered job discovery and auto-apply with tailored resumes',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#080808',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#080808' }}>{children}</body>
    </html>
  )
}
