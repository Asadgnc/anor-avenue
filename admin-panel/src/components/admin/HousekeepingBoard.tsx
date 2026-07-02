'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCleaningStatus } from '@/app/(dashboard)/housekeeping/actions'
import type { Room, CleaningStatus } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

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
  role: string
}

const STATUS_CONFIG: Record<CleaningStatus, { label: string; color: string; bg: string }> = {
  clean:       { label: 'Temiz',                       color: dash.green,   bg: dash.greenLight  },
  dirty:       { label: 'Kirli',                       color: dash.red,     bg: dash.redLight    },
  in_progress: { label: 'Temizleniyor',                color: dash.orange,  bg: dash.orangeLight },
  cleaned:     { label: 'Temizlendi · Denetim bekliyor', color: '#0284C7',  bg: '#E0F2FE'        },
  inspected:   { label: 'Denetlendi',                  color: dash.primary, bg: dash.primaryLight },
}

// Temizlikçi için geçiş — sadece 2 adım
function getHousekeeperAction(status: CleaningStatus): { next: CleaningStatus; label: string } | null {
  if (status === 'dirty') return { next: 'in_progress', label: 'Temizliğe Başla' }
  if (status === 'in_progress') return { next: 'cleaned', label: 'Temizlendi' }
  return null
}

// Yönetici / resepsiyon için tüm geçişler
const MANAGER_NEXT: Record<CleaningStatus, CleaningStatus> = {
  dirty:       'in_progress',
  in_progress: 'cleaned',
  cleaned:     'inspected',
  inspected:   'clean',
  clean:       'dirty',
}

const MANAGER_LABEL: Record<CleaningStatus, string> = {
  dirty:       'Temizliğe Başla',
  in_progress: 'Temizlendi',
  cleaned:     'Denetlendi',
  inspected:   'Temiz İşaretle',
  clean:       'Kirli İşaretle',
}

export default function HousekeepingBoard({ rooms, tasks, role }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const isHousekeeper = role === 'housekeeper'

  const tasksByRoom: Record<string, Task[]> = {}
  for (const t of tasks) {
    if (!tasksByRoom[t.room_id]) tasksByRoom[t.room_id] = []
    tasksByRoom[t.room_id].push(t)
  }

  function handleStatusChange(e: React.MouseEvent, roomId: string, next: CleaningStatus) {
    e.stopPropagation()
    startTransition(() => {
      updateCleaningStatus(roomId, next)
    })
  }

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

                // Buton mantığı
                let actionBtn: React.ReactNode = null
                if (isHousekeeper) {
                  const action = getHousekeeperAction(status)
                  if (action) {
                    actionBtn = (
                      <button
                        disabled={isPending}
                        onClick={(e) => handleStatusChange(e, room.id, action.next)}
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
                        {action.label}
                      </button>
                    )
                  }
                } else {
                  const nextStatus = MANAGER_NEXT[status]
                  actionBtn = (
                    <button
                      disabled={isPending}
                      onClick={(e) => handleStatusChange(e, room.id, nextStatus)}
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
                      {MANAGER_LABEL[status]}
                    </button>
                  )
                }

                return (
                  <div
                    key={room.id}
                    onClick={() => router.push(`/housekeeping/${room.id}`)}
                    style={{
                      backgroundColor: 'var(--color-admin-card)',
                      boxShadow: 'var(--shadow-card)',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      cursor: 'pointer',
                    }}
                    className="hover:ring-1 hover:ring-foreground/15 transition-shadow"
                  >
                    {/* Room header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-lg" style={{ color: dash.text }}>#{room.room_number}</span>
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
                    {actionBtn}

                    {/* Detay linki */}
                    <p
                      style={{ color: 'var(--color-admin-muted)', fontSize: '0.7rem', marginTop: '0.5rem', textAlign: 'center' }}
                    >
                      Denetim →
                    </p>
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
