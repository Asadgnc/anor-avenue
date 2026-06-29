'use server'

import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'

const ROOM_TYPE_NAMES: Record<string, string> = {
  standard: 'Standart',
  luxury: 'Lüks',
  mansard: 'Mansard Lüks',
}

export type BookingInquiryState = {
  success?: boolean
  reservationCode?: string
  error?: string
}

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(7).max(30),
  email: z.string().email().optional().or(z.literal('')),
  roomType: z.enum(['standard', 'luxury', 'mansard']),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(4),
  specialRequests: z.string().max(1000).optional(),
})

export async function submitBookingInquiry(
  locale: string,
  _prev: BookingInquiryState,
  formData: FormData
): Promise<BookingInquiryState> {
  const raw = Object.fromEntries(formData)
  const parsed = schema.safeParse(raw)

  if (!parsed.success) {
    const errorMsg =
      locale === 'uz'
        ? "Iltimos, barcha majburiy maydonlarni to'g'ri to'ldiring."
        : locale === 'ru'
        ? 'Пожалуйста, заполните все обязательные поля корректно.'
        : 'Please fill in all required fields correctly.'
    return { error: errorMsg }
  }

  const d = parsed.data
  if (d.checkOut <= d.checkIn) {
    const errorMsg =
      locale === 'uz'
        ? "Ketish sanasi kelish sanasidan keyin bo'lishi kerak."
        : locale === 'ru'
        ? 'Дата выезда должна быть позже даты заезда.'
        : 'Check-out date must be after check-in date.'
    return { error: errorMsg }
  }

  const service = createServiceClient()

  // Oda tipini bul
  const typeName = ROOM_TYPE_NAMES[d.roomType]
  const { data: roomTypeData, error: typeErr } = await service
    .from('room_types')
    .select('id, base_price')
    .eq('name', typeName)
    .single()

  if (typeErr || !roomTypeData) {
    return { error: locale === 'uz' ? 'Xona turi topilmadi.' : locale === 'ru' ? 'Тип номера не найден.' : 'Room type not found.' }
  }

  // Bu tipteki tüm aktif odaları getir
  const { data: rooms } = await service
    .from('rooms')
    .select('id')
    .eq('room_type_id', roomTypeData.id)
    .eq('is_active', true)

  if (!rooms || rooms.length === 0) {
    const msg = locale === 'uz' ? 'Bu turdagi xona mavjud emas.' : locale === 'ru' ? 'Нет номеров данного типа.' : 'No rooms of this type available.'
    return { error: msg }
  }

  // Çakışan rezervasyonları bul
  const roomIds = rooms.map((r) => r.id)
  const { data: conflicts } = await service
    .from('reservations')
    .select('room_id')
    .in('room_id', roomIds)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .lt('check_in', d.checkOut)
    .gt('check_out', d.checkIn)

  const conflictSet = new Set((conflicts ?? []).map((c) => c.room_id as string))
  const availableRoom = rooms.find((r) => !conflictSet.has(r.id))

  if (!availableRoom) {
    const msg =
      locale === 'uz'
        ? "Tanlangan sanalarda bo'sh xona yo'q. Boshqa sanalarni sinab ko'ring."
        : locale === 'ru'
        ? 'На выбранные даты нет свободных номеров. Попробуйте другие даты.'
        : 'No rooms available for the selected dates. Please try different dates.'
    return { error: msg }
  }

  // Gece ve toplam tutar hesapla
  const nights = Math.round(
    (new Date(d.checkOut).getTime() - new Date(d.checkIn).getTime()) / 86400000
  )
  const totalAmount = Number(roomTypeData.base_price) * nights

  // Misafir oluştur
  const { data: guest, error: guestErr } = await service
    .from('guests')
    .insert({
      first_name: d.firstName,
      last_name: d.lastName,
      phone: d.phone,
      email: d.email || null,
    })
    .select('id')
    .single()

  if (guestErr || !guest) {
    return { error: locale === 'uz' ? 'Mehmon ma\'lumotlari saqlanmadi.' : locale === 'ru' ? 'Ошибка сохранения данных гостя.' : 'Failed to save guest details.' }
  }

  // Pending rezervasyon oluştur
  const { data: reservation, error: resErr } = await service
    .from('reservations')
    .insert({
      guest_id: guest.id,
      room_id: availableRoom.id,
      check_in: d.checkIn,
      check_out: d.checkOut,
      adults: d.adults,
      children: 0,
      room_rate: Number(roomTypeData.base_price),
      total_amount: totalAmount,
      discount: 0,
      currency: 'UZS',
      special_requests: d.specialRequests || null,
      status: 'pending',
      channel: 'direct',
    })
    .select('reservation_code')
    .single()

  if (resErr || !reservation) {
    return { error: locale === 'uz' ? 'Buyurtma yaratishda xatolik.' : locale === 'ru' ? 'Ошибка создания бронирования.' : 'Failed to create reservation.' }
  }

  return { success: true, reservationCode: reservation.reservation_code }
}
