'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from './actions'

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Anor Avenue</h1>
            <p className="mt-1 text-sm text-gray-500">Yönetim Paneli</p>
          </div>

          <form action={action} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                E-posta
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isPending}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-gray-900 focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="personel@anoravenue.uz"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isPending}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-gray-900 focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
            </div>

            {state.error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium
                         rounded-lg hover:bg-gray-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
