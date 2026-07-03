'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { updateCleaningStatus } from '@/app/[locale]/(dashboard)/housekeeping/actions'
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

// Status colors for all roles
const STATUS_COLORS: Record<CleaningStatus, { color: string; bg: string }> = {
  clean:       { color: dash.green,   bg: dash.greenLight   },
  dirty:       { color: dash.red,     bg: dash.redLight     },
  in_progress: { color: dash.orange,  bg: dash.orangeLight  },
  cleaned:     { color: '#0284C7',    bg: '#E0F2FE'         },
  inspected:   { color: dash.primary, bg: dash.primaryLight },
}

// Manager / reception transitions (cleaned → inspection page, no button)
const MANAGER_NEXT: Partial<Record<CleaningStatus, CleaningStatus>> = {
  dirty:       'in_progress',
  in_progress: 'cleaned',
  clean:       'dirty',
  inspected:   'clean', // backward compatibility
}

const btnStyle = (bg: string, color: string, pending: boolean): React.CSSProperties => ({
  backgroundColor: bg,
  color,
  border: `1px solid ${color}40`,
  borderRadius: '0.5rem',
  padding: '0.375rem 0.75rem',
  fontSize: '0.75rem',
  fontWeight: '600',
  width: '100%',
  cursor: pending ? 'not-allowed' : 'pointer',
  opacity: pending ? 0.6 : 1,
  transition: 'opacity 0.15s',
})

export default function HousekeepingBoard({ rooms, tasks, role }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const t = useTranslations('housekeeping.board')
  const tStatus = useTranslations('status.cleaning')
  const isHousekeeper = role === 'housekeeper'

  const managerLabel: Partial<Record<CleaningStatus, string>> = {
    dirty:       t('startCleaning'),
    in_progress: t('cleaned'),
    clean:       t('markDirty'),
    inspected:   t('markClean'),
  }

  const getHousekeeperAction = (status: CleaningStatus): { next: CleaningStatus; label: string } | null => {
    if (status === 'dirty')       return { next: 'in_progress', label: t('startCleaning') }
    if (status === 'in_progress') return { next: 'cleaned',     label: t('cleaned')       }
    return null
  }

  const floorLabel = (floor: number): string =>
    floor < 0 ? t('floorBasement', { floor }) : t('floorN', { floor })

  const tasksByRoom: Record<string, Task[]> = {}
  for (const task of tasks) {
    if (!tasksByRoom[task.room_id]) tasksByRoom[task.room_id] = []
    tasksByRoom[task.room_id].push(task)
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

        return (
          <div key={floor}>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-admin-muted)' }}
            >
              {floorLabel(floor)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {floorRooms.map((room) => {
                const status = room.cleaning_status
                const cfg = STATUS_COLORS[status]

                // Housekeeper sees "cleaned" as "clean"
                const displayLabel = isHousekeeper && status === 'cleaned'
                  ? tStatus('cleaned_housekeeper')
                  : tStatus(status)

                const roomTasks = tasksByRoom[room.id] ?? []

                // ——— Button logic ———
                let actionBtn: React.ReactNode = null

                if (isHousekeeper) {
                  const action = getHousekeeperAction(status)
                  if (action) {
                    actionBtn = (
                      <button
                        disabled={isPending}
                        onClick={(e) => handleStatusChange(e, room.id, action.next)}
                        style={btnStyle(cfg.bg, cfg.color, isPending)}
                      >
                        {action.label}
                      </button>
                    )
                  }
                } else {
                  if (status === 'cleaned') {
                    actionBtn = (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/housekeeping/${room.id}`)
                        }}
                        style={{
                          backgroundColor: '#E0F2FE',
                          color: '#0369A1',
                          border: '1px solid #0369A140',
                          borderRadius: '0.5rem',
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          width: '100%',
                          cursor: 'pointer',
                          transition: 'opacity 0.15s',
                        }}
                      >
                        {t('inspect')}
                      </button>
                    )
                  } else {
                    const nextStatus = MANAGER_NEXT[status]
                    const btnLabel  = managerLabel[status]
                    if (nextStatus && btnLabel) {
                      actionBtn = (
                        <button
                          disabled={isPending}
                          onClick={(e) => handleStatusChange(e, room.id, nextStatus)}
                          style={btnStyle(cfg.bg, cfg.color, isPending)}
                        >
                          {btnLabel}
                        </button>
                      )
                    }
                  }
                }

                const cardClickable = !isHousekeeper
                const showInspectionHint = !isHousekeeper && status !== 'cleaned'

                return (
                  <div
                    key={room.id}
                    onClick={cardClickable ? () => router.push(`/housekeeping/${room.id}`) : undefined}
                    style={{
                      backgroundColor: 'var(--color-admin-card)',
                      boxShadow: 'var(--shadow-card)',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      cursor: cardClickable ? 'pointer' : 'default',
                    }}
                    className={cardClickable ? 'hover:ring-1 hover:ring-foreground/15 transition-shadow' : ''}
                  >
                    {/* Room header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-lg" style={{ color: dash.text }}>
                        #{room.room_number}
                      </span>
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
                        {displayLabel}
                      </span>
                    </div>

                    {/* Active tasks */}
                    {roomTasks.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {roomTasks.map((task) => (
                          <p
                            key={task.id}
                            style={{ color: 'var(--color-admin-muted)', fontSize: '0.75rem' }}
                          >
                            📋 {task.task_type}
                            {task.profiles && ` — ${task.profiles.full_name}`}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Action button */}
                    {actionBtn}

                    {/* Inspection hint */}
                    {showInspectionHint && (
                      <p
                        style={{
                          color: 'var(--color-admin-muted)',
                          fontSize: '0.7rem',
                          marginTop: '0.5rem',
                          textAlign: 'center',
                        }}
                      >
                        {t('inspectionHint')}
                      </p>
                    )}
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
