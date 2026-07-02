'use client'

// Tüm panel sayfalarında görünen ortak üst bar.
// Sol: mevcut sayfanın bölüm adı (URL'den bulunur)
// Sağ: bekleyen rezervasyon/ödeme bildirimleri + kullanıcı kartı

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/reservations': 'Rezervasyon Takvimi',
  '/reservations/list': 'Rezervasyon Listesi',
  '/reservations/new': 'Yeni Rezervasyon',
  '/rooms': 'Odalar',
  '/guests': 'Misafirler',
  '/guests/new': 'Yeni Misafir',
  '/registrations': 'Misafir Kayıt (Registratsiya)',
  '/housekeeping': 'Temizlik',
  '/housekeeping/overview': 'Günlük Özet',
  '/payments': 'Ödemeler',
  '/reports': 'Raporlar',
  '/staff': 'Personel',
  '/settings': 'Ayarlar',
}

function resolveTitle(pathname: string): string {
  // En uzun eşleşen ön eki bul — /reservations/abc123 → "Rezervasyon Takvimi" yerine
  // tam eşleşme varsa onu, yoksa üst bölümün adını gösterir
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  let best = ''
  for (const route of Object.keys(ROUTE_TITLES)) {
    if (pathname.startsWith(route + '/') && route.length > best.length) best = route
  }
  if (best === '/reservations') return 'Rezervasyon Detayı'
  if (best === '/guests') return 'Misafir Detayı'
  return best ? ROUTE_TITLES[best] : 'Anor Avenue'
}

type Props = {
  userName: string
  roleLabel: string
  pendingReservations: number
  pendingPayments: number
}

export default function AppTopbar({ userName, roleLabel, pendingReservations, pendingPayments }: Props) {
  const pathname = usePathname()
  const initial = userName.charAt(0).toUpperCase() || '?'

  return (
    <header className="sticky top-0 z-30 hidden md:flex h-14 items-center justify-between gap-4 px-6 bg-card/80 backdrop-blur border-b border-border">
      <p className="text-sm font-semibold text-foreground truncate">{resolveTitle(pathname)}</p>

      <div className="flex items-center gap-2.5">
        <Link
          href="/reservations/list?status=pending"
          className="relative w-9 h-9 rounded-full flex items-center justify-center bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-shadow duration-150"
          aria-label="Bekleyen rezervasyonlar"
        >
          <Bell size={15} className="text-foreground" />
          {pendingReservations > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 justify-center bg-destructive text-white">
              {pendingReservations > 9 ? '9+' : pendingReservations}
            </Badge>
          )}
        </Link>

        <Link
          href="/payments"
          className="relative w-9 h-9 rounded-full flex items-center justify-center bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-shadow duration-150"
          aria-label="Bekleyen ödemeler"
        >
          <Mail size={15} className="text-foreground" />
          {pendingPayments > 0 && (
            <Badge variant="warning" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 justify-center">
              {pendingPayments > 9 ? '9+' : pendingPayments}
            </Badge>
          )}
        </Link>

        <div className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-card ring-1 ring-foreground/10">
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground bg-primary shrink-0">
            {initial}
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold truncate max-w-[140px] text-foreground">{userName}</p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
