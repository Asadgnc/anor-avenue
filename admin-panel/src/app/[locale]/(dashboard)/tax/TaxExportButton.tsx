'use client'

import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'

export interface TaxExportRow {
  guest: string
  nationality: string
  reservation: string
  amount: number
  paid: boolean
}

// Client-side CSV export (Excel-openable). 1C-specific formatting can be layered
// on later once the exact 1C column spec is provided.
export default function TaxExportButton({ rows, headers }: { rows: TaxExportRow[]; headers: string[] }) {
  const t = useTranslations('reportExport')

  function download() {
    const head = headers.join(';')
    const body = rows
      .map((r) => [r.guest, r.nationality, r.reservation, String(r.amount), r.paid ? '1' : '0']
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(';'))
      .join('\n')
    const csv = '﻿' + head + '\n' + body // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tourist-tax-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={download}
      disabled={rows.length === 0}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 disabled:opacity-40 transition-all"
    >
      <Download size={15} /> {t('csv')}
    </button>
  )
}
