import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'
import { Toaster } from '@/components/ui/sonner'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'MS Trading - Bill Management',
  description: 'Bill management system for MS Trading Company - Create and manage Kacchi and Pakki bills',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon.svg?v=9',
        type: 'image/svg+xml',
      },
      {
        url: '/icon-light-32x32.png?v=9',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png?v=9',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.png?v=9',
        type: 'image/png',
      },
      {
        url: '/favicon.ico?v=9',
      },
    ],
    apple: '/apple-icon.png?v=9',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { margin: 0; padding: 0; font-size: 12px; }
              .bill-display { margin: 0; padding: 20px; box-shadow: none !important; border: 1px solid #000 !important; }
              .hidden-print, nav, button, .space-y-4.hidden-print { display: none !important; }
              .container { max-width: none !important; width: 100% !important; }
              .lg\\:col-span-2 { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 20px !important; }
              * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
            }
          `
        }} />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
