import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

const SUPPORTED_LOCALES = ['ru', 'uz', 'uz-cyrl']

export async function GET(req: NextRequest) {
  const localeParam = req.nextUrl.searchParams.get('locale') ?? 'ru'
  const locale = SUPPORTED_LOCALES.includes(localeParam) ? localeParam : 'ru'
  const t = await getTranslations({ locale, namespace: 'reportExport' })
  const tMethods = await getTranslations({ locale, namespace: 'payments.methods' })
  const bcp47 = locale === 'uz' ? 'uz-UZ' : locale === 'uz-cyrl' ? 'uz-Cyrl-UZ' : 'ru-RU'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse(t('unauthorized'), { status: 401 })

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

  const methodLabel = (method: string): string => {
    if (method === 'payme') return 'Payme'
    if (method === 'click') return 'Click'
    if (method === 'uzum') return 'Uzum'
    if (method === 'cash') return tMethods('cash')
    if (method === 'transfer') return tMethods('transfer')
    return method
  }

  const lines: string[] = []

  lines.push(t('reportTitle', { date }))
  lines.push('')

  lines.push(t('summary'))
  lines.push(`${t('dateRow')},${date}`)
  lines.push(`${t('totalIncome')},${totalRevenue}`)
  lines.push(`${t('checkInCount')},${checkins.length}`)
  lines.push(`${t('checkOutCount')},${checkouts.length}`)
  lines.push(`${t('paymentCount')},${payments.length}`)
  lines.push('')

  lines.push(t('incomeSection'))
  lines.push(t('incomeHeader'))
  for (const p of payments) {
    const res = (p.reservations as unknown) as { reservation_code: string; guests: { first_name: string; last_name: string } | null } | null
    const guest = res?.guests
    const name = guest ? `${guest.first_name} ${guest.last_name}` : ''
    const code = res?.reservation_code ?? ''
    const time = p.created_at ? new Date(p.created_at).toLocaleTimeString(bcp47) : ''
    lines.push(`${code},"${name}",${p.amount},${methodLabel(p.method as string)},${time}`)
  }
  lines.push('')

  lines.push(t('checkInSection'))
  lines.push(t('checkInHeader'))
  for (const r of checkins) {
    const guest = (r.guests as unknown) as { first_name: string; last_name: string } | null
    const name = guest ? `${guest.first_name} ${guest.last_name}` : ''
    const room = ((r.rooms as unknown) as { room_number: string } | null)?.room_number ?? ''
    lines.push(`${r.reservation_code},"${name}",${room},${r.check_in},${r.check_out},${r.room_rate}`)
  }
  lines.push('')

  lines.push(t('checkOutSection'))
  lines.push(t('checkOutHeader'))
  for (const r of checkouts) {
    const guest = (r.guests as unknown) as { first_name: string; last_name: string } | null
    const name = guest ? `${guest.first_name} ${guest.last_name}` : ''
    const room = ((r.rooms as unknown) as { room_number: string } | null)?.room_number ?? ''
    lines.push(`${r.reservation_code},"${name}",${room},${r.check_in},${r.check_out},${r.total_amount}`)
  }

  // Add UTF-8 BOM so Excel reads the characters correctly
  const csv = '﻿' + lines.join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="anor-avenue-rapor-${date}.csv"`,
    },
  })
}
