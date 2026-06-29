'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReservationStatus } from '@/types/hotel'

interface ReservationRow {
  id: string
  reservation_code: string
  status: ReservationStatus
  check_in: string
  check_out: string
  nights: number
  adults: number
  total_amount: number
  channel: string
  created_at: string
  guests: { first_name: string; last_name: string; phone: string | null } | null
  rooms: { room_number: string; room_types: { name: string } | null } | null
}

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Bekliyor',   color: '#FCD34D', bg: '#451A03' },
  confirmed:   { label: 'Onaylı',     color: '#93C5FD', bg: '#1E3A5F' },
  checked_in:  { label: 'Girişte',    color: '#86EFAC', bg: '#14532D' },
  checked_out: { label: 'Çıktı',      color: '#9CA3AF', bg: '#1F2937' },
  cancelled:   { label: 'İptal',      color: '#6B7280', bg: '#1F2937' },
  no_show:     { label: 'Gelmedi',    color: '#FCA5A5', bg: '#450A0A' },
}

const ALL_STATUSES: (ReservationStatus | 'all')[] = ['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']

const STATUS_LABELS: Record<ReservationStatus | 'all', string> = {
  all: 'Tümü',
  pending: 'Bekliyor',
  confirmed: 'Onaylı',
  checked_in: 'Girişte',
  checked_out: 'Çıktı',
  cancelled: 'İptal',
  no_show: 'Gelmedi',
}

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

interface Props {
  reservations: ReservationRow[]
  initialStatus: ReservationStatus | 'all'
}

export default function ReservationListClient({ reservations, initialStatus }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReservationStatus | 'all'>(initialStatus)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return reservations.filter((r) => {
      if (status !== 'all' && r.status !== status) return false
      if (!q) return true
      const guestName = `${r.guests?.first_name ?? ''} ${r.guests?.last_name ?? ''}`.toLowerCase()
      const phone = r.guests?.phone ?? ''
      return (
        guestName.includes(q) ||
        r.reservation_code.toLowerCase().includes(q) ||
        (r.rooms?.room_number ?? '').toLowerCase().includes(q) ||
        phone.includes(q)
      )
    })
  }, [reservations, search, status])

  function handleStatusChange(s: ReservationStatus | 'all') {
    setStatus(s)
    const params = s === 'all' ? '' : `?status=${s}`
    router.replace(`/reservations/list${params}`, { scroll: false })
  }

  return (
    <div className="space-y-4">
      {/* Arama + filtreler */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Misafir adı, tel, kod veya oda ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: 'var(--color-admin-card)',
            border: '1px solid var(--color-admin-border)',
            color: '#E8E8F0',
          }}
        />
        <div className="flex flex-wrap gap-1">
          {ALL_STATUSES.map((s) => {
            const active = s === status
            const cfg = s !== 'all' ? STATUS_CONFIG[s] : null
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: active ? (cfg?.bg ?? '#1E1E3A') : 'var(--color-admin-card)',
                  color: active ? (cfg?.color ?? 'var(--color-accent)') : 'var(--color-admin-muted)',
                  border: active
                    ? `1px solid ${cfg?.color ?? 'var(--color-accent)'}`
                    : '1px solid var(--color-admin-border)',
                }}
              >
                {STATUS_LABELS[s]}
                {s !== 'all' && (
                  <span className="ml-1.5 opacity-70">
                    {reservations.filter((r) => r.status === s).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sonuç sayısı */}
      <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>
        {filtered.length} rezervasyon gösteriliyor
        {search && ` · "${search}" araması`}
      </p>

      {/* Tablo */}
      <div
        style={{
          backgroundColor: 'var(--color-admin-card)',
          borderRadius: '0.75rem',
          border: '1px solid var(--color-admin-border)',
          overflow: 'hidden',
        }}
      >
        {filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--color-admin-muted)' }}>
            <p className="text-4xl mb-3">🔍</p>
            <p>Sonuç bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                  {['Kod', 'Misafir', 'Oda', 'Giriş', 'Çıkış', 'Gece', 'Tutar', 'Durum', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--color-admin-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const cfg = STATUS_CONFIG[r.status]
                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: '1px solid var(--color-admin-border)' }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                        {r.reservation_code}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#E8E8F0]">
                          {r.guests?.first_name} {r.guests?.last_name}
                        </p>
                        {r.guests?.phone && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                            {r.guests.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                        <p className="text-[#E8E8F0]">{r.rooms?.room_number ?? '—'}</p>
                        <p className="text-xs">{r.rooms?.room_types?.name ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-[#E8E8F0] whitespace-nowrap">{r.check_in}</td>
                      <td className="px-4 py-3 text-[#E8E8F0] whitespace-nowrap">{r.check_out}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                        {r.nights ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-accent)' }}>
                        {formatUZS(r.total_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ color: cfg.color, backgroundColor: cfg.bg }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/reservations/${r.id}`}
                          className="text-xs font-medium hover:opacity-80 transition-opacity whitespace-nowrap"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          Detay →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
