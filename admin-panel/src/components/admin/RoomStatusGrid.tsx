import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import RoomCell from '@/components/admin/RoomCell'

export interface RoomStatusRow {
  id: string
  room_number: string
  floor: number
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'blocked'
}

const STATUS_DOT: Record<string, string> = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  cleaning: 'bg-amber-500',
  maintenance: 'bg-violet-500',
  blocked: 'bg-violet-500',
}

interface RoomStatusGridProps {
  rooms: RoomStatusRow[]
  /** Booking/işlem butonları yalnızca ön büro (admin/receptionist) rollerinde. */
  role: string
}

export default async function RoomStatusGrid({ rooms, role }: RoomStatusGridProps) {
  const t = await getTranslations('rooms.statusGrid')
  const tStatus = await getTranslations('status.room')
  const tFloor = await getTranslations('rooms.floors')

  const floorLabel = (floor: number): string => {
    if (floor === -1) return tFloor('basement')
    if (floor === 2) return tFloor('floor2')
    if (floor === 3) return tFloor('floor3')
    if (floor === 4) return tFloor('floor4')
    return tFloor('floorN', { floor })
  }

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('title')}</CardTitle>
        <span className="text-xs text-muted-foreground">{t('roomCount', { n: rooms.length })}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {floors.map((floor) => (
          <div key={floor}>
            <p className="text-[11px] font-medium mb-2 text-muted-foreground">
              {floorLabel(floor)}
            </p>
            <div className="flex flex-wrap gap-2">
              {rooms
                .filter((r) => r.floor === floor)
                .map((r) => (
                  <RoomCell
                    key={r.id}
                    room={r}
                    role={role}
                    dotClass={STATUS_DOT[r.status] ?? STATUS_DOT.available}
                    statusLabel={tStatus(r.status)}
                  />
                ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
          {(['available', 'occupied', 'cleaning', 'maintenance'] as const).map((key) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[key])} />
              {tStatus(key)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
