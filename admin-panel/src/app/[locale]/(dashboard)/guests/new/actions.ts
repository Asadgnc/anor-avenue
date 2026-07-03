'use server'

import { z } from 'zod'
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

export type GuestFormState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
  guestId?: string   // success: for client router.push()
}

export async function createGuestAction(
  _prev: GuestFormState,
  formData: FormData
): Promise<GuestFormState> {
  const te = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: te('sessionInvalid') }

  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString()
      if (key) fieldErrors[key] = te(key === 'email' ? 'invalidEmail' : key === 'lastName' ? 'lastNameRequired' : 'firstNameRequired')
    }
    return { fieldErrors }
  }

  const d = parsed.data
  const service = createServiceClient()

  const { data: guest, error } = await service
    .from('guests')
    .insert({
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
    .select('id')
    .single()

  if (error || !guest) {
    return { error: te('guestCreateFailed', { msg: error?.message ?? te('unknownError') }) }
  }

  // Not using redirect() — client handles it via router.push()
  return { guestId: guest.id }
}
