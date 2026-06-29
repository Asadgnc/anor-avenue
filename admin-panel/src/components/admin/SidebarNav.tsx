'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  BedDouble,
  Users,
  Sparkles,
  CreditCard,
  BarChart3,
  LogOut,
  ClipboardList,
  Menu,
  X,
  Settings,
  UserCog,
} from 'lucide-react'
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
  { href: '/staff', label: 'Personel', icon: UserCog },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
] as const

export default function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navContent = (
    <>
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
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
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
    </>
  )

  return (
    <>
      {/* ── Mobil üst bar ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{ backgroundColor: 'var(--color-admin-sidebar)', borderColor: 'var(--color-admin-border)' }}
      >
        <p className="font-bold text-sm tracking-wider" style={{ color: 'var(--color-accent)' }}>
          ANOR AVENUE
        </p>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg"
          style={{ color: 'var(--color-admin-muted)' }}
          aria-label="Menü aç"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobil overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobil drawer / Desktop sidebar ── */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto w-64 md:w-56 flex flex-col border-r min-h-screen shrink-0 transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          backgroundColor: 'var(--color-admin-sidebar)',
          borderColor: 'var(--color-admin-border)',
        }}
      >
        {/* Mobilde kapat butonu */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-3 right-3 p-2 rounded-lg"
          style={{ color: 'var(--color-admin-muted)' }}
          aria-label="Menü kapat"
        >
          <X size={18} />
        </button>

        {navContent}
      </aside>
    </>
  )
}
