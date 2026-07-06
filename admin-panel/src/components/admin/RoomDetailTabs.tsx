'use client'

// Shared tab bar for a single room's detail views. Links the item checklist
// (/rooms/[id]) and the inspection page (/housekeeping/[roomId]) so they read
// as one tabbed detail page (Phase 3 consolidation). Both use the same room id.

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Package, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  roomId: string
  active: 'items' | 'inspection'
}

export default function RoomDetailTabs({ roomId, active }: Props) {
  const t = useTranslations('roomItems')

  const seg = (href: string, isActive: boolean, Icon: typeof Package, label: string) => (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors',
        isActive ? 'text-white' : 'hover:bg-black/5'
      )}
      style={
        isActive
          ? { backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }
          : { color: 'var(--color-admin-muted)' }
      }
    >
      <Icon size={15} />
      {label}
    </Link>
  )

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg p-0.5"
      style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
    >
      {seg(`/rooms/${roomId}`, active === 'items', Package, t('tabItems'))}
      {seg(`/housekeeping/${roomId}`, active === 'inspection', ClipboardCheck, t('tabInspection'))}
    </div>
  )
}
