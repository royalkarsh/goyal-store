// app/layout.tsx — Root layout
import type { Metadata, Viewport } from 'next'
import { Syne, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/next'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'Goyal General Store — Fresh Groceries Delivered',
    template: '%s | Goyal General Store',
  },
  description: 'Your trusted neighbourhood kirana store in Rohini, Delhi. 500+ products — staples, dairy, snacks, spices. Fast local delivery.',
  keywords: ['kirana store', 'grocery delivery', 'Rohini Delhi', 'online grocery', 'Goyal General Store'],
  openGraph: { type: 'website', locale: 'en_IN', siteName: 'Goyal General Store' },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0D2818',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${inter.variable}`}>
      <body className="bg-cream font-inter antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#0D2818',
              color: '#fff',
              borderRadius: '100px',
              padding: '12px 20px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#52b788', secondary: '#0D2818' } },
            error: { iconTheme: { primary: '#e63946', secondary: '#fff' } },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
