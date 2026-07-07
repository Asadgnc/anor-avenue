'use server'

import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { fetchRoomCapacities, nightsBetween } from '@/lib/availability'
import { sendEmail } from '@/lib/email'

// 'standard' bilerek yok: bodrum odaları (101-103) yalnızca iç sistemde
// satılır, misafir sitesinden asla booklenemez.
const ROOM_TYPE_LABELS: Record<string, string> = {
  deluxe:   'Delyuks Xona / Делюкс / Deluxe',
  luxury:   'Lyuks Xona / Люкс / Luxury',
}

const ROOM_TYPE_NAMES: Record<string, string> = {
  deluxe: 'Deluxe',
  luxury: 'Luxury',
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
  roomType: z.enum(['deluxe', 'luxury']),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(4),
  specialRequests: z.string().max(1000).optional(),
})

// Admin uygulamasındaki dahili Channex senkron endpoint'ini best-effort çağırır.
async function notifyChannexSync(): Promise<void> {
  const url = process.env.ADMIN_SYNC_URL
  const secret = process.env.INTERNAL_SYNC_SECRET
  if (!url || !secret) return
  try {
    await fetch(`${url.replace(/\/$/, '')}/api/internal/channex-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({}),
      cache: 'no-store',
    })
  } catch (e) {
    console.error('[channex] guest sync notify failed:', e)
  }
}

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

  const typeName = ROOM_TYPE_NAMES[d.roomType]

  // Bu tipteki tüm aktif odaları effective_price ile getir (rooms_with_effective_price view'i)
  const { data: rooms, error: roomsErr } = await service
    .from('rooms_with_effective_price')
    .select('id, effective_price')
    .eq('room_type_name', typeName)
    .eq('is_active', true)
    .eq('is_public', true)

  if (roomsErr || !rooms || rooms.length === 0) {
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

  // Kapasite-duyarlı seçim: kişi sayısına yeten en küçük (israfsız) boş oda
  const capMap = await fetchRoomCapacities(service)
  const availableRoom = rooms
    .filter((r) => !conflictSet.has(r.id) && (capMap.get(r.id) ?? 2) >= d.adults)
    .sort((a, b) => (capMap.get(a.id) ?? 2) - (capMap.get(b.id) ?? 2))[0]

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
  const totalAmount = Number(availableRoom.effective_price) * nights

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
      room_rate: Number(availableRoom.effective_price),
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

  // Channex: müsaitliği admin uygulamasındaki dahili endpoint üzerinden hemen
  // yeniden gönder (best-effort; env yoksa atlanır, admin cron yine de yakalar).
  await notifyChannexSync()

  const code = reservation.reservation_code
  const guestName = `${d.firstName} ${d.lastName}`
  const roomLabel = ROOM_TYPE_LABELS[d.roomType] ?? d.roomType

  // Admin bildirimi
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  if (adminEmail) {
    const rows = [
      ['Misafir', guestName],
      ['Telefon', d.phone],
      d.email ? ['E-posta', d.email] : null,
      ['Oda', roomLabel],
      ['Giriş', d.checkIn],
      ['Çıkış', d.checkOut],
      ['Gece', String(nights)],
      ['Toplam', `${new Intl.NumberFormat('uz-UZ').format(totalAmount)} UZS`],
    ]
      .filter(Boolean)
      .map((r) => `<tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${r![0]}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${r![1]}</td></tr>`)
      .join('')

    await sendEmail({
      to: adminEmail,
      subject: `🏨 Yeni Rezervasyon — ${code}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0F0F1A;color:#E8E8F0;padding:32px;border-radius:12px">
        <h1 style="color:#C9A96E;font-size:20px;margin-bottom:4px">Yeni Rezervasyon Talebi</h1>
        <p style="color:#888;font-size:14px;margin-bottom:24px">Misafir sitesinden yeni rezervasyon geldi</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
        <div style="margin-top:24px;padding:16px;background:#1E1E3A;border-radius:8px;text-align:center">
          <p style="color:#888;font-size:12px;margin:0 0 4px">Rezervasyon Kodu</p>
          <p style="color:#C9A96E;font-size:22px;font-weight:800;font-family:monospace;margin:0">${code}</p>
        </div>
        <p style="margin-top:24px;font-size:12px;color:#555;text-align:center">Anor Avenue Hotel Admin Paneli</p>
      </div>`,
    })
  }

  // Misafire onay emaili (email adresi vermişse)
  if (d.email) {
    const isUz = locale === 'uz'
    const isRu = locale === 'ru'
    const subj = isUz ? `Buyurtma qabul qilindi — ${code}` : isRu ? `Бронирование принято — ${code}` : `Booking Received — ${code}`
    const title = isUz ? 'Buyurtmangiz qabul qilindi!' : isRu ? 'Бронирование принято!' : 'Booking Received!'
    const note = isUz
      ? 'Tez orada siz bilan bog\'lanamiz.'
      : isRu ? 'Мы свяжемся с вами в ближайшее время.'
      : 'We will contact you shortly.'
    const lbl = isUz
      ? { room: 'Xona', in: 'Kelish', out: 'Ketish', nights: 'Kecha', total: 'Jami', code: 'Kod' }
      : isRu
      ? { room: 'Номер', in: 'Заезд', out: 'Выезд', nights: 'Ночей', total: 'Итого', code: 'Код' }
      : { room: 'Room', in: 'Check-in', out: 'Check-out', nights: 'Nights', total: 'Total', code: 'Code' }

    await sendEmail({
      to: d.email,
      subject: subj,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0F0F1A;color:#E8E8F0;padding:32px;border-radius:12px">
        <h1 style="color:#C9A96E;font-size:20px;margin-bottom:4px">${title}</h1>
        <p style="color:#888;font-size:14px;margin-bottom:24px">${note}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lbl.room}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${roomLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lbl.in}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${d.checkIn}</td></tr>
          <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lbl.out}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${d.checkOut}</td></tr>
          <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lbl.nights}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${nights}</td></tr>
          <tr><td style="padding:8px 0;color:#888">${lbl.total}</td><td style="padding:8px 0;text-align:right;color:#C9A96E;font-weight:700">${new Intl.NumberFormat('uz-UZ').format(totalAmount)} UZS</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#1E1E3A;border-radius:8px;text-align:center">
          <p style="color:#888;font-size:12px;margin:0 0 4px">${lbl.code}</p>
          <p style="color:#C9A96E;font-size:22px;font-weight:800;font-family:monospace;margin:0">${code}</p>
        </div>
        <p style="margin-top:24px;font-size:12px;color:#555;text-align:center">Anor Avenue Hotel · Toshkent</p>
      </div>`,
    })
  }

  return { success: true, reservationCode: code }
}

// ─────────────────────────────────────────────────────────────────────────────
// Çok-odalı ("kombinasyon") rezervasyon — tek misafir + birden çok rezervasyon,
// TEK gönderimde. Akıllı bulma sayfasından seçilen oda kümesi için kullanılır.
// ─────────────────────────────────────────────────────────────────────────────

export type ComboBookingState = {
  success?: boolean
  reservationCode?: string
  roomCount?: number
  error?: string
}

const comboSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(7).max(30),
  email: z.string().email().optional().or(z.literal('')),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(29),
  roomIds: z.string().min(1), // virgülle ayrık uuid listesi
  specialRequests: z.string().max(1000).optional(),
})

// Kişileri odalara dağıt (büyük kapasiteden doldur, her odaya en az 1)
function allocateAdults(caps: number[], party: number): number[] {
  const alloc = caps.map(() => 0)
  const order = caps.map((_, i) => i).sort((a, b) => caps[b] - caps[a])
  let remaining = party
  for (const i of order) {
    const take = Math.min(caps[i], Math.max(0, remaining))
    alloc[i] = take
    remaining -= take
  }
  for (let i = 0; i < alloc.length; i++) if (alloc[i] < 1) alloc[i] = 1
  return alloc
}

export async function bookRoomCombination(
  locale: string,
  _prev: ComboBookingState,
  formData: FormData
): Promise<ComboBookingState> {
  const parsed = comboSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const msg =
      locale === 'uz'
        ? "Iltimos, barcha majburiy maydonlarni to'g'ri to'ldiring."
        : locale === 'ru'
        ? 'Пожалуйста, заполните все обязательные поля корректно.'
        : 'Please fill in all required fields correctly.'
    return { error: msg }
  }

  const d = parsed.data
  if (d.checkOut <= d.checkIn) {
    const msg =
      locale === 'uz'
        ? "Ketish sanasi kelish sanasidan keyin bo'lishi kerak."
        : locale === 'ru'
        ? 'Дата выезда должна быть позже даты заезда.'
        : 'Check-out date must be after check-in date.'
    return { error: msg }
  }

  const roomIds = [...new Set(d.roomIds.split(',').map((s) => s.trim()).filter(Boolean))]
  if (roomIds.length === 0) {
    return { error: locale === 'ru' ? 'Номера не выбраны.' : locale === 'uz' ? 'Xona tanlanmagan.' : 'No rooms selected.' }
  }

  const service = createServiceClient()

  // Seçilen odaları getir (fiyat + isim)
  const { data: rooms, error: roomsErr } = await service
    .from('rooms_with_effective_price')
    .select('id, effective_price, room_number, room_type_name')
    .in('id', roomIds)
    .eq('is_active', true)
    .eq('is_public', true)

  if (roomsErr || !rooms || rooms.length !== roomIds.length) {
    return { error: locale === 'ru' ? 'Некоторые номера недоступны.' : locale === 'uz' ? 'Ba\'zi xonalar mavjud emas.' : 'Some rooms are unavailable.' }
  }

  // Insert anında yeniden müsaitlik doğrula (yarış azaltma)
  const { data: conflicts } = await service
    .from('reservations')
    .select('room_id')
    .in('room_id', roomIds)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .lt('check_in', d.checkOut)
    .gt('check_out', d.checkIn)

  if (conflicts && conflicts.length > 0) {
    return {
      error:
        locale === 'uz'
          ? "Tanlangan xonalardan biri hozirgina band qilindi. Iltimos, qaytadan qidiring."
          : locale === 'ru'
          ? 'Один из выбранных номеров только что заняли. Пожалуйста, повторите поиск.'
          : 'One of the selected rooms was just booked. Please search again.',
    }
  }

  const nights = Math.max(1, nightsBetween(d.checkIn, d.checkOut))
  const capMap = await fetchRoomCapacities(service)
  const caps = rooms.map((r) => capMap.get(r.id as string) ?? 2)
  const alloc = allocateAdults(caps, d.adults)

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

  // Her oda için bir rezervasyon
  const rows = rooms.map((r, i) => ({
    guest_id: guest.id,
    room_id: r.id,
    check_in: d.checkIn,
    check_out: d.checkOut,
    adults: alloc[i],
    children: 0,
    room_rate: Number(r.effective_price),
    total_amount: Number(r.effective_price) * nights,
    discount: 0,
    currency: 'UZS',
    special_requests: d.specialRequests || null,
    status: 'pending' as const,
    channel: 'direct' as const,
  }))

  const { data: inserted, error: resErr } = await service
    .from('reservations')
    .insert(rows)
    .select('reservation_code')

  if (resErr || !inserted || inserted.length === 0) {
    return { error: locale === 'uz' ? 'Buyurtma yaratishda xatolik.' : locale === 'ru' ? 'Ошибка создания бронирования.' : 'Failed to create reservation.' }
  }

  await notifyChannexSync()

  const primaryCode = inserted[0].reservation_code as string
  const totalAmount = rows.reduce((s, r) => s + r.total_amount, 0)
  const guestName = `${d.firstName} ${d.lastName}`
  const roomList = rooms.map((r) => `${r.room_type_name} ${r.room_number}`).join(', ')

  // Admin bildirimi (özet)
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  if (adminEmail) {
    const rowsHtml = [
      ['Misafir', guestName],
      ['Telefon', d.phone],
      d.email ? ['E-posta', d.email] : null,
      ['Odalar', roomList],
      ['Kişi', String(d.adults)],
      ['Giriş', d.checkIn],
      ['Çıkış', d.checkOut],
      ['Gece', String(nights)],
      ['Toplam', `${new Intl.NumberFormat('uz-UZ').format(totalAmount)} UZS`],
    ]
      .filter(Boolean)
      .map((r) => `<tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${r![0]}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${r![1]}</td></tr>`)
      .join('')

    await sendEmail({
      to: adminEmail,
      subject: `🏨 Yeni Grup Rezervasyonu (${rooms.length} oda) — ${primaryCode}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0F0F1A;color:#E8E8F0;padding:32px;border-radius:12px">
        <h1 style="color:#C9A96E;font-size:20px;margin-bottom:4px">Yeni Grup Rezervasyonu</h1>
        <p style="color:#888;font-size:14px;margin-bottom:24px">Misafir sitesinden ${rooms.length} odalı rezervasyon geldi</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rowsHtml}</table>
        <div style="margin-top:24px;padding:16px;background:#1E1E3A;border-radius:8px;text-align:center">
          <p style="color:#888;font-size:12px;margin:0 0 4px">Ana Rezervasyon Kodu</p>
          <p style="color:#C9A96E;font-size:22px;font-weight:800;font-family:monospace;margin:0">${primaryCode}</p>
        </div>
      </div>`,
    })
  }

  // Misafire onay
  if (d.email) {
    const isUz = locale === 'uz'
    const isRu = locale === 'ru'
    const subj = isUz ? `Buyurtma qabul qilindi — ${primaryCode}` : isRu ? `Бронирование принято — ${primaryCode}` : `Booking Received — ${primaryCode}`
    const title = isUz ? 'Buyurtmangiz qabul qilindi!' : isRu ? 'Бронирование принято!' : 'Booking Received!'
    const note = isUz ? 'Tez orada siz bilan bog\'lanamiz.' : isRu ? 'Мы свяжемся с вами в ближайшее время.' : 'We will contact you shortly.'
    const lbl = isUz
      ? { rooms: 'Xonalar', in: 'Kelish', out: 'Ketish', total: 'Jami', code: 'Kod' }
      : isRu
      ? { rooms: 'Номера', in: 'Заезд', out: 'Выезд', total: 'Итого', code: 'Код' }
      : { rooms: 'Rooms', in: 'Check-in', out: 'Check-out', total: 'Total', code: 'Code' }
    await sendEmail({
      to: d.email,
      subject: subj,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0F0F1A;color:#E8E8F0;padding:32px;border-radius:12px">
        <h1 style="color:#C9A96E;font-size:20px;margin-bottom:4px">${title}</h1>
        <p style="color:#888;font-size:14px;margin-bottom:24px">${note}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lbl.rooms}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${roomList}</td></tr>
          <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lbl.in}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${d.checkIn}</td></tr>
          <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lbl.out}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${d.checkOut}</td></tr>
          <tr><td style="padding:8px 0;color:#888">${lbl.total}</td><td style="padding:8px 0;text-align:right;color:#C9A96E;font-weight:700">${new Intl.NumberFormat('uz-UZ').format(totalAmount)} UZS</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#1E1E3A;border-radius:8px;text-align:center">
          <p style="color:#888;font-size:12px;margin:0 0 4px">${lbl.code}</p>
          <p style="color:#C9A96E;font-size:22px;font-weight:800;font-family:monospace;margin:0">${primaryCode}</p>
        </div>
      </div>`,
    })
  }

  return { success: true, reservationCode: primaryCode, roomCount: rooms.length }
}
