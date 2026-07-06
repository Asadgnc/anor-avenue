'use client'

// "Yarı kayıt" (registration_pending) bir rezervasyonu tam kayıt olarak işaretler.
// Dashboard'daki "Tamamlanmamış kayıtlar" listesinden buradan tamamlanır.

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { dash } from '@/lib/dashboardTheme'
import { completeRegistrationAction } from '@/components/admin/room-detail/actions'

export default function CompleteRegistrationButton({ reservationId }: { reservationId: string }) {
  const t = useTranslations('roomDetail')
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function complete() {
    setBusy(true)
    setError(null)
    const res = await completeRegistrationAction(reservationId)
    setBusy(false)
    if (res.error) setError(res.error)
    else router.refresh()
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ backgroundColor: dash.orangeLight }}
    >
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: dash.orange }}>
          {t('registrationPendingTitle')}
        </p>
        <p className="text-xs" style={{ color: dash.orange }}>
          {t('registrationPendingDesc')}
        </p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <button
        type="button"
        onClick={complete}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: dash.green }}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        {t('completeRegistration')}
      </button>
    </div>
  )
}
