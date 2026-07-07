import { getAuthClaims } from '@/lib/auth-claims'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import HotelProfileForm from './HotelProfileForm'
import FinanceSettingsForm from './FinanceSettingsForm'
import RoomTypePriceForm from './RoomTypePriceForm'
import ChannexSettings, { type VariantRow } from './ChannexSettings'

interface RoomType {
  id: string
  name: string
  base_price: number
}

interface HotelSettings {
  hotel_name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  checkin_time: string
  checkout_time: string
  channex_property_id: string | null
  channex_last_sync: string | null
  usd_rate: number | null
  tourist_tax_per_night: number | null
}

export default async function SettingsPage() {
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')

  const t = await getTranslations('settings')

  const service = createServiceClient()

  const [{ data: roomTypes }, { data: hotelRow }, { data: variantRows }, { data: roomRows }] = await Promise.all([
    service.from('room_types').select('id, name, base_price').order('base_price'),
    service.from('hotel_settings').select('*').eq('id', 1).single(),
    service.from('channex_variants').select('id, channex_room_type_id, channex_rate_plan_id, label, occupancy, ota_price, enabled').order('sort_order'),
    service.from('rooms').select('channex_variant_id'),
  ])

  const types = (roomTypes ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    base_price: Number(r.base_price),
  })) as RoomType[]

  const roomCount = new Map<string, number>()
  for (const r of roomRows ?? []) {
    if (r.channex_variant_id) roomCount.set(r.channex_variant_id, (roomCount.get(r.channex_variant_id) ?? 0) + 1)
  }

  const variants = (variantRows ?? []).map((v) => ({
    id: v.id,
    channex_room_type_id: v.channex_room_type_id,
    channex_rate_plan_id: v.channex_rate_plan_id,
    label: v.label,
    occupancy: v.occupancy,
    ota_price: v.ota_price != null ? Number(v.ota_price) : null,
    enabled: v.enabled,
    room_count: roomCount.get(v.id) ?? 0,
  })) as VariantRow[]

  const hotel = (hotelRow ?? {
    hotel_name: 'Anor Avenue Hotel',
    address: 'Toshkent, O\'zbekiston',
    phone: '',
    email: '',
    website: '',
    checkin_time: '14:00',
    checkout_time: '12:00',
    channex_property_id: null,
    channex_last_sync: null,
    usd_rate: 12000,
    tourist_tax_per_night: 0,
  }) as HotelSettings

  const channexConfigured = Boolean(process.env.CHANNEX_API_KEY)

  const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? '—'

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-admin-muted)' }}>
          {t('subtitle')}
        </p>
      </div>

      {/* Hotel profile */}
      <div
        className="rounded-2xl"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h2 className="text-sm font-semibold text-foreground">{t('hotelProfile.title')}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            {t('hotelProfile.subtitle')}
          </p>
        </div>
        <div className="px-5 py-4">
          <HotelProfileForm
            hotelName={hotel.hotel_name}
            address={hotel.address ?? ''}
            phone={hotel.phone ?? ''}
            email={hotel.email ?? ''}
            website={hotel.website ?? ''}
            checkinTime={hotel.checkin_time}
            checkoutTime={hotel.checkout_time}
          />
        </div>
      </div>

      {/* Finance settings — USD rate + tourist tax (admin only) */}
      <div
        className="rounded-2xl"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h2 className="text-sm font-semibold text-foreground">{t('financeSettings.title')}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            {t('financeSettings.subtitle')}
          </p>
        </div>
        <div className="px-5 py-4">
          <FinanceSettingsForm
            usdRate={Number(hotel.usd_rate ?? 12000)}
            touristTaxPerNight={Number(hotel.tourist_tax_per_night ?? 0)}
          />
        </div>
      </div>

      {/* Base category prices (our own website + admin) */}
      <div
        className="rounded-2xl"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h2 className="text-sm font-semibold text-foreground">{t('roomTypePrices.title')}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            {t('roomTypePrices.subtitle')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>
            {t('roomTypePrices.syncNote')}
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {types.map((rt) => (
            <RoomTypePriceForm key={rt.id} id={rt.id} name={rt.name} basePrice={rt.base_price} />
          ))}
          {types.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{t('roomTypePrices.empty')}</p>
          )}
        </div>
      </div>

      {/* Channex OTA variants + connection */}
      <ChannexSettings
        variants={variants}
        propertyId={hotel.channex_property_id ?? ''}
        lastSync={hotel.channex_last_sync ?? null}
        isConfigured={channexConfigured}
      />

      {/* Email notification settings */}
      <div
        className="rounded-2xl"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h2 className="text-sm font-semibold text-foreground">{t('emailNotifications.title')}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            {t('emailNotifications.subtitle')}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--color-admin-muted)' }}>{t('emailNotifications.adminEmail')}</span>
            <span className="font-mono text-xs text-foreground">{ADMIN_EMAIL}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--color-admin-muted)' }}>{t('emailNotifications.resendApi')}</span>
            <span
              className="text-xs font-semibold"
              style={{ color: process.env.RESEND_API_KEY ? '#22C55E' : '#EF4444' }}
            >
              {process.env.RESEND_API_KEY ? t('emailNotifications.connected') : t('emailNotifications.notSet')}
            </span>
          </div>
          <div
            className="mt-2 p-3 rounded-lg text-xs space-y-1"
            style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-admin-muted)' }}
          >
            <p className="font-semibold text-foreground">{t('emailNotifications.envVarsNote')}</p>
            <p className="font-mono">RESEND_API_KEY=re_xxxxxxxxxxxx</p>
            <p className="font-mono">ADMIN_NOTIFICATION_EMAIL=a.kenja3683@gmail.com</p>
            <p className="font-mono">EMAIL_FROM=Anor Avenue Hotel &lt;noreply@seninadresi.com&gt;</p>
          </div>
        </div>
      </div>
    </div>
  )
}
