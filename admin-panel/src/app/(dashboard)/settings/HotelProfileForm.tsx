'use client'

import { useActionState } from 'react'
import { updateHotelProfileAction, type HotelProfileState } from './actions'

interface Props {
  hotelName: string
  address: string
  phone: string
  email: string
  website: string
  checkinTime: string
  checkoutTime: string
}

const initState: HotelProfileState = {}

const inputClass = 'w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors'
const inputStyle = {
  backgroundColor: 'var(--color-admin-card)',
  color: 'var(--foreground)',
  borderColor: 'var(--color-admin-border)',
}

export default function HotelProfileForm(props: Props) {
  const [state, action, pending] = useActionState<HotelProfileState, FormData>(
    updateHotelProfileAction,
    initState
  )

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
            Otel Adı
          </label>
          <input
            name="hotel_name"
            defaultValue={props.hotelName}
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
            Adres
          </label>
          <input
            name="address"
            defaultValue={props.address}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
            Telefon
          </label>
          <input
            name="phone"
            type="tel"
            defaultValue={props.phone}
            placeholder="+998 90 000 00 00"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
            E-posta
          </label>
          <input
            name="email"
            type="email"
            defaultValue={props.email}
            placeholder="info@anor-avenue.com"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
            Web Sitesi
          </label>
          <input
            name="website"
            type="url"
            defaultValue={props.website}
            placeholder="https://anor-avenue.com"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
              Giriş Saati
            </label>
            <input
              name="checkin_time"
              type="time"
              defaultValue={props.checkinTime}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
              Çıkış Saati
            </label>
            <input
              name="checkout_time"
              type="time"
              defaultValue={props.checkoutTime}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
        >
          {pending ? 'Kaydediliyor…' : state.success ? 'Kaydedildi ✓' : 'Kaydet'}
        </button>
        {state.error && (
          <span className="text-xs" style={{ color: '#EF4444' }}>{state.error}</span>
        )}
      </div>
    </form>
  )
}
