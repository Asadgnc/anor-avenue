import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RegistrationStatusButtons from './RegistrationStatusButtons'

interface RegistrationRow {
  id: string
  status: string
  registered_at: string
  guests: {
    id: string
    first_name: string
    last_name: string
    nationality: string | null
    passport_number: string | null
    passport_series: string | null
    date_of_birth: string | null
  } | null
  reservations: {
    id: string
    reservation_code: string
    check_in: string
    check_out: string
    rooms: { room_number: string } | null
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Bekliyor',  color: '#D4A017', bg: '#451A03' },
  submitted: { label: 'Gönderildi', color: '#93C5FD', bg: '#1E3A5F' },
  confirmed: { label: 'Onaylandı', color: '#86EFAC', bg: '#14532D' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const statusFilter = params.status ?? 'all'

  const { data, error } = await supabase
    .from('guest_registrations')
    .select(`
      id, status, registered_at,
      guests(id, first_name, last_name, nationality, passport_number, passport_series, date_of_birth),
      reservations(id, reservation_code, check_in, check_out, rooms(room_number))
    `)
    .order('registered_at', { ascending: false })

  const allRows = (data ?? []) as unknown as RegistrationRow[]

  // Küçük otel — JS'de filtrelemek yeterli
  const rows = statusFilter === 'all' ? allRows : allRows.filter((r) => r.status === statusFilter)

  const counts = {
    all: allRows.length,
    pending: allRows.filter((r) => r.status === 'pending').length,
    submitted: allRows.filter((r) => r.status === 'submitted').length,
    confirmed: allRows.filter((r) => r.status === 'confirmed').length,
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E8F0]">Misafir Kayıt (Registratsiya)</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            Yabancı misafir bildirimi — Özbekistan yasal zorunluluğu
          </p>
        </div>
      </div>

      {/* Durum Filtreleri */}
      <div className="flex gap-2 flex-wrap">
        {([['all', 'Tümü'], ['pending', 'Bekliyor'], ['submitted', 'Gönderildi'], ['confirmed', 'Onaylandı']] as const).map(([val, label]) => {
          const active = statusFilter === val
          const count = counts[val]
          return (
            <Link
              key={val}
              href={val === 'all' ? '/registrations' : `/registrations?status=${val}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: active ? 'var(--color-accent)' : 'var(--color-admin-card)',
                color: active ? '#0F0F1A' : 'var(--color-admin-muted)',
                border: '1px solid var(--color-admin-border)',
              }}
            >
              {label}
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: active ? 'rgba(0,0,0,0.2)' : 'var(--color-admin-bg)' }}
              >
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Tablo */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        {error ? (
          <p className="px-5 py-4 text-sm" style={{ color: '#FCA5A5' }}>
            Kayıtlar yüklenemedi: {error.message}
          </p>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>
              {statusFilter === 'all' ? 'Henüz kayıt yok.' : 'Bu durumda kayıt yok.'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-admin-muted)' }}>
              Rezervasyon detay sayfasından yabancı misafir için kayıt oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                  {['Misafir', 'Pasaport', 'Milliyet', 'Rezervasyon', 'Tarihler', 'Oda', 'Kayıt Tarihi', 'Durum', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: 'var(--color-admin-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG['pending']
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                      <td className="py-3 px-4">
                        <Link
                          href={`/guests/${row.guests?.id}`}
                          className="font-medium hover:opacity-80 transition-opacity"
                          style={{ color: '#E8E8F0' }}
                        >
                          {row.guests?.first_name} {row.guests?.last_name}
                        </Link>
                        {row.guests?.date_of_birth && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                            D: {formatDate(row.guests.date_of_birth)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--color-admin-muted)' }}>
                        {row.guests?.passport_series ? `${row.guests.passport_series} ` : ''}
                        {row.guests?.passport_number ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
                        {row.guests?.nationality ?? '—'}
                      </td>
                      <td className="py-3 px-4">
                        {row.reservations ? (
                          <Link
                            href={`/reservations/${row.reservations.id}`}
                            className="font-mono text-xs hover:opacity-80"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {row.reservations.reservation_code}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap" style={{ color: 'var(--color-admin-muted)' }}>
                        {row.reservations ? (
                          <>{formatDate(row.reservations.check_in)} → {formatDate(row.reservations.check_out)}</>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
                        {row.reservations?.rooms?.room_number ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap" style={{ color: 'var(--color-admin-muted)' }}>
                        {formatDate(row.registered_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <RegistrationStatusButtons id={row.id} currentStatus={row.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bilgi notu */}
      <div
        className="rounded-lg px-4 py-3 text-xs"
        style={{ backgroundColor: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-muted)' }}
      >
        <strong style={{ color: '#E8E8F0' }}>Registratsiya nedir?</strong>{' '}
        Özbekistan'da yabancı uyruklu misafirlerin otel girişinden itibaren 3 gün içinde Göç İdaresi (OVIR) sistemine bildirilmesi yasal zorunluluktur.
        Kayıt durumunu <strong style={{ color: '#E8E8F0' }}>Bekliyor → Gönderildi → Onaylandı</strong> olarak takip edin.
      </div>
    </div>
  )
}
