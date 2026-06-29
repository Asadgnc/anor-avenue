import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
