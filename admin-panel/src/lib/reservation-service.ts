// ─────────────────────────────────────────────────────────────────────────────
// Shared reservation-creation core (server-only, plain module — NOT 'use server')
//
// Every admin path that creates reservations goes through createReservationCore:
//   - /reservations/new  → standard form + walk-in form
//   - dashboard room panel → createOccupancyAction + createFutureBookingAction
//
// It owns: room load via the availability engine (conflict + capacity +
// effective price from rooms_with_effective_price — NEVER raw base_price),
// guest insert, adults distribution, per-room reservation rows, companions,
// optional advance payment, room-status side effects for immediate check-ins,
// and the final Channex availability push.
//
// Errors come back as translation keys (errors.* namespace) + params so the
// calling server action translates them for the active locale.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadBookableRooms, nightsBetween, type BookableRoom } from './availability'
import { triggerAvailabilitySync } from './channex-sync'

export interface ReservationGuestInput {
  firstName: string
  lastName: string
  phone?: string | null
  email?: string | null
  nationality?: string | null
  passportNumber?: string | null
  dateOfBirth?: string | null
  passportExpiry?: string | null
  sex?: string | null
}

export interface ReservationCompanionInput {
  firstName: string
  lastName: string
  nationality?: string | null
  dateOfBirth?: string | null
  relationship?: string | null
  marriageCertShown?: boolean
}

export interface CreateReservationInput {
  roomIds: string[]
  checkIn: string // YYYY-MM-DD
  checkOut: string // YYYY-MM-DD
  guestCount: number
  status: 'pending' | 'confirmed' | 'checked_in'
  channel: string
  /** One guest record shared by all rooms. null → a '—' placeholder guest per room (half registration). */
  guest: ReservationGuestInput | null
  registrationPending?: boolean
  breakfastIncluded?: boolean
  expectedCheckInTime?: string | null
  specialRequests?: string | null
  /** Attached to the primary reservation only. */
  companions?: ReservationCompanionInput[]
  /** Optional advance payment, attached to the primary reservation. */
  advance?: { amount: number; method: string; receivedBy?: string | null } | null
}

export interface PerRoomReservation {
  reservationId: string
  roomId: string
  roomNumber: string
  adults: number
  pricePerNight: number
}

export type CreateReservationResult =
  | {
      ok: true
      primaryReservationId: string
      guestId: string | null
      perRoom: PerRoomReservation[]
    }
  | {
      ok: false
      errorKey:
        | 'invalidData'
        | 'checkOutAfterCheckIn'
        | 'roomNotFound'
        | 'roomConflict'
        | 'capacityInsufficient'
        | 'guestCreateFailed'
        | 'reservationCreateFailed'
      params?: Record<string, string>
    }

/** Postgres exclusion-constraint violation (migration 019 no-overlap) — the DB-level overbooking guard. */
export function isOverlapViolation(err: { code?: string | null } | null | undefined): boolean {
  return err?.code === '23P01'
}

/**
 * Distribute guests across rooms in order (by capacity).
 * Returns null when the combined capacity is insufficient.
 */
export function allocateAdults(
  rooms: { id: string; capacity: number }[],
  guestCount: number
): { roomId: string; adults: number }[] | null {
  const out: { roomId: string; adults: number }[] = []
  let remaining = guestCount
  for (const r of rooms) {
    if (remaining <= 0) {
      out.push({ roomId: r.id, adults: 0 })
      continue
    }
    const take = Math.min(r.capacity, remaining)
    out.push({ roomId: r.id, adults: take })
    remaining -= take
  }
  if (remaining > 0) return null
  return out
}

export async function createReservationCore(
  service: SupabaseClient,
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  if (input.roomIds.length === 0 || input.guestCount < 1) {
    return { ok: false, errorKey: 'invalidData' }
  }
  if (input.checkOut <= input.checkIn) {
    return { ok: false, errorKey: 'checkOutAfterCheckIn' }
  }

  // Availability engine = single source for conflicts + capacity + effective price
  const bookable = await loadBookableRooms(service, input.checkIn, input.checkOut)
  const byId = new Map(bookable.map((r) => [r.id, r]))

  const selected: BookableRoom[] = []
  for (const id of input.roomIds) {
    const room = byId.get(id)
    if (!room) return { ok: false, errorKey: 'roomNotFound' }
    selected.push(room)
  }

  const conflict = selected.find((r) => r.state !== 'FREE')
  if (conflict) {
    return { ok: false, errorKey: 'roomConflict', params: { code: conflict.roomNumber } }
  }

  const plan = allocateAdults(
    selected.map((r) => ({ id: r.id, capacity: r.capacity })),
    input.guestCount
  )
  if (!plan) return { ok: false, errorKey: 'capacityInsufficient' }

  const nights = Math.max(1, nightsBetween(input.checkIn, input.checkOut))
  const nowIso = new Date().toISOString()
  const isCheckIn = input.status === 'checked_in'

  // Shared guest (when provided) — one record for all rooms
  let sharedGuestId: string | null = null
  if (input.guest) {
    const g = input.guest
    const { data: guest, error: guestErr } = await service
      .from('guests')
      .insert({
        first_name: g.firstName,
        last_name: g.lastName,
        phone: g.phone || null,
        email: g.email || null,
        nationality: g.nationality || null,
        passport_number: g.passportNumber || null,
        date_of_birth: g.dateOfBirth || null,
        passport_expiry: g.passportExpiry || null,
        sex: g.sex || null,
      })
      .select('id')
      .single()
    if (guestErr || !guest) {
      return { ok: false, errorKey: 'guestCreateFailed', params: { msg: guestErr?.message ?? '' } }
    }
    sharedGuestId = guest.id
  }

  const perRoom: PerRoomReservation[] = []
  let primaryReservationId = ''

  for (const p of plan) {
    if (p.adults === 0) continue
    const room = selected.find((r) => r.id === p.roomId)!

    let guestId = sharedGuestId
    if (!guestId) {
      // Placeholder guest per room (updated once a passport is scanned)
      const { data: guest, error: guestErr } = await service
        .from('guests')
        .insert({ first_name: '—', last_name: '—' })
        .select('id')
        .single()
      if (guestErr || !guest) {
        return { ok: false, errorKey: 'guestCreateFailed', params: { msg: guestErr?.message ?? '' } }
      }
      guestId = guest.id
    }

    const { data: res, error: resErr } = await service
      .from('reservations')
      .insert({
        guest_id: guestId,
        room_id: room.id,
        check_in: input.checkIn,
        check_out: input.checkOut,
        adults: p.adults,
        children: 0,
        room_rate: room.pricePerNight,
        total_amount: room.pricePerNight * nights,
        discount: 0,
        currency: 'UZS',
        status: input.status,
        channel: input.channel,
        special_requests: input.specialRequests || null,
        breakfast_included: input.breakfastIncluded ?? false,
        expected_check_in_time: input.expectedCheckInTime || null,
        ...(isCheckIn ? { actual_check_in: nowIso } : {}),
        ...(input.registrationPending ? { registration_pending: true } : {}),
      })
      .select('id')
      .single()

    if (resErr || !res) {
      // The DB EXCLUDE constraint (019) catches races the app-level check missed
      if (isOverlapViolation(resErr)) {
        return { ok: false, errorKey: 'roomConflict', params: { code: room.roomNumber } }
      }
      return { ok: false, errorKey: 'reservationCreateFailed', params: { msg: resErr?.message ?? '' } }
    }

    if (isCheckIn) {
      await service.from('rooms').update({ status: 'occupied' }).eq('id', room.id)
    }

    if (!primaryReservationId) primaryReservationId = res.id
    perRoom.push({
      reservationId: res.id,
      roomId: room.id,
      roomNumber: room.roomNumber,
      adults: p.adults,
      pricePerNight: room.pricePerNight,
    })
  }

  // Companions → primary reservation
  if (primaryReservationId && input.companions && input.companions.length > 0) {
    await service.from('reservation_companions').insert(
      input.companions.map((c) => ({
        reservation_id: primaryReservationId,
        first_name: c.firstName,
        last_name: c.lastName,
        nationality: c.nationality || null,
        date_of_birth: c.dateOfBirth || null,
        relationship: c.relationship || null,
        marriage_cert_shown: c.marriageCertShown ?? false,
      }))
    )
  }

  // Advance payment → primary reservation
  if (primaryReservationId && input.advance && input.advance.amount > 0) {
    await service.from('payments').insert({
      reservation_id: primaryReservationId,
      amount: input.advance.amount,
      currency: 'UZS',
      method: input.advance.method,
      status: 'completed',
      paid_at: nowIso,
      received_by: input.advance.receivedBy ?? null,
    })
  }

  // Channex: push availability immediately (no-op without env)
  await triggerAvailabilitySync()

  return { ok: true, primaryReservationId, guestId: sharedGuestId, perRoom }
}
