import { getAuthClaims } from '@/lib/auth-claims'
import { redirect } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import NewGuestFormClient from './NewGuestFormClient'

export default async function NewGuestPage() {
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')

  const t = await getTranslations('guests')
  const tt = await getTranslations('topbar')

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <Link
          href="/guests"
          className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)', backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
        >
          {t('detail.backLink')}
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">{tt('newGuest')}</h1>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <NewGuestFormClient />
      </div>
    </div>
  )
}
