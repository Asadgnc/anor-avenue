'use client'

// Shared tab bar for the accounting ("Muhasebe") module. Links the existing money
// pages so they read as one module (Phase 4): Overview(/finance) · Income(/payments)
// · Expense(/bills) · Payroll(/payroll) · Reports(/reports). Only admin + accountant
// reach these pages (enforced by middleware + page guards).

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { LayoutGrid, CreditCard, Receipt, Banknote, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/finance',  key: 'tabOverview', icon: LayoutGrid },
  { href: '/payments', key: 'tabIncome',   icon: CreditCard },
  { href: '/bills',    key: 'tabExpense',  icon: Receipt },
  { href: '/payroll',  key: 'tabPayroll',  icon: Banknote },
  { href: '/reports',  key: 'tabReports',  icon: BarChart3 },
] as const

export default function AccountingTabs() {
  const pathname = usePathname()
  const t = useTranslations('accounting')

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {TABS.map(({ href, key, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
              active ? 'text-white' : 'hover:bg-black/5'
            )}
            style={
              active
                ? { backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }
                : { backgroundColor: 'var(--color-admin-card)', color: 'var(--color-admin-muted)', boxShadow: 'var(--shadow-card)' }
            }
          >
            <Icon size={15} />
            {t(key)}
          </Link>
        )
      })}
    </div>
  )
}
