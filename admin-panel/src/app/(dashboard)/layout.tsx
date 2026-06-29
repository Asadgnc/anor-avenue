import SidebarNav from '@/components/admin/SidebarNav'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-admin-bg)' }}>
      <SidebarNav />
      {/* pt-14 = mobil top bar yüksekliği (56px), md:pt-0 = desktop'ta üst bar yok */}
      <main className="flex-1 min-w-0 px-4 md:px-8 py-4 md:py-8 pt-[calc(3.5rem+1rem)] md:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
