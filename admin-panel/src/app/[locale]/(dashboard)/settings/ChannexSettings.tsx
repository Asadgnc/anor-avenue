'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
  saveVariantsAction,
  testChannexConnectionAction,
  fullResyncAction,
  type ChannexActionState,
} from './channex-actions'

export interface VariantRow {
  id: string
  channex_room_type_id: string
  channex_rate_plan_id: string
  label: string
  occupancy: number
  ota_price: number | null
  enabled: boolean
  room_count: number
}

interface Props {
  variants: VariantRow[]
  propertyId: string
  lastSync: string | null
  isConfigured: boolean
}

const cardStyle = { backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }
const inputStyle = {
  backgroundColor: 'var(--color-admin-card)',
  color: 'var(--foreground)',
  borderColor: 'var(--color-admin-border)',
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU')
}

export default function ChannexSettings({ variants: init, propertyId, lastSync, isConfigured }: Props) {
  const t = useTranslations('channex')
  const [variants, setVariants] = useState<VariantRow[]>(init)

  return (
    <>
      <VariantsCard t={t} variants={variants} setVariants={setVariants} />
      <ConnectCard t={t} propertyId={propertyId} lastSync={lastSync} isConfigured={isConfigured} />
    </>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl" style={cardStyle}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>{subtitle}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

type TFn = ReturnType<typeof useTranslations>

// ─── Varyant OTA fiyat + aç/kapa ────────────────────────────────────────────

function VariantsCard({
  t, variants, setVariants,
}: {
  t: TFn
  variants: VariantRow[]
  setVariants: (f: (p: VariantRow[]) => VariantRow[]) => void
}) {
  const [pending, start] = useTransition()
  const [state, setState] = useState<ChannexActionState>({})

  function upd(id: string, patch: Partial<VariantRow>) {
    setVariants((p) => p.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }
  function save() {
    const payload = variants.map((v) => ({
      id: v.id,
      enabled: v.enabled,
      otaPrice: v.ota_price != null && v.ota_price > 0 ? v.ota_price : null,
    }))
    const fd = new FormData()
    fd.set('payload', JSON.stringify(payload))
    start(async () => setState(await saveVariantsAction({}, fd)))
  }

  return (
    <Card title={t('variants.title')} subtitle={t('variants.subtitle')}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--color-admin-muted)' }} className="text-left text-xs">
              <th className="pb-2 pr-4 font-medium">{t('variants.variant')}</th>
              <th className="pb-2 pr-4 font-medium">{t('variants.occupancy')}</th>
              <th className="pb-2 pr-4 font-medium">{t('variants.rooms')}</th>
              <th className="pb-2 pr-4 font-medium">{t('variants.otaPrice')}</th>
              <th className="pb-2 pr-4 font-medium">{t('variants.enabled')}</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} style={{ borderTop: '1px solid var(--color-admin-border)' }}>
                <td className="py-2 pr-4 text-foreground font-medium">{v.label}</td>
                <td className="py-2 pr-4 tabular-nums">{v.occupancy}</td>
                <td className="py-2 pr-4 tabular-nums">{v.room_count}</td>
                <td className="py-2 pr-4">
                  <input
                    type="number" min={0} step={1000}
                    className="px-2 py-1.5 rounded-lg text-sm border outline-none tabular-nums w-32"
                    style={inputStyle}
                    placeholder={t('variants.pricePlaceholder')}
                    value={v.ota_price ?? ''}
                    onChange={(e) => upd(v.id, { ota_price: e.target.value ? Number(e.target.value) : null })}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input type="checkbox" checked={v.enabled} onChange={(e) => upd(v.id, { enabled: e.target.checked })} />
                </td>
              </tr>
            ))}
            {variants.length === 0 && (
              <tr><td colSpan={5} className="py-3 text-sm" style={{ color: 'var(--color-admin-muted)' }}>{t('variants.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <form action={save} className="flex items-center gap-3 mt-4">
        <button
          type="submit" disabled={pending}
          className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
        >
          {pending ? t('variants.saving') : state.success ? t('variants.saved') : t('variants.save')}
        </button>
        {state.error && <span className="text-xs" style={{ color: '#EF4444' }}>{state.error}</span>}
        <span className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>{t('variants.priceHint')}</span>
      </form>
    </Card>
  )
}

// ─── Channex bağlantısı ─────────────────────────────────────────────────────

function ConnectCard({
  t, propertyId, lastSync, isConfigured,
}: {
  t: TFn
  propertyId: string
  lastSync: string | null
  isConfigured: boolean
}) {
  const [testState, setTestState] = useState<ChannexActionState>({})
  const [resyncState, setResyncState] = useState<ChannexActionState>({})
  const [testing, startTest] = useTransition()
  const [resyncing, startResync] = useTransition()

  return (
    <Card title={t('connect.title')} subtitle={t('connect.subtitle')}>
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--color-admin-muted)' }}>{t('connect.status')}</span>
          <span className="font-semibold" style={{ color: isConfigured ? '#22C55E' : '#EF4444' }}>
            {isConfigured ? t('connect.configured') : t('connect.notConfigured')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--color-admin-muted)' }}>{t('connect.propertyId')}</span>
          <span className="font-mono text-foreground">{propertyId || '—'}</span>
        </div>
        {!isConfigured && (
          <p className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-admin-muted)' }}>
            {t('connect.notConfiguredHint')}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          type="button" disabled={testing}
          onClick={() => startTest(async () => setTestState(await testChannexConnectionAction({})))}
          className="px-4 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50 hover:opacity-80"
          style={{ borderColor: 'var(--color-admin-border)', color: 'var(--foreground)' }}
        >
          {testing ? t('connect.testing') : t('connect.test')}
        </button>
        <button
          type="button" disabled={resyncing || !isConfigured}
          onClick={() => startResync(async () => setResyncState(await fullResyncAction({})))}
          className="px-4 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50 hover:opacity-80"
          style={{ borderColor: 'var(--color-admin-border)', color: 'var(--foreground)' }}
        >
          {resyncing ? t('connect.resyncing') : t('connect.resync')}
        </button>
      </div>

      <div className="mt-2 space-y-1 text-xs">
        {testState.success && <p style={{ color: '#22C55E' }}>{t('connect.testOk')}</p>}
        {testState.error && <p style={{ color: '#EF4444' }}>{testState.error}</p>}
        {resyncState.success && <p style={{ color: '#22C55E' }}>{resyncState.message}</p>}
        {resyncState.error && <p style={{ color: '#EF4444' }}>{resyncState.error}</p>}
        <p style={{ color: 'var(--color-admin-muted)' }}>
          {t('connect.lastSync')}: {lastSync ? new Date(lastSync).toLocaleString('ru-RU') : t('connect.never')}
        </p>
      </div>
    </Card>
  )
}
