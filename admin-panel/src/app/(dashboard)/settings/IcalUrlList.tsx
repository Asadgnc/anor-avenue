'use client'

import { useState } from 'react'

type Room = { id: string; room_number: string }

type Props = {
  rooms: Room[]
  guestSiteUrl: string
  icalSecret: string | null
}

export default function IcalUrlList({ rooms, guestSiteUrl, icalSecret }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  function buildUrl(roomId: string) {
    const base = guestSiteUrl.replace(/\/$/, '')
    const url = `${base}/api/ical/${roomId}`
    return icalSecret ? `${url}?token=${icalSecret}` : url
  }

  async function copy(roomId: string) {
    await navigator.clipboard.writeText(buildUrl(roomId))
    setCopied(roomId)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-3">
      {!icalSecret && (
        <div
          className="text-xs px-3 py-2 rounded-lg"
          style={{ backgroundColor: '#422006', color: '#FCD34D' }}
        >
          ⚠ <strong>ICAL_SECRET</strong> ortam değişkeni ayarlanmamış — URL'ler herkese açık. Vercel'de eklemen önerilir.
        </div>
      )}
      {rooms.map((room) => (
        <div
          key={room.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--color-admin-bg)' }}
        >
          <span
            className="text-xs font-semibold shrink-0 w-10 text-center rounded-md py-0.5"
            style={{ backgroundColor: 'var(--color-admin-border)', color: '#E8E8F0' }}
          >
            {room.room_number}
          </span>
          <code
            className="text-xs flex-1 truncate"
            style={{ color: 'var(--color-admin-muted)' }}
          >
            {buildUrl(room.id)}
          </code>
          <button
            onClick={() => copy(room.id)}
            className="text-xs px-2 py-1 rounded-md shrink-0 transition-colors"
            style={{
              backgroundColor: copied === room.id ? '#166534' : 'var(--color-admin-border)',
              color: copied === room.id ? '#86EFAC' : '#E8E8F0',
            }}
          >
            {copied === room.id ? '✓ Kopyalandı' : 'Kopyala'}
          </button>
        </div>
      ))}
      <div
        className="text-xs p-3 rounded-lg space-y-1"
        style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-admin-muted)' }}
      >
        <p className="font-semibold text-[#E8E8F0]">Nasıl kullanılır?</p>
        <p>1. Nobeds.com veya benzeri channel manager&apos;a giriş yap</p>
        <p>2. Her oda için yukarıdaki URL&apos;yi ilgili OTA odası ile eşleştir</p>
        <p>3. Channel manager saatlik olarak bu URL&apos;yi çekerek müsaitliği günceller</p>
        <p className="pt-1">Vercel env: <code>GUEST_SITE_URL</code> (misafir sitesi URL&apos;si)</p>
        <p>Vercel env: <code>ICAL_SECRET</code> (rastgele şifre — güvenlik için)</p>
      </div>
    </div>
  )
}
