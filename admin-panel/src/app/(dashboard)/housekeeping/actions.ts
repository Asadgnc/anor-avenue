'use server'

import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const cleaningStatusSchema = z.enum(['clean', 'dirty', 'in_progress', 'inspected'])

export async function updateCleaningStatus(roomId: string, newStatus: string) {
  const validatedStatus = cleaningStatusSchema.parse(newStatus)
  const validatedRoomId = z.string().uuid().parse(roomId)

  // Auth kontrolü
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum geçersiz.')

  const service = createServiceClient()
  const { error } = await service
    .from('rooms')
    .update({ cleaning_status: validatedStatus })
    .eq('id', validatedRoomId)

  if (error) throw new Error(error.message)

  revalidatePath('/housekeeping')
  revalidatePath('/dashboard')
}
