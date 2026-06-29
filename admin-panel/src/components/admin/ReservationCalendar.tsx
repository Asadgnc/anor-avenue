'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Room, Reservation, ReservationStatus } from '@/types/hotel'

// ─── Renk / Durum Tablosu ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ReservationStatus,
  { bg: string; border: string; text: string; label: string }
> = {
  confirmed:   { bg: '#1E3A5F', border: '#2563EB', text: '#93C5FD', label: 'Onaylı' },
  checked_in:  { bg: '#14532D', border: '#16A34A', text: '#86EFAC', label: 'Girişte' },
  pending:     { bg: '#451A03', border: '#D97706', text: '#FCD34D', label: 'Bekliyor' },
  checked_out: { bg: '#1F2937', border: '#4B5563', text: '#9CA3AF', label: 'Çıktı' },
  cancelled:   { bg: '#1F2937', border: '#374151', text: '#6B7280', label: 'İptal' },
  no_show:     { bg: '#450A0A', border: '#991B1B', text: '#FCA5A5', label: 'Gelmedi' },
}

const FLOOR_LABEL: Record<number, string> = {
  [-1]: 'Bodrum Kat',
  2: '2. Kat',
  3: '3. Kat',
  4: '4. Kat · Mansard',
}

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function generateDates(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

function formatDayHeader(dateStr: string): { day: string; weekday: string } {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: d.getDate().toString(),
    weekday: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
  }
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + 'T00:00:00').getDay()
  return day === 0 || day === 6
}

// roomId → (dateStr → Reservation)
function buildLookup(reservations: Reservation[]): Map<string, Map<string, Reservation>> {
  const lookup = new Map<string, Map<string, Reservation>>()
  for (const res of reservations) {
    if (!lookup.has(res.room_id)) lookup.set(res.room_id, new Map())
    const roomMap = lookup.get(res.room_id)!
    const start = new Date(res.check_in + 'T00:00:00')
    const end = new Date(res.check_out + 'T00:00:00')
    const cur = new Date(start)
    while (cur < end) {
      roomMap.set(cur.toISOString().split('T')[0], res)
      cur.setDate(cur.getDate() + 1)
    }
  }
  return lookup
}

function guestFullName(res: Reservation): string {
  return res.guests ? `${res.guests.first_name} ${res.guests.last_name}` : 'Misafir'
}

function formatUZS(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(amount) + ' UZS'
}

// ─── Renk Açıklaması (Legend) ─────────────────────────────────────────────────

function Legend() {
  const entries: ReservationStatus[] = ['confirmed', 'checked_in', 'pending', 'checked_out']
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {entries.map((status) => {
        const cfg = STATUS_CONFIG[status]
        return (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border"
              style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
            />
            <span className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>
              {cfg.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Rezervasyon Detay Overlay ────────────────────────────────────────────────

function ReservationDetail({
  reservation,
  onClose,
}: {
  reservation: Reservation
  onClose: () => void
}) {
  const cfg = STATUS_CONFIG[reservation.status]
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl border p-6 w-full max-w-sm shadow-2xl"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: cfg.border }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-semibold text-[#E8E8F0] text-lg">{guestFullName(reservation)}</p>
            <p className="text-xs mt-0.5 font-mono" style={{ color: cfg.text }}>
              {reservation.reservation_code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-admin-muted)', backgroundColor: 'var(--color-admin-bg)' }}
          >
            ✕
          </button>
        </div>

        {/* Detaylar */}
        <div className="space-y-2.5">
          <DetailRow label="Durum">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: cfg.bg, color: cfg.text }}
            >
              {cfg.label}
            </span>
          </DetailRow>
          <DetailRow label="Giriş" value={reservation.check_in} />
          <DetailRow label="Çıkış" value={reservation.check_out} />
          <DetailRow label="Gece" value={String(reservation.nights ?? '')} />
          <DetailRow label="Yetişkin" value={String(reservation.adults)} />
          <DetailRow label="Oda Fiyatı" value={formatUZS(reservation.room_rate) + '/gece'} />
          <DetailRow label="Toplam" value={formatUZS(reservation.total_amount)} />
          {reservation.special_requests && (
            <DetailRow label="İstek" value={reservation.special_requests} />
          )}
        </div>

        {/* Detay sayfasına git */}
        <Link
          href={`/reservations/${reservation.id}`}
          onClick={onClose}
          className="block mt-5 text-center py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
        >
          Detay & İşlemler →
        </Link>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center text-sm gap-4">
      <span style={{ color: 'var(--color-admin-muted)' }}>{label}</span>
      {children ?? <span className="text-[#E8E8F0] text-right">{value}</span>}
    </div>
  )
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

interface Props {
  rooms: Room[]
  reservations: Reservation[]
  startDate: string  // YYYY-MM-DD
}

const DAYS = 15

export default function ReservationCalendar({ rooms, reservations, startDate }: Props) {
  const [selected, setSelected] = useState<Reservation | null>(null)

  const dates = useMemo(() => generateDates(startDate, DAYS), [startDate])
  const lookup = useMemo(() => buildLookup(reservations), [reservations])

  // Odaları kata göre grupla
  const floorGroups = useMemo(() => {
    const map = new Map<number, Room[]>()
    for (const room of rooms) {
      if (!map.has(room.floor)) map.set(room.floor, [])
      map.get(room.floor)!.push(room)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [rooms])

  if (rooms.length === 0) {
    return (
      <div
        className="rounded-xl border p-16 text-center"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        <p className="text-[#E8E8F0] font-medium mb-2">Henüz oda kaydı yok</p>
        <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>
          Supabase SQL Editor&apos;de <code className="font-mono">docs/schema.sql</code> çalıştırıldıktan
          sonra odalar burada görünecek.
        </p>
      </div>
    )
  }

  return (
    <>
      <Legend />

      <div
        className="rounded-xl border overflow-x-auto"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        <table className="border-collapse text-sm" style={{ minWidth: '860px', width: '100%' }}>
          {/* ─ Başlık ─ */}
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 w-40 min-w-40 px-4 py-3 text-left text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-admin-card)',
                  color: 'var(--color-admin-muted)',
                  borderBottom: '1px solid var(--color-admin-border)',
                }}
              >
                Oda
              </th>
              {dates.map((dateStr) => {
                const { day, weekday } = formatDayHeader(dateStr)
                const isToday = dateStr === startDate
                const weekend = isWeekend(dateStr)
                return (
                  <th
                    key={dateStr}
                    className="w-12 min-w-12 px-0.5 py-2 text-center text-xs font-medium"
                    style={{
                      backgroundColor: isToday ? '#1A1A30' : 'var(--color-admin-card)',
                      color: isToday
                        ? 'var(--color-accent)'
                        : weekend
                        ? '#C8C8E0'
                        : 'var(--color-admin-muted)',
                      borderBottom: isToday
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--color-admin-border)',
                    }}
                  >
                    <div className="leading-tight">{weekday}</div>
                    <div className="font-bold leading-tight">{day}</div>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* ─ Gövde ─ */}
          <tbody>
            {floorGroups.map(([floor, floorRooms]) => (
              <Fragment key={`floor-${floor}`}>
                {/* Kat Başlığı */}
                <tr>
                  <td
                    colSpan={dates.length + 1}
                    className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
                    style={{
                      color: 'var(--color-accent)',
                      backgroundColor: '#16213E',
                      borderBottom: '1px solid var(--color-admin-border)',
                      borderTop: '1px solid var(--color-admin-border)',
                    }}
                  >
                    {FLOOR_LABEL[floor] ?? `${floor}. Kat`}
                  </td>
                </tr>

                {/* Oda Satırları */}
                {floorRooms.map((room) => {
                  const roomMap = lookup.get(room.id) ?? new Map<string, Reservation>()
                  return (
                    <tr key={room.id}>
                      {/* Oda Etiketi */}
                      <td
                        className="sticky left-0 z-10 px-4 py-2"
                        style={{
                          backgroundColor: 'var(--color-admin-card)',
                          borderBottom: '1px solid var(--color-admin-border)',
                        }}
                      >
                        <div className="font-semibold text-[#E8E8F0] leading-tight">
                          {room.room_number}
                        </div>
                        <div
                          className="text-xs leading-tight mt-0.5"
                          style={{ color: 'var(--color-admin-muted)' }}
                        >
                          {room.room_types?.name ?? '—'}
                        </div>
                      </td>

                      {/* Gün Hücreleri */}
                      {dates.map((dateStr) => {
                        const res = roomMap.get(dateStr) ?? null
                        const prevRes = roomMap.get(addDays(dateStr, -1)) ?? null
                        const nextRes = roomMap.get(addDays(dateStr, 1)) ?? null

                        const isFirst = res !== null && prevRes?.id !== res.id
                        const isLast = res !== null && nextRes?.id !== res.id
                        const isToday = dateStr === startDate
                        const cfg = res ? STATUS_CONFIG[res.status] : null

                        let borderRadius = '0'
                        if (isFirst && isLast) borderRadius = '4px'
                        else if (isFirst) borderRadius = '4px 0 0 4px'
                        else if (isLast) borderRadius = '0 4px 4px 0'

                        return (
                          <td
                            key={dateStr}
                            className="px-0.5 py-1.5 align-middle"
                            style={{
                              borderBottom: '1px solid var(--color-admin-border)',
                              backgroundColor: isToday ? '#1A1A30' : undefined,
                            }}
                          >
                            {res && cfg ? (
                              <button
                                onClick={() => setSelected(res)}
                                className="w-full h-7 px-1.5 text-xs text-left overflow-hidden whitespace-nowrap transition-opacity hover:opacity-80 block"
                                style={{
                                  backgroundColor: cfg.bg,
                                  color: cfg.text,
                                  borderRadius,
                                  borderLeft: isFirst ? `2px solid ${cfg.border}` : undefined,
                                }}
                                title={guestFullName(res)}
                              >
                                {isFirst ? guestFullName(res).split(' ')[0] : ''}
                              </button>
                            ) : (
                              <div className="w-full h-7" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rezervasyon Detay */}
      {selected && (
        <ReservationDetail reservation={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
