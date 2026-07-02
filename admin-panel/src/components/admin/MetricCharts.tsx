// Saf SVG bar chart bileşeni — harici kütüphane yok, Server Component uyumlu

interface DayMetric {
  date: string
  occupancy: number
  adr: number
  revpar: number
}

interface BarChartProps {
  data: DayMetric[]
  getValue: (d: DayMetric) => number
  color: string
  maxValue: number
}

function BarChart({ data, getValue, color, maxValue }: BarChartProps) {
  const W = 600
  const H = 72
  const gap = 2
  const barW = Math.max(1, W / data.length - gap)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: '72px' }}
      preserveAspectRatio="none"
    >
      {data.map((d, i) => {
        const val = getValue(d)
        const barH = maxValue > 0 ? Math.max(1, (val / maxValue) * H) : 0
        return (
          <rect
            key={d.date}
            x={i * (barW + gap)}
            y={H - barH}
            width={barW}
            height={barH}
            fill={color}
            opacity={0.75}
            rx={1}
          />
        )
      })}
    </svg>
  )
}

interface ChartCardProps {
  title: string
  subtitle: string
  color: string
  data: DayMetric[]
  getValue: (d: DayMetric) => number
  maxValue: number
  currentValue: string
  trend: string
}

function ChartCard({ title, subtitle, color, data, getValue, maxValue, currentValue, trend }: ChartCardProps) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {title}
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1 text-foreground">
            {currentValue}
          </p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
          {trend}
        </span>
      </div>
      <BarChart data={data} getValue={getValue} color={color} maxValue={maxValue} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.date.slice(5) ?? ''}</span>
        <span>Son 30 gün</span>
        <span>{data[data.length - 1]?.date.slice(5) ?? ''}</span>
      </div>
    </div>
  )
}

interface MetricChartsProps {
  data: DayMetric[]
}

export default function MetricCharts({ data }: MetricChartsProps) {
  if (data.length === 0) return null

  const maxOccupancy = 100
  const maxAdr = Math.max(...data.map((d) => d.adr), 1)
  const maxRevpar = Math.max(...data.map((d) => d.revpar), 1)

  const avgOccupancy = data.reduce((s, d) => s + d.occupancy, 0) / data.length
  const avgAdr = data.reduce((s, d) => s + d.adr, 0) / data.filter((d) => d.adr > 0).length || 0
  const avgRevpar = data.reduce((s, d) => s + d.revpar, 0) / data.filter((d) => d.revpar > 0).length || 0

  function formatUZS(n: number) {
    if (n === 0) return '—'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
    return n.toFixed(0)
  }

  const last = data[data.length - 1]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ChartCard
        title="Doluluk"
        subtitle={`Ort. ${avgOccupancy.toFixed(1)}% / Bugün ${last.occupancy.toFixed(1)}%`}
        color="var(--chart-1)"
        data={data}
        getValue={(d) => d.occupancy}
        maxValue={maxOccupancy}
        currentValue={`${last.occupancy.toFixed(1)}%`}
        trend={`Ort. ${avgOccupancy.toFixed(0)}%`}
      />
      <ChartCard
        title="ADR"
        subtitle={`Ort. ${formatUZS(avgAdr)} K UZS / gece`}
        color="var(--chart-2)"
        data={data}
        getValue={(d) => d.adr}
        maxValue={maxAdr}
        currentValue={`${formatUZS(last.adr)} K`}
        trend={`Ort. ${formatUZS(avgAdr)} K`}
      />
      <ChartCard
        title="RevPAR"
        subtitle={`Ort. ${formatUZS(avgRevpar)} K UZS`}
        color="var(--chart-4)"
        data={data}
        getValue={(d) => d.revpar}
        maxValue={maxRevpar}
        currentValue={`${formatUZS(last.revpar)} K`}
        trend={`Ort. ${formatUZS(avgRevpar)} K`}
      />
    </div>
  )
}
