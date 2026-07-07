'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, Printer } from 'lucide-react'
import StatusBadge, { type StatusTone } from '@/components/admin/StatusBadge'
import type { PaymentMethod, PaymentStatus } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

export interface PaymentRowData {
  id: string
  reservationCode: string | null
  reservationId: string | null
  guestName: string | null
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  paidAt: string | null
  createdAt: string
  receivedByName: string | null
  notes: string | null
  fiscalUrl: string | null
}

const STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  pending:   'warning',
  completed: 'success',
  failed:    'error',
  refunded:  'neutral',
}

function formatUZS(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(amount) + ' UZS'
}

function PaymentDetailModal({
  payment,
  onClose,
  dateLocale,
}: {
  payment: PaymentRowData
  onClose: () => void
  dateLocale: string
}) {
  const t = useTranslations('payments')
  const tStatus = useTranslations('status.payment')
  const tf = useTranslations('fiscalScan')

  const dateStr = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(dateLocale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—'

  const methodLabel = (m: PaymentMethod): string => {
    if (m === 'payme') return 'Payme'
    if (m === 'click') return 'Click'
    if (m === 'uzum') return 'Uzum'
    if (m === 'cash') return t('methods.cash')
    if (m === 'card') return t('methods.card')
    return t('methods.transfer')
  }

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
      body { font-family: 'Courier New', monospace; max-width: 320px; margin: 20px auto; font-size: 13px; }
      h2 { text-align: center; font-size: 15px; margin-bottom: 4px; }
      .divider { border-top: 1px dashed #000; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; margin: 4px 0; }
      .total { font-size: 16px; font-weight: bold; }
      .center { text-align: center; }
      @media print { body { margin: 0; } }
    </style></head><body>
      <h2>Anor Avenue Hotel</h2>
      <p class="center" style="font-size:11px;margin:2px 0;">${t('receipt.title')}</p>
      <div class="divider"></div>
      <div class="row"><span>${t('receipt.code')}</span><span>${payment.reservationCode ?? '—'}</span></div>
      <div class="row"><span>${t('receipt.guest')}</span><span>${payment.guestName ?? '—'}</span></div>
      <div class="row"><span>${t('receipt.method')}</span><span>${methodLabel(payment.method)}</span></div>
      <div class="row"><span>${t('receipt.date')}</span><span>${dateStr(payment.paidAt ?? payment.createdAt)}</span></div>
      ${payment.receivedByName ? `<div class="row"><span>${t('receipt.receivedBy')}</span><span>${payment.receivedByName}</span></div>` : ''}
      <div class="divider"></div>
      <div class="row total"><span>${t('receipt.amount')}</span><span>${formatUZS(payment.amount)}</span></div>
      <div class="divider"></div>
      <p class="center" style="font-size:11px;margin-top:12px;">${t('receipt.thanks')}</p>
    </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-admin-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <h3 className="text-sm font-semibold text-foreground">{t('detail.title')}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1 text-xs"
              style={{ color: 'var(--color-accent)' }}
              title={t('receipt.printButton')}
            >
              <Printer size={14} />
              <span>{t('receipt.printButton')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
              style={{ color: 'var(--color-admin-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <Row label={t('detail.reservation')} value={payment.reservationCode ?? '—'} mono />
          <Row label={t('detail.guest')} value={payment.guestName ?? '—'} />
          <Row
            label={t('detail.amount')}
            value={formatUZS(payment.amount)}
            bold
            color="var(--color-accent)"
          />
          <Row label={t('detail.method')} value={methodLabel(payment.method)} />
          <Row
            label={t('detail.status')}
            value=""
            badge={<StatusBadge tone={STATUS_TONE[payment.status]}>{tStatus(payment.status)}</StatusBadge>}
          />
          <Row
            label={t('detail.date')}
            value={dateStr(payment.paidAt ?? payment.createdAt)}
            mono
          />
          {payment.receivedByName && (
            <Row label={t('detail.receivedBy')} value={payment.receivedByName} />
          )}
          {payment.notes && (
            <Row label={t('detail.notes')} value={payment.notes} />
          )}
          {payment.fiscalUrl && (
            <Row
              label={tf('receiptLink')}
              value=""
              badge={
                <a
                  href={payment.fiscalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {tf('receiptLink')}
                </a>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  color,
  mono,
  badge,
}: {
  label: string
  value: string
  bold?: boolean
  color?: string
  mono?: boolean
  badge?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs shrink-0" style={{ color: 'var(--color-admin-muted)' }}>{label}</span>
      {badge ?? (
        <span
          className={`text-sm text-right ${bold ? 'font-bold' : ''} ${mono ? 'font-mono' : ''}`}
          style={{ color: color ?? 'var(--foreground)' }}
        >
          {value}
        </span>
      )}
    </div>
  )
}

interface Props {
  payments: PaymentRowData[]
  dateLocale: string
}

export default function PaymentsClient({ payments, dateLocale }: Props) {
  const t = useTranslations('payments')
  const tStatus = useTranslations('status.payment')
  const [selected, setSelected] = useState<PaymentRowData | null>(null)

  const methodLabel = (method: PaymentMethod): string => {
    if (method === 'payme') return 'Payme'
    if (method === 'click') return 'Click'
    if (method === 'uzum') return 'Uzum'
    if (method === 'cash') return t('methods.cash')
    if (method === 'card') return t('methods.card')
    return t('methods.transfer')
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {[
                t('headers.reservation'),
                t('headers.guest'),
                t('headers.amount'),
                t('headers.method'),
                t('headers.receivedBy'),
                t('headers.status'),
                t('headers.date'),
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr
                key={p.id}
                className="border-b border-border hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
                onClick={() => setSelected(p)}
              >
                <td className="px-5 py-3 font-mono text-xs text-foreground">
                  {p.reservationCode ?? '—'}
                </td>
                <td className="px-5 py-3 text-foreground">
                  {p.guestName ?? '—'}
                </td>
                <td className="px-5 py-3 font-semibold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                  {formatUZS(p.amount)}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {methodLabel(p.method)}
                </td>
                <td className="px-5 py-3 text-muted-foreground text-xs">
                  {p.receivedByName ?? '—'}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge tone={STATUS_TONE[p.status]}>{tStatus(p.status)}</StatusBadge>
                </td>
                <td className="px-5 py-3 tabular-nums text-muted-foreground">
                  {p.paidAt
                    ? new Date(p.paidAt).toLocaleDateString(dateLocale)
                    : new Date(p.createdAt).toLocaleDateString(dateLocale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <PaymentDetailModal
          payment={selected}
          onClose={() => setSelected(null)}
          dateLocale={dateLocale}
        />
      )}
    </>
  )
}
