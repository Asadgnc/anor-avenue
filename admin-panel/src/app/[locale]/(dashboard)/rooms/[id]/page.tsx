import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { redirect, notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { addRoomItemAction, deleteRoomItemAction } from '@/app/[locale]/(dashboard)/rooms/actions'
import RoomDetailTabs from '@/components/admin/RoomDetailTabs'
import type { RoomItem } from '@/types/hotel'

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')

  const t = await getTranslations('roomItems')
  const tFloor = await getTranslations('rooms.floors')
  const floorLabel = (floor: number): string => {
    if (floor === -1) return tFloor('basement')
    if (floor === 2) return tFloor('floor2')
    if (floor === 3) return tFloor('floor3')
    if (floor === 4) return tFloor('floor4')
    return tFloor('floorN', { floor })
  }

  const [roomResult, itemsResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, room_number, floor, room_types(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('room_items')
      .select('id, room_id, name, expected_qty, sort_order, created_at')
      .eq('room_id', id)
      .order('sort_order'),
  ])

  if (!roomResult.data) notFound()

  type RoomRow = { id: string; room_number: string; floor: number; room_types: { name: string } | null }
  const room = roomResult.data as unknown as RoomRow
  const items = (itemsResult.data ?? []) as unknown as RoomItem[]

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/rooms" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t('title', { number: room.room_number })}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {room.room_types?.name ?? ''} · {floorLabel(room.floor)}
          </p>
        </div>
      </div>

      <RoomDetailTabs roomId={id} active="items" />

      {/* Existing items */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">{t('empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('itemHeader')}</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('qtyHeader')}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{item.expected_qty}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={async () => { 'use server'; await deleteRoomItemAction(item.id, id) }}>
                      <button
                        type="submit"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title={t('deleteTitle')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add new item */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">{t('addTitle')}</h2>
        <form
          action={async (fd: FormData) => { 'use server'; await addRoomItemAction(id, fd) }}
          className="flex gap-2"
        >
          <input
            name="name"
            placeholder={t('namePlaceholder')}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
            required
          />
          <input
            name="expected_qty"
            type="number"
            min="1"
            defaultValue="1"
            className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary text-center"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t('addButton')}
          </button>
        </form>
      </div>
    </div>
  )
}
