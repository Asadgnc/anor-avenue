'use server'

import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function addGardenTaskAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const schema = z.object({
    title: z.string().min(1, 'Görev adı zorunlu'),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const service = createServiceClient()
  const { error } = await service.from('garden_tasks').insert({
    title: parsed.data.title,
    note: parsed.data.note || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/garden')
  return { success: true }
}

export async function toggleGardenTaskAction(
  taskId: string,
  currentStatus: string
): Promise<void> {
  const validId = z.string().uuid().parse(taskId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum geçersiz.')

  const newStatus = currentStatus === 'done' ? 'pending' : 'done'
  const service = createServiceClient()
  const { error } = await service
    .from('garden_tasks')
    .update({ status: newStatus, done_at: newStatus === 'done' ? new Date().toISOString() : null })
    .eq('id', validId)

  if (error) throw new Error(error.message)
  revalidatePath('/garden')
}
