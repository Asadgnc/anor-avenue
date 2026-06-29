'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import type { ReservationStatus } from '@/types/hotel'

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
    } else if (newStatus === 'cancelled') {
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
