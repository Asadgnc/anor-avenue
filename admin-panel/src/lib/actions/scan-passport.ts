'use server'

// Cloud OCR for passport MRZ. The client sends a JPEG (base64) of the passport
// page; we forward it to Google Cloud Vision, then parse the TD3 machine-readable
// zone out of the returned text with the existing local parser + check digits.
// Vision is far more robust to glare, focus and clutter than on-device OCR.
//
// The API key lives only on the server (GOOGLE_CLOUD_VISION_API_KEY). Access is
// gated behind an authenticated staff session so the endpoint can't be abused to
// burn our free OCR quota.

import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { parseMrzFromText, type MrzFields } from '@/lib/mrz'

export type ScanResult = { fields: MrzFields } | { error: 'not_found' | 'failed' }

const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'

// ~7 MB of base64 ≈ ~5 MB raw image — well under Vision's 10 MB inline limit and
// plenty for a downscaled 1600px JPEG.
const MAX_BASE64_LEN = 7 * 1024 * 1024

const schema = z.object({
  // Accept either a raw base64 payload or a full data URL; we strip the prefix.
  imageBase64: z.string().min(100).max(MAX_BASE64_LEN),
})

function stripDataUrl(value: string): string {
  const comma = value.indexOf(',')
  return value.startsWith('data:') && comma !== -1 ? value.slice(comma + 1) : value
}

export async function scanPassportAction(imageBase64: string): Promise<ScanResult> {
  const parsed = schema.safeParse({ imageBase64 })
  if (!parsed.success) return { error: 'failed' }

  // Staff-only.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'failed' }

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY
  if (!apiKey) return { error: 'failed' }

  const content = stripDataUrl(parsed.data.imageBase64)

  try {
    const res = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            // MRZ is Latin-script; hinting keeps Vision from guessing Cyrillic.
            imageContext: { languageHints: ['en'] },
          },
        ],
      }),
    })

    if (!res.ok) return { error: 'failed' }

    const json = (await res.json()) as {
      responses?: Array<{
        fullTextAnnotation?: { text?: string }
        error?: { message?: string }
      }>
    }

    const first = json.responses?.[0]
    if (first?.error) return { error: 'failed' }

    const text = first?.fullTextAnnotation?.text
    if (!text) return { error: 'not_found' }

    const fields = parseMrzFromText(text)
    if (!fields) return { error: 'not_found' }

    return { fields }
  } catch {
    return { error: 'failed' }
  }
}
