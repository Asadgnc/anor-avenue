import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import InviteFormClient from './InviteFormClient'
import DeleteStaffButton from './DeleteStaffButton'
import ChangeRoleSelect from './ChangeRoleSelect'

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

const ROLE_COLORS: Record<string, string> = {
  admin:        'var(--color-accent)',
  manager:      '#3B82F6',
  receptionist: '#22C55E',
  housekeeper:  '#F59E0B',
  accountant:   '#FD5070',
}

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const t = await getTranslations('staff')

  const service = createServiceClient()

  // Fetch all auth users
  const { data: usersData } = await service.auth.admin.listUsers()
  const authUsers = usersData?.users ?? []

  // Fetch name + role from the profiles table (source of truth)
  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, role')

  const profileMap = new Map(profiles?.map((p) => [p.id, p]))

  // Merge the two
  const users = authUsers.map((u) => {
    const profile = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      fullName: profile?.full_name ?? '—',
      // profiles table is the primary source; fall back to user_metadata
      role: (profile?.role ?? u.user_metadata?.role ?? 'receptionist') as string,
      lastSignIn: u.last_sign_in_at ?? null,
    }
  })

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-admin-muted)' }}>
          {t('subtitle')}
        </p>
      </div>

      {/* Invite form */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('inviteSection.title')}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            {t('inviteSection.subtitle')}
          </p>
        </div>
        <InviteFormClient />
      </div>

      {/* User list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{ backgroundColor: 'var(--color-admin-bg)', borderBottom: '1px solid var(--color-admin-border)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>
            {t('activeAccounts')}
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
            {t('empty')}
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
                  {/* Name + Email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">
                      {u.fullName}
                      {isMe && (
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-admin-muted)' }}>
                          {t('meBadge')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-admin-muted)' }}>
                      {u.email}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)', opacity: 0.7 }}>
                      {u.lastSignIn
                        ? t('lastSignIn', { date: new Date(u.lastSignIn).toLocaleString(dateLocale) })
                        : t('neverSignedIn')}
                    </p>
                  </div>

                  {/* Role + Change + Delete */}
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

      {/* Role descriptions */}
      <div
        className="rounded-lg p-4 text-xs space-y-1"
        style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-admin-muted)' }}
      >
        <p className="font-semibold text-foreground">{t('rolesSection')}</p>
        <p><span className="font-mono" style={{ color: 'var(--color-accent)' }}>admin</span> — {t('roleDescriptions.admin')}</p>
        <p><span className="font-mono" style={{ color: '#3B82F6' }}>manager</span> — {t('roleDescriptions.manager')}</p>
        <p><span className="font-mono" style={{ color: '#22C55E' }}>receptionist</span> — {t('roleDescriptions.receptionist')}</p>
        <p><span className="font-mono" style={{ color: '#F59E0B' }}>housekeeper</span> — {t('roleDescriptions.housekeeper')}</p>
        <p><span className="font-mono" style={{ color: '#FD5070' }}>accountant</span> — {t('roleDescriptions.accountant')}</p>
      </div>
    </div>
  )
}
