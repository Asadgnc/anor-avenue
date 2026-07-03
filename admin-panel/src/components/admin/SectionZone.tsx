// Section wrapper — dashboard-style uppercase heading + transparent
// background instead of a pastel background.
// The prop interface is preserved; `tone` is no longer used visually.

type Tone = 'purple' | 'green' | 'orange' | 'blue' | 'neutral'

interface SectionZoneProps {
  tone: Tone
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}

export default function SectionZone({ title, icon, action, children }: SectionZoneProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon && <span className="shrink-0 [&>svg]:size-3.5">{icon}</span>}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
