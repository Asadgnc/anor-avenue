'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getLocale } from 'next-intl/server'

async function requirePayrollRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')
  const role = (user.user_metadata?.role as string) ?? ''
  if (!['admin', 'accountant'].includes(role)) throw new Error('forbidden')
  return { supabase, userId: user.id }
}

const periodSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  notes: z.string().max(500).optional().nullable(),
})

export type PeriodState = { error?: string; success?: boolean; id?: string }

export async function createPeriodAction(
  _prev: PeriodState,
  formData: FormData
): Promise<PeriodState> {
  try {
    const { supabase, userId } = await requirePayrollRole()
    const parsed = periodSchema.safeParse({
      year: formData.get('year'),
      month: formData.get('month'),
      notes: formData.get('notes') || null,
    })
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

    const { data, error } = await supabase
      .from('payroll_periods')
      .insert({ ...parsed.data, created_by: userId })
      .select('id')
      .single()
    if (error) return { error: error.code === '23505' ? 'duplicate' : error.message }

    const locale = await getLocale()
    revalidatePath(`/${locale}/payroll`)
    return { success: true, id: data.id }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

const itemSchema = z.object({
  period_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  base_salary: z.coerce.number().min(0),
  bonus: z.coerce.number().min(0).default(0),
  deduction: z.coerce.number().min(0).default(0),
  currency: z.enum(['UZS', 'USD']).default('UZS'),
  notes: z.string().max(300).optional().nullable(),
})

export type ItemState = { error?: string; success?: boolean }

export async function upsertPayrollItemAction(
  _prev: ItemState,
  formData: FormData
): Promise<ItemState> {
  try {
    const { supabase } = await requirePayrollRole()
    const parsed = itemSchema.safeParse({
      period_id: formData.get('period_id'),
      profile_id: formData.get('profile_id'),
      base_salary: formData.get('base_salary'),
      bonus: formData.get('bonus') || 0,
      deduction: formData.get('deduction') || 0,
      currency: formData.get('currency') || 'UZS',
      notes: formData.get('notes') || null,
    })
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

    const { error } = await supabase
      .from('payroll_items')
      .upsert(parsed.data, { onConflict: 'period_id,profile_id' })
    if (error) return { error: error.message }

    const locale = await getLocale()
    revalidatePath(`/${locale}/payroll`)
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updatePeriodStatusAction(
  periodId: string,
  status: 'draft' | 'finalized' | 'paid'
): Promise<{ error?: string }> {
  try {
    const { supabase } = await requirePayrollRole()
    const { error } = await supabase
      .from('payroll_periods')
      .update({ status })
      .eq('id', periodId)
    if (error) return { error: error.message }
    const locale = await getLocale()
    revalidatePath(`/${locale}/payroll`)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
