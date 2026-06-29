import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RoomTypePriceForm from './RoomTypePriceForm'

interface RoomType {
  id: string
  name: string
  base_price: number
  description: string | null
  max_occupancy: number
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id, name, base_price, description, max_occupancy')
    .order('base_price')

  const types = (roomTypes ?? []) as RoomType[]

  const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? '—'

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#E8E8F0]">Ayarlar</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-admin-muted)' }}>
          Oda fiyatları ve otel konfigürasyonu
        </p>
      </div>

      {/* Oda Tipi Fiyatları */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h2 className="text-sm font-semibold text-[#E8E8F0]">Oda Tipi Fiyatları</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            Değişiklik anında aktif olur — yeni rezervasyonlara yansır
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {types.map((rt) => (
            <RoomTypePriceForm key={rt.id} id={rt.id} name={rt.name} basePrice={rt.base_price} />
          ))}
          {types.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>
              Oda tipi bulunamadı. Veritabanı seed verisi eksik olabilir.
            </p>
          )}
        </div>
      </div>

      {/* Email Bildirim Ayarları */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h2 className="text-sm font-semibold text-[#E8E8F0]">Email Bildirimleri</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            Vercel ortam değişkenlerinden okunur
          </p>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--color-admin-muted)' }}>Admin bildirim e-postası</span>
            <span className="font-mono text-xs text-[#E8E8F0]">{ADMIN_EMAIL}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--color-admin-muted)' }}>Resend API</span>
            <span
              className="text-xs font-semibold"
              style={{ color: process.env.RESEND_API_KEY ? '#86EFAC' : '#FCA5A5' }}
            >
              {process.env.RESEND_API_KEY ? 'Bağlı ✓' : 'Ayarlanmamış — email gönderilmez'}
            </span>
          </div>
          <div
            className="mt-2 p-3 rounded-lg text-xs space-y-1"
            style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-admin-muted)' }}
          >
            <p className="font-semibold text-[#E8E8F0]">Vercel ortam değişkenlerine şunları ekle:</p>
            <p className="font-mono">RESEND_API_KEY=re_xxxxxxxxxxxx</p>
            <p className="font-mono">ADMIN_NOTIFICATION_EMAIL=a.kenja3683@gmail.com</p>
            <p className="font-mono">EMAIL_FROM=Anor Avenue Hotel &lt;noreply@seninadresi.com&gt;</p>
          </div>
        </div>
      </div>

      {/* Otel Bilgileri (Bilgi amaçlı) */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h2 className="text-sm font-semibold text-[#E8E8F0]">Otel Bilgileri</h2>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          {[
            ['Otel Adı', 'Anor Avenue Hotel'],
            ['Şehir', 'Taşkent, Özbekistan'],
            ['Oda Sayısı', '10-12 oda, 4 kat'],
            ['Para Birimi', 'UZS (Özbek Somu)'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color: 'var(--color-admin-muted)' }}>{k}</span>
              <span className="text-[#E8E8F0]">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
