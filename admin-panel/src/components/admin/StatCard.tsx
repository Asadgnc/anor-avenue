import { Link } from '@/i18n/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  deltaPercent?: number
  href?: string
}

export default function StatCard({ icon, label, value, deltaPercent, href }: StatCardProps) {
  const positive = (deltaPercent ?? 0) >= 0

  const inner = (
    <Card className={href ? 'transition-shadow duration-150 hover:ring-foreground/20' : undefined}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
            {icon}
          </span>
          {deltaPercent !== undefined && (
            <Badge variant={positive ? 'success' : 'destructive'}>
              {positive ? '+' : ''}
              {deltaPercent.toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className="text-2xl font-semibold leading-none tabular-nums text-foreground">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
