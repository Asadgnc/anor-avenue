'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Wind, CheckCircle2, X } from 'lucide-react'
import { dash } from '@/lib/dashboardTheme'

interface RoomInfo {
  room_number: string
  floor: number
}

interface Props {
  dirtyRooms: RoomInfo[]
  cleanRooms: RoomInfo[]
}

function RoomListModal({
  title,
  rooms,
  color,
  onClose,
}: {
  title: string
  rooms: RoomInfo[]
  color: string
  onClose: () => void
}) {
  const t = useTranslations('dashboard.cleaningModal')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-admin-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/10 transition-colors"
            style={{ color: 'var(--color-admin-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Room list */}
        <div className="p-4">
          {rooms.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--color-admin-muted)' }}>
              {t('noRooms')}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {rooms.map((r) => (
                <div
                  key={r.room_number}
                  className="rounded-lg px-3 py-2 text-center text-sm font-semibold"
                  style={{ backgroundColor: 'var(--color-admin-bg)', color }}
                >
                  {r.room_number}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CleaningStatusCards({ dirtyRooms, cleanRooms }: Props) {
  const t = useTranslations('dashboard')
  const tStatus = useTranslations('status.cleaning')
  const [modal, setModal] = useState<'dirty' | 'clean' | null>(null)

  const cards = [
    {
      key: 'dirty' as const,
      rooms: dirtyRooms,
      label: tStatus('dirty'),
      color: dash.red,
      bg: dash.redLight,
      icon: <Wind size={16} />,
    },
    {
      key: 'clean' as const,
      rooms: cleanRooms,
      label: tStatus('clean'),
      color: dash.green,
      bg: dash.greenLight,
      icon: <CheckCircle2 size={16} />,
    },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => setModal(c.key)}
            className="rounded-xl border border-border p-4 flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer"
            style={{ backgroundColor: c.bg }}
          >
            <span style={{ color: c.color }}>{c.icon}</span>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color: c.color }}>{c.rooms.length}</p>
              <p className="text-xs mt-0.5" style={{ color: c.color }}>{c.label}</p>
            </div>
          </button>
        ))}
      </div>

      {modal === 'dirty' && (
        <RoomListModal
          title={t('dirtyRoomsTitle')}
          rooms={dirtyRooms}
          color={dash.red}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'clean' && (
        <RoomListModal
          title={t('cleanRoomsTitle')}
          rooms={cleanRooms}
          color={dash.green}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
