import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getBooking, type ChannexBooking } from '@/lib/channex'
import { triggerAvailabilitySync } from '@/lib/channex-sync'

// Channex webhook: sadece BİLDİRİM gelir → tam kaydı API'den çekeriz.
// URL: /api/webhooks/channex?secret=<CHANNEX_WEBHOOK_SECRET>

const OTA_TO_CHANNEL: Record<string, string> = {
  'booking.com': 'booking_com',
  booking: 'booking_com',
  airbnb: 'airbnb',
  expedia: 'expedia',
  agoda: 'agoda',
}

function mapChannel(otaName?: string): string {
  if (!otaName) return 'other_ota'
  const key = otaName.toLowerCase().replace(/\.com$/, '').trim()
  return OTA_TO_CHANNEL[key] ?? OTA_TO_CHANNEL[otaName.toLowerCase()] ?? 'other_ota'
}

function nights(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const expected = process.env.CHANNEX_WEBHOOK_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { event?: string; payload?: { booking_id?: string; revision_id?: string } }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const event = body.event ?? ''
  if (!event.startsWith('booking')) {
    return NextResponse.json({ ok: true, skipped: event }, { status: 200 })
  }

  const bookingId = body.payload?.booking_id
  const revisionId = body.payload?.revision_id
  if (!bookingId) {
    return NextResponse.json({ error: 'no booking_id' }, { status: 400 })
  }

  const res = await getBooking(bookingId)
  if (!res.ok || !res.data) {
    console.error('[channex webhook] getBooking failed:', res.error)
    return NextResponse.json({ ok: false, error: res.error }, { status: 200 })
  }

  try {
    await processBooking(res.data, bookingId, revisionId)
  } catch (e) {
    console.error('[channex webhook] processBooking error:', e)
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

async function processBooking(booking: ChannexBooking, bookingId: string, revisionId?: string) {
  const service = createServiceClient()

  const status = (booking.status ?? 'new').toLowerCase()
  const room = booking.rooms?.[0]
  const checkIn = booking.arrival_date ?? room?.checkin_date
  const checkOut = booking.departure_date ?? room?.checkout_date

  const { data: existing } = await service
    .from('reservations')
    .select('id, room_id, status')
    .eq('channex_booking_id', bookingId)
    .maybeSingle()

  // İptal
  if (status === 'cancelled') {
    if (existing) {
      await service
        .from('reservations')
        .update({ status: 'cancelled', channex_revision_id: revisionId ?? null })
        .eq('id', existing.id)
      await triggerAvailabilitySync()
    }
    return
  }

  if (!checkIn || !checkOut || !room) {
    console.error('[channex webhook] eksik tarih/oda bilgisi', bookingId)
    return
  }

  // Channex oda tipini (varyant) bul
  const { data: variant } = await service
    .from('channex_variants')
    .select('id')
    .eq('channex_room_type_id', room.room_type_id)
    .maybeSingle()
  if (!variant) {
    console.error('[channex webhook] eşleşmeyen varyant:', room.room_type_id)
    return
  }

  const totalAmount = Number(booking.amount ?? room.amount ?? 0)
  const n = nights(checkIn, checkOut)
  const roomRate = totalAmount > 0 ? Math.round(totalAmount / n) : 0
  const currency = booking.currency ?? 'UZS'
  const channel = mapChannel(booking.ota_name)

  // Değişiklik (modified)
  if (existing) {
    await service
      .from('reservations')
      .update({
        check_in: checkIn,
        check_out: checkOut,
        total_amount: totalAmount,
        room_rate: roomRate,
        currency,
        status: 'confirmed',
        channex_revision_id: revisionId ?? null,
      })
      .eq('id', existing.id)
    await triggerAvailabilitySync()
    return
  }

  // Yeni: bu varyanta bağlı boş oda otomatik ata
  const roomId = await assignFreeRoom(service, variant.id, checkIn, checkOut)
  if (!roomId) {
    console.error('[channex webhook] varyantta boş oda yok:', variant.id, bookingId)
    return
  }

  const { data: guest, error: guestErr } = await service
    .from('guests')
    .insert({
      first_name: booking.customer?.name || 'OTA',
      last_name: booking.customer?.surname || 'Guest',
      email: booking.customer?.mail || null,
      phone: booking.customer?.phone || null,
      nationality: booking.customer?.country || null,
    })
    .select('id')
    .single()

  if (guestErr || !guest) {
    console.error('[channex webhook] guest insert failed:', guestErr?.message)
    return
  }

  const { error: resErr } = await service.from('reservations').insert({
    guest_id: guest.id,
    room_id: roomId,
    check_in: checkIn,
    check_out: checkOut,
    adults: room.occupancy?.adults ?? 1,
    children: room.occupancy?.children ?? 0,
    room_rate: roomRate,
    total_amount: totalAmount,
    discount: 0,
    currency,
    status: 'confirmed',
    channel,
    ota_reference: booking.ota_reservation_code || null,
    channex_booking_id: bookingId,
    channex_revision_id: revisionId ?? null,
  })

  if (resErr) {
    console.error('[channex webhook] reservation insert failed:', resErr.message)
    return
  }

  await triggerAvailabilitySync()
}

type Service = ReturnType<typeof createServiceClient>

/** Verilen varyanta bağlı, tarihlerde çakışmayan ilk boş odayı bulur. */
async function assignFreeRoom(
  service: Service,
  variantId: string,
  checkIn: string,
  checkOut: string,
): Promise<string | null> {
  const { data: rooms } = await service
    .from('rooms')
    .select('id')
    .eq('channex_variant_id', variantId)
    .eq('is_active', true)
    .not('status', 'in', '(maintenance,blocked)')
    .order('room_number')

  if (!rooms || rooms.length === 0) return null

  const roomIds = rooms.map((r) => r.id)
  const { data: conflicts } = await service
    .from('reservations')
    .select('room_id')
    .in('room_id', roomIds)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)

  const busy = new Set((conflicts ?? []).map((c) => c.room_id))
  const free = rooms.find((r) => !busy.has(r.id))
  return free?.id ?? null
}
