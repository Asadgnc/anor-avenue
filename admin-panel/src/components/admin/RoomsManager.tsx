'use client'

import { useActionState, useState } from 'react'
import { addRoomAction, updateCleaningStatusAction, updateRoomStatusAction, type RoomFormState } from '@/app/(dashboard)/rooms/actions'
import type { Room, RoomType } from '@/types/hotel'

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const ROOM_STATUSES = [
  { value: 'available',   label: 'Müsait',      color: '#86EFAC' },
  { value: 'occupied',    label: 'Dolu',         color: '#FCA5A5' },
  { value: 'cleaning',    label: 'Temizlikte',   color: '#FCD34D' },
  { value: 'maintenance', label: 'Bakımda',      color: '#C4B5FD' },
  { value: 'blocked',     label: 'Bloke',        color: '#9CA3AF' },
] as const

const CLEANING_STATUSES = [
  { value: 'clean',       label: 'Temiz',        color: '#86EFAC' },
  { value: 'dirty',       label: 'Kirli',        color: '#FCA5A5' },
  { value: 'in_progress', label: 'Temizleniyor', color: '#FCD34D' },
  { value: 'inspected',   label: 'Denetlendi',   color: '#C9A96E' },
] as const

const FLOOR_LABEL: Record<number, string> = {
  [-1]: 'Bodrum Kat',
  2: '2. Kat',
  3: '3. Kat',
  4: '4. Kat · Mansard',
}

const FLOOR_OPTIONS = [
  { value: -1, label: 'Bodrum Kat (-1)' },
  { value: 2,  label: '2. Kat' },
  { value: 3,  label: '3. Kat' },
  { value: 4,  label: '4. Kat (Mansard)' },
]

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

function StatusPill({
  value,
  options,
  onSelect,
}: {
  value: string
  options: readonly { value: string; label: string; color: string }[]
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
        style={{ color: current?.color ?? '#9CA3AF', backgroundColor: '#1E1E3A' }}
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

// ─── Oda Ekleme Formu ─────────────────────────────────────────────────────────

function AddRoomForm({ roomTypes }: { roomTypes: RoomType[] }) {
  const [state, action, pending] = useActionState<RoomFormState, FormData>(addRoomAction, {})
  const [added, setAdded] = useState(false)

  return (
    <form
      action={async (fd) => {
        await action(fd)
        setAdded(true)
        setTimeout(() => setAdded(false), 3000)
      }}
      className="rounded-xl border p-5 space-y-4"
      style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
        Yeni Oda Ekle
      </h2>

      {state.error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#450A0A', color: '#FCA5A5' }}>
          {state.error}
        </p>
      )}
      {added && !state.error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#14532D', color: '#86EFAC' }}>
          Oda eklendi ✓
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
            Oda No <span style={{ color: '#C62828' }}>*</span>
          </label>
          <input
            name="roomNumber"
            placeholder="101"
            className="px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              backgroundColor: 'var(--color-admin-bg)',
              color: '#E8E8F0',
              borderColor: 'var(--color-admin-border)',
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
            Kat <span style={{ color: '#C62828' }}>*</span>
          </label>
          <select
            name="floor"
            defaultValue={2}
            className="px-3 py-2 rounded-lg text-sm border outline-none appearance-none"
            style={{
              backgroundColor: 'var(--color-admin-bg)',
              color: '#E8E8F0',
              borderColor: 'var(--color-admin-border)',
            }}
          >
            {FLOOR_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
            Oda Tipi <span style={{ color: '#C62828' }}>*</span>
          </label>
          <select
            name="roomTypeId"
            className="px-3 py-2 rounded-lg text-sm border outline-none appearance-none"
            style={{
              backgroundColor: 'var(--color-admin-bg)',
              color: '#E8E8F0',
              borderColor: 'var(--color-admin-border)',
            }}
          >
            <option value="">— Seçin —</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
      >
        {pending ? 'Ekleniyor…' : '+ Oda Ekle'}
      </button>
    </form>
  )
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

interface Props {
  rooms: Room[]
  roomTypes: RoomType[]
}

export default function RoomsManager({ rooms, roomTypes }: Props) {
  const [roomStatuses, setRoomStatuses] = useState<Record<string, string>>(
    Object.fromEntries(rooms.map((r) => [r.id, r.status]))
  )
  const [cleaningStatuses, setCleaningStatuses] = useState<Record<string, string>>(
    Object.fromEntries(rooms.map((r) => [r.id, r.cleaning_status]))
  )

  const handleRoomStatus = async (roomId: string, status: string) => {
    setRoomStatuses((prev) => ({ ...prev, [roomId]: status }))
    await updateRoomStatusAction(roomId, status)
  }

  const handleCleaningStatus = async (roomId: string, status: string) => {
    setCleaningStatuses((prev) => ({ ...prev, [roomId]: status }))
    await updateCleaningStatusAction(roomId, status)
  }

  // Oda tipine göre grupla
  const byFloor = rooms.reduce<Record<number, Room[]>>((acc, r) => {
    if (!acc[r.floor]) acc[r.floor] = []
    acc[r.floor].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <AddRoomForm roomTypes={roomTypes} />

      {rooms.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
        >
          <p className="text-[#E8E8F0]">Henüz oda yok.</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-admin-muted)' }}>
            Yukarıdan oda ekleyin.
          </p>
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
                {FLOOR_LABEL[Number(floor)] ?? `${floor}. Kat`}
              </p>
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: 'var(--color-admin-border)' }}
              >
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: '#16213E' }}>
                      {['Oda No', 'Tip', 'Oda Durumu', 'Temizlik', 'Fiyat/Gece'].map((h) => (
                        <th
                          key={h}
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
                      <tr
                        key={room.id}
                        style={{ backgroundColor: 'var(--color-admin-card)', borderBottom: '1px solid var(--color-admin-border)' }}
                      >
                        <td className="px-4 py-3 font-semibold text-[#E8E8F0]">{room.room_number}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                          {room.room_types?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            value={roomStatuses[room.id] ?? room.status}
                            options={ROOM_STATUSES}
                            onSelect={(v) => handleRoomStatus(room.id, v)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            value={cleaningStatuses[room.id] ?? room.cleaning_status}
                            options={CLEANING_STATUSES}
                            onSelect={(v) => handleCleaningStatus(room.id, v)}
                          />
                        </td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-admin-muted)' }}>
                          {room.room_types?.base_price
                            ? new Intl.NumberFormat('uz-UZ').format(room.room_types.base_price) + ' UZS'
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
      )}
    </div>
  )
}
