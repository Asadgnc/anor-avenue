'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getLocale } from 'next-intl/server'

const shiftSchema = z.object({
  profile_id: z.string().uuid(),
  shift_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['present', 'absent', 'sick', 'leave', 'holiday']),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  break_min: z.coerce.number().int().min(0).max(480).default(0),
  notes: z.string().max(300).optional().nullable(),
})

export type ShiftState = { error?: string; success?: boolean }

export async function upsertShiftAction(
  _prev: ShiftState,
  formData: FormData
): Promise<ShiftState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' }
  const role = (user.user_metadata?.role as string) ?? ''
  if (!['admin', 'manager'].includes(role)) return { error: 'forbidden' }

  const parsed = shiftSchema.safeParse({
    profile_id: formData.get('profile_id'),
    shift_date: formData.get('shift_date'),
    status: formData.get('status'),
    start_time: formData.get('start_time') || null,
    end_time: formData.get('end_time') || null,
    break_min: formData.get('break_min') || 0,
    notes: formData.get('notes') || null,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { error } = await supabase.from('staff_shifts').upsert(
    { ...parsed.data, created_by: user.id },
    { onConflict: 'profile_id,shift_date' }
  )
  if (error) return { error: error.message }

  const locale = await getLocale()
  revalidatePath(`/${locale}/timesheet`)
  return { success: true }
}

export async function deleteShiftAction(shiftId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const role = (user.user_metadata?.role as string) ?? ''
  if (!['admin', 'manager'].includes(role)) return
  await supabase.from('staff_shifts').delete().eq('id', shiftId)
  const locale = await getLocale()
  revalidatePath(`/${locale}/timesheet`)
}
