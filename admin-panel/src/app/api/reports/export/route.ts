import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Yetkisiz', { status: 401 })

  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const service = createServiceClient()
  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  const [paymentsRes, checkinsRes, checkoutsRes] = await Promise.all([
    service
      .from('payments')
      .select('amount, method, status, created_at, reservations(reservation_code, guests(first_name, last_name))')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .eq('status', 'completed'),
    service
      .from('reservations')
      .select('reservation_code, room_rate, check_in, check_out, adults, guests(first_name, last_name), rooms(room_number)')
      .eq('check_in', date)
      .in('status', ['checked_in', 'confirmed', 'checked_out']),
    service
      .from('reservations')
      .select('reservation_code, total_amount, check_in, check_out, guests(first_name, last_name), rooms(room_number)')
      .eq('check_out', date)
      .in('status', ['checked_out', 'checked_in']),
  ])

  const payments = paymentsRes.data ?? []
  const checkins = checkinsRes.data ?? []
  const checkouts = checkoutsRes.data ?? []

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)

  const METHOD_LABELS: Record<string, string> = {
    cash: 'Nakit', payme: 'Payme', click: 'Click', uzum: 'Uzum', transfer: 'Havale',
  }

  const lines: string[] = []

  lines.push(`Anor Avenue Hotel - Günlük Rapor - ${date}`)
  lines.push('')

  lines.push('=== ÖZET ===')
  lines.push(`Tarih,${date}`)
  lines.push(`Toplam Gelir (UZS),${totalRevenue}`)
  lines.push(`Check-in Sayısı,${checkins.length}`)
  lines.push(`Check-out Sayısı,${checkouts.length}`)
  lines.push(`Ödeme İşlemi,${payments.length}`)
  lines.push('')

  lines.push('=== GÜNLÜK GELİR ===')
  lines.push('Rezervasyon Kodu,Misafir Adı,Tutar (UZS),Yöntem,İşlem Saati')
  for (const p of payments) {
    const res = (p.reservations as unknown) as { reservation_code: string; guests: { first_name: string; last_name: string } | null } | null
    const guest = res?.guests
    const name = guest ? `${guest.first_name} ${guest.last_name}` : ''
    const code = res?.reservation_code ?? ''
    const time = p.created_at ? new Date(p.created_at).toLocaleTimeString('tr-TR') : ''
    lines.push(`${code},"${name}",${p.amount},${METHOD_LABELS[(p.method as string)] ?? p.method},${time}`)
  }
  lines.push('')

  lines.push('=== CHECK-IN LİSTESİ ===')
  lines.push('Rezervasyon Kodu,Misafir Adı,Oda,Giriş,Çıkış,Gecelik Fiyat (UZS)')
  for (const r of checkins) {
    const guest = (r.guests as unknown) as { first_name: string; last_name: string } | null
    const name = guest ? `${guest.first_name} ${guest.last_name}` : ''
    const room = ((r.rooms as unknown) as { room_number: string } | null)?.room_number ?? ''
    lines.push(`${r.reservation_code},"${name}",${room},${r.check_in},${r.check_out},${r.room_rate}`)
  }
  lines.push('')

  lines.push('=== CHECK-OUT LİSTESİ ===')
  lines.push('Rezervasyon Kodu,Misafir Adı,Oda,Giriş,Çıkış,Toplam Tutar (UZS)')
  for (const r of checkouts) {
    const guest = (r.guests as unknown) as { first_name: string; last_name: string } | null
    const name = guest ? `${guest.first_name} ${guest.last_name}` : ''
    const room = ((r.rooms as unknown) as { room_number: string } | null)?.room_number ?? ''
    lines.push(`${r.reservation_code},"${name}",${room},${r.check_in},${r.check_out},${r.total_amount}`)
  }

  // UTF-8 BOM ekliyoruz ki Excel Türkçe karakterleri doğru okusun
  const csv = '﻿' + lines.join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="anor-avenue-rapor-${date}.csv"`,
    },
  })
}
