import { createClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function esc(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(...cols: (string | number | null | undefined)[]): string {
  return cols.map(esc).join(',')
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Nakit', payme: 'Payme', click: 'Click', uzum: 'Uzum', transfer: 'Havale',
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const today = new Date().toISOString().split('T')[0]
  const date = searchParams.get('date') ?? today

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  const [checkinsResult, checkoutsResult, paymentsResult, occupancyResult, totalRoomsResult] = await Promise.all([
    supabase.from('reservations')
      .select('reservation_code, room_rate, guests(first_name, last_name), rooms(room_number)')
      .eq('check_in', date)
      .in('status', ['checked_in', 'confirmed', 'checked_out']),
    supabase.from('reservations')
      .select('reservation_code, total_amount, guests(first_name, last_name), rooms(room_number)')
      .eq('check_out', date)
      .in('status', ['checked_out', 'checked_in']),
    supabase.from('payments')
      .select('amount, method, status, paid_at, notes')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .eq('status', 'completed'),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'occupied').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const checkins = (checkinsResult.data ?? []) as unknown as Array<{
    reservation_code: string; room_rate: number
    guests: { first_name: string; last_name: string } | null
    rooms: { room_number: string } | null
  }>
  const checkouts = (checkoutsResult.data ?? []) as unknown as Array<{
    reservation_code: string; total_amount: number
    guests: { first_name: string; last_name: string } | null
    rooms: { room_number: string } | null
  }>
  const payments = (paymentsResult.data ?? []) as unknown as Array<{
    amount: number; method: string; status: string; paid_at: string | null; notes: string | null
  }>

  const occupiedRooms = occupancyResult.count ?? 0
  const totalRooms = totalRoomsResult.count ?? 0
  const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : '0.0'
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)

  const lines: string[] = []

  // ── Bölüm 1: Günlük Özet ──────────────────────────────────────────
  lines.push(row('ANOR AVENUE — GÜNLÜK RAPOR'))
  lines.push(row('Tarih', date))
  lines.push(row('Rapor oluşturma', new Date().toLocaleString('tr-TR')))
  lines.push('')
  lines.push(row('ÖZET'))
  lines.push(row('Doluluk', `${occupancyRate}%`, `${occupiedRooms}/${totalRooms} oda`))
  lines.push(row('Günlük Gelir (UZS)', totalRevenue))
  lines.push(row('Check-in Sayısı', checkins.length))
  lines.push(row('Check-out Sayısı', checkouts.length))
  lines.push(row('Ödeme İşlemi', payments.length))
  lines.push('')

  // ── Bölüm 2: Check-in Listesi ─────────────────────────────────────
  lines.push(row('CHECK-IN LİSTESİ'))
  lines.push(row('Rezervasyon Kodu', 'Misafir', 'Oda', 'Oda Fiyatı (UZS)'))
  for (const r of checkins) {
    lines.push(row(
      r.reservation_code,
      `${r.guests?.first_name ?? ''} ${r.guests?.last_name ?? ''}`.trim(),
      r.rooms?.room_number ?? '',
      r.room_rate,
    ))
  }
  if (checkins.length === 0) lines.push(row('Bu tarihte check-in yok.'))
  lines.push('')

  // ── Bölüm 3: Check-out Listesi ────────────────────────────────────
  lines.push(row('CHECK-OUT LİSTESİ'))
  lines.push(row('Rezervasyon Kodu', 'Misafir', 'Oda', 'Toplam (UZS)'))
  for (const r of checkouts) {
    lines.push(row(
      r.reservation_code,
      `${r.guests?.first_name ?? ''} ${r.guests?.last_name ?? ''}`.trim(),
      r.rooms?.room_number ?? '',
      r.total_amount,
    ))
  }
  if (checkouts.length === 0) lines.push(row('Bu tarihte check-out yok.'))
  lines.push('')

  // ── Bölüm 4: Ödemeler ─────────────────────────────────────────────
  lines.push(row('ÖDEMELER'))
  lines.push(row('Yöntem', 'Tutar (UZS)', 'Tarih', 'Not'))
  for (const p of payments) {
    lines.push(row(
      METHOD_LABELS[p.method] ?? p.method,
      p.amount,
      p.paid_at ? new Date(p.paid_at).toLocaleString('tr-TR') : '',
      p.notes ?? '',
    ))
  }
  if (payments.length === 0) lines.push(row('Bu tarihte ödeme yok.'))
  lines.push('')

  // ── Bölüm 5: Yöntem Dağılımı ──────────────────────────────────────
  const revenueByMethod: Record<string, number> = {}
  for (const p of payments) {
    revenueByMethod[p.method] = (revenueByMethod[p.method] ?? 0) + Number(p.amount)
  }
  lines.push(row('GELİR YÖNTEMLERİ'))
  lines.push(row('Yöntem', 'Toplam (UZS)'))
  for (const [method, amount] of Object.entries(revenueByMethod)) {
    lines.push(row(METHOD_LABELS[method] ?? method, amount))
  }
  lines.push(row('TOPLAM', totalRevenue))

  // BOM (Byte Order Mark) — Excel Türkçe karakterleri doğru okusun
  const bom = '﻿'
  const csv = bom + lines.join('\n')
  const filename = `anor-avenue-rapor-${date}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
