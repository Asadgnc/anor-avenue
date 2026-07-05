'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getLocale } from 'next-intl/server'

const WRITER_ROLES = ['admin', 'manager', 'receptionist'] as const

async function requireWriteRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')
  const role = (user.user_metadata?.role as string) ?? ''
  if (!(WRITER_ROLES as readonly string[]).includes(role)) throw new Error('forbidden')
  return { supabase, userId: user.id }
}

// --- Notes ---

const noteSchema = z.object({
  note: z.string().min(1).max(1000),
})

export type NoteState = { error?: string; success?: boolean }

export async function addGuestNoteAction(
  guestId: string,
  _prev: NoteState,
  formData: FormData
): Promise<NoteState> {
  try {
    const { supabase, userId } = await requireWriteRole()
    const parsed = noteSchema.safeParse({ note: formData.get('note') })
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

    const { error } = await supabase.from('guest_notes').insert({
      guest_id: guestId,
      note: parsed.data.note,
      created_by: userId,
    })
    if (error) return { error: error.message }

    const locale = await getLocale()
    revalidatePath(`/${locale}/guests/${guestId}`)
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteGuestNoteAction(noteId: string, guestId: string): Promise<void> {
  try {
    const { supabase } = await requireWriteRole()
    await supabase.from('guest_notes').delete().eq('id', noteId)
    const locale = await getLocale()
    revalidatePath(`/${locale}/guests/${guestId}`)
  } catch {
    // silently ignore delete failures
  }
}

// --- Tags ---

const tagSchema = z.object({
  tag: z.string().min(1).max(50).toLowerCase().trim(),
})

export type TagState = { error?: string; success?: boolean }

export async function addGuestTagAction(
  guestId: string,
  _prev: TagState,
  formData: FormData
): Promise<TagState> {
  try {
    const { supabase } = await requireWriteRole()
    const raw = (formData.get('tag') as string | null) ?? ''
    const parsed = tagSchema.safeParse({ tag: raw.toLowerCase().trim() })
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

    const { error } = await supabase.from('guest_tags').insert({
      guest_id: guestId,
      tag: parsed.data.tag,
    })
    if (error && error.code === '23505') return { error: 'duplicate' }
    if (error) return { error: error.message }

    const locale = await getLocale()
    revalidatePath(`/${locale}/guests/${guestId}`)
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removeGuestTagAction(tagId: string, guestId: string): Promise<void> {
  try {
    const { supabase } = await requireWriteRole()
    await supabase.from('guest_tags').delete().eq('id', tagId)
    const locale = await getLocale()
    revalidatePath(`/${locale}/guests/${guestId}`)
  } catch {
    // silently ignore
  }
}

// --- Loyalty Points ---

const loyaltySchema = z.object({
  delta: z.coerce.number().int().nonpositive().or(z.coerce.number().int().positive()),
  reason: z.string().min(1).max(200),
})

export type LoyaltyState = { error?: string; success?: boolean }

export async function adjustLoyaltyAction(
  guestId: string,
  _prev: LoyaltyState,
  formData: FormData
): Promise<LoyaltyState> {
  try {
    const { supabase, userId } = await requireWriteRole()
    const parsed = loyaltySchema.safeParse({
      delta: formData.get('delta'),
      reason: formData.get('reason'),
    })
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

    const { error } = await supabase.from('loyalty_points').insert({
      guest_id: guestId,
      delta: parsed.data.delta,
      reason: parsed.data.reason,
      created_by: userId,
    })
    if (error) return { error: error.message }

    const locale = await getLocale()
    revalidatePath(`/${locale}/guests/${guestId}`)
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
