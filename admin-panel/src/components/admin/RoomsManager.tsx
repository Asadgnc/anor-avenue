'use client'

import { Fragment, useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  addRoomAction,
  updateRoomAction,
  updateCleaningStatusAction,
  updateRoomStatusAction,
  type RoomFormState,
} from '@/app/[locale]/(dashboard)/rooms/actions'
import type { Room, RoomType } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOM_STATUS_COLORS = {
  available:   { color: dash.green,  bg: dash.greenLight },
  occupied:    { color: dash.red,    bg: dash.redLight },
  cleaning:    { color: dash.orange, bg: dash.orangeLight },
  maintenance: { color: dash.blue,   bg: dash.blueLight },
  blocked:     { color: dash.muted,  bg: dash.border },
} as const

const CLEANING_STATUS_COLORS = {
  clean:       { color: dash.green,   bg: dash.greenLight },
  dirty:       { color: dash.red,     bg: dash.redLight },
  in_progress: { color: dash.orange,  bg: dash.orangeLight },
  cleaned:     { color: '#0284C7',    bg: '#E0F2FE' },
  inspected:   { color: dash.primary, bg: dash.primaryLight },
} as const

const FLOOR_OPTION_VALUES = [-1, 2, 3, 4]

const inputCls = 'px-2 py-1.5 rounded-lg text-xs border outline-none w-full'
const inputStyle = {
  backgroundColor: 'var(--color-admin-bg)',
  color: dash.text,
  borderColor: 'var(--color-admin-border)',
}

function useFloorLabel() {
  const tFloor = useTranslations('rooms.floors')
  return (floor: number): string => {
    if (floor === -1) return tFloor('basement')
    if (floor === 2) return tFloor('floor2')
    if (floor === 3) return tFloor('floor3')
    if (floor === 4) return tFloor('floor4')
    return tFloor('floorN', { floor })
  }
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

function StatusPill({
  value,
  options,
  onSelect,
}: {
  value: string
  options: readonly { value: string; label: string; color: string; bg: string }[]
  onSelect: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-0.5 rounded text-xs font-medium"
        style={{ color: current?.color ?? dash.muted, backgroundColor: current?.bg ?? dash.border }}
      >
        {current?.label ?? value} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-7 z-20 rounded-lg border shadow-xl py-1 min-w-36"
            style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onSelect(o.value); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs hover:opacity-80"
                style={{ color: o.color }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Add room form ────────────────────────────────────────────────────────────

function AddRoomForm({ roomTypes }: { roomTypes: RoomType[] }) {
  const router = useRouter()
  const t = useTranslations('rooms.addRoom')
  const floorLabel = useFloorLabel()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState<RoomFormState, FormData>(addRoomAction, {})
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (state.success) {
      setAdded(true)
      formRef.current?.reset()
      router.refresh()
      const timer = setTimeout(() => setAdded(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [state.success, router])

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-2xl p-5 space-y-4"
      style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
        {t('title')}
      </h2>

      {state.error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: dash.redLight, color: dash.red }}>
          {state.error}
        </p>
      )}
      {added && !state.error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: dash.greenLight, color: dash.green }}>
          {t('success')}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
            {t('numberLabel')} <span style={{ color: dash.red }}>*</span>
          </label>
          <input
            name="roomNumber"
            placeholder="101"
            className="px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ backgroundColor: 'var(--color-admin-bg)', color: dash.text, borderColor: 'var(--color-admin-border)' }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
            {t('floorLabel')} <span style={{ color: dash.red }}>*</span>
          </label>
          <select
            name="floor"
            defaultValue={2}
            className="px-3 py-2 rounded-lg text-sm border outline-none appearance-none"
            style={{ backgroundColor: 'var(--color-admin-bg)', color: dash.text, borderColor: 'var(--color-admin-border)' }}
          >
            {FLOOR_OPTION_VALUES.map((value) => (
              <option key={value} value={value}>{floorLabel(value)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
            {t('typeLabel')} <span style={{ color: dash.red }}>*</span>
          </label>
          <select
            name="roomTypeId"
            className="px-3 py-2 rounded-lg text-sm border outline-none appearance-none"
            style={{ backgroundColor: 'var(--color-admin-bg)', color: dash.text, borderColor: 'var(--color-admin-border)' }}
          >
            <option value="">{t('selectPlaceholder')}</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>{rt.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
      >
        {pending ? t('addingButton') : t('addButton')}
      </button>
    </form>
  )
}

// ─── Edit room row ────────────────────────────────────────────────────────────

function EditRoomRow({
  room,
  roomTypes,
  onClose,
}: {
  room: Room
  roomTypes: RoomType[]
  onClose: () => void
}) {
  const router = useRouter()
  const t = useTranslations('rooms.editRoom')
  const tc = useTranslations('common')
  const floorLabel = useFloorLabel()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await updateRoomAction(room.id, fd)
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      onClose()
      router.refresh()
    }
  }

  return (
    <tr style={{ backgroundColor: dash.bg, borderBottom: '1px solid var(--color-admin-border)' }}>
      <td colSpan={6} className="px-4 py-3">
        <form onSubmit={handleSubmit}>
          {error && (
            <p className="mb-2 text-xs px-2 py-1 rounded" style={{ backgroundColor: dash.redLight, color: dash.red }}>
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('numberLabel')}</label>
              <input name="roomNumber" defaultValue={room.room_number} required className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('floorLabel')}</label>
              <select name="floor" defaultValue={room.floor} className={inputCls} style={inputStyle}>
                {FLOOR_OPTION_VALUES.map((value) => (
                  <option key={value} value={value}>{floorLabel(value)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('typeLabel')}</label>
              <select name="roomTypeId" defaultValue={room.room_type_id} className={inputCls} style={inputStyle}>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('notesLabel')}</label>
              <input name="notes" defaultValue={room.notes ?? ''} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('activeLabel')}</label>
              <select name="isActive" defaultValue={room.is_active ? 'true' : 'false'} className={inputCls} style={inputStyle}>
                <option value="true">{t('activeOption')}</option>
                <option value="false">{t('inactiveOption')}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
            >
              {saving ? tc('saving') : tc('save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs border hover:opacity-80"
              style={{ color: 'var(--color-admin-muted)', borderColor: 'var(--color-admin-border)' }}
            >
              {tc('cancel')}
            </button>
          </div>
        </form>
      </td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  rooms: Room[]
  roomTypes: RoomType[]
}

export default function RoomsManager({ rooms, roomTypes }: Props) {
  const t = useTranslations('rooms')
  const th = useTranslations('rooms.headers')
  const tRoomStatus = useTranslations('status.room')
  const tCleaning = useTranslations('status.cleaning')
  const floorLabel = useFloorLabel()

  const roomStatusOptions = (Object.keys(ROOM_STATUS_COLORS) as (keyof typeof ROOM_STATUS_COLORS)[]).map((k) => ({
    value: k,
    label: tRoomStatus(k),
    ...ROOM_STATUS_COLORS[k],
  }))
  const cleaningStatusOptions = (Object.keys(CLEANING_STATUS_COLORS) as (keyof typeof CLEANING_STATUS_COLORS)[]).map((k) => ({
    value: k,
    label: tCleaning(k),
    ...CLEANING_STATUS_COLORS[k],
  }))

  const [roomStatuses, setRoomStatuses] = useState<Record<string, string>>(
    Object.fromEntries(rooms.map((r) => [r.id, r.status]))
  )
  const [cleaningStatuses, setCleaningStatuses] = useState<Record<string, string>>(
    Object.fromEntries(rooms.map((r) => [r.id, r.cleaning_status]))
  )
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)

  const handleRoomStatus = async (roomId: string, status: string) => {
    setRoomStatuses((prev) => ({ ...prev, [roomId]: status }))
    await updateRoomStatusAction(roomId, status)
  }

  const handleCleaningStatus = async (roomId: string, status: string) => {
    setCleaningStatuses((prev) => ({ ...prev, [roomId]: status }))
    await updateCleaningStatusAction(roomId, status)
  }

  const byFloor = rooms.reduce<Record<number, Room[]>>((acc, r) => {
    if (!acc[r.floor]) acc[r.floor] = []
    acc[r.floor].push(r)
    return acc
  }, {})

  const headers = [th('number'), th('type'), th('status'), th('cleaning'), th('price'), '']

  return (
    <div className="space-y-6">
      <AddRoomForm roomTypes={roomTypes} />

      {rooms.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-foreground">{t('empty')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-admin-muted)' }}>{t('emptyHint')}</p>
        </div>
      ) : (
        Object.entries(byFloor)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([floor, floorRooms]) => (
            <div key={floor}>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
                style={{ color: 'var(--color-accent)' }}
              >
                {floorLabel(Number(floor))}
              </p>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse" style={{ minWidth: '600px' }}>
                    <thead>
                      <tr style={{ backgroundColor: dash.bg }}>
                        {headers.map((h, i) => (
                          <th
                            key={`${h}-${i}`}
                            className="px-4 py-2.5 text-left text-xs font-medium"
                            style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {floorRooms.map((room) => (
                        <Fragment key={room.id}>
                          <tr
                            style={{ backgroundColor: 'var(--color-admin-card)', borderBottom: '1px solid var(--color-admin-border)' }}
                          >
                            <td className="px-4 py-3 font-semibold text-foreground">{room.room_number}</td>
                            <td className="px-4 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                              {room.room_types?.name ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill
                                value={roomStatuses[room.id] ?? room.status}
                                options={roomStatusOptions}
                                onSelect={(v) => handleRoomStatus(room.id, v)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill
                                value={cleaningStatuses[room.id] ?? room.cleaning_status}
                                options={cleaningStatusOptions}
                                onSelect={(v) => handleCleaningStatus(room.id, v)}
                              />
                            </td>
                            <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-admin-muted)' }}>
                              {room.room_types?.base_price
                                ? new Intl.NumberFormat('uz-UZ').format(room.room_types.base_price) + ' UZS'
                                : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setEditingRoomId(editingRoomId === room.id ? null : room.id)}
                                  className="text-xs px-2 py-1 rounded-lg border transition-opacity hover:opacity-80"
                                  style={{ color: 'var(--color-accent)', borderColor: 'var(--color-admin-border)' }}
                                >
                                  {editingRoomId === room.id ? t('cancelButton') : t('editButton')}
                                </button>
                                <a
                                  href={`/rooms/${room.id}`}
                                  className="text-xs px-2 py-1 rounded-lg border transition-opacity hover:opacity-80"
                                  style={{ color: 'var(--color-admin-muted)', borderColor: 'var(--color-admin-border)' }}
                                >
                                  {t('inventoryLink')}
                                </a>
                              </div>
                            </td>
                          </tr>
                          {editingRoomId === room.id && (
                            <EditRoomRow
                              room={room}
                              roomTypes={roomTypes}
                              onClose={() => setEditingRoomId(null)}
                            />
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  )
}
