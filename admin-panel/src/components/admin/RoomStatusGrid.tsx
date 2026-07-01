import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface RoomStatusRow {
  room_number: string
  floor: number
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'blocked'
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  available: { label: 'Müsait', dot: 'bg-green-500' },
  occupied: { label: 'Dolu', dot: 'bg-red-500' },
  cleaning: { label: 'Temizlikte', dot: 'bg-amber-500' },
  maintenance: { label: 'Bakımda', dot: 'bg-violet-500' },
  blocked: { label: 'Bakımda', dot: 'bg-violet-500' },
}

function floorLabel(floor: number): string {
  if (floor < 0) return `${floor}. Kat (Bodrum)`
  if (floor === 4) return `${floor}. Kat (Mansard)`
  return `${floor}. Kat`
}

interface RoomStatusGridProps {
  rooms: RoomStatusRow[]
}

export default function RoomStatusGrid({ rooms }: RoomStatusGridProps) {
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Oda Durumu</CardTitle>
        <span className="text-xs text-muted-foreground">{rooms.length} oda</span>
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
                .map((r) => {
                  const s = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.available
                  return (
                    <div
                      key={r.room_number}
                      className="flex-1 min-w-[84px] rounded-lg border border-border px-3 py-2.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', s.dot)} />
                        <p className="text-sm font-medium text-foreground">{r.room_number}</p>
                      </div>
                      <p className="text-[11px] mt-0.5 text-muted-foreground">{s.label}</p>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
          {(['available', 'occupied', 'cleaning', 'maintenance'] as const).map((key) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[key].dot)} />
              {STATUS_CONFIG[key].label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
