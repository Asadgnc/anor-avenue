'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

const schema = z.object({
  firstName:      z.string().min(1, 'Ad zorunlu'),
  lastName:       z.string().min(1, 'Soyad zorunlu'),
  phone:          z.string().optional(),
  email:          z.string().optional(),
  nationality:    z.string().optional(),
  passportNumber: z.string().optional(),
  roomId:         z.string().uuid('Oda seçmelisiniz'),
  checkIn:        z.string().min(1, 'Giriş tarihi zorunlu'),
  checkOut:       z.string().min(1, 'Çıkış tarihi zorunlu'),
  adults:         z.coerce.number().int().min(1, 'En az 1 yetişkin').max(8),
  specialRequests: z.string().optional(),
  advanceAmount:  z.coerce.number().min(0).optional(),
  paymentMethod:  z.enum(['payme', 'click', 'uzum', 'cash', 'transfer']).optional(),
})

export type ReservationFormState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
  reservationId?: string  // başarı: client router.push() için
}

export async function createReservationAction(
  _prev: ReservationFormState,
  formData: FormData
): Promise<ReservationFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz, lütfen tekrar giriş yapın.' }

  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString()
      if (key) fieldErrors[key] = issue.message
    }
    return { fieldErrors }
  }

  const d = parsed.data

  if (d.checkIn >= d.checkOut) {
    return { error: 'Çıkış tarihi, giriş tarihinden sonra olmalıdır.' }
  }

  const service = createServiceClient()

  // Oda fiyatını çek
  const { data: roomData, error: roomErr } = await service
    .from('rooms')
    .select('id, room_number, room_types(base_price)')
    .eq('id', d.roomId)
    .eq('is_active', true)
    .single()

  if (roomErr || !roomData) {
    return { error: 'Oda bulunamadı veya aktif değil.' }
  }

  const roomTypes = roomData.room_types as unknown as { base_price: number } | null
  const roomRate = roomTypes?.base_price ?? 0

  // Çakışma kontrolü (overbooking önleme)
  const { data: conflicts } = await service
    .from('reservations')
    .select('id, reservation_code')
    .eq('room_id', d.roomId)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .lt('check_in', d.checkOut)
    .gt('check_out', d.checkIn)

  if (conflicts && conflicts.length > 0) {
    return {
      error: `Bu oda seçilen tarihler için dolu (${conflicts[0].reservation_code}). Farklı tarih veya oda seçin.`,
    }
  }

  const nights = Math.round(
    (new Date(d.checkOut).getTime() - new Date(d.checkIn).getTime()) / 86400000
  )
  const totalAmount = roomRate * nights

  // Misafir oluştur
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
    return { error: `Misafir kaydı oluşturulamadı: ${guestErr?.message ?? 'Bilinmeyen hata'}` }
  }

  // Rezervasyon oluştur
  const { data: reservation, error: resErr } = await service
    .from('reservations')
    .insert({
      guest_id:         guest.id,
      room_id:          d.roomId,
      check_in:         d.checkIn,
      check_out:        d.checkOut,
      adults:           d.adults,
      children:         0,
      room_rate:        roomRate,
      total_amount:     totalAmount,
      discount:         0,
      currency:         'UZS',
      special_requests: d.specialRequests || null,
      status:           'confirmed',
      channel:          'direct',
    })
    .select('id')
    .single()

  if (resErr || !reservation) {
    return { error: `Rezervasyon oluşturulamadı: ${resErr?.message ?? 'Bilinmeyen hata'}` }
  }

  // Ön ödeme kaydı (opsiyonel)
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

  // redirect() yerine reservationId döndür
  return { reservationId: reservation.id }
}
