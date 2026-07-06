'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { createReservationAction, type ReservationFormState } from '@/app/[locale]/(dashboard)/reservations/new/actions'
import PassportScanButton from './PassportScanButton'
import type { MrzFields } from '@/lib/mrz'
import type { Room } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUZS(n: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n)
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.round(diff / 86400000))
}

// ─── Form elements ──────────────────────────────────────────────────────────

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

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  rooms: Room[]
}

const initial: ReservationFormState = {}

export default function NewReservationForm({ rooms }: Props) {
  const router = useRouter()
  const t = useTranslations('newReservation')
  const ts = useTranslations('newReservation.sections')
  const tf = useTranslations('newReservation.fields')
  const tp = useTranslations('newReservation.placeholders')
  const tFloor = useTranslations('rooms.floors')
  const tm = useTranslations('reservations.methods')
  const [state, action, pending] = useActionState(createReservationAction, initial)

  const paymentMethods = [
    { value: 'cash', label: tm('cash') },
    { value: 'payme', label: 'Payme' },
    { value: 'click', label: 'Click' },
    { value: 'uzum', label: 'Uzum' },
    { value: 'transfer', label: tm('transfer') },
  ] as const

  const floorLabel = (floor: number): string => {
    if (floor === -1) return tFloor('basement')
    if (floor === 2) return tFloor('floor2')
    if (floor === 3) return tFloor('floor3')
    if (floor === 4) return tFloor('floor4')
    return tFloor('floorN', { floor })
  }

  // On success → redirect to reservation detail page
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

  // Guest fields — controlled so the passport scanner can fill them
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nationality, setNationality] = useState('')
  const [passportNumber, setPassportNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [passportExpiry, setPassportExpiry] = useState('')
  const [sex, setSex] = useState('')

  function applyScan(f: MrzFields) {
    if (f.surname) setLastName(f.surname)
    if (f.givenNames) setFirstName(f.givenNames)
    if (f.nationalityName) setNationality(f.nationalityName)
    if (f.passportNumber) setPassportNumber(f.passportNumber)
    if (f.dateOfBirth) setDateOfBirth(f.dateOfBirth)
    if (f.expiryDate) setPassportExpiry(f.expiryDate)
    if (f.sex) setSex(f.sex)
  }

  // Selected room price
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  )
  const pricePerNight = selectedRoom?.room_types?.base_price ?? 0
  const nights = nightsBetween(checkIn, checkOut)
  const totalAmount = pricePerNight * nights

  const fe = state.fieldErrors ?? {}
  const today = new Date().toISOString().split('T')[0]

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {/* General error */}
      {state.error && (
        <div
          className="px-4 py-3 rounded-lg text-sm border"
          style={{ backgroundColor: dash.redLight, borderColor: dash.red, color: dash.red }}
        >
          {state.error}
        </div>
      )}

      {/* Guest info */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <SectionTitle>{ts('guestInfo')}</SectionTitle>
          <PassportScanButton onResult={applyScan} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={tf('firstName')} required error={fe.firstName}>
            <Input name="firstName" placeholder="Alisher" hasError={!!fe.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label={tf('lastName')} required error={fe.lastName}>
            <Input name="lastName" placeholder="Karimov" hasError={!!fe.lastName} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={tf('phone')} error={fe.phone}>
            <Input name="phone" type="tel" placeholder="+998 90 123 45 67" />
          </Field>
          <Field label={tf('email')} error={fe.email}>
            <Input name="email" type="email" placeholder={tp('email')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={tf('nationality')} error={fe.nationality}>
            <Input name="nationality" placeholder={tp('nationality')} value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </Field>
          <Field label={tf('passportId')} error={fe.passportNumber}>
            <Input name="passportNumber" placeholder="AA1234567" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} />
          </Field>
        </div>

        {/* Scan-populated fields (hidden; no manual entry needed here) */}
        <input type="hidden" name="dateOfBirth" value={dateOfBirth} />
        <input type="hidden" name="passportExpiry" value={passportExpiry} />
        <input type="hidden" name="sex" value={sex} />
      </div>

      {/* Reservation details */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <SectionTitle>{ts('reservationDetails')}</SectionTitle>

        <Field label={tf('room')} required error={fe.roomId}>
          <Select
            name="roomId"
            hasError={!!fe.roomId}
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
          >
            <option value="">{t('roomSelect')}</option>
            {Object.entries(
              rooms.reduce<Record<number, Room[]>>((acc, r) => {
                if (!acc[r.floor]) acc[r.floor] = []
                acc[r.floor].push(r)
                return acc
              }, {})
            )
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([floor, floorRooms]) => (
                <optgroup key={floor} label={floorLabel(Number(floor))}>
                  {floorRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_number} — {room.room_types?.name ?? '?'} (
                      {formatUZS(room.room_types?.base_price ?? 0)} UZS)
                    </option>
                  ))}
                </optgroup>
              ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={tf('checkIn')} required error={fe.checkIn}>
            <Input
              name="checkIn"
              type="date"
              min={today}
              hasError={!!fe.checkIn}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </Field>
          <Field label={tf('checkOut')} required error={fe.checkOut}>
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

        <Field label={tf('adults')} required error={fe.adults}>
          <Select name="adults" defaultValue="1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {t('adultsOption', { n })}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={tf('expectedCheckIn')}>
            <Input name="expectedCheckInTime" type="time" />
          </Field>
          <Field label={tf('breakfast')}>
            <label className="flex items-center gap-2.5 cursor-pointer mt-1">
              <input
                type="checkbox"
                name="breakfastIncluded"
                className="w-4 h-4 rounded accent-[var(--color-accent)]"
              />
              <span className="text-sm" style={{ color: dash.text }}>{t('breakfastIncluded')}</span>
            </label>
          </Field>
        </div>

        <Field label={tf('specialRequest')}>
          <textarea
            name="specialRequests"
            rows={2}
            placeholder={tp('specialRequest')}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{
              backgroundColor: 'var(--color-admin-bg)',
              color: dash.text,
              borderColor: 'var(--color-admin-border)',
            }}
          />
        </Field>

        {/* Price summary */}
        {nights > 0 && pricePerNight > 0 && (
          <div
            className="rounded-lg p-3 border text-sm space-y-1"
            style={{ backgroundColor: dash.primaryLight, borderColor: 'var(--color-admin-border)' }}
          >
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-admin-muted)' }}>
                {t('priceFormula', { price: formatUZS(pricePerNight), nights })}
              </span>
              <span style={{ color: dash.text }}>{formatUZS(totalAmount)} UZS</span>
            </div>
          </div>
        )}
      </div>

      {/* Prepayment (optional) */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center justify-between">
          <SectionTitle>{ts('prepayment')}</SectionTitle>
          <button
            type="button"
            onClick={() => setShowPayment((v) => !v)}
            className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-admin-muted)' }}
          >
            {showPayment ? t('removePrepayment') : t('addPrepayment')}
          </button>
        </div>

        {showPayment && (
          <div className="grid grid-cols-2 gap-4">
            <Field label={tf('amount')} error={fe.advanceAmount}>
              <Input
                name="advanceAmount"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
              />
            </Field>
            <Field label={tf('method')} error={fe.paymentMethod}>
              <Select name="paymentMethod" defaultValue="cash">
                {paymentMethods.map(({ value, label }) => (
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
            {t('prepaymentNote')}
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pb-8">
        <button
          type="submit"
          disabled={pending || !!state.reservationId}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
        >
          {pending ? t('savingButton') : state.reservationId ? t('redirectingButton') : t('submitButton')}
        </button>
        <a
          href="/reservations"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)' }}
        >
          {t('cancelLink')}
        </a>
      </div>
    </form>
  )
}
