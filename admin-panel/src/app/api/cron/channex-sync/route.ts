import { NextResponse } from 'next/server'
import { syncAll } from '@/lib/channex-sync'

// Güvenlik ağı: yuvarlanan pencereyi periyodik yeniden gönderir (kaçan
// güncellemeyi kendi kendine onarır). Asıl senkron zaten mutasyonlarda/webhook'ta olur.
// Vercel Cron isteğe otomatik `Authorization: Bearer <CRON_SECRET>` ekler (env varsa).

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const summary = await syncAll(365)
  return NextResponse.json(summary, { status: 200 })
}
