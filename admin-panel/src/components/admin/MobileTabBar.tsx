'use client'

// Mobile bottom navigation (phones only, lg:hidden) — thumb-reach access to
// the most used sections per role. Desktop keeps the sidebar; the drawer
// hamburger stays for everything else.

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import {
  Home,
  CalendarDays,
  BedDouble,
  Sparkles,
  Package,
  Wallet,
  Receipt,
} from 'lucide-react'

interface Props {
  role: string
}

interface TabItem {
  href: string
  labelKey: string
  icon: React.ReactNode
}

function tabsForRole(role: string): TabItem[] {
  if (role === 'housekeeper') {
    return [
      { href: '/dashboard', labelKey: 'dashboard', icon: <Home size={20} /> },
      { href: '/housekeeping', labelKey: 'housekeeping', icon: <Sparkles size={20} /> },
      { href: '/depo', labelKey: 'warehouse', icon: <Package size={20} /> },
    ]
  }
  if (role === 'accountant') {
    return [
      { href: '/dashboard', labelKey: 'dashboard', icon: <Home size={20} /> },
      { href: '/finance', labelKey: 'moduleAccounting', icon: <Wallet size={20} /> },
      { href: '/payments', labelKey: 'payments', icon: <Receipt size={20} /> },
    ]
  }
  // admin + receptionist
  return [
    { href: '/dashboard', labelKey: 'dashboard', icon: <Home size={20} /> },
    { href: '/reservations', labelKey: 'calendar', icon: <CalendarDays size={20} /> },
    { href: '/rooms', labelKey: 'rooms', icon: <BedDouble size={20} /> },
    { href: '/housekeeping', labelKey: 'housekeeping', icon: <Sparkles size={20} /> },
  ]
}

export default function MobileTabBar({ role }: Props) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const tabs = tabsForRole(role)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      style={{ boxShadow: '0 -2px 12px rgba(15, 23, 42, 0.08)' }}
    >
      {tabs.map((tab) => {
        const active =
          tab.href === '/dashboard'
            ? pathname === '/dashboard' || pathname === '/'
            : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              active ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {tab.icon}
            <span className="truncate">{t(tab.labelKey)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
