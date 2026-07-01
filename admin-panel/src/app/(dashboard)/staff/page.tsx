import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import InviteFormClient from './InviteFormClient'
import DeleteStaffButton from './DeleteStaffButton'
import ChangeRoleSelect from './ChangeRoleSelect'

const ROLE_COLORS: Record<string, string> = {
  admin:        '#5B4FE9',
  manager:      '#3B82F6',
  receptionist: '#22C55E',
  housekeeper:  '#F59E0B',
  accountant:   '#FD5070',
}

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  // Tüm auth kullanıcılarını çek
  const { data: usersData } = await service.auth.admin.listUsers()
  const authUsers = usersData?.users ?? []

  // profiles tablosundan isim + rol bilgisi çek (doğru kaynak)
  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, role')

  const profileMap = new Map(profiles?.map((p) => [p.id, p]))

  // İkisini birleştir
  const users = authUsers.map((u) => {
    const profile = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      fullName: profile?.full_name ?? '—',
      // profiles tablosu birincil kaynak; yoksa user_metadata fallback
      role: (profile?.role ?? u.user_metadata?.role ?? 'receptionist') as string,
      lastSignIn: u.last_sign_in_at ?? null,
    }
  })

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#15112B]">Personel Yönetimi</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-admin-muted)' }}>
          Sisteme erişimi olan hesaplar
        </p>
      </div>

      {/* Davet Formu */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div>
          <h2 className="text-sm font-semibold text-[#15112B]">Yeni Personel Davet Et</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            Girilen e-postaya giriş bağlantısı gönderilir
          </p>
        </div>
        <InviteFormClient />
      </div>

      {/* Kullanıcı Listesi */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{ backgroundColor: 'var(--color-admin-bg)', borderBottom: '1px solid var(--color-admin-border)' }}
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
              const isMe = u.id === user.id
              return (
                <div
                  key={u.id}
                  className="px-5 py-3 flex flex-wrap items-center justify-between gap-3"
                  style={{ backgroundColor: 'var(--color-admin-card)' }}
                >
                  {/* İsim + Email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#15112B] font-medium">
                      {u.fullName}
                      {isMe && (
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-admin-muted)' }}>
                          (ben)
                        </span>
                      )}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-admin-muted)' }}>
                      {u.email}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)', opacity: 0.7 }}>
                      {u.lastSignIn
                        ? `Son giriş: ${new Date(u.lastSignIn).toLocaleString('tr-TR')}`
                        : 'Henüz giriş yapılmadı'}
                    </p>
                  </div>

                  {/* Rol + Değiştir + Sil */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {isMe ? (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          color: ROLE_COLORS[u.role] ?? '#9CA3AF',
                          backgroundColor: 'var(--color-admin-bg)',
                        }}
                      >
                        {u.role}
                      </span>
                    ) : (
                      <ChangeRoleSelect userId={u.id} currentRole={u.role} />
                    )}
                    {!isMe && <DeleteStaffButton userId={u.id} email={u.email} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rol Açıklamaları */}
      <div
        className="rounded-lg p-4 text-xs space-y-1"
        style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-admin-muted)' }}
      >
        <p className="font-semibold text-[#15112B]">Rol Erişim Seviyeleri</p>
        <p><span className="font-mono" style={{ color: '#5B4FE9' }}>admin</span> — Her şey: sistem ayarları, kullanıcı yönetimi, tüm raporlar</p>
        <p><span className="font-mono" style={{ color: '#3B82F6' }}>manager</span> — Operasyon + finans + raporlar (personel/ayarlar sınırlı)</p>
        <p><span className="font-mono" style={{ color: '#22C55E' }}>receptionist</span> — Rezervasyon, check-in/out, ödeme, misafir, temizlik</p>
        <p><span className="font-mono" style={{ color: '#F59E0B' }}>housekeeper</span> — Sadece Dashboard ve Temizlik sayfası</p>
        <p><span className="font-mono" style={{ color: '#FD5070' }}>accountant</span> — Dashboard, Ödemeler, Raporlar</p>
      </div>
    </div>
  )
}
