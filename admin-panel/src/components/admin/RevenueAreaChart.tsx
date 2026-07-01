'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DayRevenue {
  date: string // YYYY-MM-DD
  amount: number
}

interface RevenueAreaChartProps {
  data: DayRevenue[]
}

function formatUZS(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(Math.round(n))
}

export default function RevenueAreaChart({ data }: RevenueAreaChartProps) {
  const [hover, setHover] = useState<number | null>(null)

  const W = 600
  const H = 160
  const max = Math.max(...data.map((d) => d.amount), 1)
  const stepX = data.length > 1 ? W / (data.length - 1) : W

  const points = data.map((d, i) => {
    const x = i * stepX
    const y = H - (d.amount / max) * (H - 12) - 4
    return { x, y, d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`

  const active = hover !== null ? points[hover] : points[points.length - 1]
  const totalRevenue = data.reduce((s, d) => s + d.amount, 0)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Gelir</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Son 30 gün toplam {formatUZS(totalRevenue)} UZS
          </p>
        </div>
        <Badge variant="secondary">Son 30 Gün</Badge>
      </CardHeader>

      <CardContent>
        <div className="relative">
          {active && (
            <div
              className="absolute -top-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shadow-sm pointer-events-none z-10 bg-foreground text-background whitespace-nowrap"
              style={{
                left: `${Math.min(Math.max((active.x / W) * 100, 12), 88)}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {active.d.date.slice(5)} · {formatUZS(active.d.amount)} UZS
            </div>
          )}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ height: '160px' }}
            preserveAspectRatio="none"
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#revenueGradient)" />
            <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2} />
            {active && (
              <circle cx={active.x} cy={active.y} r={4} className="fill-primary stroke-background" strokeWidth={2} />
            )}
            {points.map((p, i) => (
              <rect
                key={i}
                x={p.x - stepX / 2}
                y={0}
                width={stepX}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}
          </svg>
        </div>

        <div className="flex justify-between text-[11px] mt-1 text-muted-foreground">
          <span>{data[0]?.date.slice(5) ?? ''}</span>
          <span>{data[data.length - 1]?.date.slice(5) ?? ''}</span>
        </div>
      </CardContent>
    </Card>
  )
}
