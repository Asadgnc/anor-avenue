import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import RoomTypePriceForm from './RoomTypePriceForm'
import HotelProfileForm from './HotelProfileForm'

interface RoomType {
  id: string
  name: string
  base_price: number
  description: string | null
  max_occupancy: number
}

interface HotelSettings {
  hotel_name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  checkin_time: string
  checkout_time: string
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${await getLocale()}/login`)

  const t = await getTranslations('settings')

  const service = createServiceClient()

  const [{ data: roomTypes }, { data: hotelRow }] = await Promise.all([
    supabase.from('room_types').select('id, name, base_price, description, max_occupancy').order('base_price'),
    service.from('hotel_settings').select('*').eq('id', 1).single(),
  ])

  const types = (roomTypes ?? []) as RoomType[]
  const hotel = (hotelRow ?? {
    hotel_name: 'Anor Avenue Hotel',
    address: 'Toshkent, O\'zbekiston',
    phone: '',
    email: '',
    website: '',
    checkin_time: '14:00',
    checkout_time: '12:00',
  }) as HotelSettings

  const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? '—'

  return (
    <div className="space-y-8 max-w-2xl">
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

      {/* Room type prices */}
      <div
        className="rounded-2xl"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h2 className="text-sm font-semibold text-foreground">{t('roomTypePrices.title')}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            {t('roomTypePrices.subtitle')}
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {types.map((rt) => (
            <RoomTypePriceForm key={rt.id} id={rt.id} name={rt.name} basePrice={rt.base_price} />
          ))}
          {types.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>
              {t('roomTypePrices.empty')}
            </p>
          )}
        </div>
      </div>

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
