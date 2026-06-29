'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateReservationAction } from './actions'

interface ReservationEditProps {
  reservationId: string
  checkIn: string
  checkOut: string
  adults: number
  roomRate: number
  specialRequests: string | null
  notes: string | null
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const inputStyle = {
  backgroundColor: 'var(--color-admin-bg)',
  color: '#E8E8F0',
  borderColor: 'var(--color-admin-border)',
}

export default function EditReservationFormClient(props: ReservationEditProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await updateReservationAction(props.reservationId, new FormData(e.currentTarget))
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setEditing(false)
      router.refresh()
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80"
        style={{ color: 'var(--color-accent)', borderColor: 'var(--color-admin-border)' }}
      >
        Rezervasyonu Düzenle
      </button>
    )
  }

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
          Rezervasyon Düzenle
        </p>
        <button
          onClick={() => { setEditing(false); setError(null) }}
          className="text-xs px-2 py-1 rounded-lg hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)' }}
        >
          ✕
        </button>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#450A0A', color: '#FCA5A5' }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
              Giriş Tarihi
            </label>
            <input name="checkIn" type="date" defaultValue={props.checkIn} required className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
              Çıkış Tarihi
            </label>
            <input name="checkOut" type="date" defaultValue={props.checkOut} required className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
              Yetişkin Sayısı
            </label>
            <input name="adults" type="number" min={1} max={10} defaultValue={props.adults} required className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
              Gecelik Fiyat (UZS)
            </label>
            <input name="roomRate" type="number" min={1} defaultValue={props.roomRate} required className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
            Özel İstekler
          </label>
          <textarea
            name="specialRequests"
            defaultValue={props.specialRequests ?? ''}
            rows={2}
            className={inputCls}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
            Notlar (dahili)
          </label>
          <textarea
            name="notes"
            defaultValue={props.notes ?? ''}
            rows={2}
            className={inputCls}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setError(null) }}
            className="px-4 py-2 rounded-lg text-sm border transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-admin-muted)', borderColor: 'var(--color-admin-border)' }}
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  )
}
