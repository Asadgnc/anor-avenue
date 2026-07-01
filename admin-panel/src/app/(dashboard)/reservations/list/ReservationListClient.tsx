'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { ReservationStatus, Channel } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'
import SectionZone from '@/components/admin/SectionZone'

interface ReservationRow {
  id: string
  reservation_code: string
  status: ReservationStatus
  check_in: string
  check_out: string
  nights: number
  adults: number
  total_amount: number
  channel: Channel
  created_at: string
  guests: { first_name: string; last_name: string; phone: string | null } | null
  rooms: { room_number: string; room_types: { name: string } | null } | null
}

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Bekliyor',   color: dash.orange, bg: dash.orangeLight },
  confirmed:   { label: 'Onaylı',     color: dash.blue,   bg: dash.blueLight },
  checked_in:  { label: 'Girişte',    color: dash.green,  bg: dash.greenLight },
  checked_out: { label: 'Çıktı',      color: dash.muted,  bg: dash.border },
  cancelled:   { label: 'İptal',      color: dash.muted,  bg: dash.border },
  no_show:     { label: 'Gelmedi',    color: dash.red,    bg: dash.redLight },
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

const ALL_CHANNELS: (Channel | 'all')[] = ['all', 'direct', 'walk_in', 'phone', 'booking_com', 'agoda']

const CHANNEL_LABELS: Record<Channel | 'all', string> = {
  all: 'Tüm Kanallar',
  direct: 'Kendi Sitemiz',
  walk_in: 'Yüz Yüze',
  phone: 'Telefon',
  booking_com: 'Booking.com',
  agoda: 'Agoda',
}

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

interface Props {
  reservations: ReservationRow[]
  initialStatus: ReservationStatus | 'all'
  initialChannel: Channel | 'all'
  dateParams: { createdOn?: string; checkIn?: string; checkOut?: string }
}

export default function ReservationListClient({ reservations, initialStatus, initialChannel, dateParams }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReservationStatus | 'all'>(initialStatus)
  const [channel, setChannel] = useState<Channel | 'all'>(initialChannel)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return reservations.filter((r) => {
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
  }, [reservations, search])

  function navigate(nextStatus: ReservationStatus | 'all', nextChannel: Channel | 'all') {
    const params = new URLSearchParams()
    if (nextStatus !== 'all') params.set('status', nextStatus)
    if (nextChannel !== 'all') params.set('channel', nextChannel)
    if (dateParams.createdOn) params.set('createdOn', dateParams.createdOn)
    if (dateParams.checkIn) params.set('checkIn', dateParams.checkIn)
    if (dateParams.checkOut) params.set('checkOut', dateParams.checkOut)
    const qs = params.toString()
    router.replace(`/reservations/list${qs ? `?${qs}` : ''}`)
  }

  function handleStatusChange(s: ReservationStatus | 'all') {
    setStatus(s)
    navigate(s, channel)
  }

  function handleChannelChange(c: Channel | 'all') {
    setChannel(c)
    navigate(status, c)
  }

  return (
    <div className="space-y-4">
      {/* Filtreler — mavi tonlu bölge */}
      <SectionZone tone="blue" title="Filtrele" icon={<Search size={16} />}>
        <div className="flex flex-col gap-3">
          {/* Arama */}
          <input
            type="text"
            placeholder="Misafir adı, tel, kod veya oda ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-xl px-3.5 py-2.5 text-sm outline-none"
            style={{ backgroundColor: dash.card, boxShadow: dash.cardShadow, color: dash.text }}
          />

          {/* Durum filtresi */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((s) => {
              const active = s === status
              const cfg = s !== 'all' ? STATUS_CONFIG[s] : null
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: active ? (cfg?.bg ?? dash.primaryLight) : dash.card,
                    color: active ? (cfg?.color ?? dash.primary) : dash.muted,
                    boxShadow: active ? undefined : dash.cardShadow,
                  }}
                >
                  {STATUS_LABELS[s]}
                  {s !== 'all' && (
                    <span className="ml-1.5 opacity-70">{reservations.filter((r) => r.status === s).length}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Kanal filtresi */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_CHANNELS.map((c) => {
              const active = c === channel
              return (
                <button
                  key={c}
                  onClick={() => handleChannelChange(c)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: active ? dash.primary : dash.card,
                    color: active ? '#fff' : dash.muted,
                    boxShadow: active ? undefined : dash.cardShadow,
                  }}
                >
                  {CHANNEL_LABELS[c]}
                  {c !== 'all' && (
                    <span className="ml-1.5 opacity-70">{reservations.filter((r) => r.channel === c).length}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </SectionZone>

      <p className="text-xs" style={{ color: dash.muted }}>
        {filtered.length} rezervasyon gösteriliyor
        {search && ` · "${search}" araması`}
      </p>

      {/* Tablo */}
      <div style={{ backgroundColor: dash.card, borderRadius: '1rem', boxShadow: dash.cardShadow, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: dash.muted }}>
            <p>Sonuç bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${dash.border}` }}>
                  {['Kod', 'Misafir', 'Oda', 'Kanal', 'Giriş', 'Çıkış', 'Gece', 'Tutar', 'Durum', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: dash.muted }}
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
                    <tr key={r.id} style={{ borderBottom: `1px solid ${dash.border}` }} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: dash.primary }}>
                        {r.reservation_code}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: dash.text }}>
                          {r.guests?.first_name} {r.guests?.last_name}
                        </p>
                        {r.guests?.phone && (
                          <p className="text-xs mt-0.5" style={{ color: dash.muted }}>
                            {r.guests.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: dash.muted }}>
                        <p style={{ color: dash.text }}>{r.rooms?.room_number ?? '—'}</p>
                        <p className="text-xs">{r.rooms?.room_types?.name ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: dash.muted }}>
                        {CHANNEL_LABELS[r.channel] ?? r.channel}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: dash.text }}>{r.check_in}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: dash.text }}>{r.check_out}</td>
                      <td className="px-4 py-3" style={{ color: dash.muted }}>{r.nights ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: dash.text }}>{formatUZS(r.total_amount)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/reservations/${r.id}`} className="text-xs font-medium hover:opacity-80 transition-opacity whitespace-nowrap" style={{ color: dash.primary }}>
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
