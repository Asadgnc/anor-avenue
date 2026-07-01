'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import type { ReservationStatus } from '@/types/hotel'

// ─── Rezervasyon Düzenleme ────────────────────────────────────────────────────

const updateResSchema = z.object({
  checkIn:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih'),
  checkOut:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih'),
  adults:               z.coerce.number().int().min(1).max(10),
  roomRate:             z.coerce.number().positive('Fiyat 0\'dan büyük olmalı'),
  specialRequests:      z.string().max(1000).optional(),
  notes:                z.string().max(1000).optional(),
  breakfastIncluded:    z.string().optional().transform(v => v === 'on'),
  expectedCheckInTime:  z.string().optional(),
})

export type UpdateResState = { error?: string; success?: boolean }

export async function updateReservationAction(
  reservationId: string,
  formData: FormData
): Promise<UpdateResState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const parsed = updateResSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const d = parsed.data
  if (d.checkOut <= d.checkIn) return { error: 'Çıkış tarihi girişten sonra olmalı.' }

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
      // nights: GENERATED ALWAYS AS (check_out - check_in) STORED — buraya yazılmaz
      room_rate:               d.roomRate,
      total_amount:            totalAmount,
      special_requests:        d.specialRequests || null,
      notes:                   d.notes || null,
      breakfast_included:      d.breakfastIncluded ?? false,
      expected_check_in_time:  d.expectedCheckInTime || null,
    })
    .eq('id', reservationId)

  if (error) return { error: error.message }

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/reservations')
  revalidatePath('/dashboard')
  return { success: true }
}

// ─── Ödeme Silme ──────────────────────────────────────────────────────────────

export async function deletePaymentAction(
  paymentId: string,
  reservationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const service = createServiceClient()
  const { error } = await service.from('payments').delete().eq('id', paymentId)
  if (error) return { error: error.message }

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/payments')
  return {}
}

// ─── Durum Güncelleme ─────────────────────────────────────────────────────────

export async function updateReservationStatusAction(
  reservationId: string,
  newStatus: ReservationStatus
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const service = createServiceClient()

  const update: Record<string, string> = { status: newStatus }
  if (newStatus === 'checked_in') update.actual_check_in = new Date().toISOString()
  if (newStatus === 'checked_out') update.actual_check_out = new Date().toISOString()

  const { error } = await service
    .from('reservations')
    .update(update)
    .eq('id', reservationId)

  if (error) return { error: error.message }

  // Oda durumunu güncelle
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

  revalidatePath(`/reservations/${reservationId}`)
  revalidatePath('/reservations')
  revalidatePath('/dashboard')
  return {}
}

// ─── Ödeme Kaydetme ───────────────────────────────────────────────────────────

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Tutar 0\'dan büyük olmalı'),
  method: z.enum(['payme', 'click', 'uzum', 'cash', 'transfer']),
  notes: z.string().optional(),
})

export type AddPaymentState = { error?: string; fieldErrors?: Record<string, string>; success?: boolean }

export async function addPaymentAction(
  reservationId: string,
  _prev: AddPaymentState,
  formData: FormData
): Promise<AddPaymentState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString()
      if (key) fieldErrors[key] = issue.message
    }
    return { fieldErrors }
  }

  const service = createServiceClient()

  // Kullanıcının profili varsa received_by olarak kaydet (yoksa null)
  const { data: profile } = await service.from('profiles').select('id').eq('id', user.id).single()

  const { error } = await service.from('payments').insert({
    reservation_id: reservationId,
    amount: parsed.data.amount,
    currency: 'UZS',
    method: parsed.data.method,
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
