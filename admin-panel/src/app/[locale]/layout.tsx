import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Geist, Geist_Mono } from 'next/font/google'
import '../globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  title: 'Anor Avenue — Admin Panel',
  description: 'Anor Avenue Hotel management system',
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/icons/icon-192.png',
  },
  // iOS "Ana Ekrana Ekle" tam ekran uygulama davranışı
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Anor Avenue',
  },
}

export const viewport = {
  themeColor: '#16233B',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: paramLocale } = await params
  if (!hasLocale(routing.locales, paramLocale)) notFound()

  // Cookie locale overrides the URL segment locale so that language switching
  // works without changing the URL (localePrefix: 'never').
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  const locale = hasLocale(routing.locales, cookieLocale) ? cookieLocale! : paramLocale

  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
