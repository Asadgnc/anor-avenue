'use client'

import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
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
  Package,
  Leaf,
  Wallet,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'

type UserRole = 'admin' | 'manager' | 'receptionist' | 'housekeeper' | 'accountant'

type BadgeKey = 'reservations' | 'payments'

type NavLink = {
  href: string
  labelKey: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles: UserRole[]
  badgeKey?: BadgeKey
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',             labelKey: 'dashboard',        icon: LayoutDashboard, roles: ['admin', 'manager', 'receptionist', 'housekeeper', 'accountant'] },
  { href: '/reservations',          labelKey: 'calendar',         icon: CalendarDays,    roles: ['admin', 'manager', 'receptionist'] },
  { href: '/reservations/list',     labelKey: 'reservationList',  icon: List,            roles: ['admin', 'manager', 'receptionist'], badgeKey: 'reservations' },
  { href: '/reservations/new',      labelKey: 'newReservation',   icon: Plus,            roles: ['admin', 'manager', 'receptionist'] },
  { href: '/rooms',                 labelKey: 'rooms',            icon: BedDouble,       roles: ['admin', 'manager', 'receptionist'] },
  { href: '/guests',                labelKey: 'guests',           icon: Users,           roles: ['admin', 'manager', 'receptionist'] },
  { href: '/registrations',         labelKey: 'registrations',    icon: ClipboardList,   roles: ['admin', 'manager', 'receptionist'] },
  { href: '/housekeeping',          labelKey: 'housekeeping',     icon: Sparkles,        roles: ['admin', 'manager', 'receptionist', 'housekeeper'] },
  { href: '/housekeeping/overview', labelKey: 'dailyOverview',    icon: CalendarCheck,   roles: ['admin', 'manager', 'receptionist', 'housekeeper'] },
  { href: '/payments',              labelKey: 'payments',         icon: CreditCard,      roles: ['admin', 'manager', 'receptionist', 'accountant'], badgeKey: 'payments' },
  { href: '/reports',               labelKey: 'reports',          icon: BarChart3,       roles: ['admin', 'manager', 'accountant'] },
  { href: '/depo',                  labelKey: 'warehouse',        icon: Package,         roles: ['admin', 'manager', 'receptionist', 'housekeeper', 'accountant'] },
  { href: '/garden',                labelKey: 'garden',           icon: Leaf,            roles: ['admin', 'manager', 'receptionist', 'housekeeper'] },
  { href: '/finance',               labelKey: 'cashFlow',         icon: Wallet,          roles: ['admin'] },
  { href: '/staff',                 labelKey: 'staff',            icon: UserCog,         roles: ['admin'] },
  { href: '/settings',              labelKey: 'settings',         icon: Settings,        roles: ['admin'] },
]

type Props = {
  role: string
  userEmail: string
  badges?: Partial<Record<BadgeKey, number>>
}

export default function SidebarNav({ role, userEmail, badges = {} }: Props) {
  const userRole = (role as UserRole) ?? 'receptionist'
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const tRoles = useTranslations('roles')
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
          <p className="font-semibold text-sm tracking-wide text-sidebar-foreground leading-tight">
            {t('brandName')}
          </p>
          <p className="text-[11px] leading-tight text-sidebar-foreground/55">
            {t('title')}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {visibleLinks.map(({ href, labelKey, icon: Icon, badgeKey }) => {
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
              <span className="flex-1">{t(labelKey as Parameters<typeof t>[0])}</span>
              {!!badgeValue && (
                <span className="text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center bg-destructive text-white">
                  {badgeValue > 99 ? '99+' : badgeValue}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer — user info + logout */}
      <div className="px-3 py-4 space-y-2">
        <div className="px-3.5 py-3 rounded-lg space-y-0.5 bg-sidebar-accent">
          <p className="text-xs text-sidebar-foreground truncate leading-tight">{userEmail}</p>
          <span className="text-[11px] font-semibold text-sidebar-foreground/60">
            {tRoles(userRole as Parameters<typeof tRoles>[0])}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm w-full transition-colors duration-150 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut size={16} />
          {t('logout')}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-sidebar text-sidebar-foreground">
        <p className="font-semibold text-sm tracking-wide">{t('brandName')}</p>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg"
          aria-label={t('openMenu')}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="bg-sidebar text-sidebar-foreground border-sidebar-border p-0 w-64 flex flex-col gap-0 [&_[data-slot=sheet-close]]:text-sidebar-foreground [&_[data-slot=sheet-close]]:hover:bg-sidebar-accent [&_[data-slot=sheet-close]]:hover:text-sidebar-foreground">
          {navContent}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar — full height, separated by thin border on the right */}
      <aside className="hidden md:flex md:sticky md:top-0 w-64 md:h-screen flex-col shrink-0 self-start bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        {navContent}
      </aside>
    </>
  )
}
