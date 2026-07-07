import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import withSerwistInit from '@serwist/next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // Dev'de service worker kapalı (hot reload ile çakışır); sadece production build'de üretilir.
  disable: process.env.NODE_ENV === 'development',
  // Offline yedek sayfası precache'e eklenir (SW kurulurken indirilir).
  additionalPrecacheEntries: [{ url: '/~offline', revision: crypto.randomUUID() }],
})

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withSerwist(withNextIntl(nextConfig))
