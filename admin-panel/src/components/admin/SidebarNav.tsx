'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Plus, BedDouble, Users, Sparkles, CreditCard, BarChart3, LogOut, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reservations', label: 'Rezervasyonlar', icon: CalendarDays },
  { href: '/reservations/new', label: 'Yeni Rezervasyon', icon: Plus },
  { href: '/rooms', label: 'Odalar', icon: BedDouble },
  { href: '/guests', label: 'Misafirler', icon: Users },
  { href: '/registrations', label: 'Kayıt (Reg.)', icon: ClipboardList },
  { href: '/housekeeping', label: 'Temizlik', icon: Sparkles },
  { href: '/payments', label: 'Ödemeler', icon: CreditCard },
  { href: '/reports', label: 'Raporlar', icon: BarChart3 },
] as const

export default function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="w-56 shrink-0 flex flex-col border-r min-h-screen"
      style={{ backgroundColor: 'var(--color-admin-sidebar)', borderColor: 'var(--color-admin-border)' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'var(--color-admin-border)' }}>
        <p className="font-bold text-sm tracking-wider" style={{ color: 'var(--color-accent)' }}>
          ANOR AVENUE
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
          Yönetim Paneli
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: active ? '#1E1E3A' : 'transparent',
                color: active ? '#E8E8F0' : 'var(--color-admin-muted)',
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: 'var(--color-admin-border)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors hover:bg-red-900/20"
          style={{ color: 'var(--color-admin-muted)' }}
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
        <p className="text-xs px-3" style={{ color: 'var(--color-admin-muted)' }}>v0.1 · Geliştirme</p>
      </div>
    </aside>
  )
}
