'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export type StaffState = { error?: string; success?: boolean }

const VALID_ROLES = ['admin', 'manager', 'receptionist', 'housekeeper', 'accountant'] as const
type Role = typeof VALID_ROLES[number]

// ─── Personel davet et ────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Geçerli bir e-posta giriniz'),
  role: z.enum(VALID_ROLES),
  fullName: z.string().min(1, 'İsim gerekli').default('Yeni Personel'),
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

    // profiles tablosuna satır ekle (get_user_role() + RLS için zorunlu)
    await service.from('profiles').upsert({
      id: data.user.id,
      full_name: parsed.data.fullName,
      role: parsed.data.role,
    }, { onConflict: 'id' })
  }

  revalidatePath('/staff')
  return { success: true }
}

// ─── Rol değiştir ─────────────────────────────────────────────────────────────

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(VALID_ROLES),
})

export async function changeRoleAction(
  _prev: StaffState,
  formData: FormData
): Promise<StaffState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  // Sadece admin rol değiştirebilir
  const callerRole = (user.user_metadata?.role as Role | undefined) ?? 'receptionist'
  if (callerRole !== 'admin') return { error: 'Yetkiniz yok.' }

  const parsed = changeRoleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (parsed.data.userId === user.id) return { error: 'Kendi rolünüzü değiştiremezsiniz.' }

  const service = createServiceClient()

  // 1) user_metadata güncelle (middleware için)
  const { error: authError } = await service.auth.admin.updateUserById(parsed.data.userId, {
    user_metadata: { role: parsed.data.role },
  })
  if (authError) return { error: authError.message }

  // 2) profiles tablosu güncelle (RLS / get_user_role() için)
  const { error: dbError } = await service
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.userId)

  if (dbError) return { error: dbError.message }

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
