'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export type StaffState = { error?: string; success?: boolean }

const VALID_ROLES = ['admin', 'receptionist', 'housekeeper', 'accountant'] as const
type Role = typeof VALID_ROLES[number]

// ─── Invite staff ────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(VALID_ROLES),
  fullName: z.string().min(1).default('Anor Avenue'),
})

export async function inviteStaffAction(
  _prev: StaffState,
  formData: FormData
): Promise<StaffState> {
  const t = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: t('invalidEmail') }

  const service = createServiceClient()

  // Send invite via Supabase Auth Admin
  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://anor-avenue-admin-panel.vercel.app'
  const { data, error } = await service.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { role: parsed.data.role },
    redirectTo: `${baseUrl}/api/auth/callback`,
  })

  if (error) {
    if (error.message.includes('already')) return { error: t('emailAlreadyRegistered') }
    return { error: error.message }
  }

  if (data.user) {
    // Save role in user_metadata
    await service.auth.admin.updateUserById(data.user.id, {
      user_metadata: { role: parsed.data.role },
    })

    // Insert row into profiles table (required for get_user_role() + RLS)
    await service.from('profiles').upsert({
      id: data.user.id,
      full_name: parsed.data.fullName,
      role: parsed.data.role,
    }, { onConflict: 'id' })
  }

  revalidatePath('/staff')
  return { success: true }
}

// ─── Change role ─────────────────────────────────────────────────────────────

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(VALID_ROLES),
})

export async function changeRoleAction(
  _prev: StaffState,
  formData: FormData
): Promise<StaffState> {
  const t = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }

  // Only admin may change roles
  const callerRole = (user.user_metadata?.role as Role | undefined) ?? 'receptionist'
  if (callerRole !== 'admin') return { error: t('permissionDenied') }

  const parsed = changeRoleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: t('invalidData') }

  if (parsed.data.userId === user.id) return { error: t('cannotChangeOwnRole') }

  const service = createServiceClient()

  // 1) Update user_metadata (for middleware)
  const { error: authError } = await service.auth.admin.updateUserById(parsed.data.userId, {
    user_metadata: { role: parsed.data.role },
  })
  if (authError) return { error: authError.message }

  // 2) Update profiles table (for RLS / get_user_role())
  const { error: dbError } = await service
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.userId)

  if (dbError) return { error: dbError.message }

  revalidatePath('/staff')
  return { success: true }
}

// ─── Delete staff ─────────────────────────────────────────────────────────────

export async function deleteStaffAction(userId: string): Promise<StaffState> {
  const t = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }
  if (user.id === userId) return { error: t('cannotDeleteOwnAccount') }

  const service = createServiceClient()
  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/staff')
  return { success: true }
}
