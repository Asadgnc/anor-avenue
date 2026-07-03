'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { ReservationStatus, Channel } from '@/types/hotel'
import SectionZone from '@/components/admin/SectionZone'
import StatusBadge, { type StatusTone } from '@/components/admin/StatusBadge'
import { cn } from '@/lib/utils'

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

const STATUS_CONFIG: Record<ReservationStatus, { label: string; tone: StatusTone }> = {
  pending:     { label: 'Bekliyor', tone: 'warning' },
  confirmed:   { label: 'Onaylı',   tone: 'info' },
  checked_in:  { label: 'Girişte',  tone: 'success' },
  checked_out: { label: 'Çıktı',    tone: 'neutral' },
  cancelled:   { label: 'İptal',    tone: 'neutral' },
  no_show:     { label: 'Gelmedi',  tone: 'error' },
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
      {/* Filtreler */}
      <SectionZone tone="blue" title="Filtrele" icon={<Search size={16} />}>
        <div className="flex flex-col gap-3">
          {/* Arama */}
          <input
            type="text"
            placeholder="Misafir adı, tel, kod veya oda ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-lg px-3.5 py-2.5 text-sm bg-card ring-1 ring-foreground/10 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow duration-150"
          />

          {/* Durum filtresi */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((s) => {
              const active = s === status
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card ring-1 ring-foreground/10 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {STATUS_LABELS[s]}
                  {s !== 'all' && (
                    <span className="ml-1.5 opacity-70 tabular-nums">{reservations.filter((r) => r.status === s).length}</span>
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
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card ring-1 ring-foreground/10 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {CHANNEL_LABELS[c]}
                  {c !== 'all' && (
                    <span className="ml-1.5 opacity-70 tabular-nums">{reservations.filter((r) => r.channel === c).length}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </SectionZone>

      <p className="text-xs text-muted-foreground">
        {filtered.length} rezervasyon gösteriliyor
        {search && ` · "${search}" araması`}
      </p>

      {/* Tablo */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>Sonuç bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Kod', 'Misafir', 'Oda', 'Kanal', 'Giriş', 'Çıkış', 'Gece', 'Tutar', 'Durum', ''].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                    <tr key={r.id} className="border-b border-border hover:bg-muted/50 transition-colors duration-150">
                      <td className="px-4 py-3 font-mono text-xs text-primary">
                        {r.reservation_code}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {r.guests?.first_name} {r.guests?.last_name}
                        </p>
                        {r.guests?.phone && (
                          <p className="text-xs mt-0.5 tabular-nums text-muted-foreground">
                            {r.guests.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-foreground">{r.rooms?.room_number ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{r.rooms?.room_types?.name ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {CHANNEL_LABELS[r.channel] ?? r.channel}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-foreground">{r.check_in}</td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-foreground">{r.check_out}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.nights ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-foreground">{formatUZS(r.total_amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/reservations/${r.id}`} className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
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
