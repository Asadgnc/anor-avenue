'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { triggerAvailabilitySync } from '@/lib/channex-sync'
import type { ReservationStatus } from '@/types/hotel'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

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

  if (error) return { error: error.message }

  await triggerAvailabilitySync()

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/reservations')
  revalidatePath('/dashboard')
  return { success: true }
}

// ─── Delete payment ──────────────────────────────────────────────────────────

export async function deletePaymentAction(
  paymentId: string,
  reservationId: string
): Promise<{ error?: string }> {
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

  const service = createServiceClient()
  const { error } = await service.from('payments').delete().eq('id', paymentId)
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
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

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
  method: z.enum(['payme', 'click', 'uzum', 'cash', 'transfer']),
  revenue_category: z.enum(['accommodation', 'breakfast', 'extra_service', 'deposit', 'other']).default('accommodation'),
  notes: z.string().optional(),
})

export type AddPaymentState = { error?: string; fieldErrors?: Record<string, string>; success?: boolean }

export async function addPaymentAction(
  reservationId: string,
  _prev: AddPaymentState,
  formData: FormData
): Promise<AddPaymentState> {
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

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
  const { data: profile } = await service.from('profiles').select('id').eq('id', user.id).single()

  const { error } = await service.from('payments').insert({
    reservation_id: reservationId,
    amount: parsed.data.amount,
    currency: 'UZS',
    method: parsed.data.method,
    revenue_category: parsed.data.revenue_category,
    status: 'completed',
    paid_at: new Date().toISOString(),
    received_by: profile ? user.id : null,
    notes: parsed.data.notes || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/payments')
  return { success: true }
}
