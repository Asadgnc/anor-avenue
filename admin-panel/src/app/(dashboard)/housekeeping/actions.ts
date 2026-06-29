'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const cleaningStatusSchema = z.enum(['clean', 'dirty', 'in_progress', 'inspected'])

export async function updateCleaningStatus(roomId: string, newStatus: string) {
  const validatedStatus = cleaningStatusSchema.parse(newStatus)
  const validatedRoomId = z.string().uuid().parse(roomId)

  const supabase = await createClient()
  const { error } = await supabase
    .from('rooms')
    .update({ cleaning_status: validatedStatus })
    .eq('id', validatedRoomId)

  if (error) throw new Error(error.message)

  revalidatePath('/housekeeping')
}
