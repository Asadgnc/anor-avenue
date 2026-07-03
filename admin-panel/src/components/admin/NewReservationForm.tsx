'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createReservationAction, type ReservationFormState } from '@/app/[locale]/(dashboard)/reservations/new/actions'
import type { Room } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Nakit' },
  { value: 'payme', label: 'Payme' },
  { value: 'click', label: 'Click' },
  { value: 'uzum', label: 'Uzum' },
  { value: 'transfer', label: 'Banka Transferi' },
] as const

const FLOOR_LABEL: Record<number, string> = {
  [-1]: 'Bodrum',
  2: '2. Kat',
  3: '3. Kat',
  4: '4. Kat (Mansard)',
}

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

function formatUZS(n: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n)
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.round(diff / 86400000))
}

// ─── Form Elemanları ──────────────────────────────────────────────────────────

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
        {label}
        {required && <span style={{ color: 'var(--color-error, #C62828)' }}> *</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs" style={{ color: '#EF4444' }}>
          {error}
        </p>
      )}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, ...rest } = props
  return (
    <input
      {...rest}
      className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors focus:ring-1"
      style={{
        backgroundColor: 'var(--color-admin-bg)',
        color: dash.text,
        borderColor: hasError ? '#EF4444' : 'var(--color-admin-border)',
      }}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  const { hasError, children, ...rest } = props
  return (
    <select
      {...rest}
      className="w-full px-3 py-2 rounded-lg text-sm border outline-none appearance-none"
      style={{
        backgroundColor: 'var(--color-admin-bg)',
        color: dash.text,
        borderColor: hasError ? '#EF4444' : 'var(--color-admin-border)',
      }}
    >
      {children}
    </select>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-widest pt-2"
      style={{ color: 'var(--color-accent)' }}
    >
      {children}
    </h2>
  )
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

interface Props {
  rooms: Room[]
}

const initial: ReservationFormState = {}

export default function NewReservationForm({ rooms }: Props) {
  const router = useRouter()
  const [state, action, pending] = useActionState(createReservationAction, initial)

  // Başarı → rezervasyon detay sayfasına yönlendir
  useEffect(() => {
    if (state.reservationId) {
      router.push(`/reservations/${state.reservationId}`)
    }
  }, [state.reservationId, router])

  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [showPayment, setShowPayment] = useState(false)

  // Seçili odanın fiyatı
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  )
  const pricePerNight = selectedRoom?.room_types?.base_price ?? 0
  const nights = nightsBetween(checkIn, checkOut)
  const totalAmount = pricePerNight * nights

  // Hata kısayolları
  const fe = state.fieldErrors ?? {}
  const today = new Date().toISOString().split('T')[0]

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {/* Genel hata */}
      {state.error && (
        <div
          className="px-4 py-3 rounded-lg text-sm border"
          style={{ backgroundColor: dash.redLight, borderColor: dash.red, color: dash.red }}
        >
          {state.error}
        </div>
      )}

      {/* ── Misafir Bilgileri ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <SectionTitle>Misafir Bilgileri</SectionTitle>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ad" required error={fe.firstName}>
            <Input name="firstName" placeholder="Alisher" hasError={!!fe.firstName} />
          </Field>
          <Field label="Soyad" required error={fe.lastName}>
            <Input name="lastName" placeholder="Karimov" hasError={!!fe.lastName} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Telefon" error={fe.phone}>
            <Input name="phone" type="tel" placeholder="+998 90 123 45 67" />
          </Field>
          <Field label="E-posta" error={fe.email}>
            <Input name="email" type="email" placeholder="misafir@email.com" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Uyruk" error={fe.nationality}>
            <Input name="nationality" placeholder="Özbekistan" />
          </Field>
          <Field label="Pasaport / Kimlik No" error={fe.passportNumber}>
            <Input name="passportNumber" placeholder="AA1234567" />
          </Field>
        </div>
      </div>

      {/* ── Rezervasyon Detayları ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <SectionTitle>Rezervasyon Detayları</SectionTitle>

        <Field label="Oda" required error={fe.roomId}>
          <Select
            name="roomId"
            hasError={!!fe.roomId}
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
          >
            <option value="">— Oda seçin —</option>
            {Object.entries(
              rooms.reduce<Record<number, Room[]>>((acc, r) => {
                if (!acc[r.floor]) acc[r.floor] = []
                acc[r.floor].push(r)
                return acc
              }, {})
            )
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([floor, floorRooms]) => (
                <optgroup key={floor} label={FLOOR_LABEL[Number(floor)] ?? `${floor}. Kat`}>
                  {floorRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_number} — {room.room_types?.name ?? '?'} (
                      {formatUZS(room.room_types?.base_price ?? 0)} UZS/gece)
                    </option>
                  ))}
                </optgroup>
              ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Giriş Tarihi" required error={fe.checkIn}>
            <Input
              name="checkIn"
              type="date"
              min={today}
              hasError={!!fe.checkIn}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </Field>
          <Field label="Çıkış Tarihi" required error={fe.checkOut}>
            <Input
              name="checkOut"
              type="date"
              min={checkIn || today}
              hasError={!!fe.checkOut}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Yetişkin Sayısı" required error={fe.adults}>
          <Select name="adults" defaultValue="1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} Yetişkin
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Beklenen Giriş Saati (opsiyonel)">
            <Input name="expectedCheckInTime" type="time" />
          </Field>
          <Field label="Kahvaltı">
            <label className="flex items-center gap-2.5 cursor-pointer mt-1">
              <input
                type="checkbox"
                name="breakfastIncluded"
                className="w-4 h-4 rounded accent-[var(--color-accent)]"
              />
              <span className="text-sm" style={{ color: dash.text }}>Kahvaltı dahil</span>
            </label>
          </Field>
        </div>

        <Field label="Özel İstek">
          <textarea
            name="specialRequests"
            rows={2}
            placeholder="Erken giriş, yüksek kat tercihi..."
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{
              backgroundColor: 'var(--color-admin-bg)',
              color: dash.text,
              borderColor: 'var(--color-admin-border)',
            }}
          />
        </Field>

        {/* Fiyat Özeti */}
        {nights > 0 && pricePerNight > 0 && (
          <div
            className="rounded-lg p-3 border text-sm space-y-1"
            style={{ backgroundColor: dash.primaryLight, borderColor: 'var(--color-admin-border)' }}
          >
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-admin-muted)' }}>
                {formatUZS(pricePerNight)} × {nights} gece
              </span>
              <span style={{ color: dash.text }}>{formatUZS(totalAmount)} UZS</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Ön Ödeme (opsiyonel) ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center justify-between">
          <SectionTitle>Ön Ödeme</SectionTitle>
          <button
            type="button"
            onClick={() => setShowPayment((v) => !v)}
            className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-admin-muted)' }}
          >
            {showPayment ? 'Kaldır' : '+ Ekle'}
          </button>
        </div>

        {showPayment && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tutar (UZS)" error={fe.advanceAmount}>
              <Input
                name="advanceAmount"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
              />
            </Field>
            <Field label="Ödeme Yöntemi" error={fe.paymentMethod}>
              <Select name="paymentMethod" defaultValue="cash">
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {!showPayment && (
          <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>
            Ön ödeme alınmadıysa boş bırakın. Check-in sırasında eklenebilir.
          </p>
        )}
      </div>

      {/* ── Gönder ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-8">
        <button
          type="submit"
          disabled={pending || !!state.reservationId}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
        >
          {pending ? 'Kaydediliyor…' : state.reservationId ? 'Yönlendiriliyor…' : 'Rezervasyon Oluştur'}
        </button>
        <a
          href="/reservations"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)' }}
        >
          İptal
        </a>
      </div>
    </form>
  )
}
