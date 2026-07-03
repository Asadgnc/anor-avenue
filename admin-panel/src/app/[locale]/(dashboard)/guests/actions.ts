'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

const schema = z.object({
  firstName:      z.string().min(1),
  lastName:       z.string().min(1),
  phone:          z.string().optional(),
  email:          z.string().email().optional().or(z.literal('')),
  nationality:    z.string().optional(),
  passportNumber: z.string().optional(),
  passportSeries: z.string().optional(),
  dateOfBirth:    z.string().optional(),
  address:        z.string().optional(),
  notes:          z.string().optional(),
})

export type UpdateGuestState = { error?: string; success?: boolean }

export async function updateGuestAction(
  guestId: string,
  formData: FormData
): Promise<UpdateGuestState> {
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const key = parsed.error.issues[0].path[0]?.toString()
    return { error: te(key === 'email' ? 'invalidEmail' : key === 'lastName' ? 'lastNameRequired' : 'firstNameRequired') }
  }

  const d = parsed.data
  const service = createServiceClient()

  const { error } = await service
    .from('guests')
    .update({
      first_name:      d.firstName,
      last_name:       d.lastName,
      phone:           d.phone || null,
      email:           d.email || null,
      nationality:     d.nationality || null,
      passport_number: d.passportNumber || null,
      passport_series: d.passportSeries || null,
      date_of_birth:   d.dateOfBirth || null,
      address:         d.address || null,
      notes:           d.notes || null,
    })
    .eq('id', guestId)

  if (error) return { error: error.message }

  revalidatePath(`/guests/${guestId}`)
  revalidatePath('/guests')
  return { success: true }
}
