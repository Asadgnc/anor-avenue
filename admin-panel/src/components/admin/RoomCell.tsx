'use client'

// Dashboard oda ızgarasındaki tek oda kartı — tıklanınca sağdan panel açar.
// Panel açılınca oda detayını (aktif konaklama + geçmiş) lazy yükler.

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  getRoomDetailAction,
  type RoomDetail,
} from '@/components/admin/room-detail/actions'
import RoomDetailPanel from '@/components/admin/room-detail/RoomDetailPanel'

interface RoomCellProps {
  room: { id: string; room_number: string; floor: number; status: string }
  role: string
  dotClass: string
  statusLabel: string
}

export default function RoomCell({ room, role, dotClass, statusLabel }: RoomCellProps) {
  const t = useTranslations('roomDetail')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<RoomDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const res = await getRoomDetailAction(room.id)
    if (res.error || !res.detail) setError(res.error ?? 'error')
    else setDetail(res.detail)
    setLoading(false)
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setDetail(null)
      void load()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="flex-1 min-w-[84px] rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50 hover:border-foreground/20"
          >
            <span className="flex items-center gap-1.5">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
              <span className="text-sm font-medium text-foreground">{room.room_number}</span>
            </span>
            <span className="block text-[11px] mt-0.5 text-muted-foreground">{statusLabel}</span>
          </button>
        }
      />

      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle>
            {t('title', { room: room.room_number })}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
        </SheetHeader>

        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="animate-spin" size={22} />
            </div>
          )}
          {error && !loading && (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          )}
          {detail && !loading && (
            <RoomDetailPanel
              detail={detail}
              role={role}
              onChanged={load}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
