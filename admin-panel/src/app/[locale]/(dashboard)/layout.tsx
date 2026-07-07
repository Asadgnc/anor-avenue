import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import SidebarNav from '@/components/admin/SidebarNav'
import AppTopbar from '@/components/admin/AppTopbar'
import RealtimeRefresher from '@/components/admin/RealtimeRefresher'
import { getTranslations } from 'next-intl/server'
import { logoutAction } from '@/app/actions/logout'

export const dynamic = 'force-dynamic'

const KNOWN_ROLES = ['admin', 'receptionist', 'housekeeper', 'accountant']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('roles')

  const ROLE_LABELS: Record<string, string> = {
    admin: t('admin'),
    receptionist: t('receptionist'),
    housekeeper: t('housekeeper'),
    accountant: t('accountant'),
  }

  // Middleware oturumu her istekte ağ üzerinden doğruluyor; burada JWT yerel okunur.
  const auth = await getAuthClaims()

  // No insecure fallback: an unknown/unassigned role gets an "unauthorized" screen.
  const role = auth?.role ?? ''

  if (!KNOWN_ROLES.includes(role)) {
    const tu = await getTranslations('unauthorized')
    const tn = await getTranslations('nav')
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-4 rounded-2xl bg-card p-8 ring-1 ring-foreground/10">
          <h1 className="text-lg font-semibold text-foreground">{tu('title')}</h1>
          <p className="text-sm text-muted-foreground">{tu('message')}</p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground"
            >
              {tn('logout')}
            </button>
          </form>
        </div>
      </div>
    )
  }
  const userEmail = auth?.email ?? ''
  const userName = auth?.fullName || (userEmail ? userEmail.split('@')[0] : 'User')

  // 3 ayrı count sorgusu yerine tek RPC (docs/migrations/025_dashboard_rpc.sql)
  const supabase = await createClient()
  const { data: badgeData } = await supabase.rpc('get_nav_badges')
  const navBadges = (badgeData ?? {}) as {
    pendingReservations?: number
    pendingPayments?: number
    pendingRequests?: number
  }

  const badges = {
    reservations: navBadges.pendingReservations ?? 0,
    payments: navBadges.pendingPayments ?? 0,
  }
  const stockRequests = navBadges.pendingRequests ?? 0

  return (
    <div className="min-h-screen flex bg-background">
      <SidebarNav role={role} userEmail={userEmail} badges={badges} />
      <div className="flex-1 min-w-0 flex flex-col">
        <AppTopbar
          userName={userName}
          roleLabel={ROLE_LABELS[role] ?? role}
          role={role}
          pendingReservations={badges.reservations}
          pendingPayments={badges.payments}
          stockRequests={stockRequests}
        />
        <RealtimeRefresher />
        {/* pt-[calc(3.5rem+1rem)] = mobil top bar (56px) + padding */}
        <main className="px-4 md:px-8 py-4 md:py-6 pt-[calc(3.5rem+1rem)] md:pt-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
