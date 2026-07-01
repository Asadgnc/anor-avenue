import Link from 'next/link'
import { Search, Bell, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DashboardTopbarProps {
  title: string
  subtitle: string
  userName: string
  roleLabel: string
  pendingReservations: number
  pendingPayments: number
}

export default function DashboardTopbar({
  title,
  subtitle,
  userName,
  roleLabel,
  pendingReservations,
  pendingPayments,
}: DashboardTopbarProps) {
  const initial = userName.charAt(0).toUpperCase() || '?'

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm mt-0.5 capitalize text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-full w-64 bg-card ring-1 ring-foreground/10">
          <Search size={15} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Rezervasyon, misafir ara...</span>
        </div>

        <Link
          href="/reservations/list?status=pending"
          className="relative w-10 h-10 rounded-full flex items-center justify-center bg-card ring-1 ring-foreground/10"
          aria-label="Bekleyen rezervasyonlar"
        >
          <Bell size={16} className="text-foreground" />
          {pendingReservations > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 justify-center bg-destructive text-white">
              {pendingReservations > 9 ? '9+' : pendingReservations}
            </Badge>
          )}
        </Link>

        <Link
          href="/payments"
          className="relative w-10 h-10 rounded-full flex items-center justify-center bg-card ring-1 ring-foreground/10"
          aria-label="Bekleyen ödemeler"
        >
          <Mail size={16} className="text-foreground" />
          {pendingPayments > 0 && (
            <Badge variant="warning" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 justify-center">
              {pendingPayments > 9 ? '9+' : pendingPayments}
            </Badge>
          )}
        </Link>

        <div className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full bg-card ring-1 ring-foreground/10">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-primary-foreground bg-primary shrink-0">
            {initial}
          </span>
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-semibold truncate max-w-[140px] text-foreground">{userName}</p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
