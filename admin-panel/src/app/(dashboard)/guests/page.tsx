import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Guest } from '@/types/hotel'

export default async function GuestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: guests } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email, phone, nationality, passport_number')
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (guests ?? []) as Guest[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E8F0]">Misafirler</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {rows.length} kayıt
          </p>
        </div>
        <Link
          href="/guests/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
        >
          + Yeni Misafir
        </Link>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: 'var(--color-admin-card)',
          borderRadius: '0.75rem',
          border: '1px solid var(--color-admin-border)',
          overflow: 'hidden',
        }}
      >
        {rows.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--color-admin-muted)' }}>
            <p className="text-4xl mb-3">👤</p>
            <p>Henüz misafir kaydı yok.</p>
            <p className="text-xs mt-1">Rezervasyon oluşturulduğunda misafirler otomatik eklenir.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                  {['Ad Soyad', 'Telefon', 'E-posta', 'Milliyet', 'Pasaport', 'İşlem'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--color-admin-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr
                    key={g.id}
                    style={{ borderBottom: '1px solid var(--color-admin-border)' }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-[#E8E8F0]">
                      {g.first_name} {g.last_name}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                      {g.phone ?? '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                      {g.email ?? '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                      {g.nationality ?? '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                      {g.passport_number ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/guests/${g.id}`}
                        className="text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        Detay →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
