import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import RoomInspectionForm from '@/components/admin/RoomInspectionForm'
import type { RoomItem, RoomInspection } from '@/types/hotel'

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

interface InspectionRow {
  id: string
  all_ok: boolean
  problem_note: string | null
  damage_ok: boolean
  damage_note: string | null
  missing_items: Array<{ item_id: string; name: string; note?: string }>
  created_at: string
  profiles: { full_name: string } | null
}

export default async function RoomInspectionPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getLocale()
  const t = await getTranslations('housekeeping.inspection')
  const tFloor = await getTranslations('rooms.floors')
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const floorLabel = (floor: number): string => {
    if (floor === -1) return tFloor('basement')
    if (floor === 2) return tFloor('floor2')
    if (floor === 3) return tFloor('floor3')
    if (floor === 4) return tFloor('floor4')
    return tFloor('floorN', { floor })
  }

  const [roomResult, itemsResult, inspectionsResult, activeResResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, room_number, floor, cleaning_status, room_types(name)')
      .eq('id', roomId)
      .single(),
    supabase
      .from('room_items')
      .select('id, room_id, name, expected_qty, sort_order, created_at')
      .eq('room_id', roomId)
      .order('sort_order'),
    supabase
      .from('room_inspections')
      .select('id, all_ok, problem_note, damage_ok, damage_note, missing_items, created_at, profiles(full_name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('reservations')
      .select('id, reservation_code, guests(first_name, last_name)')
      .eq('room_id', roomId)
      .eq('status', 'checked_in')
      .maybeSingle(),
  ])

  if (!roomResult.data) notFound()

  type RoomRow = {
    id: string
    room_number: string
    floor: number
    cleaning_status: string
    room_types: { name: string } | null
  }

  const room = roomResult.data as unknown as RoomRow
  const items = (itemsResult.data ?? []) as unknown as RoomItem[]
  const inspections = (inspectionsResult.data ?? []) as unknown as InspectionRow[]
  const activeReservation = activeResResult.data as {
    id: string
    reservation_code: string
    guests: { first_name: string; last_name: string } | null
  } | null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/housekeeping"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t('title', { number: room.room_number })}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {room.room_types?.name ?? ''} · {floorLabel(room.floor)}
            {activeReservation && (
              <span className="ml-2 text-amber-700 font-medium">
                · {activeReservation.guests
                    ? `${activeReservation.guests.first_name} ${activeReservation.guests.last_name}`
                    : activeReservation.reservation_code} {t('staying')}
              </span>
            )}
          </p>
        </div>
      </div>

      <RoomInspectionForm
        roomId={roomId}
        reservationId={activeReservation?.id}
        items={items}
      />

      {/* Past inspections */}
      {inspections.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            {t('pastInspections')}
          </h2>
          <div className="space-y-3">
            {inspections.map((ins) => (
              <div
                key={ins.id}
                className="rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{ins.profiles?.full_name ?? t('unknown')}</span>
                  <span>{new Date(ins.created_at).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${ins.all_ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {ins.all_ok ? t('noProblem') : t('hasProblem')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${ins.damage_ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {ins.damage_ok ? t('noDamage') : t('hasDamage')}
                  </span>
                  {(ins.missing_items as RoomInspection['missing_items']).length > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                      {t('missingItems', { n: (ins.missing_items as RoomInspection['missing_items']).length })}
                    </span>
                  )}
                </div>
                {ins.problem_note && (
                  <p className="text-xs text-foreground">{t('problemNote', { note: ins.problem_note })}</p>
                )}
                {ins.damage_note && (
                  <p className="text-xs text-foreground">{t('damageNote', { note: ins.damage_note })}</p>
                )}
                {(ins.missing_items as RoomInspection['missing_items']).length > 0 && (
                  <p className="text-xs text-foreground">
                    {t('missingNote', { list: (ins.missing_items as RoomInspection['missing_items']).map((m) => m.name).join(', ') })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
