import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import RegistrationStatusButtons from './RegistrationStatusButtons'
import { dash } from '@/lib/dashboardTheme'

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

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

const STATUS_TONE: Record<string, { color: string; bg: string }> = {
  pending:   { color: dash.orange, bg: dash.orangeLight },
  submitted: { color: dash.blue,   bg: dash.blueLight },
  confirmed: { color: dash.green,  bg: dash.greenLight },
}

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const t = await getTranslations('registrations')
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })

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

  // Small hotel — filtering in JS is sufficient
  const rows = statusFilter === 'all' ? allRows : allRows.filter((r) => r.status === statusFilter)

  const counts = {
    all: allRows.length,
    pending: allRows.filter((r) => r.status === 'pending').length,
    submitted: allRows.filter((r) => r.status === 'submitted').length,
    confirmed: allRows.filter((r) => r.status === 'confirmed').length,
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {([['all', t('filters.all')], ['pending', t('filters.pending')], ['submitted', t('filters.submitted')], ['confirmed', t('filters.confirmed')]] as const).map(([val, label]) => {
          const active = statusFilter === val
          const count = counts[val]
          return (
            <Link
              key={val}
              href={val === 'all' ? '/registrations' : `/registrations?status=${val}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: active ? 'var(--color-accent)' : 'var(--color-admin-card)',
                color: active ? '#FFFFFF' : 'var(--color-admin-muted)',
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
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        {error ? (
          <p className="px-5 py-4 text-sm" style={{ color: dash.red }}>
            {t('loadError')}{error.message}
          </p>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>
              {statusFilter === 'all' ? t('emptyAll') : t('emptyStatus')}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-admin-muted)' }}>
              {t('emptyHint')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                  {[t('headers.guest'), t('headers.passport'), t('headers.nationality'), t('headers.reservation'), t('headers.dates'), t('headers.room'), t('headers.registeredAt'), t('headers.status'), ''].map((h, i) => (
                    <th
                      key={i}
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
                  const cfg = STATUS_TONE[row.status] ?? STATUS_TONE['pending']
                  const statusLabel = t(`statuses.${row.status}` as 'statuses.pending')
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                      <td className="py-3 px-4">
                        <Link
                          href={`/guests/${row.guests?.id}`}
                          className="font-medium hover:opacity-80 transition-opacity"
                          style={{ color: dash.text }}
                        >
                          {row.guests?.first_name} {row.guests?.last_name}
                        </Link>
                        {row.guests?.date_of_birth && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                            {t('birthDatePrefix')}{formatDate(row.guests.date_of_birth)}
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
                          {statusLabel}
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

      {/* Info note */}
      <div
        className="rounded-2xl px-4 py-3 text-xs"
        style={{ backgroundColor: dash.zoneBlue, color: 'var(--color-admin-muted)' }}
      >
        <strong style={{ color: dash.text }}>{t('infoTitle')}</strong>{' '}
        {t('infoText')}{' '}
        <strong style={{ color: dash.text }}>{t('infoBoldText')}</strong>{t('infoTextEnd')}
      </div>
    </div>
  )
}
