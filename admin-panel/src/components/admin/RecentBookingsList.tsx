import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowUpRight, Users2, BedDouble } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface RecentBooking {
  id: string
  reservation_code: string
  guest_name: string
  check_in: string
  adults: number
  room_number: string | null
}

interface RecentBookingsListProps {
  bookings: RecentBooking[]
}

export default async function RecentBookingsList({ bookings }: RecentBookingsListProps) {
  const t = await getTranslations('dashboard')
  const tc = await getTranslations('common')
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('recentTitle')}</CardTitle>
        <Link href="/reservations/list" className="text-xs font-medium text-primary">
          {tc('all')}
        </Link>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm py-6 text-center text-muted-foreground">{t('noBookings')}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {bookings.map((b) => (
              <Link
                key={b.id}
                href={`/reservations/${b.id}`}
                className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0 hover:opacity-70 transition-opacity"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{b.guest_name}</p>
                  <p className="text-[11px] mt-0.5 text-muted-foreground">{b.check_in}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <BedDouble size={11} /> {b.room_number ?? '—'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users2 size={11} /> {b.adults}
                    </span>
                  </div>
                </div>
                <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                  <ArrowUpRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
