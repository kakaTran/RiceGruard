import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RiceGuard',
  description: 'Created to help farmers to detect rice diseases',
  generator: 'Made by KaKa',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="mdl-js">
      <body>{children}</body>
    </html>
  )
}
