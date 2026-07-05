import { NextResponse } from 'next/server'
import { syncAvailability } from '@/lib/channex-sync'

// Dahili senkron: guest-site (ayrı uygulama) misafir rezervasyonu oluşturunca
// müsaitliği hemen Channex'e itmek için çağırır. Paylaşılan gizli anahtarla korunur.
// Env yoksa (INTERNAL_SYNC_SECRET) 403; Channex yoksa syncAvailability no-op.

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_SYNC_SECRET
  if (!secret || request.headers.get('x-internal-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try { await request.json() } catch { /* boş gövde ok */ }

  const from = new Date().toISOString().slice(0, 10)
  const to = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  const res = await syncAvailability(from, to)
  return NextResponse.json({ ok: !res.error, ...res }, { status: 200 })
}
