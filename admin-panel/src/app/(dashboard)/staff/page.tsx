import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import InviteFormClient from './InviteFormClient'
import DeleteStaffButton from './DeleteStaffButton'

const ROLE_LABELS: Record<string, string> = {
  admin:        'Admin',
  manager:      'Müdür',
  receptionist: 'Resepsiyon',
  housekeeper:  'Temizlik',
  accountant:   'Muhasebeci',
}

const ROLE_COLORS: Record<string, string> = {
  admin:        '#C9A96E',
  manager:      '#93C5FD',
  receptionist: '#86EFAC',
  housekeeper:  '#C4B5FD',
  accountant:   '#FCD34D',
}

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: usersData } = await service.auth.admin.listUsers()
  const users = usersData?.users ?? []

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#E8E8F0]">Personel Yönetimi</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-admin-muted)' }}>
          Sisteme erişimi olan hesaplar
        </p>
      </div>

      {/* Davet Formu */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold text-[#E8E8F0]">Yeni Personel Davet Et</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            Girilen e-postaya giriş bağlantısı gönderilir
          </p>
        </div>
        <InviteFormClient />
      </div>

      {/* Kullanıcı Listesi */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-admin-border)' }}
      >
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{ backgroundColor: '#16213E', borderBottom: '1px solid var(--color-admin-border)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>
            Aktif Hesaplar
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-accent)' }}
          >
            {users.length}
          </span>
        </div>

        {users.length === 0 ? (
          <p className="px-5 py-6 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            Kullanıcı bulunamadı.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
            {users.map((u) => {
              const role = (u.user_metadata?.role as string | undefined) ?? 'receptionist'
              const isMe = u.id === user.id
              return (
                <div
                  key={u.id}
                  className="px-5 py-3 flex items-center justify-between gap-4"
                  style={{ backgroundColor: 'var(--color-admin-card)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8E8F0] truncate">
                      {u.email}
                      {isMe && (
                        <span className="ml-2 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
                          (ben)
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                      {u.last_sign_in_at
                        ? `Son giriş: ${new Date(u.last_sign_in_at).toLocaleString('tr-TR')}`
                        : 'Henüz giriş yapılmadı'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        color: ROLE_COLORS[role] ?? '#9CA3AF',
                        backgroundColor: 'var(--color-admin-bg)',
                      }}
                    >
                      {ROLE_LABELS[role] ?? role}
                    </span>
                    {!isMe && <DeleteStaffButton userId={u.id} email={u.email ?? ''} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div
        className="rounded-lg p-4 text-xs space-y-1"
        style={{ backgroundColor: '#1E1E3A', color: 'var(--color-admin-muted)' }}
      >
        <p className="font-semibold text-[#E8E8F0]">Rol Açıklamaları</p>
        <p><span className="font-mono" style={{ color: '#C9A96E' }}>admin</span> — Her şey: sistem ayarları, kullanıcı yönetimi</p>
        <p><span className="font-mono" style={{ color: '#93C5FD' }}>manager</span> — Operasyon + finans + raporlar (sistem ayarları sınırlı)</p>
        <p><span className="font-mono" style={{ color: '#86EFAC' }}>receptionist</span> — Rezervasyon, check-in/out, ödeme alma</p>
        <p><span className="font-mono" style={{ color: '#C4B5FD' }}>housekeeper</span> — Sadece temizlik durumu + kendi görevleri</p>
        <p><span className="font-mono" style={{ color: '#FCD34D' }}>accountant</span> — Finans/fatura/rapor; rezervasyona dokunamaz</p>
      </div>
    </div>
  )
}
