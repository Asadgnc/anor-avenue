'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard oda paneli — server action'ları
//
// getRoomDetailAction        → panel açılınca oda + aktif konaklama + geçmiş
// createOccupancyAction       → "Giriş Yap": oda(lar)ı HEMEN dolu işaretle (yarı kayıt)
// attachPassportScanAction    → taranan pasaportu kaydet (görsel private bucket'a)
// createFutureBookingAction   → "Rezervasyon Yap": ileri tarihli onaylı rezervasyon
// completeRegistrationAction  → yarı kaydı "tam kayıt" olarak işaretle
//
// Çakışma (overbooking) tespiti için availability motorunun loadBookableRooms'u
// yeniden kullanılır — böylece kombinasyon önerisiyle aynı mantık uygulanır.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { triggerAvailabilitySync } from '@/lib/channex-sync'
import { loadBookableRooms, findAvailability, nightsBetween } from '@/lib/availability'

const FRONT_DESK = new Set(['admin', 'receptionist'])

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Types döndürülen ──────────────────────────────────────────────────────────

export interface RoomStayInfo {
  reservationId: string
  reservationCode: string
  status: string
  guestName: string
  peopleCount: number
  checkIn: string
  checkOut: string
  nights: number
  totalAmount: number
  paid: number
  breakfast: boolean
  registrationPending: boolean
  mayExtend: boolean
}

export interface RoomHistoryRow {
  reservationId: string
  guestName: string
  peopleCount: number
  checkIn: string
  checkOut: string
  nights: number
  paid: number
  status: string
}

export interface RoomDetail {
  id: string
  roomNumber: string
  floor: number
  typeName: string
  capacity: number
  status: string
  current: RoomStayInfo | null
  history: RoomHistoryRow[]
}

// ─── getRoomDetail ──────────────────────────────────────────────────────────────

interface ResRow {
  id: string
  reservation_code: string
  status: string
  check_in: string
  check_out: string
  adults: number
  children: number | null
  nights: number | null
  total_amount: number
  breakfast_included: boolean
  registration_pending: boolean
  may_extend: boolean
  guests: { first_name: string; last_name: string } | null
}

export async function getRoomDetailAction(
  roomId: string
): Promise<{ detail?: RoomDetail; error?: string }> {
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

  if (!z.string().uuid().safeParse(roomId).success) return { error: te('invalidData') }

  const service = createServiceClient()

  // Oda + kapasite
  const { data: room, error: roomErr } = await service
    .from('rooms')
    .select('id, room_number, floor, status, room_types(name, max_occupancy), channex_variants(occupancy)')
    .eq('id', roomId)
    .single()
  if (roomErr || !room) return { error: te('roomNotFound') }

  const roomType = room.room_types as unknown as { name: string; max_occupancy: number | null } | null
  const variant = room.channex_variants as unknown as { occupancy: number | null } | null
  const capacity = variant?.occupancy ?? roomType?.max_occupancy ?? 2

  // Bu odaya ait rezervasyonlar (aktif + geçmiş), en yeniden eskiye
  const { data: resData } = await service
    .from('reservations')
    .select('id, reservation_code, status, check_in, check_out, adults, children, nights, total_amount, breakfast_included, registration_pending, may_extend, guests(first_name, last_name)')
    .eq('room_id', roomId)
    .order('check_in', { ascending: false })
    .limit(60)

  const rows = (resData ?? []) as unknown as ResRow[]

  // Ödeme toplamları (completed) tek sorguda
  const resIds = rows.map((r) => r.id)
  const paidByRes = new Map<string, number>()
  if (resIds.length > 0) {
    const { data: pays } = await service
      .from('payments')
      .select('reservation_id, amount, status')
      .in('reservation_id', resIds)
      .eq('status', 'completed')
    for (const p of (pays ?? []) as Array<{ reservation_id: string; amount: number }>) {
      paidByRes.set(p.reservation_id, (paidByRes.get(p.reservation_id) ?? 0) + Number(p.amount))
    }
  }

  const today = todayStr()
  const guestName = (r: ResRow) =>
    r.guests ? `${r.guests.first_name} ${r.guests.last_name}`.trim() : '—'
  const people = (r: ResRow) => Number(r.adults) + Number(r.children ?? 0)
  const nightsOf = (r: ResRow) => r.nights ?? nightsBetween(r.check_in, r.check_out)

  // Aktif konaklama: checked_in ve bugün aralıkta
  const currentRow = rows.find(
    (r) => r.status === 'checked_in' && r.check_in <= today && r.check_out > today
  )

  const current: RoomStayInfo | null = currentRow
    ? {
        reservationId: currentRow.id,
        reservationCode: currentRow.reservation_code,
        status: currentRow.status,
        guestName: guestName(currentRow),
        peopleCount: people(currentRow),
        checkIn: currentRow.check_in,
        checkOut: currentRow.check_out,
        nights: nightsOf(currentRow),
        totalAmount: Number(currentRow.total_amount),
        paid: paidByRes.get(currentRow.id) ?? 0,
        breakfast: currentRow.breakfast_included,
        registrationPending: currentRow.registration_pending,
        mayExtend: currentRow.may_extend,
      }
    : null

  // Geçmiş: aktif olan hariç, bitmiş/geçmiş konaklamalar
  const history: RoomHistoryRow[] = rows
    .filter((r) => r.id !== currentRow?.id)
    .filter(
      (r) =>
        ['checked_out', 'cancelled', 'no_show'].includes(r.status) || r.check_out <= today
    )
    .map((r) => ({
      reservationId: r.id,
      guestName: guestName(r),
      peopleCount: people(r),
      checkIn: r.check_in,
      checkOut: r.check_out,
      nights: nightsOf(r),
      paid: paidByRes.get(r.id) ?? 0,
      status: r.status,
    }))

  return {
    detail: {
      id: room.id,
      roomNumber: room.room_number,
      floor: room.floor,
      typeName: roomType?.name ?? '—',
      capacity,
      status: room.status,
      current,
      history,
    },
  }
}

// ─── getRoomOffers (kombinasyon önerileri, client'a serileştirilebilir) ─────────

export interface SimpleOfferRoom {
  id: string
  roomNumber: string
  typeName: string
  capacity: number
  pricePerNight: number
}
export interface SimpleOffer {
  rooms: SimpleOfferRoom[]
  totalCapacity: number
  totalPrice: number
  perNightPrice: number
  waste: number
  exactFit: boolean
}

export async function getRoomOffersAction(input: {
  checkIn: string
  checkOut: string
  guestCount: number
}): Promise<{ error?: string; status?: 'ok' | 'insufficient'; offers?: SimpleOffer[] }> {
  const te = await getTranslations('errors')
  const { user, role } = await requireFrontDesk()
  if (!user) return { error: te('sessionInvalid') }
  if (!FRONT_DESK.has(role)) return { error: te('permissionDenied') }

  const schema = z.object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guestCount: z.number().int().min(1).max(30),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: te('invalidData') }
  if (parsed.data.checkOut <= parsed.data.checkIn) return { error: te('checkOutAfterCheckIn') }

  const service = createServiceClient()
  const result = await findAvailability(service, {
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
    partySize: parsed.data.guestCount,
  })

  const toSimple = (rooms: (typeof result.offers)[number]['rooms']): SimpleOfferRoom[] =>
    rooms.map((r) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      typeName: r.typeName,
      capacity: r.capacity,
      pricePerNight: r.pricePerNight,
    }))

  const offers: SimpleOffer[] = result.offers.map((o) => ({
    rooms: toSimple(o.rooms),
    totalCapacity: o.totalCapacity,
    totalPrice: o.totalPrice,
    perNightPrice: o.perNightPrice,
    waste: o.waste,
    exactFit: o.exactFit,
  }))

  return { status: result.status, offers }
}

// ─── createOccupancy (Giriş Yap → hemen dolu işaretle) ──────────────────────────

export interface OccupancySlot {
  slotIndex: number
  reservationId: string
  roomNumber: string
  isPrimary: boolean
}

export interface OccupancyResult {
  primaryReservationId: string
  slots: OccupancySlot[]
}

async function requireFrontDesk() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, role: '' }
  const role = (user.user_metadata?.role as string | undefined) ?? ''
  return { user, role }
}

/** Kişileri odalara sırayla (kapasiteye göre) dağıt: her odanın ilk slotu birincil. */
function distribute(
  rooms: { id: string; capacity: number }[],
  guestCount: number
): { roomId: string; slots: number }[] | null {
  const out: { roomId: string; slots: number }[] = []
  let remaining = guestCount
  for (const r of rooms) {
    if (remaining <= 0) {
      out.push({ roomId: r.id, slots: 0 })
      continue
    }
    const take = Math.min(r.capacity, remaining)
    out.push({ roomId: r.id, slots: take })
    remaining -= take
  }
  if (remaining > 0) return null // kapasite yetersiz
  return out
}

export async function createOccupancyAction(input: {
  roomIds: string[]
  checkOut: string
  guestCount: number
}): Promise<{ error?: string; result?: OccupancyResult }> {
  const te = await getTranslations('errors')
  const { user, role } = await requireFrontDesk()
  if (!user) return { error: te('sessionInvalid') }
  if (!FRONT_DESK.has(role)) return { error: te('permissionDenied') }

  const schema = z.object({
    roomIds: z.array(z.string().uuid()).min(1),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guestCount: z.number().int().min(1).max(30),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: te('invalidData') }
  const { roomIds, checkOut, guestCount } = parsed.data

  const today = todayStr()
  if (checkOut <= today) return { error: te('checkOutAfterCheckIn') }

  const service = createServiceClient()

  // Motorla tüm odaları yükle → çakışma (overbooking) + kapasite + fiyat tek yerde
  const bookable = await loadBookableRooms(service, today, checkOut)
  const byId = new Map(bookable.map((r) => [r.id, r]))

  const selected = roomIds.map((id) => byId.get(id))
  if (selected.some((r) => !r)) return { error: te('roomNotFound') }
  const rooms = selected as NonNullable<(typeof selected)[number]>[]
  const conflict = rooms.find((r) => r.state !== 'FREE')
  if (conflict) return { error: te('roomConflict', { code: conflict.roomNumber }) }

  const plan = distribute(rooms.map((r) => ({ id: r.id, capacity: r.capacity })), guestCount)
  if (!plan) return { error: te('capacityInsufficient') }

  const nights = Math.max(1, nightsBetween(today, checkOut))

  const slots: OccupancySlot[] = []
  let primaryReservationId = ''
  let slotIndex = 0

  for (const p of plan) {
    if (p.slots === 0) continue
    const room = rooms.find((r) => r.id === p.roomId)!

    // Yer tutucu birincil misafir (pasaport taranınca güncellenecek)
    const { data: guest, error: guestErr } = await service
      .from('guests')
      .insert({ first_name: '—', last_name: '—' })
      .select('id')
      .single()
    if (guestErr || !guest) return { error: te('guestCreateFailed', { msg: guestErr?.message ?? '' }) }

    const total = room.pricePerNight * nights
    const { data: res, error: resErr } = await service
      .from('reservations')
      .insert({
        guest_id: guest.id,
        room_id: room.id,
        check_in: today,
        check_out: checkOut,
        adults: p.slots,
        children: 0,
        room_rate: room.pricePerNight,
        total_amount: total,
        discount: 0,
        currency: 'UZS',
        status: 'checked_in',
        channel: 'walk_in',
        actual_check_in: new Date().toISOString(),
        registration_pending: true,
      })
      .select('id')
      .single()
    if (resErr || !res) return { error: te('reservationCreateFailed', { msg: resErr?.message ?? '' }) }

    await service.from('rooms').update({ status: 'occupied' }).eq('id', room.id)

    if (!primaryReservationId) primaryReservationId = res.id

    for (let i = 0; i < p.slots; i++) {
      slots.push({
        slotIndex,
        reservationId: res.id,
        roomNumber: room.roomNumber,
        isPrimary: i === 0,
      })
      slotIndex++
    }
  }

  // Anında senkron: Channex + OTA push (env yoksa no-op); guest-site aynı DB'yi realtime okur
  await triggerAvailabilitySync()

  revalidatePath('/dashboard')
  revalidatePath('/reservations')

  return { result: { primaryReservationId, slots } }
}

// ─── attachPassportScan ─────────────────────────────────────────────────────────

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl)
  if (!m) return null
  return { contentType: m[1], buffer: Buffer.from(m[2], 'base64') }
}

export async function attachPassportScanAction(input: {
  reservationId: string
  slotIndex: number
  isPrimary: boolean
  guest: {
    firstName: string
    lastName: string
    nationality?: string
    dateOfBirth?: string
    passportNumber?: string
    passportExpiry?: string
    sex?: string
    mrzRaw?: string
  }
  imageDataUrl?: string
}): Promise<{ error?: string; success?: boolean }> {
  const te = await getTranslations('errors')
  const { user, role } = await requireFrontDesk()
  if (!user) return { error: te('sessionInvalid') }
  if (!FRONT_DESK.has(role)) return { error: te('permissionDenied') }

  const schema = z.object({
    reservationId: z.string().uuid(),
    slotIndex: z.number().int().min(0),
    isPrimary: z.boolean(),
    guest: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      nationality: z.string().optional(),
      dateOfBirth: z.string().optional(),
      passportNumber: z.string().optional(),
      passportExpiry: z.string().optional(),
      sex: z.enum(['M', 'F']).optional().or(z.literal('')),
      mrzRaw: z.string().optional(),
    }),
    imageDataUrl: z.string().optional(),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: te('invalidData') }
  const d = parsed.data

  const service = createServiceClient()

  // Rezervasyonun birincil misafiri
  const { data: res, error: resErr } = await service
    .from('reservations')
    .select('guest_id')
    .eq('id', d.reservationId)
    .single()
  if (resErr || !res) return { error: te('reservationNotFound') }

  const sex = d.guest.sex || null
  const dob = d.guest.dateOfBirth || null

  let scanGuestId: string | null = null

  if (d.isPrimary) {
    scanGuestId = res.guest_id
    const { error: gErr } = await service
      .from('guests')
      .update({
        first_name: d.guest.firstName,
        last_name: d.guest.lastName,
        nationality: d.guest.nationality || null,
        date_of_birth: dob,
        passport_number: d.guest.passportNumber || null,
        passport_expiry: d.guest.passportExpiry || null,
        sex,
        mrz_raw: d.guest.mrzRaw || null,
      })
      .eq('id', res.guest_id)
    if (gErr) return { error: gErr.message }
  } else {
    const { error: cErr } = await service.from('reservation_companions').insert({
      reservation_id: d.reservationId,
      first_name: d.guest.firstName,
      last_name: d.guest.lastName,
      nationality: d.guest.nationality || null,
      date_of_birth: dob,
      passport_number: d.guest.passportNumber || null,
      passport_expiry: d.guest.passportExpiry || null,
      sex,
    })
    if (cErr) return { error: cErr.message }
  }

  // Pasaport görselini private `passports` bucket'a yükle (sadece admin görecek)
  let storagePath: string | null = null
  if (d.imageDataUrl) {
    const parsedImg = dataUrlToBuffer(d.imageDataUrl)
    if (parsedImg) {
      const path = `${d.reservationId}/${d.slotIndex}-${Date.now()}.jpg`
      const { error: upErr } = await service.storage
        .from('passports')
        .upload(path, parsedImg.buffer, { contentType: parsedImg.contentType, upsert: false })
      if (!upErr) storagePath = path
    }
  }

  // Arşiv kaydı (görsel yoksa da MRZ + iz için satır bırakılabilir; yalnızca görsel
  // varsa kaydediyoruz — passport_scans.storage_path NOT NULL)
  if (storagePath) {
    const { data: profile } = await service.from('profiles').select('id').eq('id', user.id).single()
    await service.from('passport_scans').insert({
      reservation_id: d.reservationId,
      guest_id: scanGuestId,
      slot_index: d.slotIndex,
      storage_path: storagePath,
      mrz_raw: d.guest.mrzRaw || null,
      scanned_by: profile ? user.id : null,
    })
  }

  revalidatePath(`/reservations/${d.reservationId}`)
  return { success: true }
}

// ─── createFutureBooking (Rezervasyon Yap → ileri tarihli onaylı) ───────────────

export async function createFutureBookingAction(input: {
  roomIds: string[]
  checkIn: string
  checkOut: string
  guestCount: number
  primary: {
    firstName: string
    lastName: string
    phone?: string
    email?: string
    nationality?: string
    passportNumber?: string
    dateOfBirth?: string
    passportExpiry?: string
    sex?: string
  }
  advanceAmount?: number
  paymentMethod?: 'payme' | 'click' | 'uzum' | 'cash' | 'transfer'
}): Promise<{ error?: string; reservationId?: string }> {
  const te = await getTranslations('errors')
  const { user, role } = await requireFrontDesk()
  if (!user) return { error: te('sessionInvalid') }
  if (!FRONT_DESK.has(role)) return { error: te('permissionDenied') }

  const schema = z.object({
    roomIds: z.array(z.string().uuid()).min(1),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guestCount: z.number().int().min(1).max(30),
    primary: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().optional(),
      nationality: z.string().optional(),
      passportNumber: z.string().optional(),
      dateOfBirth: z.string().optional(),
      passportExpiry: z.string().optional(),
      sex: z.enum(['M', 'F']).optional().or(z.literal('')),
    }),
    advanceAmount: z.number().min(0).optional(),
    paymentMethod: z.enum(['payme', 'click', 'uzum', 'cash', 'transfer']).optional(),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: te('invalidData') }
  const d = parsed.data
  if (d.checkOut <= d.checkIn) return { error: te('checkOutAfterCheckIn') }

  const service = createServiceClient()

  const bookable = await loadBookableRooms(service, d.checkIn, d.checkOut)
  const byId = new Map(bookable.map((r) => [r.id, r]))
  const selected = d.roomIds.map((id) => byId.get(id))
  if (selected.some((r) => !r)) return { error: te('roomNotFound') }
  const rooms = selected as NonNullable<(typeof selected)[number]>[]
  const conflict = rooms.find((r) => r.state !== 'FREE')
  if (conflict) return { error: te('roomConflict', { code: conflict.roomNumber }) }

  const plan = distribute(rooms.map((r) => ({ id: r.id, capacity: r.capacity })), d.guestCount)
  if (!plan) return { error: te('capacityInsufficient') }

  const nights = Math.max(1, nightsBetween(d.checkIn, d.checkOut))

  // Tek misafir kaydı, her oda için bir rezervasyon satırı (guest-site combo deseni)
  const { data: guest, error: guestErr } = await service
    .from('guests')
    .insert({
      first_name: d.primary.firstName,
      last_name: d.primary.lastName,
      phone: d.primary.phone || null,
      email: d.primary.email || null,
      nationality: d.primary.nationality || null,
      passport_number: d.primary.passportNumber || null,
      date_of_birth: d.primary.dateOfBirth || null,
      passport_expiry: d.primary.passportExpiry || null,
      sex: d.primary.sex || null,
    })
    .select('id')
    .single()
  if (guestErr || !guest) return { error: te('guestCreateFailed', { msg: guestErr?.message ?? '' }) }

  let firstReservationId = ''
  for (const p of plan) {
    if (p.slots === 0) continue
    const room = rooms.find((r) => r.id === p.roomId)!
    const total = room.pricePerNight * nights
    const { data: res, error: resErr } = await service
      .from('reservations')
      .insert({
        guest_id: guest.id,
        room_id: room.id,
        check_in: d.checkIn,
        check_out: d.checkOut,
        adults: p.slots,
        children: 0,
        room_rate: room.pricePerNight,
        total_amount: total,
        discount: 0,
        currency: 'UZS',
        status: 'confirmed',
        channel: 'direct',
      })
      .select('id')
      .single()
    if (resErr || !res) return { error: te('reservationCreateFailed', { msg: resErr?.message ?? '' }) }
    if (!firstReservationId) firstReservationId = res.id
  }

  // Ön ödeme (opsiyonel) — birincil rezervasyona
  if (d.advanceAmount && d.advanceAmount > 0 && d.paymentMethod && firstReservationId) {
    await service.from('payments').insert({
      reservation_id: firstReservationId,
      amount: d.advanceAmount,
      currency: 'UZS',
      method: d.paymentMethod,
      status: 'completed',
      paid_at: new Date().toISOString(),
    })
  }

  await triggerAvailabilitySync()

  revalidatePath('/dashboard')
  revalidatePath('/reservations')
  return { reservationId: firstReservationId }
}

// ─── completeRegistration (yarı kayıt → tam kayıt) ──────────────────────────────

export async function completeRegistrationAction(
  reservationId: string
): Promise<{ error?: string; success?: boolean }> {
  const te = await getTranslations('errors')
  const { user, role } = await requireFrontDesk()
  if (!user) return { error: te('sessionInvalid') }
  if (!FRONT_DESK.has(role)) return { error: te('permissionDenied') }
  if (!z.string().uuid().safeParse(reservationId).success) return { error: te('invalidData') }

  const service = createServiceClient()
  const { error } = await service
    .from('reservations')
    .update({ registration_pending: false })
    .eq('id', reservationId)
  if (error) return { error: error.message }

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/dashboard')
  return { success: true }
}
