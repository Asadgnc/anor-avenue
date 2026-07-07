import type { MetadataRoute } from 'next'

// PWA manifesti — panel telefona/PC'ye "Anor Avenue" uygulaması olarak kurulur.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Anor Avenue Hotel',
    short_name: 'Anor Avenue',
    description: 'Anor Avenue Hotel boshqaruv paneli',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F8FAFC',
    theme_color: '#16233B',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
