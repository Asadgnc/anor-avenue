'use client'

import { useActionState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { addGardenTaskAction, toggleGardenTaskAction } from './actions'
import type { GardenTask } from '@/types/hotel'

const initialState = { error: undefined as string | undefined, success: undefined as boolean | undefined }

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

interface Props {
  tasks: GardenTask[]
}

export default function GardenClient({ tasks }: Props) {
  const [state, action, isPending] = useActionState(addGardenTaskAction, initialState)
  const [isToggling, startToggle] = useTransition()
  const t = useTranslations('garden')
  const locale = useLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'

  const pending = tasks.filter((task) => task.status === 'pending')
  const done = tasks.filter((task) => task.status === 'done')

  const inputCls = 'px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="space-y-6">
      {/* New task */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t('addTask.title')}</h2>
        <form action={action} className="space-y-3">
          <input
            name="title"
            className={`${inputCls} w-full`}
            placeholder={t('addTask.namePlaceholder')}
            required
          />
          <textarea
            name="note"
            className={`${inputCls} w-full`}
            rows={2}
            placeholder={t('addTask.notePlaceholder')}
          />
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity"
          >
            {isPending ? t('addTask.addingButton') : t('addTask.addButton')}
          </button>
        </form>
      </div>

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('pending', { n: pending.length })}
          </h2>
          <div className="space-y-2">
            {pending.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
              >
                <button
                  disabled={isToggling}
                  onClick={() => startToggle(() => toggleGardenTaskAction(task.id, task.status))}
                  className="mt-0.5 w-5 h-5 rounded border-2 border-muted-foreground/40 shrink-0 hover:border-primary transition-colors"
                  title={t('completeButton')}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  {task.note && <p className="text-xs text-muted-foreground mt-0.5">{task.note}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(task.created_at).toLocaleDateString(dateLocale, { dateStyle: 'short' })}
                    {task.profiles && ` · ${task.profiles.full_name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">{t('emptyPending')}</p>
        </div>
      )}

      {/* Completed tasks */}
      {done.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('done', { n: done.length })}
          </h2>
          <div className="space-y-2">
            {done.slice(0, 10).map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-3 opacity-60"
              >
                <button
                  disabled={isToggling}
                  onClick={() => startToggle(() => toggleGardenTaskAction(task.id, task.status))}
                  className="mt-0.5 w-5 h-5 rounded border-2 border-green-500 bg-green-500 shrink-0 flex items-center justify-center text-white text-xs"
                  title={t('undoButton')}
                >
                  ✓
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground line-through">{task.title}</p>
                  {task.done_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(task.done_at).toLocaleDateString(dateLocale, { dateStyle: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
