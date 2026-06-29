'use client'

import { useTransition } from 'react'
import { updateCleaningStatus } from '@/app/(dashboard)/housekeeping/actions'
import type { Room, CleaningStatus } from '@/types/hotel'

interface Task {
  id: string
  room_id: string
  task_type: string
  status: string
  priority: number
  notes: string | null
  profiles: { full_name: string } | null
}

interface Props {
  rooms: Room[]
  tasks: Task[]
}

const STATUS_CONFIG: Record<CleaningStatus, { label: string; color: string; bg: string }> = {
  clean:       { label: 'Temiz',        color: '#2D6A4F', bg: 'rgba(45,106,79,0.12)'  },
  dirty:       { label: 'Kirli',        color: '#C62828', bg: 'rgba(198,40,40,0.12)'  },
  in_progress: { label: 'Temizleniyor', color: '#D4A017', bg: 'rgba(212,160,23,0.12)' },
  inspected:   { label: 'Denetlendi',   color: '#C9A96E', bg: 'rgba(201,169,110,0.12)'},
}

const NEXT_STATUS: Record<CleaningStatus, CleaningStatus> = {
  dirty:       'in_progress',
  in_progress: 'inspected',
  inspected:   'clean',
  clean:       'dirty',
}

const NEXT_LABEL: Record<CleaningStatus, string> = {
  dirty:       'Temizliğe Başla',
  in_progress: 'Denetlemeye Al',
  inspected:   'Temiz İşaretle',
  clean:       'Kirli İşaretle',
}

export default function HousekeepingBoard({ rooms, tasks }: Props) {
  const [isPending, startTransition] = useTransition()

  const tasksByRoom: Record<string, Task[]> = {}
  for (const t of tasks) {
    if (!tasksByRoom[t.room_id]) tasksByRoom[t.room_id] = []
    tasksByRoom[t.room_id].push(t)
  }

  function handleStatusChange(roomId: string, currentStatus: CleaningStatus) {
    const next = NEXT_STATUS[currentStatus]
    startTransition(() => {
      updateCleaningStatus(roomId, next)
    })
  }

  // Group by floor
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b)

  return (
    <div className="space-y-8">
      {floors.map((floor) => {
        const floorRooms = rooms.filter((r) => r.floor === floor)
        const floorLabel = floor < 0 ? `Bodrum (${floor}. kat)` : `${floor}. Kat`

        return (
          <div key={floor}>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-admin-muted)' }}
            >
              {floorLabel}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {floorRooms.map((room) => {
                const status = room.cleaning_status
                const cfg = STATUS_CONFIG[status]
                const roomTasks = tasksByRoom[room.id] ?? []

                return (
                  <div
                    key={room.id}
                    style={{
                      backgroundColor: 'var(--color-admin-card)',
                      border: `1px solid var(--color-admin-border)`,
                      borderRadius: '0.75rem',
                      padding: '1rem',
                    }}
                  >
                    {/* Room header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[#E8E8F0] text-lg">#{room.room_number}</span>
                      <span
                        style={{
                          backgroundColor: cfg.bg,
                          color: cfg.color,
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                        }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    {/* Active tasks */}
                    {roomTasks.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {roomTasks.map((t) => (
                          <p
                            key={t.id}
                            style={{ color: 'var(--color-admin-muted)', fontSize: '0.75rem' }}
                          >
                            📋 {t.task_type}
                            {t.profiles && ` — ${t.profiles.full_name}`}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Action button */}
                    <button
                      disabled={isPending}
                      onClick={() => handleStatusChange(room.id, status)}
                      style={{
                        backgroundColor: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}40`,
                        borderRadius: '0.5rem',
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        width: '100%',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        opacity: isPending ? 0.6 : 1,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      {NEXT_LABEL[status]}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
