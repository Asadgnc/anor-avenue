'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  List,
  Plus,
  BedDouble,
  Users,
  Sparkles,
  CreditCard,
  BarChart3,
  LogOut,
  ClipboardList,
  Menu,
  Settings,
  UserCog,
  Hotel,
  CalendarCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'

type UserRole = 'admin' | 'manager' | 'receptionist' | 'housekeeper' | 'accountant'

type BadgeKey = 'reservations' | 'payments'

type NavLink = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles: UserRole[]
  badgeKey?: BadgeKey
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',          label: 'Dashboard',            icon: LayoutDashboard, roles: ['admin', 'manager', 'receptionist', 'housekeeper', 'accountant'] },
  { href: '/reservations',       label: 'Takvim',               icon: CalendarDays,    roles: ['admin', 'manager', 'receptionist'] },
  { href: '/reservations/list',  label: 'Rezervasyon Listesi',  icon: List,            roles: ['admin', 'manager', 'receptionist'], badgeKey: 'reservations' },
  { href: '/reservations/new',   label: 'Yeni Rezervasyon',     icon: Plus,            roles: ['admin', 'manager', 'receptionist'] },
  { href: '/rooms',              label: 'Odalar',               icon: BedDouble,       roles: ['admin', 'manager', 'receptionist'] },
  { href: '/guests',             label: 'Misafirler',           icon: Users,           roles: ['admin', 'manager', 'receptionist'] },
  { href: '/registrations',      label: 'Kayıt (Reg.)',         icon: ClipboardList,   roles: ['admin', 'manager', 'receptionist'] },
  { href: '/housekeeping',       label: 'Temizlik',             icon: Sparkles,        roles: ['admin', 'manager', 'receptionist', 'housekeeper'] },
  { href: '/housekeeping/overview', label: 'Günlük Özet',       icon: CalendarCheck,   roles: ['admin', 'manager', 'receptionist', 'housekeeper'] },
  { href: '/payments',           label: 'Ödemeler',             icon: CreditCard,      roles: ['admin', 'manager', 'receptionist', 'accountant'], badgeKey: 'payments' },
  { href: '/reports',            label: 'Raporlar',             icon: BarChart3,       roles: ['admin', 'manager', 'accountant'] },
  { href: '/staff',              label: 'Personel',             icon: UserCog,         roles: ['admin'] },
  { href: '/settings',           label: 'Ayarlar',              icon: Settings,        roles: ['admin'] },
]

const ROLE_LABELS: Record<UserRole, string> = {
  admin:        'Admin',
  manager:      'Müdür',
  receptionist: 'Resepsiyon',
  housekeeper:  'Temizlik',
  accountant:   'Muhasebeci',
}

type Props = {
  role: string
  userEmail: string
  badges?: Partial<Record<BadgeKey, number>>
}

export default function SidebarNav({ role, userEmail, badges = {} }: Props) {
  const userRole = (role as UserRole) ?? 'receptionist'
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleLinks = NAV_LINKS.filter((link) => link.roles.includes(userRole))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-sidebar-primary">
          <Hotel size={18} className="text-sidebar-primary-foreground" />
        </span>
        <div>
          <p className="font-semibold text-sm tracking-wide text-sidebar-foreground leading-tight">Anor Avenue</p>
          <p className="text-[11px] leading-tight text-sidebar-foreground/55">
            Yönetim Paneli
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {visibleLinks.map(({ href, label, icon: Icon, badgeKey }) => {
          const exactOnly = ['/dashboard', '/reservations', '/reservations/list', '/reservations/new', '/housekeeping']
          const active = exactOnly.includes(href)
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/')
          const badgeValue = badgeKey ? badges[badgeKey] : undefined
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon size={16} className={active ? 'text-sidebar-primary' : undefined} />
              <span className="flex-1">{label}</span>
              {!!badgeValue && (
                <span className="text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center bg-destructive text-white">
                  {badgeValue > 99 ? '99+' : badgeValue}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer — kullanıcı bilgisi + çıkış */}
      <div className="px-3 py-4 space-y-2">
        <div className="px-3.5 py-3 rounded-lg space-y-0.5 bg-sidebar-accent">
          <p className="text-xs text-sidebar-foreground truncate leading-tight">{userEmail}</p>
          <span className="text-[11px] font-semibold text-sidebar-foreground/60">
            {ROLE_LABELS[userRole] ?? role}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm w-full transition-colors duration-150 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Mobil üst bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-sidebar text-sidebar-foreground">
        <p className="font-semibold text-sm tracking-wide">Anor Avenue</p>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg"
          aria-label="Menü aç"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobil drawer ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="bg-sidebar text-sidebar-foreground border-sidebar-border p-0 w-64 flex flex-col gap-0 [&_[data-slot=sheet-close]]:text-sidebar-foreground [&_[data-slot=sheet-close]]:hover:bg-sidebar-accent [&_[data-slot=sheet-close]]:hover:text-sidebar-foreground">
          {navContent}
        </SheetContent>
      </Sheet>

      {/* ── Desktop sidebar — tam yükseklik, sağdan ince çizgiyle ayrılır ── */}
      <aside className="hidden md:flex md:sticky md:top-0 w-64 md:h-screen flex-col shrink-0 self-start bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        {navContent}
      </aside>
    </>
  )
}
