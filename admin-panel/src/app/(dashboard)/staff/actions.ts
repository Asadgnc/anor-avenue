'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export type StaffState = { error?: string; success?: boolean }

// ─── Personel davet et ────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Geçerli bir e-posta giriniz'),
  role: z.enum(['admin', 'manager', 'receptionist', 'housekeeper', 'accountant']),
})

export async function inviteStaffAction(
  _prev: StaffState,
  formData: FormData
): Promise<StaffState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const service = createServiceClient()

  // Supabase Auth Admin ile davet gönder
  const { data, error } = await service.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { role: parsed.data.role },
    redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://anor-avenue-admin-panel.vercel.app'}/login`,
  })

  if (error) {
    if (error.message.includes('already')) return { error: 'Bu e-posta zaten kayıtlı.' }
    return { error: error.message }
  }

  if (data.user) {
    // user_metadata rolü kaydet
    await service.auth.admin.updateUserById(data.user.id, {
      user_metadata: { role: parsed.data.role },
    })
  }

  revalidatePath('/staff')
  return { success: true }
}

// ─── Personel sil ─────────────────────────────────────────────────────────────

export async function deleteStaffAction(userId: string): Promise<StaffState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }
  if (user.id === userId) return { error: 'Kendi hesabınızı silemezsiniz.' }

  const service = createServiceClient()
  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/staff')
  return { success: true }
}
