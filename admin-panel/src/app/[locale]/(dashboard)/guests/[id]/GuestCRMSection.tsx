'use client'

import { useActionState, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { X, Plus, Star, MessageSquare } from 'lucide-react'
import {
  addGuestNoteAction,
  deleteGuestNoteAction,
  addGuestTagAction,
  removeGuestTagAction,
  adjustLoyaltyAction,
  type NoteState,
  type TagState,
  type LoyaltyState,
} from './crm-actions'

export interface GuestNote {
  id: string
  note: string
  created_at: string
  profiles: { full_name: string } | null
}

export interface GuestTag {
  id: string
  tag: string
}

export interface LoyaltyEntry {
  id: string
  delta: number
  reason: string
  created_at: string
  profiles: { full_name: string } | null
}

const PRESET_TAGS = ['vip', 'regular', 'frequent', 'allergic', 'problematic', 'corporate']

function TagBadge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    vip: '#B45309',
    regular: '#1D4ED8',
    frequent: '#065F46',
    allergic: '#9D174D',
    problematic: '#991B1B',
    corporate: '#4338CA',
  }
  const bg: Record<string, string> = {
    vip: '#FEF3C7',
    regular: '#DBEAFE',
    frequent: '#D1FAE5',
    allergic: '#FCE7F3',
    problematic: '#FEE2E2',
    corporate: '#EDE9FE',
  }
  const c = colors[label] ?? '#374151'
  const b = bg[label] ?? '#F3F4F6'
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: c, backgroundColor: b }}
    >
      {color}
    </span>
  )
}

// --- Notes sub-component ---
function NotesSection({
  guestId,
  notes,
  canWrite,
}: {
  guestId: string
  notes: GuestNote[]
  canWrite: boolean
}) {
  const t = useTranslations('guests.crm')
  const [state, action, pending] = useActionState<NoteState, FormData>(
    (prev, fd) => addGuestNoteAction(guestId, prev, fd),
    {}
  )
  const [, startTransition] = useTransition()

  function handleDelete(noteId: string) {
    startTransition(async () => {
      await deleteGuestNoteAction(noteId, guestId)
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>
        <MessageSquare size={12} className="inline mr-1" />
        {t('notesTitle')}
      </p>

      {notes.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{t('notesEmpty')}</p>
      )}

      <div className="space-y-2">
        {notes.map((n) => (
          <div
            key={n.id}
            className="flex gap-3 p-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)' }}
          >
            <p className="flex-1 text-foreground whitespace-pre-wrap">{n.note}</p>
            <div className="shrink-0 text-right space-y-1">
              <p className="text-[10px]" style={{ color: 'var(--color-admin-muted)' }}>
                {n.profiles?.full_name ?? '—'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-admin-muted)' }}>
                {n.created_at.slice(0, 10)}
              </p>
              {canWrite && (
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-[10px] hover:text-red-500 transition-colors"
                  style={{ color: 'var(--color-admin-muted)' }}
                >
                  {t('delete')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canWrite && (
        <form action={action} className="space-y-2">
          <textarea
            name="note"
            rows={2}
            placeholder={t('notePlaceholder')}
            required
            className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{
              backgroundColor: 'var(--color-admin-bg)',
              border: '1px solid var(--color-admin-border)',
              color: 'var(--foreground)',
            }}
          />
          {state.error && <p className="text-xs text-red-500">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {pending ? t('saving') : t('addNote')}
          </button>
          {state.success && <span className="text-xs text-green-600 ml-2">{t('saved')}</span>}
        </form>
      )}
    </div>
  )
}

// --- Tags sub-component ---
function TagsSection({
  guestId,
  tags,
  canWrite,
}: {
  guestId: string
  tags: GuestTag[]
  canWrite: boolean
}) {
  const t = useTranslations('guests.crm')
  const [state, action, pending] = useActionState<TagState, FormData>(
    (prev, fd) => addGuestTagAction(guestId, prev, fd),
    {}
  )
  const [, startTransition] = useTransition()
  const [customTag, setCustomTag] = useState('')
  const existingTags = tags.map((t) => t.tag)

  function handleRemove(tagId: string) {
    startTransition(async () => {
      await removeGuestTagAction(tagId, guestId)
    })
  }

  function submitPreset(tag: string) {
    const fd = new FormData()
    fd.set('tag', tag)
    startTransition(async () => {
      await addGuestTagAction(guestId, {}, fd)
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>
        {t('tagsTitle')}
      </p>

      {/* Current tags */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && (
          <span className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{t('tagsEmpty')}</span>
        )}
        {tags.map((tg) => (
          <span
            key={tg.id}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
          >
            {tg.tag}
            {canWrite && (
              <button onClick={() => handleRemove(tg.id)} className="hover:text-red-500 ml-0.5 transition-colors">
                <X size={10} />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Preset quick-add */}
      {canWrite && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.filter((pt) => !existingTags.includes(pt)).map((pt) => (
              <button
                key={pt}
                onClick={() => submitPreset(pt)}
                className="text-xs px-2 py-0.5 rounded-full border transition-colors hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)]"
                style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-muted)' }}
              >
                + {pt}
              </button>
            ))}
          </div>

          {/* Custom tag */}
          <form action={action} className="flex gap-2">
            <input
              name="tag"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder={t('customTagPlaceholder')}
              maxLength={50}
              className="flex-1 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              style={{
                backgroundColor: 'var(--color-admin-bg)',
                border: '1px solid var(--color-admin-border)',
                color: 'var(--foreground)',
              }}
            />
            <button
              type="submit"
              disabled={pending || !customTag.trim()}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              <Plus size={14} />
            </button>
          </form>
          {state.error && state.error !== 'duplicate' && <p className="text-xs text-red-500">{state.error}</p>}
        </div>
      )}
    </div>
  )
}

// --- Loyalty sub-component ---
function LoyaltySection({
  guestId,
  balance,
  history,
  canWrite,
}: {
  guestId: string
  balance: number
  history: LoyaltyEntry[]
  canWrite: boolean
}) {
  const t = useTranslations('guests.crm')
  const [showForm, setShowForm] = useState(false)
  const [state, action, pending] = useActionState<LoyaltyState, FormData>(
    (prev, fd) => adjustLoyaltyAction(guestId, prev, fd),
    {}
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>
          <Star size={12} className="inline mr-1" />
          {t('loyaltyTitle')}
        </p>
        <span
          className="text-lg font-bold"
          style={{ color: balance > 0 ? 'var(--color-accent)' : 'var(--color-admin-muted)' }}
        >
          {balance} {t('points')}
        </span>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="divide-y rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-admin-border)', borderColor: 'var(--color-admin-border)' }}>
          {history.slice(0, 5).map((h) => (
            <div key={h.id} className="flex items-center justify-between px-3 py-2 text-xs">
              <div>
                <p className="text-foreground">{h.reason}</p>
                <p style={{ color: 'var(--color-admin-muted)' }}>{h.created_at.slice(0, 10)} · {h.profiles?.full_name ?? '—'}</p>
              </div>
              <span className={`font-bold ${h.delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {h.delta > 0 ? '+' : ''}{h.delta}
              </span>
            </div>
          ))}
        </div>
      )}
      {history.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{t('loyaltyEmpty')}</p>
      )}

      {/* Manual adjustment */}
      {canWrite && (
        <>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {showForm ? t('cancelBtn') : t('adjustPoints')}
          </button>
          {showForm && (
            <form action={action} className="space-y-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)' }}>
              <div className="flex gap-2">
                <input
                  name="delta"
                  type="number"
                  placeholder={t('deltaPlaceholder')}
                  required
                  className="w-24 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)] tabular-nums"
                  style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
                />
                <input
                  name="reason"
                  type="text"
                  placeholder={t('reasonPlaceholder')}
                  required
                  maxLength={200}
                  className="flex-1 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  {pending ? '…' : t('save')}
                </button>
              </div>
              {state.error && <p className="text-xs text-red-500">{state.error}</p>}
              {state.success && <p className="text-xs text-green-600">{t('saved')}</p>}
            </form>
          )}
        </>
      )}
    </div>
  )
}

// --- Main exported component ---
export default function GuestCRMSection({
  guestId,
  notes,
  tags,
  loyaltyHistory,
  loyaltyBalance,
  role,
}: {
  guestId: string
  notes: GuestNote[]
  tags: GuestTag[]
  loyaltyHistory: LoyaltyEntry[]
  loyaltyBalance: number
  role: string
}) {
  const t = useTranslations('guests.crm')
  const canWrite = ['admin', 'receptionist'].includes(role)

  return (
    <div
      className="rounded-2xl divide-y"
      style={{
        backgroundColor: 'var(--color-admin-card)',
        boxShadow: 'var(--shadow-card)',
        borderColor: 'var(--color-admin-border)',
      }}
    >
      <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
        {t('sectionTitle')}
      </p>

      <div className="p-5 space-y-6">
        <TagsSection guestId={guestId} tags={tags} canWrite={canWrite} />
        <div style={{ borderTop: '1px solid var(--color-admin-border)', paddingTop: '1.25rem' }}>
          <LoyaltySection guestId={guestId} balance={loyaltyBalance} history={loyaltyHistory} canWrite={canWrite} />
        </div>
        <div style={{ borderTop: '1px solid var(--color-admin-border)', paddingTop: '1.25rem' }}>
          <NotesSection guestId={guestId} notes={notes} canWrite={canWrite} />
        </div>
      </div>
    </div>
  )
}
