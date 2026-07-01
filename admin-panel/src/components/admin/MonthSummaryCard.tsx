import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SummaryRow {
  label: string
  percent: number
}

interface MonthSummaryCardProps {
  occupancyRate: number
  collectionRate: number
  cancellationRate: number
  avgNights: number
  monthLabel: string
}

export default function MonthSummaryCard({
  occupancyRate,
  collectionRate,
  cancellationRate,
  avgNights,
  monthLabel,
}: MonthSummaryCardProps) {
  const rows: SummaryRow[] = [
    { label: 'Doluluk Oranı', percent: occupancyRate },
    { label: 'Ödeme Tahsilat Oranı', percent: collectionRate },
    { label: 'İptal Oranı', percent: cancellationRate },
  ]

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Bu Ay Özet</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>
        </div>
        <Badge variant="secondary">{avgNights.toFixed(1)} gece ort.</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="text-xs font-semibold text-foreground">{r.percent.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(0, Math.min(100, r.percent))}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
