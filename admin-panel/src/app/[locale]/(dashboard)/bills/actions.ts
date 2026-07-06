'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

// ─── Add bill ────────────────────────────────────────────────────────────────

const addBillSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['utility', 'rent', 'salary', 'subscription', 'other']),
  estimated_amount: z.coerce.number().positive().optional().or(z.literal('')).transform(v => v === '' ? null : v),
  currency: z.enum(['UZS', 'USD']),
  due_day: z.coerce.number().int().min(1).max(28),
  notes: z.string().max(500).optional(),
})

export type AddBillState = { error?: string; success?: boolean }

export async function addBillAction(
  _prev: AddBillState,
  formData: FormData
): Promise<AddBillState> {
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

  const role = user.user_metadata?.role as string
  if (!['admin', 'accountant'].includes(role)) return { error: te('forbidden') }

  const parsed = addBillSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? te('validationError') }

  const service = createServiceClient()
  const { error } = await service.from('recurring_bills').insert({
    name: parsed.data.name,
    category: parsed.data.category,
    estimated_amount: parsed.data.estimated_amount ?? null,
    currency: parsed.data.currency,
    due_day: parsed.data.due_day,
    notes: parsed.data.notes || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/bills')
  return { success: true }
}

// ─── Mark bill paid ───────────────────────────────────────────────────────────

const markPaidSchema = z.object({
  amount: z.coerce.number().positive(),
  notes: z.string().max(500).optional(),
})

export type MarkPaidState = { error?: string; success?: boolean }

export async function markBillPaidAction(
  billId: string,
  dueDate: string,
  _prev: MarkPaidState,
  formData: FormData
): Promise<MarkPaidState> {
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

  const role = user.user_metadata?.role as string
  if (!['admin', 'accountant'].includes(role)) return { error: te('forbidden') }

  const parsed = markPaidSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: te('amountPositive') }

  const service = createServiceClient()
  const { error } = await service.from('bill_payments').upsert({
    bill_id: billId,
    due_date: dueDate,
    paid_date: new Date().toISOString().split('T')[0],
    amount: parsed.data.amount,
    currency: 'UZS',
    status: 'paid',
    notes: parsed.data.notes || null,
    paid_by: user.id,
  }, { onConflict: 'bill_id,due_date' })

  if (error) return { error: error.message }

  revalidatePath('/bills')
  revalidatePath('/dashboard')
  return { success: true }
}

// ─── Toggle bill active ───────────────────────────────────────────────────────

export async function toggleBillAction(
  billId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

  const role = user.user_metadata?.role as string
  if (!['admin', 'accountant'].includes(role)) return { error: te('forbidden') }

  const service = createServiceClient()
  const { error } = await service
    .from('recurring_bills')
    .update({ is_active: isActive })
    .eq('id', billId)

  if (error) return { error: error.message }

  revalidatePath('/bills')
  return {}
}
