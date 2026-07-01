import { createClient } from '@/lib/supabase-server'
import SidebarNav from '@/components/admin/SidebarNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = (user?.user_metadata?.role as string | undefined) ?? 'receptionist'
  const userEmail = user?.email ?? ''

  const [pendingReservations, pendingPayments] = await Promise.all([
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const badges = {
    reservations: pendingReservations.count ?? 0,
    payments: pendingPayments.count ?? 0,
  }

  return (
    <div className="min-h-screen flex bg-muted/40">
      <SidebarNav role={role} userEmail={userEmail} badges={badges} />
      {/* pt-[calc(3.5rem+1rem)] = mobil top bar (56px) + padding */}
      <main className="flex-1 min-w-0 px-4 md:px-8 py-4 md:py-8 pt-[calc(3.5rem+1rem)] md:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
