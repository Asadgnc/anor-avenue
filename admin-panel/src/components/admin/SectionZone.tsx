import { dash } from '@/lib/dashboardTheme'

type Tone = 'purple' | 'green' | 'orange' | 'blue' | 'neutral'

const TONE_BG: Record<Tone, string> = {
  purple: dash.zonePurple,
  green: dash.zoneGreen,
  orange: dash.zoneOrange,
  blue: dash.zoneBlue,
  neutral: dash.bg,
}

const TONE_ACCENT: Record<Tone, string> = {
  purple: dash.primary,
  green: dash.green,
  orange: dash.orange,
  blue: dash.blue,
  neutral: dash.muted,
}

interface SectionZoneProps {
  tone: Tone
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}

export default function SectionZone({ tone, title, icon, action, children }: SectionZoneProps) {
  return (
    <div className="rounded-3xl p-4 md:p-5" style={{ backgroundColor: TONE_BG[tone] }}>
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <div className="flex items-center gap-2">
          {icon && (
            <span style={{ color: TONE_ACCENT[tone] }} className="shrink-0">
              {icon}
            </span>
          )}
          <p className="text-sm font-semibold" style={{ color: dash.text }}>
            {title}
          </p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
