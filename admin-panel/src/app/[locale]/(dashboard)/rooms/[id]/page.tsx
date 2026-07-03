import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { addRoomItemAction, deleteRoomItemAction } from '@/app/[locale]/(dashboard)/rooms/actions'
import type { RoomItem } from '@/types/hotel'

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
            Oda #{room.room_number} — Eşyalar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {room.room_types?.name ?? ''} · {room.floor < 0 ? 'Bodrum' : `${room.floor}. Kat`}
          </p>
        </div>
      </div>

      {/* Mevcut eşyalar */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Henüz eşya eklenmedi.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eşya</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adet</th>
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
                        title="Sil"
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

      {/* Yeni eşya ekle */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Yeni Eşya Ekle</h2>
        <form
          action={async (fd: FormData) => { 'use server'; await addRoomItemAction(id, fd) }}
          className="flex gap-2"
        >
          <input
            name="name"
            placeholder="Eşya adı"
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
            Ekle
          </button>
        </form>
      </div>
    </div>
  )
}
