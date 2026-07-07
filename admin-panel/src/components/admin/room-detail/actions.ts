'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard room panel — server actions
//
// getRoomDetailAction        → on panel open: room + active stay + history
// createOccupancyAction       → "Check in": mark room(s) occupied NOW (half registration)
// attachPassportScanAction    → save a scanned passport (image goes to the private bucket)
// createFutureBookingAction   → "Book": confirmed future-dated reservation
// completeRegistrationAction  → mark a half registration as fully registered
//
// Conflict (overbooking) detection reuses the availability engine's
// loadBookableRooms — so it applies the same logic as combination offers.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { requireRole } from '@/lib/require-role'
import { findAvailability, nightsBetween } from '@/lib/availability'
import { createReservationCore } from '@/lib/reservation-service'

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Returned types ────────────────────────────────────────────────────────────

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

  // Reservations for this room (active + past), newest first
  const { data: resData } = await service
    .from('reservations')
    .select('id, reservation_code, status, check_in, check_out, adults, children, nights, total_amount, breakfast_included, registration_pending, may_extend, guests(first_name, last_name)')
    .eq('room_id', roomId)
    .order('check_in', { ascending: false })
    .limit(60)

  const rows = (resData ?? []) as unknown as ResRow[]

  // Payment totals (completed) in a single query
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

  // Active stay: checked_in and today within the range
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

  // History: finished/past stays, excluding the active one
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

// ─── getRoomOffers (combination offers, serializable to the client) ─────────────

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
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }

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

// ─── createOccupancy ("Check in" → mark occupied immediately) ───────────────────

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

export async function createOccupancyAction(input: {
  roomIds: string[]
  checkOut: string
  guestCount: number
}): Promise<{ error?: string; result?: OccupancyResult }> {
  const te = await getTranslations('errors')
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }

  const schema = z.object({
    roomIds: z.array(z.string().uuid()).min(1),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guestCount: z.number().int().min(1).max(30),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: te('invalidData') }
  const { roomIds, checkOut, guestCount } = parsed.data

  const today = todayStr()
  const service = createServiceClient()

  // Shared core: conflicts + capacity + effective price + room status + Channex push
  const result = await createReservationCore(service, {
    roomIds,
    checkIn: today,
    checkOut,
    guestCount,
    status: 'checked_in',
    channel: 'walk_in',
    guest: null, // placeholder guest per room — filled by passport scans
    registrationPending: true,
  })
  if (!result.ok) return { error: te(result.errorKey, result.params) }

  const slots: OccupancySlot[] = []
  let slotIndex = 0
  for (const r of result.perRoom) {
    for (let i = 0; i < r.adults; i++) {
      slots.push({
        slotIndex,
        reservationId: r.reservationId,
        roomNumber: r.roomNumber,
        isPrimary: i === 0,
      })
      slotIndex++
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/reservations')

  return { result: { primaryReservationId: result.primaryReservationId, slots } }
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
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }

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

  // Upload the passport image to the private `passports` bucket (admin-only access)
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

  // Archive record (we only insert when there is an image —
  // passport_scans.storage_path is NOT NULL)
  if (storagePath) {
    const { data: profile } = await service.from('profiles').select('id').eq('id', auth.userId).single()
    await service.from('passport_scans').insert({
      reservation_id: d.reservationId,
      guest_id: scanGuestId,
      slot_index: d.slotIndex,
      storage_path: storagePath,
      mrz_raw: d.guest.mrzRaw || null,
      scanned_by: profile ? auth.userId : null,
    })
  }

  revalidatePath(`/reservations/${d.reservationId}`)
  return { success: true }
}

// ─── createFutureBooking ("Book" → confirmed future-dated) ──────────────────────

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
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }

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

  const service = createServiceClient()

  // Shared core: one guest record, one reservation row per room + Channex push
  const result = await createReservationCore(service, {
    roomIds: d.roomIds,
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    guestCount: d.guestCount,
    status: 'confirmed',
    channel: 'direct',
    guest: d.primary,
    advance:
      d.advanceAmount && d.advanceAmount > 0 && d.paymentMethod
        ? { amount: d.advanceAmount, method: d.paymentMethod, receivedBy: auth.userId }
        : null,
  })
  if (!result.ok) return { error: te(result.errorKey, result.params) }

  revalidatePath('/dashboard')
  revalidatePath('/reservations')
  return { reservationId: result.primaryReservationId }
}

// ─── completeRegistration (half registration → full registration) ───────────────

export async function completeRegistrationAction(
  reservationId: string
): Promise<{ error?: string; success?: boolean }> {
  const te = await getTranslations('errors')
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }
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
