'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase'
import { requireRole } from '@/lib/require-role'
import { triggerAvailabilitySync } from '@/lib/channex-sync'
import { loadBookableRooms, nightsBetween } from '@/lib/availability'
import { isOverlapViolation } from '@/lib/reservation-service'
import type { ReservationStatus } from '@/types/hotel'

const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in'] as const

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Edit reservation ────────────────────────────────────────────────────────

const ISSUE_KEY: Record<string, string> = {
  checkIn: 'invalidDate',
  checkOut: 'invalidDate',
  roomRate: 'pricePositive',
}

const updateResSchema = z.object({
  checkIn:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults:               z.coerce.number().int().min(1).max(10),
  roomRate:             z.coerce.number().positive(),
  specialRequests:      z.string().max(1000).optional(),
  notes:                z.string().max(1000).optional(),
  breakfastIncluded:    z.string().optional().transform(v => v === 'on'),
  expectedCheckInTime:  z.string().optional(),
  mayExtend:            z.string().optional().transform(v => v === 'on'),
})

export type UpdateResState = { error?: string; success?: boolean }

export async function updateReservationAction(
  reservationId: string,
  formData: FormData
): Promise<UpdateResState> {
  const te = await getTranslations('errors')
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }

  const parsed = updateResSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const key = parsed.error.issues[0].path[0]?.toString()
    return { error: te(ISSUE_KEY[key ?? ''] ?? 'invalidDate') }
  }

  const d = parsed.data
  if (d.checkOut <= d.checkIn) return { error: te('checkOutAfterCheckIn') }

  const nights = Math.round(
    (new Date(d.checkOut).getTime() - new Date(d.checkIn).getTime()) / 86400000
  )
  const totalAmount = d.roomRate * nights

  const service = createServiceClient()

  // Re-check conflicts for the new dates (excluding this reservation) so the
  // user gets a friendly message instead of a raw DB constraint error.
  const { data: current } = await service
    .from('reservations')
    .select('room_id')
    .eq('id', reservationId)
    .single()
  if (!current) return { error: te('reservationNotFound') }

  const { data: conflicts } = await service
    .from('reservations')
    .select('id')
    .eq('room_id', current.room_id)
    .neq('id', reservationId)
    .in('status', [...ACTIVE_STATUSES])
    .lt('check_in', d.checkOut)
    .gt('check_out', d.checkIn)
  if (conflicts && conflicts.length > 0) return { error: te('roomConflictDates') }

  const { error } = await service
    .from('reservations')
    .update({
      check_in:                d.checkIn,
      check_out:               d.checkOut,
      adults:                  d.adults,
      // nights: GENERATED ALWAYS AS (check_out - check_in) STORED — not written here
      room_rate:               d.roomRate,
      total_amount:            totalAmount,
      special_requests:        d.specialRequests || null,
      notes:                   d.notes || null,
      breakfast_included:      d.breakfastIncluded ?? false,
      expected_check_in_time:  d.expectedCheckInTime || null,
      may_extend:              d.mayExtend ?? false,
    })
    .eq('id', reservationId)

  if (error) {
    // Race: the DB EXCLUDE constraint (019) caught an overlap the check missed
    if (isOverlapViolation(error)) return { error: te('roomConflictDates') }
    return { error: error.message }
  }

  await triggerAvailabilitySync()

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/reservations')
  revalidatePath('/dashboard')
  return { success: true }
}

// ─── Cancel payment (never hard-delete — keep an audit trail) ─────────────────

export async function cancelPaymentAction(
  paymentId: string,
  reservationId: string
): Promise<{ error?: string }> {
  const auth = await requireRole('admin', 'accountant', 'receptionist')
  if (!auth.ok) return { error: auth.error }

  // Payments are never deleted (accounting integrity). Mark as refunded + who/when.
  const service = createServiceClient()
  const { error } = await service
    .from('payments')
    .update({
      status: 'refunded',
      cancelled_at: new Date().toISOString(),
      cancelled_by: auth.userId,
    })
    .eq('id', paymentId)
  if (error) return { error: error.message }

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/payments')
  return {}
}

// ─── Update status ───────────────────────────────────────────────────────────

export async function updateReservationStatusAction(
  reservationId: string,
  newStatus: ReservationStatus
): Promise<{ error?: string }> {
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }

  const service = createServiceClient()

  const update: Record<string, string> = { status: newStatus }
  if (newStatus === 'checked_in') update.actual_check_in = new Date().toISOString()
  if (newStatus === 'checked_out') update.actual_check_out = new Date().toISOString()

  const { error } = await service
    .from('reservations')
    .update(update)
    .eq('id', reservationId)

  if (error) return { error: error.message }

  // Update room status
  const { data: res } = await service
    .from('reservations')
    .select('room_id')
    .eq('id', reservationId)
    .single()

  if (res?.room_id) {
    if (newStatus === 'checked_in') {
      await service.from('rooms').update({ status: 'occupied' }).eq('id', res.room_id)
    } else if (newStatus === 'checked_out') {
      await service.from('rooms').update({ status: 'available', cleaning_status: 'dirty' }).eq('id', res.room_id)
    } else if (newStatus === 'cancelled' || newStatus === 'no_show') {
      await service.from('rooms').update({ status: 'available' }).eq('id', res.room_id)
    }
  }

  await triggerAvailabilitySync()

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/reservations')
  revalidatePath('/dashboard')
  return {}
}

// ─── Save payment ────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(['payme', 'click', 'uzum', 'cash', 'transfer', 'card']),
  revenue_category: z.enum(['accommodation', 'breakfast', 'extra_service', 'deposit', 'other']).default('accommodation'),
  notes: z.string().optional(),
  fiscal_url: z.string().optional(),
})

/** Soliq (OFD) chek havolasidan strukturani ajratadi; yaroqsiz boʻlsa null. */
function parseFiscal(raw?: string): { url: string; receiptId: string | null; scannedAt: string } | null {
  const text = raw?.trim()
  if (!text) return null
  try {
    const u = new URL(text)
    if (!/(^|\.)soliq\.uz$/i.test(u.hostname)) return null
    return { url: text, receiptId: u.searchParams.get('r'), scannedAt: new Date().toISOString() }
  } catch {
    return null
  }
}

export type AddPaymentState = { error?: string; fieldErrors?: Record<string, string>; success?: boolean }

export async function addPaymentAction(
  reservationId: string,
  _prev: AddPaymentState,
  formData: FormData
): Promise<AddPaymentState> {
  const te = await getTranslations('errors')
  const auth = await requireRole('admin', 'receptionist', 'accountant')
  if (!auth.ok) return { error: auth.error }

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString()
      if (key) fieldErrors[key] = te('amountPositive')
    }
    return { fieldErrors }
  }

  const service = createServiceClient()

  // If the user has a profile, record received_by (otherwise null)
  const { data: profile } = await service.from('profiles').select('id').eq('id', auth.userId).single()

  const fiscal = parseFiscal(parsed.data.fiscal_url)

  // Fiş alanları yalnızca değer varsa yazılır; böylece 029 migration'ı henüz
  // uygulanmamış olsa bile normal ödeme kaydı (fişsiz) çalışmaya devam eder.
  const row: Record<string, unknown> = {
    reservation_id: reservationId,
    amount: parsed.data.amount,
    currency: 'UZS',
    method: parsed.data.method,
    revenue_category: parsed.data.revenue_category,
    status: 'completed',
    paid_at: new Date().toISOString(),
    received_by: profile ? auth.userId : null,
    notes: parsed.data.notes || null,
  }
  if (fiscal) {
    row.fiscal_url = fiscal.url
    row.fiscal_receipt_id = fiscal.receiptId
    row.fiscal_scanned_at = fiscal.scannedAt
  }

  const { error } = await service.from('payments').insert(row)

  if (error) return { error: error.message }

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/payments')
  return { success: true }
}

// ─── Stay tools: room move + extension ───────────────────────────────────────
// MVP semantics (owner-approved): a move updates room_id on the SAME record
// (no split rows / per-room night history); the rate stays as-is and can be
// edited separately. An extension first tries the current room; if it is
// booked, the UI offers alternative rooms that are free for the whole
// remaining window (move now + extend).

export interface MoveTarget {
  roomId: string
  roomNumber: string
  pricePerNight: number
  capacity: number
}

interface StayRow {
  id: string
  room_id: string
  check_in: string
  check_out: string
  status: string
  adults: number
  room_rate: number
  notes: string | null
  rooms: { room_number: string } | null
}

async function loadStay(
  service: ReturnType<typeof createServiceClient>,
  reservationId: string
): Promise<StayRow | null> {
  const { data } = await service
    .from('reservations')
    .select('id, room_id, check_in, check_out, status, adults, room_rate, notes, rooms(room_number)')
    .eq('id', reservationId)
    .single()
  return (data as unknown as StayRow) ?? null
}

/** The remaining occupancy window: from today for in-house stays, else from check-in. */
function stayWindowStart(stay: StayRow): string {
  const today = todayStr()
  return stay.status === 'checked_in' && stay.check_in < today ? today : stay.check_in
}

/**
 * Rooms this stay could move into (free for the whole remaining window,
 * big enough for the party). Also used to offer alternatives when extending.
 */
export async function getMoveTargetsAction(
  reservationId: string,
  newCheckOut?: string
): Promise<{ error?: string; targets?: MoveTarget[] }> {
  const te = await getTranslations('errors')
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }
  if (!z.string().uuid().safeParse(reservationId).success) return { error: te('invalidData') }

  const service = createServiceClient()
  const stay = await loadStay(service, reservationId)
  if (!stay || !(ACTIVE_STATUSES as readonly string[]).includes(stay.status)) {
    return { error: te('reservationNotFound') }
  }

  const windowEnd = newCheckOut && newCheckOut > stay.check_out ? newCheckOut : stay.check_out
  const rooms = await loadBookableRooms(service, stayWindowStart(stay), windowEnd)

  const targets = rooms
    .filter((r) => r.id !== stay.room_id && r.state === 'FREE' && r.capacity >= stay.adults)
    .sort((a, b) => a.pricePerNight - b.pricePerNight)
    .map((r) => ({
      roomId: r.id,
      roomNumber: r.roomNumber,
      pricePerNight: r.pricePerNight,
      capacity: r.capacity,
    }))

  return { targets }
}

export async function moveRoomAction(
  reservationId: string,
  newRoomId: string,
  newCheckOut?: string
): Promise<{ error?: string; success?: boolean }> {
  const te = await getTranslations('errors')
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }
  if (
    !z.string().uuid().safeParse(reservationId).success ||
    !z.string().uuid().safeParse(newRoomId).success ||
    (newCheckOut !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(newCheckOut))
  ) {
    return { error: te('invalidData') }
  }

  const service = createServiceClient()
  const stay = await loadStay(service, reservationId)
  if (!stay || !(ACTIVE_STATUSES as readonly string[]).includes(stay.status)) {
    return { error: te('reservationNotFound') }
  }
  if (newRoomId === stay.room_id) return { error: te('invalidData') }

  const targetCheckOut = newCheckOut && newCheckOut > stay.check_out ? newCheckOut : stay.check_out
  const windowStart = stayWindowStart(stay)

  const rooms = await loadBookableRooms(service, windowStart, targetCheckOut)
  const target = rooms.find((r) => r.id === newRoomId)
  if (!target) return { error: te('roomNotFound') }
  if (target.state !== 'FREE') return { error: te('roomConflict', { code: target.roomNumber }) }
  if (target.capacity < stay.adults) return { error: te('capacityInsufficient') }

  const nights = Math.max(1, nightsBetween(stay.check_in, targetCheckOut))
  const moveNote = `${stay.rooms?.room_number ?? '?'} → ${target.roomNumber} (${todayStr()})`

  const { error } = await service
    .from('reservations')
    .update({
      room_id: newRoomId,
      check_out: targetCheckOut,
      total_amount: stay.room_rate * nights,
      notes: stay.notes ? `${stay.notes}\n${moveNote}` : moveNote,
    })
    .eq('id', reservationId)

  if (error) {
    if (isOverlapViolation(error)) return { error: te('roomConflict', { code: target.roomNumber }) }
    return { error: error.message }
  }

  // Room status side effects only when the guest is physically in-house
  if (stay.status === 'checked_in') {
    await service.from('rooms').update({ status: 'available', cleaning_status: 'dirty' }).eq('id', stay.room_id)
    await service.from('rooms').update({ status: 'occupied' }).eq('id', newRoomId)
  }

  await triggerAvailabilitySync()

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/reservations')
  revalidatePath('/dashboard')
  return { success: true }
}

export type ExtendStayResult = {
  error?: string
  success?: boolean
  /** Set when the current room is booked: rooms free for the whole remaining window. */
  alternatives?: MoveTarget[]
}

export async function extendStayAction(
  reservationId: string,
  newCheckOut: string
): Promise<ExtendStayResult> {
  const te = await getTranslations('errors')
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }
  if (
    !z.string().uuid().safeParse(reservationId).success ||
    !/^\d{4}-\d{2}-\d{2}$/.test(newCheckOut)
  ) {
    return { error: te('invalidData') }
  }

  const service = createServiceClient()
  const stay = await loadStay(service, reservationId)
  if (!stay || !(ACTIVE_STATUSES as readonly string[]).includes(stay.status)) {
    return { error: te('reservationNotFound') }
  }
  if (newCheckOut <= stay.check_out) return { error: te('checkOutAfterCheckIn') }

  // Is the current room free for the added nights?
  const { data: conflicts } = await service
    .from('reservations')
    .select('id')
    .eq('room_id', stay.room_id)
    .neq('id', reservationId)
    .in('status', [...ACTIVE_STATUSES])
    .lt('check_in', newCheckOut)
    .gt('check_out', stay.check_out)

  if (conflicts && conflicts.length > 0) {
    // Blocked → offer rooms that are free for the WHOLE remaining window (move + extend)
    const alt = await getMoveTargetsAction(reservationId, newCheckOut)
    return { alternatives: alt.targets ?? [] }
  }

  const nights = Math.max(1, nightsBetween(stay.check_in, newCheckOut))
  const { error } = await service
    .from('reservations')
    .update({ check_out: newCheckOut, total_amount: stay.room_rate * nights })
    .eq('id', reservationId)

  if (error) {
    if (isOverlapViolation(error)) return { error: te('roomConflictDates') }
    return { error: error.message }
  }

  await triggerAvailabilitySync()

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/reservations')
  revalidatePath('/dashboard')
  return { success: true }
}
