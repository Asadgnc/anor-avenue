'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type LoginState = {
  error?: string
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const t = await getTranslations('errors')
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: t('invalidCredentials') }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: t('invalidCredentials') }
  }

  const locale = await getLocale()
  redirect(`/${locale}/dashboard`)
}
