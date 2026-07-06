'use client'

// Boş oda panelindeki giriş/rezervasyon sihirbazı.
//
// "Giriş Yap" (walk-in, misafir şu an burada):
//   parametreler → (gerekirse) oda kombinasyonu → DOLU İŞARETLE (anında senkron)
//   → pasaportları sırayla okut+onayla → "Devam et (tam kayıt)" / "Yarı kayıt bırak"
// "Rezervasyon Yap" (ileri tarihli):
//   parametreler → (gerekirse) kombinasyon → birincil misafir (+opsiyonel ön ödeme) → oluştur

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { LogIn, CalendarPlus, Loader2, Check, ChevronRight, Users } from 'lucide-react'
import { dash } from '@/lib/dashboardTheme'
import PassportScanButton from '@/components/admin/PassportScanButton'
import type { MrzFields } from '@/lib/mrz'
import {
  getRoomOffersAction,
  createOccupancyAction,
  createFutureBookingAction,
  attachPassportScanAction,
  type SimpleOffer,
  type SimpleOfferRoom,
  type OccupancySlot,
} from '@/components/admin/room-detail/actions'

// ─── helpers ────────────────────────────────────────────────────────────────────

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}
function today(): string {
  return dateStr(new Date())
}
function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return dateStr(d)
}
function formatUZS(n: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1'

interface Props {
  roomId: string
  roomNumber: string
  capacity: number
  onDone: () => void
}

type Mode = 'choose' | 'walkin' | 'future'

export default function RoomBookingFlow({ roomId, roomNumber, capacity, onDone }: Props) {
  const t = useTranslations('roomDetail')
  const [mode, setMode] = useState<Mode>('choose')

  if (mode === 'choose') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('emptyRoom')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('walkin')}
            className="flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center transition-all hover:ring-2"
            style={{ borderColor: dash.primary, ['--tw-ring-color' as string]: dash.primary }}
          >
            <LogIn size={22} style={{ color: dash.primary }} />
            <span className="text-sm font-semibold text-foreground">{t('checkInNow')}</span>
            <span className="text-[11px] text-muted-foreground">{t('checkInNowDesc')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('future')}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-4 text-center transition-all hover:ring-2"
            style={{ ['--tw-ring-color' as string]: dash.primary }}
          >
            <CalendarPlus size={22} style={{ color: dash.primary }} />
            <span className="text-sm font-semibold text-foreground">{t('makeReservation')}</span>
            <span className="text-[11px] text-muted-foreground">{t('makeReservationDesc')}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setMode('choose')}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← {t('back')}
      </button>
      {mode === 'walkin' ? (
        <WalkInWizard roomId={roomId} roomNumber={roomNumber} capacity={capacity} onDone={onDone} />
      ) : (
        <FutureWizard roomId={roomId} roomNumber={roomNumber} capacity={capacity} onDone={onDone} />
      )}
    </div>
  )
}

// ─── Oda seçimi ortak parçası ───────────────────────────────────────────────────

function OfferList({
  offers,
  onPick,
  guestCount,
}: {
  offers: SimpleOffer[]
  onPick: (rooms: SimpleOfferRoom[]) => void
  guestCount: number
}) {
  const t = useTranslations('roomDetail')
  if (offers.length === 0) {
    return <p className="text-sm text-destructive">{t('noAvailability')}</p>
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t('pickCombination', { n: guestCount })}</p>
      {offers.map((o, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(o.rooms)}
          className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm hover:bg-muted/50 hover:border-foreground/20"
        >
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {o.rooms.map((r) => `#${r.roomNumber}`).join(' + ')}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {o.exactFit ? t('exactFit') : t('extraCapacity', { n: o.waste })} ·{' '}
              {t('capacityShort', { n: o.totalCapacity })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold text-foreground tabular-nums">{formatUZS(o.totalPrice)}</p>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Walk-in sihirbazı ──────────────────────────────────────────────────────────

type WalkStep = 'params' | 'offers' | 'confirm' | 'scan' | 'finish'

function WalkInWizard({ roomId, roomNumber, capacity, onDone }: Props) {
  const t = useTranslations('roomDetail')
  const router = useRouter()

  const [step, setStep] = useState<WalkStep>('params')
  const [checkOut, setCheckOut] = useState(tomorrow())
  const [guestCount, setGuestCount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [offers, setOffers] = useState<SimpleOffer[]>([])
  const [selected, setSelected] = useState<SimpleOfferRoom[]>([])
  const [slots, setSlots] = useState<OccupancySlot[]>([])
  const [primaryResId, setPrimaryResId] = useState('')

  async function submitParams() {
    setError(null)
    if (checkOut <= today()) {
      setError(t('invalidCheckout'))
      return
    }
    if (guestCount <= capacity) {
      setSelected([{ id: roomId, roomNumber, typeName: '', capacity, pricePerNight: 0 }])
      setStep('confirm')
      return
    }
    setBusy(true)
    const res = await getRoomOffersAction({ checkIn: today(), checkOut, guestCount })
    setBusy(false)
    if (res.error) return setError(res.error)
    setOffers(res.offers ?? [])
    setStep('offers')
  }

  async function markOccupied() {
    setBusy(true)
    setError(null)
    const res = await createOccupancyAction({
      roomIds: selected.map((r) => r.id),
      checkOut,
      guestCount,
    })
    setBusy(false)
    if (res.error || !res.result) return setError(res.error ?? 'error')
    setSlots(res.result.slots)
    setPrimaryResId(res.result.primaryReservationId)
    setStep('scan')
  }

  if (step === 'params') {
    return (
      <div className="space-y-3">
        <label className="block text-xs text-muted-foreground">
          {t('checkoutDate')}
          <input
            type="date"
            min={tomorrow()}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={inputCls + ' mt-1'}
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          {t('guestCount')}
          <input
            type="number"
            min={1}
            max={30}
            value={guestCount}
            onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
            className={inputCls + ' mt-1'}
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={submitParams}
          disabled={busy}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: dash.primary }}
        >
          {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('continue')}
        </button>
      </div>
    )
  }

  if (step === 'offers') {
    return (
      <OfferList
        offers={offers}
        guestCount={guestCount}
        onPick={(rooms) => {
          setSelected(rooms)
          setStep('confirm')
        }}
      />
    )
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border p-4 space-y-1.5 text-sm">
          <p className="font-medium text-foreground">
            {selected.map((r) => `#${r.roomNumber}`).join(' + ')}
          </p>
          <p className="text-muted-foreground">
            {today()} → {checkOut} · {t('morePeopleFull', { n: guestCount })}
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={markOccupied}
          disabled={busy}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: dash.orange }}
        >
          {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('markOccupied')}
        </button>
        <p className="text-[11px] text-muted-foreground text-center">{t('markOccupiedHint')}</p>
      </div>
    )
  }

  if (step === 'scan') {
    return (
      <ScanWizard
        slots={slots}
        onComplete={() => setStep('finish')}
      />
    )
  }

  // finish
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: dash.greenLight, color: dash.green }}>
        <Check size={16} /> {t('scansDone')}
      </div>
      <button
        type="button"
        onClick={() => router.push(`/reservations/${primaryResId}`)}
        className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
        style={{ backgroundColor: dash.primary }}
      >
        {t('continueFullRecord')}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted/50"
      >
        {t('leaveHalfRecord')}
      </button>
      <p className="text-[11px] text-muted-foreground text-center">{t('halfRecordHint')}</p>
    </div>
  )
}

// ─── Pasaport tarama sihirbazı (slot slot) ──────────────────────────────────────

interface SlotForm {
  firstName: string
  lastName: string
  nationality: string
  dateOfBirth: string
  passportNumber: string
  passportExpiry: string
  sex: string
  mrzRaw: string
}
const EMPTY_SLOT: SlotForm = {
  firstName: '', lastName: '', nationality: '', dateOfBirth: '',
  passportNumber: '', passportExpiry: '', sex: '', mrzRaw: '',
}

function ScanWizard({ slots, onComplete }: { slots: OccupancySlot[]; onComplete: () => void }) {
  const t = useTranslations('roomDetail')
  const [idx, setIdx] = useState(0)
  const [form, setForm] = useState<SlotForm>(EMPTY_SLOT)
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined)
  const [scanned, setScanned] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slot = slots[idx]

  function applyScan(f: MrzFields) {
    setForm({
      firstName: f.givenNames || '',
      lastName: f.surname || '',
      nationality: f.nationalityName || '',
      dateOfBirth: f.dateOfBirth || '',
      passportNumber: f.passportNumber || '',
      passportExpiry: f.expiryDate || '',
      sex: f.sex || '',
      mrzRaw: f.raw || '',
    })
    setScanned(true)
  }

  async function onImage(file: File) {
    setImageDataUrl(await fileToDataUrl(file))
  }

  function set<K extends keyof SlotForm>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function approveNext() {
    setError(null)
    if (!form.firstName || !form.lastName) {
      setError(t('nameRequired'))
      return
    }
    setBusy(true)
    const res = await attachPassportScanAction({
      reservationId: slot.reservationId,
      slotIndex: slot.slotIndex,
      isPrimary: slot.isPrimary,
      guest: {
        firstName: form.firstName,
        lastName: form.lastName,
        nationality: form.nationality || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        passportNumber: form.passportNumber || undefined,
        passportExpiry: form.passportExpiry || undefined,
        sex: (form.sex as 'M' | 'F') || undefined,
        mrzRaw: form.mrzRaw || undefined,
      },
      imageDataUrl,
    })
    setBusy(false)
    if (res.error) return setError(res.error)

    if (idx + 1 >= slots.length) {
      onComplete()
    } else {
      setIdx(idx + 1)
      setForm(EMPTY_SLOT)
      setImageDataUrl(undefined)
      setScanned(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {t('scanGuest', { n: idx + 1, total: slots.length })}
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Users size={12} /> #{slot.roomNumber}
          {slot.isPrimary && <span>· {t('primary')}</span>}
        </span>
      </div>

      <PassportScanButton onResult={applyScan} onImage={onImage} />

      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder={t('firstName')} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
        <input className={inputCls} placeholder={t('lastName')} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        <input className={inputCls} placeholder={t('nationality')} value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
        <input className={inputCls} placeholder={t('passportNumber')} value={form.passportNumber} onChange={(e) => set('passportNumber', e.target.value)} />
        <input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} title={t('dateOfBirth')} />
        <input type="date" className={inputCls} value={form.passportExpiry} onChange={(e) => set('passportExpiry', e.target.value)} title={t('passportExpiry')} />
      </div>

      {scanned && <p className="text-xs" style={{ color: dash.green }}>{t('scanSuccess')}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={approveNext}
        disabled={busy}
        className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: dash.primary }}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin mx-auto" />
        ) : idx + 1 >= slots.length ? (
          t('approveFinish')
        ) : (
          t('approveNext')
        )}
      </button>
    </div>
  )
}

// ─── İleri tarihli rezervasyon sihirbazı ────────────────────────────────────────

type FutureStep = 'params' | 'offers' | 'guest' | 'success'

function FutureWizard({ roomId, roomNumber, capacity, onDone }: Props) {
  const t = useTranslations('roomDetail')
  const router = useRouter()

  const [step, setStep] = useState<FutureStep>('params')
  const [checkIn, setCheckIn] = useState(today())
  const [checkOut, setCheckOut] = useState(tomorrow())
  const [guestCount, setGuestCount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offers, setOffers] = useState<SimpleOffer[]>([])
  const [selected, setSelected] = useState<SimpleOfferRoom[]>([])
  const [newResId, setNewResId] = useState('')

  const [guest, setGuest] = useState<SlotForm & { phone: string }>({ ...EMPTY_SLOT, phone: '' })
  const [advance, setAdvance] = useState('')
  const [method, setMethod] = useState('')

  async function submitParams() {
    setError(null)
    if (checkOut <= checkIn) return setError(t('invalidCheckout'))
    if (guestCount <= capacity) {
      setSelected([{ id: roomId, roomNumber, typeName: '', capacity, pricePerNight: 0 }])
      setStep('guest')
      return
    }
    setBusy(true)
    const res = await getRoomOffersAction({ checkIn, checkOut, guestCount })
    setBusy(false)
    if (res.error) return setError(res.error)
    setOffers(res.offers ?? [])
    setStep('offers')
  }

  function applyScan(f: MrzFields) {
    setGuest((prev) => ({
      ...prev,
      firstName: f.givenNames || prev.firstName,
      lastName: f.surname || prev.lastName,
      nationality: f.nationalityName || prev.nationality,
      dateOfBirth: f.dateOfBirth || prev.dateOfBirth,
      passportNumber: f.passportNumber || prev.passportNumber,
      passportExpiry: f.expiryDate || prev.passportExpiry,
      sex: f.sex || prev.sex,
    }))
  }

  async function submitBooking() {
    setError(null)
    if (!guest.firstName || !guest.lastName) return setError(t('nameRequired'))
    setBusy(true)
    const res = await createFutureBookingAction({
      roomIds: selected.map((r) => r.id),
      checkIn,
      checkOut,
      guestCount,
      primary: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        phone: guest.phone || undefined,
        nationality: guest.nationality || undefined,
        passportNumber: guest.passportNumber || undefined,
        dateOfBirth: guest.dateOfBirth || undefined,
        passportExpiry: guest.passportExpiry || undefined,
        sex: (guest.sex as 'M' | 'F') || undefined,
      },
      advanceAmount: advance ? Number(advance) : undefined,
      paymentMethod: (method || undefined) as
        | 'payme' | 'click' | 'uzum' | 'cash' | 'transfer' | undefined,
    })
    setBusy(false)
    if (res.error || !res.reservationId) return setError(res.error ?? 'error')
    setNewResId(res.reservationId)
    setStep('success')
  }

  if (step === 'params') {
    return (
      <div className="space-y-3">
        <label className="block text-xs text-muted-foreground">
          {t('checkInDate')}
          <input type="date" min={today()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputCls + ' mt-1'} />
        </label>
        <label className="block text-xs text-muted-foreground">
          {t('checkoutDate')}
          <input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputCls + ' mt-1'} />
        </label>
        <label className="block text-xs text-muted-foreground">
          {t('guestCount')}
          <input type="number" min={1} max={30} value={guestCount} onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value || '1', 10)))} className={inputCls + ' mt-1'} />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="button" onClick={submitParams} disabled={busy} className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: dash.primary }}>
          {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('continue')}
        </button>
      </div>
    )
  }

  if (step === 'offers') {
    return (
      <OfferList offers={offers} guestCount={guestCount} onPick={(rooms) => { setSelected(rooms); setStep('guest') }} />
    )
  }

  if (step === 'guest') {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          {selected.map((r) => `#${r.roomNumber}`).join(' + ')} · {checkIn} → {checkOut}
        </div>
        <PassportScanButton onResult={applyScan} />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder={t('firstName')} value={guest.firstName} onChange={(e) => setGuest({ ...guest, firstName: e.target.value })} />
          <input className={inputCls} placeholder={t('lastName')} value={guest.lastName} onChange={(e) => setGuest({ ...guest, lastName: e.target.value })} />
          <input className={inputCls} placeholder={t('phone')} value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
          <input className={inputCls} placeholder={t('nationality')} value={guest.nationality} onChange={(e) => setGuest({ ...guest, nationality: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={0} className={inputCls} placeholder={t('advanceAmount')} value={advance} onChange={(e) => setAdvance(e.target.value)} />
          <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">{t('paymentMethodOptional')}</option>
            <option value="cash">{t('methodCash')}</option>
            <option value="payme">Payme</option>
            <option value="click">Click</option>
            <option value="uzum">Uzum</option>
            <option value="transfer">{t('methodTransfer')}</option>
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="button" onClick={submitBooking} disabled={busy} className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: dash.primary }}>
          {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('createReservation')}
        </button>
      </div>
    )
  }

  // success
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: dash.greenLight, color: dash.green }}>
        <Check size={16} /> {t('reservationCreated')}
      </div>
      <button type="button" onClick={() => router.push(`/reservations/${newResId}`)} className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: dash.primary }}>
        {t('goToReservation')}
      </button>
      <button type="button" onClick={onDone} className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted/50">
        {t('close')}
      </button>
    </div>
  )
}
