import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { EnvCheck } from '@/components/ui/EnvCheck'
import { SCHOOL_NAME } from '@/lib/constants'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: `Morning Glory Academy — SchoolPay`,
  description: `School finance management for ${SCHOOL_NAME}`,
  applicationName: 'SchoolPay',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SchoolPay',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#16a34a',
}

// Runs synchronously in <head> before hydration to avoid a flash of the wrong theme.
// Keep keys in sync with hooks/useTheme.ts.
const themeBootstrapScript = `(function(){try{var k="schoolpay-theme";var m=localStorage.getItem(k);var s=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var d=m==="dark"||((m==="system"||!m)&&s);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full antialiased">
        <ToastProvider>
          <EnvCheck />
          <OfflineBanner />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
