import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { createServiceClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import RegistrationStatusButtons from '../RegistrationStatusButtons'
import RegistrationDetailForm from './RegistrationDetailForm'
import { dash } from '@/lib/dashboardTheme'

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

const STATUS_TONE: Record<string, { color: string; bg: string }> = {
  pending: { color: dash.orange, bg: dash.orangeLight },
  submitted: { color: dash.blue, bg: dash.blueLight },
  confirmed: { color: dash.green, bg: dash.greenLight },
}

interface DetailRow {
  id: string
  status: string
  registered_at: string
  submitted_at: string | null
  registration_number: string | null
  tourist_tax_amount: number | null
  tourist_tax_paid: boolean
  document_url: string | null
  guests: {
    id: string
    first_name: string
    last_name: string
    nationality: string | null
    passport_number: string | null
    passport_series: string | null
    date_of_birth: string | null
    visa_number: string | null
    visa_expiry: string | null
    pinfl: string | null
    passport_expiry: string | null
    sex: string | null
  } | null
  reservations: {
    id: string
    reservation_code: string
    check_in: string
    check_out: string
    rooms: { room_number: string } | null
  } | null
}

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')

  const locale = await getLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const t = await getTranslations('registrations')
  const td = await getTranslations('registrations.detail')
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })

  const { data, error } = await supabase
    .from('guest_registrations')
    .select(`
      id, status, registered_at, submitted_at, registration_number, tourist_tax_amount, tourist_tax_paid, document_url,
      guests(id, first_name, last_name, nationality, passport_number, passport_series, date_of_birth, visa_number, visa_expiry, pinfl, passport_expiry, sex),
      reservations(id, reservation_code, check_in, check_out, rooms(room_number))
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()
  const row = data as unknown as DetailRow

  // Private bucket — sunucu tarafında imzalı URL üret (PII, public değil)
  let documentSignedUrl: string | null = null
  if (row.document_url) {
    const service = createServiceClient()
    const { data: signed } = await service.storage
      .from('registrations')
      .createSignedUrl(row.document_url, 60 * 10)
    documentSignedUrl = signed?.signedUrl ?? null
  }

  const cfg = STATUS_TONE[row.status] ?? STATUS_TONE['pending']
  const statusLabel = t(`statuses.${row.status}` as 'statuses.pending')

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/registrations" className="text-sm hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
          {td('backLink')}
        </Link>
      </div>

      {/* Header */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {row.guests?.first_name} {row.guests?.last_name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {row.reservations ? (
              <>
                <Link href={`/reservations/${row.reservations.id}`} className="font-mono hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                  {row.reservations.reservation_code}
                </Link>
                {'  ·  '}
                {formatDate(row.reservations.check_in)} → {formatDate(row.reservations.check_out)}
                {row.reservations.rooms ? `  ·  ${row.reservations.rooms.room_number}` : ''}
              </>
            ) : '—'}
          </p>
          {row.submitted_at && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
              {td('submittedAtPrefix')}{formatDate(row.submitted_at)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
            {statusLabel}
          </span>
          <RegistrationStatusButtons id={row.id} currentStatus={row.status} />
        </div>
      </div>

      <RegistrationDetailForm
        registrationId={row.id}
        guest={row.guests}
        registration={{
          registration_number: row.registration_number,
          tourist_tax_amount: row.tourist_tax_amount,
          tourist_tax_paid: row.tourist_tax_paid,
        }}
        documentSignedUrl={documentSignedUrl}
      />
    </div>
  )
}
