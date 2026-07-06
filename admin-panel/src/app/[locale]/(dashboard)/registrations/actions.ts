'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

// Registratsiya detaylarını düzenleyebilen roller (E-Mehmon manuel akışı)
const REGISTRATION_ROLES = new Set(['admin', 'receptionist'])
const MAX_DOC_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_DOC_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

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
  const t = await getTranslations('errors')
  const parsed = createSchema.safeParse({
    guest_id: formData.get('guest_id'),
    reservation_id: formData.get('reservation_id'),
  })
  if (!parsed.success) return { error: t('invalidData') }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('unauthorized') }

  // Prevent duplicate registration for the same guest + reservation
  const { data: existing } = await supabase
    .from('guest_registrations')
    .select('id')
    .eq('guest_id', parsed.data.guest_id)
    .eq('reservation_id', parsed.data.reservation_id)
    .maybeSingle()

  if (existing) return { error: t('duplicateRegistration') }

  const { error } = await supabase.from('guest_registrations').insert({
    guest_id: parsed.data.guest_id,
    reservation_id: parsed.data.reservation_id,
    registered_by: user.id,
    status: 'pending',
  })

  if (error) return { error: t('registrationCreateFailed', { msg: error.message }) }

  revalidatePath('/registrations')
  return { success: true }
}

export async function updateRegistrationStatusAction(
  id: string,
  status: 'pending' | 'submitted' | 'confirmed'
): Promise<{ error?: string }> {
  const t = await getTranslations('errors')
  const parsed = updateStatusSchema.safeParse({ id, status })
  if (!parsed.success) return { error: t('invalidData') }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('unauthorized') }

  // "Podana" (submitted) durumuna geçince topshirilgan zamanı damgala (bir kez)
  const update: { status: string; submitted_at?: string } = { status: parsed.data.status }
  if (parsed.data.status === 'submitted') update.submitted_at = new Date().toISOString()

  const { error } = await supabase
    .from('guest_registrations')
    .update(update)
    .eq('id', parsed.data.id)

  if (error) return { error: error.message }

  revalidatePath('/registrations')
  return {}
}

const detailsSchema = z.object({
  passportSeries: z.string().trim().max(20).optional(),
  passportNumber: z.string().trim().max(40).optional(),
  visaNumber: z.string().trim().max(40).optional(),
  visaExpiry: z.string().optional(),
  pinfl: z.string().trim().max(20).optional(),
  nationality: z.string().trim().max(80).optional(),
  dateOfBirth: z.string().optional(),
  passportExpiry: z.string().optional(),
  sex: z.enum(['M', 'F']).optional().or(z.literal('')),
  mrzRaw: z.string().max(120).optional(),
  registrationNumber: z.string().trim().max(60).optional(),
  touristTaxAmount: z.string().optional(),
  touristTaxPaid: z.string().optional(), // checkbox: 'on' | undefined
})

// Misafir belge bilgileri (guests) + registratsiya alanları (guest_registrations) birlikte kaydedilir
export async function saveRegistrationDetailsAction(
  registrationId: string,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations('errors')
  if (!z.string().uuid().safeParse(registrationId).success) return { error: t('invalidData') }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }
  const role = (user.user_metadata?.role as string) ?? 'receptionist'
  if (!REGISTRATION_ROLES.has(role)) return { error: t('permissionDenied') }

  const parsed = detailsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: t('invalidData') }
  const d = parsed.data

  const service = createServiceClient()

  // Kayda bağlı misafir id'sini bul
  const { data: reg, error: regErr } = await service
    .from('guest_registrations')
    .select('guest_id')
    .eq('id', registrationId)
    .single()
  if (regErr || !reg) return { error: t('registrationSaveFailed', { msg: regErr?.message ?? 'not found' }) }

  // Misafir belge bilgileri
  const { error: guestErr } = await service
    .from('guests')
    .update({
      passport_series: d.passportSeries || null,
      passport_number: d.passportNumber || null,
      visa_number: d.visaNumber || null,
      visa_expiry: d.visaExpiry || null,
      pinfl: d.pinfl || null,
      nationality: d.nationality || null,
      date_of_birth: d.dateOfBirth || null,
      passport_expiry: d.passportExpiry || null,
      sex: d.sex || null,
      mrz_raw: d.mrzRaw || null,
    })
    .eq('id', reg.guest_id)
  if (guestErr) return { error: t('registrationSaveFailed', { msg: guestErr.message }) }

  // Registratsiya alanları
  const { error: regUpdErr } = await service
    .from('guest_registrations')
    .update({
      registration_number: d.registrationNumber || null,
      tourist_tax_amount: d.touristTaxAmount ? Number(d.touristTaxAmount) : null,
      tourist_tax_paid: d.touristTaxPaid === 'on',
    })
    .eq('id', registrationId)
  if (regUpdErr) return { error: t('registrationSaveFailed', { msg: regUpdErr.message }) }

  revalidatePath('/registrations')
  revalidatePath(`/registrations/${registrationId}`)
  return { success: true }
}

// E-Mehmon PDF/görsel çıktısını private storage'a yükler, document_url'e yolu yazar
export async function uploadRegistrationDocumentAction(
  registrationId: string,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations('errors')
  if (!z.string().uuid().safeParse(registrationId).success) return { error: t('invalidData') }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }
  const role = (user.user_metadata?.role as string) ?? 'receptionist'
  if (!REGISTRATION_ROLES.has(role)) return { error: t('permissionDenied') }

  const file = formData.get('document')
  if (!(file instanceof File) || file.size === 0) return { error: t('fileRequired') }
  if (file.size > MAX_DOC_BYTES) return { error: t('fileTooLarge') }
  if (!ALLOWED_DOC_TYPES.has(file.type)) return { error: t('invalidFileType') }

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'pdf'
  const path = `${registrationId}/${Date.now()}.${ext}`

  const service = createServiceClient()
  const { error: upErr } = await service.storage
    .from('registrations')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) return { error: t('uploadFailed', { msg: upErr.message }) }

  const { error: updErr } = await service
    .from('guest_registrations')
    .update({ document_url: path })
    .eq('id', registrationId)
  if (updErr) return { error: t('uploadFailed', { msg: updErr.message }) }

  revalidatePath(`/registrations/${registrationId}`)
  return { success: true }
}
