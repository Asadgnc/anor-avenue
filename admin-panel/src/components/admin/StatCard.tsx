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

// "Soft modern — static": tinted icon box, big number, fixed shadow.
// No hover motion anywhere — clickable cards react with color only.
export default function StatCard({ icon, label, value, deltaPercent, href }: StatCardProps) {
  const positive = (deltaPercent ?? 0) >= 0

  const inner = (
    <Card className={href ? 'transition-colors duration-150 hover:bg-secondary/60' : undefined}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
            {icon}
          </span>
          {deltaPercent !== undefined && (
            <Badge variant={positive ? 'success' : 'destructive'}>
              {positive ? '+' : ''}
              {deltaPercent.toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className="text-3xl font-semibold leading-none tabular-nums text-foreground">
          {value}
        </p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
