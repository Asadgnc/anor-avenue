'use client'

// Oda paneli içeriği: dolu oda görünümü + hızlı işlemler (çıkış / ödeme ekle),
// boş oda için giriş/rezervasyon sihirbazı, ve en altta oda geçmişi.

import { useActionState, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import { LogOut, Wallet, ChevronRight, Users, AlertCircle, Loader2 } from 'lucide-react'
import { dash } from '@/lib/dashboardTheme'
import {
  updateReservationStatusAction,
  addPaymentAction,
  type AddPaymentState,
} from '@/app/[locale]/(dashboard)/reservations/[id]/actions'
import type { RoomDetail } from '@/components/admin/room-detail/actions'
import RoomBookingFlow from '@/components/admin/room-detail/RoomBookingFlow'

const FRONT_DESK = new Set(['admin', 'receptionist'])

function formatUZS(n: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

interface Props {
  detail: RoomDetail
  role: string
  onChanged: () => void | Promise<void>
  onClose: () => void
}

export default function RoomDetailPanel({ detail, role, onChanged, onClose }: Props) {
  const t = useTranslations('roomDetail')
  const router = useRouter()
  const frontDesk = FRONT_DESK.has(role)

  const [showAllHistory, setShowAllHistory] = useState(false)
  const historyToShow = showAllHistory ? detail.history : detail.history.slice(0, 5)

  return (
    <div className="space-y-6">
      {detail.current ? (
        <OccupiedView
          detail={detail}
          frontDesk={frontDesk}
          onChanged={async () => {
            await onChanged()
            router.refresh()
          }}
        />
      ) : frontDesk ? (
        <RoomBookingFlow
          roomId={detail.id}
          roomNumber={detail.roomNumber}
          capacity={detail.capacity}
          onDone={() => {
            router.refresh()
            onClose()
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('emptyRoom')}</p>
      )}

      {/* ─── Oda geçmişi ─── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('historyTitle')}
        </h3>
        {detail.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
        ) : (
          <div className="space-y-1.5">
            {historyToShow.map((h) => (
              <Link
                key={h.reservationId}
                href={`/reservations/${h.reservationId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {h.guestName}
                    {h.peopleCount > 1 && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Users size={11} /> +{h.peopleCount - 1}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.checkIn} → {h.checkOut} · {t('nights', { n: h.nights })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium text-foreground tabular-nums">{formatUZS(h.paid)}</p>
                  <p className="text-[11px] text-muted-foreground">{t(`status.${h.status}`)}</p>
                </div>
              </Link>
            ))}
            {detail.history.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="w-full text-center text-xs py-1.5 text-muted-foreground hover:text-foreground"
              >
                {showAllHistory
                  ? t('showLess')
                  : t('showMore', { n: detail.history.length - 5 })}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Dolu oda görünümü ──────────────────────────────────────────────────────────

function OccupiedView({
  detail,
  frontDesk,
  onChanged,
}: {
  detail: RoomDetail
  frontDesk: boolean
  onChanged: () => void | Promise<void>
}) {
  const t = useTranslations('roomDetail')
  const cur = detail.current!
  const remaining = cur.totalAmount - cur.paid

  const [showPay, setShowPay] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function doCheckout() {
    if (!window.confirm(t('checkoutConfirm'))) return
    setCheckingOut(true)
    setError(null)
    const res = await updateReservationStatusAction(cur.reservationId, 'checked_out')
    setCheckingOut(false)
    if (res.error) setError(res.error)
    else await onChanged()
  }

  return (
    <div className="space-y-4">
      {/* Üstte iki buton: Çıkış + Ödeme Ekle */}
      {frontDesk && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={doCheckout}
            disabled={checkingOut}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: dash.orange }}
          >
            {checkingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            {t('checkout')}
          </button>
          <button
            type="button"
            onClick={() => setShowPay((v) => !v)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: dash.primary }}
          >
            <Wallet size={16} />
            {t('addPayment')}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Erken çıkış ipucu / uzatma durumu */}
      <p className="text-xs text-muted-foreground">
        {cur.mayExtend ? t('mayExtendNote') : t('earlyCheckoutNote')}
      </p>

      {/* Ödeme mini formu */}
      {showPay && frontDesk && (
        <PaymentMiniForm
          reservationId={cur.reservationId}
          remaining={remaining}
          onDone={async () => {
            setShowPay(false)
            await onChanged()
          }}
        />
      )}

      {/* Yarı kayıt uyarısı */}
      {cur.registrationPending && (
        <Link
          href={`/reservations/${cur.reservationId}`}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: dash.orangeLight, color: dash.orange }}
        >
          <AlertCircle size={15} /> {t('registrationPending')}
        </Link>
      )}

      {/* Konaklama detayları */}
      <div className="rounded-xl border border-border p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold text-foreground">{cur.guestName}</p>
          {cur.peopleCount > 1 && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: dash.blueLight, color: dash.blue }}
            >
              <Users size={12} /> {t('morePeople', { n: cur.peopleCount - 1 })}
            </span>
          )}
        </div>
        <Row label={t('stayDates')} value={`${cur.checkIn} → ${cur.checkOut}`} />
        <Row label={t('nightsLabel')} value={t('nights', { n: cur.nights })} />
        <Row label={t('peopleLabel')} value={String(cur.peopleCount)} />
        <Row label={t('paidLabel')} value={formatUZS(cur.paid)} />
        <Row
          label={t('remainingLabel')}
          value={formatUZS(remaining)}
          valueClass={remaining > 0 ? 'text-destructive' : 'text-green-600'}
        />
        <Row label={t('breakfastLabel')} value={cur.breakfast ? t('yes') : t('no')} />
      </div>

      <Link
        href={`/reservations/${cur.reservationId}`}
        className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50"
      >
        {t('goToReservation')}
        <ChevronRight size={16} className="text-muted-foreground" />
      </Link>
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${valueClass ?? 'text-foreground'}`}>{value}</span>
    </div>
  )
}

// ─── Ödeme mini formu ──────────────────────────────────────────────────────────

function PaymentMiniForm({
  reservationId,
  remaining,
  onDone,
}: {
  reservationId: string
  remaining: number
  onDone: () => void | Promise<void>
}) {
  const t = useTranslations('roomDetail')
  const boundAction = addPaymentAction.bind(null, reservationId)
  const [state, formAction, pending] = useActionState<AddPaymentState, FormData>(boundAction, {})

  // Başarılı olunca kapat (render dışı yan etki)
  useEffect(() => {
    if (state.success) void onDone()
    // onDone kimliği her render değişebilir; yalnızca success geçişinde tetikle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  return (
    <form action={formAction} className="rounded-xl border border-border p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('amount')}
          <input
            type="number"
            name="amount"
            min={0}
            step="any"
            defaultValue={remaining > 0 ? remaining : ''}
            required
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('method')}
          <select
            name="method"
            required
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1"
          >
            <option value="cash">{t('methodCash')}</option>
            <option value="payme">Payme</option>
            <option value="click">Click</option>
            <option value="uzum">Uzum</option>
            <option value="transfer">{t('methodTransfer')}</option>
          </select>
        </label>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: dash.primary }}
      >
        {pending ? t('saving') : t('savePayment')}
      </button>
    </form>
  )
}
