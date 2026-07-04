'use client'

import { useActionState, useState, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { createWalkInAction, type WalkInFormState } from '@/app/[locale]/(dashboard)/reservations/new/actions'
import NewReservationForm from './NewReservationForm'
import { dash } from '@/lib/dashboardTheme'
import type { Room } from '@/types/hotel'

// ─── Input helpers ────────────────────────────────────────────────────────────

function inputStyle(hasError = false) {
  return {
    backgroundColor: 'var(--color-admin-bg)',
    color: dash.text,
    borderColor: hasError ? '#EF4444' : 'var(--color-admin-border)',
    outlineColor: dash.primary,
  }
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, ...rest } = props
  return (
    <input
      {...rest}
      className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors focus:ring-1"
      style={inputStyle(hasError)}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors focus:ring-1"
      style={inputStyle()}
    />
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
        {label}{required && <span style={{ color: '#C62828' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Single guest card ────────────────────────────────────────────────────────

interface GuestCardProps {
  index: number
  isPrimary: boolean
  t: ReturnType<typeof useTranslations<'reservations.new'>>
}

function GuestCard({ index, isPrimary, t }: GuestCardProps) {
  const [marriageCert, setMarriageCert] = useState(false)
  const prefix = `guest_${index}_`

  return (
    <div
      className="rounded-xl p-4 border space-y-4"
      style={{ borderColor: isPrimary ? dash.primary : 'var(--color-admin-border)', backgroundColor: 'var(--color-admin-surface)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: dash.text }}>
          {t('guestCardTitle', { n: index + 1 })}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: isPrimary ? dash.primary : 'var(--color-admin-border)',
            color: isPrimary ? '#fff' : 'var(--color-admin-muted)',
          }}
        >
          {isPrimary ? t('primaryBadge') : t('companionBadge')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('fields.firstName')} required>
          <Input name={`${prefix}firstName`} required placeholder="—" />
        </Field>
        <Field label={t('fields.lastName')} required>
          <Input name={`${prefix}lastName`} required placeholder="—" />
        </Field>
        <Field label={t('fields.nationality')}>
          <Input name={`${prefix}nationality`} placeholder="UZ / RU / …" />
        </Field>
        <Field label={t('fields.dateOfBirth')}>
          <Input type="date" name={`${prefix}dateOfBirth`} />
        </Field>
        {isPrimary && (
          <>
            <Field label={t('fields.phone')}>
              <Input type="tel" name={`${prefix}phone`} placeholder="+998" />
            </Field>
            <Field label={t('fields.passportNumber')}>
              <Input name={`${prefix}passportNumber`} placeholder="AA1234567" />
            </Field>
          </>
        )}
        {!isPrimary && (
          <Field label={t('fields.relationship')}>
            <Input name={`${prefix}relationship`} placeholder="—" />
          </Field>
        )}
      </div>

      {!isPrimary && (
        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: dash.text }}>
          <input
            type="checkbox"
            checked={marriageCert}
            onChange={e => setMarriageCert(e.target.checked)}
          />
          <input type="hidden" name={`${prefix}marriageCertShown`} value={String(marriageCert)} />
          {t('fields.marriageCert')}
        </label>
      )}
    </div>
  )
}

// ─── Walk-in multi-guest form ─────────────────────────────────────────────────

function WalkInGuestForm({ rooms, onBack }: { rooms: Room[]; onBack: () => void }) {
  const t = useTranslations('reservations.new')
  const router = useRouter()

  const [guestCountInput, setGuestCountInput] = useState('')
  const [guestCount, setGuestCount] = useState<number | null>(null)

  const initialState: WalkInFormState = {}
  const [state, formAction, pending] = useActionState(createWalkInAction, initialState)

  const handleCountConfirm = useCallback(() => {
    const n = parseInt(guestCountInput, 10)
    if (n >= 1 && n <= 20) setGuestCount(n)
  }, [guestCountInput])

  const today = new Date().toISOString().split('T')[0]

  if (state.reservationId) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-5xl">✅</div>
        <p className="text-xl font-semibold" style={{ color: dash.text }}>{t('successTitle')}</p>
        <button
          onClick={() => router.push(`/reservations/${state.reservationId}`)}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: dash.primary }}
        >
          {t('successGoDetail')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Guest count step */}
      {guestCount === null ? (
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ borderColor: 'var(--color-admin-border)', backgroundColor: 'var(--color-admin-surface)' }}
        >
          <p className="text-sm font-medium" style={{ color: dash.text }}>{t('guestCountLabel')}</p>
          <div className="flex gap-3">
            <input
              type="number"
              min={1}
              max={20}
              value={guestCountInput}
              onChange={e => setGuestCountInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCountConfirm()}
              placeholder={t('guestCountPlaceholder')}
              className="w-32 px-3 py-2 rounded-lg text-sm border outline-none"
              style={inputStyle()}
            />
            <button
              type="button"
              onClick={handleCountConfirm}
              disabled={!guestCountInput || parseInt(guestCountInput, 10) < 1}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: dash.primary }}
            >
              {t('guestCountBtn')}
            </button>
          </div>
        </div>
      ) : (
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="guestCount" value={guestCount} />

          {/* Guest cards */}
          {Array.from({ length: guestCount }, (_, i) => (
            <GuestCard key={i} index={i} isPrimary={i === 0} t={t} />
          ))}

          {/* Shared stay parameters */}
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--color-admin-border)', backgroundColor: 'var(--color-admin-surface)' }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-admin-muted)' }}>
              {t('sharedSection')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('roomLabel')} required>
                <Select name="roomId" required>
                  <option value="">—</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      #{r.room_number} — {(r.room_types as unknown as { name: string } | null)?.name ?? ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t('checkOutLabel')} required>
                <Input type="date" name="checkOut" required min={today} />
              </Field>

              <Field label={t('adultsLabel')} required>
                <Input type="number" name="adults" required min={1} max={20} defaultValue={guestCount} />
              </Field>

              <Field label="">
                <label className="flex items-center gap-2 cursor-pointer text-sm mt-5" style={{ color: dash.text }}>
                  <input type="checkbox" name="breakfastIncluded" />
                  {t('breakfastLabel')}
                </label>
              </Field>

              <div className="sm:col-span-2">
                <Field label={t('specialRequestsLabel')}>
                  <textarea
                    name="specialRequests"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--color-admin-border)', backgroundColor: 'var(--color-admin-surface)' }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-admin-muted)' }}>
              {t('paymentSection')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('amountLabel')}>
                <Input type="number" name="advanceAmount" min={0} step={1000} placeholder="0" />
              </Field>
              <Field label={t('methodLabel')}>
                <Select name="paymentMethod">
                  <option value="">—</option>
                  <option value="cash">Наличные / Naqd</option>
                  <option value="payme">Payme</option>
                  <option value="click">Click</option>
                  <option value="uzum">Uzum</option>
                  <option value="transfer">Transfer</option>
                </Select>
              </Field>
            </div>
          </div>

          {state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setGuestCount(null)}
              className="px-4 py-2.5 rounded-lg text-sm border transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-muted)' }}
            >
              {t('changeMode')}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: dash.primary }}
            >
              {pending ? t('submitting') : t('submitBtn')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Main component: mode selector ───────────────────────────────────────────

type Mode = 'choose' | 'walkin' | 'book'

interface WalkInFormProps {
  rooms: Room[]
}

export default function WalkInForm({ rooms }: WalkInFormProps) {
  const t = useTranslations('reservations.new')
  const [mode, setMode] = useState<Mode>('choose')

  if (mode === 'walkin') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode('choose')}
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)' }}
        >
          {t('changeMode')}
        </button>
        <WalkInGuestForm rooms={rooms} onBack={() => setMode('choose')} />
      </div>
    )
  }

  if (mode === 'book') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode('choose')}
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)' }}
        >
          {t('changeMode')}
        </button>
        <NewReservationForm rooms={rooms} />
      </div>
    )
  }

  // Mode: choose
  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border p-6 space-y-2"
        style={{ borderColor: 'var(--color-admin-border)', backgroundColor: 'var(--color-admin-surface)' }}
      >
        <p className="text-base font-semibold" style={{ color: dash.text }}>{t('modeTitle')}</p>
        <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{t('modeSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Walk-in card */}
        <button
          type="button"
          onClick={() => setMode('walkin')}
          className="flex flex-col items-start gap-2 rounded-xl border p-6 text-left transition-all hover:ring-2"
          style={{
            borderColor: dash.primary,
            backgroundColor: 'var(--color-admin-surface)',
            ['--tw-ring-color' as string]: dash.primary,
          }}
        >
          <span className="text-3xl">🚪</span>
          <span className="text-base font-semibold" style={{ color: dash.text }}>{t('walkInBtn')}</span>
          <span className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>{t('walkInDesc')}</span>
        </button>

        {/* Book card */}
        <button
          type="button"
          onClick={() => setMode('book')}
          className="flex flex-col items-start gap-2 rounded-xl border p-6 text-left transition-all hover:ring-2"
          style={{
            borderColor: 'var(--color-admin-border)',
            backgroundColor: 'var(--color-admin-surface)',
            ['--tw-ring-color' as string]: dash.primary,
          }}
        >
          <span className="text-3xl">📅</span>
          <span className="text-base font-semibold" style={{ color: dash.text }}>{t('bookBtn')}</span>
          <span className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>{t('bookDesc')}</span>
        </button>
      </div>
    </div>
  )
}
