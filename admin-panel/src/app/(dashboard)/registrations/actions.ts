'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const createSchema = z.object({
  guest_id: z.string().uuid(),
  reservation_id: z.string().uuid(),
})

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'submitted', 'confirmed']),
})

export async function createRegistrationAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const parsed = createSchema.safeParse({
    guest_id: formData.get('guest_id'),
    reservation_id: formData.get('reservation_id'),
  })
  if (!parsed.success) return { error: 'Geçersiz veri.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz.' }

  // Aynı misafir + rezervasyon için tekrar kayıt açma
  const { data: existing } = await supabase
    .from('guest_registrations')
    .select('id')
    .eq('guest_id', parsed.data.guest_id)
    .eq('reservation_id', parsed.data.reservation_id)
    .maybeSingle()

  if (existing) return { error: 'Bu misafir için zaten kayıt açılmış.' }

  const { error } = await supabase.from('guest_registrations').insert({
    guest_id: parsed.data.guest_id,
    reservation_id: parsed.data.reservation_id,
    registered_by: user.id,
    status: 'pending',
  })

  if (error) return { error: 'Kayıt oluşturulamadı: ' + error.message }

  revalidatePath('/registrations')
  return { success: true }
}

export async function updateRegistrationStatusAction(
  id: string,
  status: 'pending' | 'submitted' | 'confirmed'
): Promise<{ error?: string }> {
  const parsed = updateStatusSchema.safeParse({ id, status })
  if (!parsed.success) return { error: 'Geçersiz veri.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz.' }

  const { error } = await supabase
    .from('guest_registrations')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)

  if (error) return { error: error.message }

  revalidatePath('/registrations')
  return {}
}
