import { createClient } from '@/lib/supabase-server'
import SidebarNav from '@/components/admin/SidebarNav'
import AppTopbar from '@/components/admin/AppTopbar'
import RealtimeRefresher from '@/components/admin/RealtimeRefresher'

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Müdür',
  receptionist: 'Resepsiyon',
  housekeeper: 'Temizlik',
  accountant: 'Muhasebeci',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = (user?.user_metadata?.role as string | undefined) ?? 'receptionist'
  const userEmail = user?.email ?? ''
  // Ek sorgu atmamak için ad, metadata'dan; yoksa e-postanın @ öncesi kullanılır
  const userName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (userEmail ? userEmail.split('@')[0] : 'Kullanıcı')

  const [pendingReservations, pendingPayments] = await Promise.all([
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const badges = {
    reservations: pendingReservations.count ?? 0,
    payments: pendingPayments.count ?? 0,
  }

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
