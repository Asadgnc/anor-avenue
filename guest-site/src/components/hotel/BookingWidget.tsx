'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  defaultCheckIn?: string
  defaultCheckOut?: string
  defaultAdults?: number
}

export default function BookingWidget({ defaultCheckIn, defaultCheckOut, defaultAdults }: Props) {
  const t = useTranslations('booking')
  const locale = useLocale()
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [checkIn, setCheckIn] = useState(defaultCheckIn || today)
  const [checkOut, setCheckOut] = useState(defaultCheckOut || tomorrow)
  const [adults, setAdults] = useState(defaultAdults ?? 2)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const safeAdults = Math.max(1, Math.min(29, adults || 1))
    const params = new URLSearchParams({ checkIn, checkOut, adults: String(safeAdults) })
    // Akıllı bulma sayfası: kişi sayısına göre oda/kombinasyon önerir
    router.push(`/${locale}/availability?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSearch}
      style={{
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '1.5rem',
      }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
    >
      {/* Check-in */}
      <div className="flex flex-col gap-1">
        <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('checkIn')}
        </label>
        <input
          type="date"
          value={checkIn}
          min={today}
          onChange={(e) => setCheckIn(e.target.value)}
          style={{
            border: '1px solid var(--color-cream-dark)',
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem 0.75rem',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
          className="focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent"
        />
      </div>

      {/* Check-out */}
      <div className="flex flex-col gap-1">
        <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('checkOut')}
        </label>
        <input
          type="date"
          value={checkOut}
          min={checkIn}
          onChange={(e) => setCheckOut(e.target.value)}
          style={{
            border: '1px solid var(--color-cream-dark)',
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem 0.75rem',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
          className="focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent"
        />
      </div>

      {/* Adults */}
      <div className="flex flex-col gap-1">
        <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('adults')}
        </label>
        <input
          type="number"
          min={1}
          max={29}
          value={adults}
          onChange={(e) => setAdults(Number(e.target.value))}
          style={{
            border: '1px solid var(--color-cream-dark)',
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem 0.75rem',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            backgroundColor: 'white',
          }}
          className="focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent"
        />
      </div>

      {/* Search button */}
      <button
        type="submit"
        style={{
          backgroundColor: 'var(--color-gold)',
          color: 'var(--color-white)',
          borderRadius: 'var(--radius-md)',
          padding: '0.625rem 1.5rem',
          fontSize: 'var(--text-sm)',
          fontWeight: '700',
          transition: 'var(--transition-fast)',
        }}
        className="hover:opacity-90"
      >
        {t('search')}
      </button>
    </form>
  )
}
