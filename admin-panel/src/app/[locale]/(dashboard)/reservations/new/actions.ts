'use server'

import { z } from 'zod'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

// Field → error translation key (resolved at runtime for i18n)
const FIELD_ERROR_KEY: Record<string, string> = {
  firstName: 'firstNameRequired',
  lastName: 'lastNameRequired',
  roomId: 'roomRequired',
  checkIn: 'checkInRequired',
  checkOut: 'checkOutRequired',
  adults: 'adultsMin',
}

const schema = z.object({
  firstName:            z.string().min(1),
  lastName:             z.string().min(1),
  phone:                z.string().optional(),
  email:                z.string().optional(),
  nationality:          z.string().optional(),
  passportNumber:       z.string().optional(),
  roomId:               z.string().uuid(),
  checkIn:              z.string().min(1),
  checkOut:             z.string().min(1),
  adults:               z.coerce.number().int().min(1).max(8),
  specialRequests:      z.string().optional(),
  advanceAmount:        z.coerce.number().min(0).optional(),
  paymentMethod:        z.enum(['payme', 'click', 'uzum', 'cash', 'transfer']).optional(),
  breakfastIncluded:    z.string().optional().transform(v => v === 'on'),
  expectedCheckInTime:  z.string().optional(),
})

export type ReservationFormState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
  reservationId?: string  // success: for client router.push()
}

export async function createReservationAction(
  _prev: ReservationFormState,
  formData: FormData
): Promise<ReservationFormState> {
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString()
      if (key) fieldErrors[key] = te(FIELD_ERROR_KEY[key] ?? 'invalidDate')
    }
    return { fieldErrors }
  }

  const d = parsed.data

  if (d.checkIn >= d.checkOut) {
    return { error: te('checkOutAfterCheckIn') }
  }

  const service = createServiceClient()

  // Fetch room price
  const { data: roomData, error: roomErr } = await service
    .from('rooms')
    .select('id, room_number, room_types(base_price)')
    .eq('id', d.roomId)
    .eq('is_active', true)
    .single()

  if (roomErr || !roomData) {
    return { error: te('roomNotFound') }
  }

  const roomTypes = roomData.room_types as unknown as { base_price: number } | null
  const roomRate = roomTypes?.base_price ?? 0

  // Conflict check (overbooking prevention)
  const { data: conflicts } = await service
    .from('reservations')
    .select('id, reservation_code')
    .eq('room_id', d.roomId)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .lt('check_in', d.checkOut)
    .gt('check_out', d.checkIn)

  if (conflicts && conflicts.length > 0) {
    return {
      error: te('roomConflict', { code: conflicts[0].reservation_code }),
    }
  }

  const nights = Math.round(
    (new Date(d.checkOut).getTime() - new Date(d.checkIn).getTime()) / 86400000
  )
  const totalAmount = roomRate * nights

  // Create guest
  const { data: guest, error: guestErr } = await service
    .from('guests')
    .insert({
      first_name:      d.firstName,
      last_name:       d.lastName,
      phone:           d.phone || null,
      email:           d.email || null,
      nationality:     d.nationality || null,
      passport_number: d.passportNumber || null,
    })
    .select('id')
    .single()

  if (guestErr || !guest) {
    return { error: te('guestCreateFailed', { msg: guestErr?.message ?? te('unknownError') }) }
  }

  // Create reservation
  const { data: reservation, error: resErr } = await service
    .from('reservations')
    .insert({
      guest_id:                guest.id,
      room_id:                 d.roomId,
      check_in:                d.checkIn,
      check_out:               d.checkOut,
      adults:                  d.adults,
      children:                0,
      room_rate:               roomRate,
      total_amount:            totalAmount,
      discount:                0,
      currency:                'UZS',
      special_requests:        d.specialRequests || null,
      status:                  'confirmed',
      channel:                 'direct',
      breakfast_included:      d.breakfastIncluded ?? false,
      expected_check_in_time:  d.expectedCheckInTime || null,
    })
    .select('id')
    .single()

  if (resErr || !reservation) {
    return { error: te('reservationCreateFailed', { msg: resErr?.message ?? te('unknownError') }) }
  }

  // Prepayment record (optional)
  if (d.advanceAmount && d.advanceAmount > 0 && d.paymentMethod) {
    await service.from('payments').insert({
      reservation_id: reservation.id,
      amount:         d.advanceAmount,
      currency:       'UZS',
      method:         d.paymentMethod,
      status:         'completed',
      paid_at:        new Date().toISOString(),
    })
  }

  // Return reservationId instead of redirect()
  return { reservationId: reservation.id }
}
