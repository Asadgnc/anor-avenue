import { Badge } from '@/components/ui/badge'

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const TONE_VARIANT: Record<StatusTone, 'success' | 'warning' | 'destructive' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'destructive',
  info: 'info',
  neutral: 'secondary',
}

interface StatusBadgeProps {
  tone: StatusTone
  children: React.ReactNode
}

export default function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <Badge variant={TONE_VARIANT[tone]}>{children}</Badge>
}
