'use server'

import { z } from 'zod'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase'
import { requireRole } from '@/lib/require-role'
import {
  createReservationCore,
  type ReservationCompanionInput,
} from '@/lib/reservation-service'

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
  dateOfBirth:          z.string().optional(),
  passportExpiry:       z.string().optional(),
  sex:                  z.enum(['M', 'F']).optional().or(z.literal('')),
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
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }

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
  const service = createServiceClient()

  const result = await createReservationCore(service, {
    roomIds: [d.roomId],
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    guestCount: d.adults,
    status: 'confirmed',
    channel: 'direct',
    guest: {
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone,
      email: d.email,
      nationality: d.nationality,
      passportNumber: d.passportNumber,
      dateOfBirth: d.dateOfBirth,
      passportExpiry: d.passportExpiry,
      sex: d.sex,
    },
    specialRequests: d.specialRequests,
    breakfastIncluded: d.breakfastIncluded,
    expectedCheckInTime: d.expectedCheckInTime,
    advance:
      d.advanceAmount && d.advanceAmount > 0 && d.paymentMethod
        ? { amount: d.advanceAmount, method: d.paymentMethod, receivedBy: auth.userId }
        : null,
  })

  if (!result.ok) return { error: te(result.errorKey, result.params) }

  // Return reservationId instead of redirect()
  return { reservationId: result.primaryReservationId }
}

// ─── Walk-in action ───────────────────────────────────────────────────────────

const walkInSchema = z.object({
  roomId:           z.string().uuid(),
  checkOut:         z.string().min(1),
  adults:           z.coerce.number().int().min(1).max(20),
  breakfastIncluded: z.string().optional().transform(v => v === 'on'),
  specialRequests:  z.string().optional(),
  advanceAmount:    z.coerce.number().min(0).optional(),
  paymentMethod:    z.enum(['payme', 'click', 'uzum', 'cash', 'transfer']).optional(),
  guestCount:       z.coerce.number().int().min(1).max(20),
  // Primary guest fields (prefixed with guest_0_)
  guest_0_firstName:     z.string().min(1),
  guest_0_lastName:      z.string().min(1),
  guest_0_nationality:   z.string().optional(),
  guest_0_dateOfBirth:   z.string().optional(),
  guest_0_phone:         z.string().optional(),
  guest_0_passportNumber: z.string().optional(),
  guest_0_passportExpiry: z.string().optional(),
  guest_0_sex:           z.enum(['M', 'F']).optional().or(z.literal('')),
})

export type WalkInFormState = {
  error?: string
  reservationId?: string
}

export async function createWalkInAction(
  _prev: WalkInFormState,
  formData: FormData
): Promise<WalkInFormState> {
  const te = await getTranslations('errors')
  const auth = await requireRole('admin', 'receptionist')
  if (!auth.ok) return { error: auth.error }

  const parsed = walkInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return { error: firstIssue?.message ?? te('invalidData') }
  }

  const d = parsed.data
  const today = new Date().toISOString().split('T')[0]

  // Companion records (guests 2..N) from dynamic form fields
  const companions: ReservationCompanionInput[] = []
  for (let i = 1; i < d.guestCount; i++) {
    const firstName = formData.get(`guest_${i}_firstName`)?.toString()
    const lastName  = formData.get(`guest_${i}_lastName`)?.toString()
    if (!firstName || !lastName) continue
    companions.push({
      firstName,
      lastName,
      nationality:       formData.get(`guest_${i}_nationality`)?.toString() || null,
      dateOfBirth:       formData.get(`guest_${i}_dateOfBirth`)?.toString() || null,
      relationship:      formData.get(`guest_${i}_relationship`)?.toString() || null,
      marriageCertShown: formData.get(`guest_${i}_marriageCertShown`) === 'true',
    })
  }

  const service = createServiceClient()

  const result = await createReservationCore(service, {
    roomIds: [d.roomId],
    checkIn: today,
    checkOut: d.checkOut,
    guestCount: d.adults,
    status: 'checked_in',
    channel: 'walk_in',
    guest: {
      firstName: d.guest_0_firstName,
      lastName: d.guest_0_lastName,
      phone: d.guest_0_phone,
      nationality: d.guest_0_nationality,
      passportNumber: d.guest_0_passportNumber,
      dateOfBirth: d.guest_0_dateOfBirth,
      passportExpiry: d.guest_0_passportExpiry,
      sex: d.guest_0_sex,
    },
    specialRequests: d.specialRequests,
    breakfastIncluded: d.breakfastIncluded,
    companions,
    advance:
      d.advanceAmount && d.advanceAmount > 0 && d.paymentMethod
        ? { amount: d.advanceAmount, method: d.paymentMethod, receivedBy: auth.userId }
        : null,
  })

  if (!result.ok) return { error: te(result.errorKey, result.params) }

  return { reservationId: result.primaryReservationId }
}
