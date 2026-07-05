'use client'

// Reusable passport MRZ scanner. Opens the phone's rear camera (or a file
// picker on desktop), runs on-device OCR with tesseract.js (free, no API key),
// parses the TD3 machine-readable zone locally with check-digit validation, and
// hands the structured fields back to the host form. It never saves anything on
// its own — the host decides what to do with the result and the raw image.

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ScanLine } from 'lucide-react'
import { parseMrzFromText, type MrzFields } from '@/lib/mrz'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  onResult: (fields: MrzFields) => void
  onImage?: (file: File) => void
  className?: string
}

// Draw the picked image onto a canvas, capping the largest side and converting
// to grayscale. Bounds OCR time and gives Tesseract a cleaner signal.
async function preprocess(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image load failed'))
      el.src = url
    })

    const MAX = 2000
    const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)

    const imageData = ctx.getImageData(0, 0, w, h)
    const px = imageData.data
    for (let i = 0; i < px.length; i += 4) {
      const gray = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
      px[i] = px[i + 1] = px[i + 2] = gray
    }
    ctx.putImageData(imageData, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

const MRZ_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'

export default function PassportScanButton({ onResult, onImage, className }: Props) {
  const t = useTranslations('scan')
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return

    setBusy(true)
    setError(null)
    setProgress(0)
    try {
      const canvas = await preprocess(file)

      // Lazy-load Tesseract so it never touches the main bundle.
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      await worker.setParameters({ tessedit_char_whitelist: MRZ_WHITELIST })
      const { data } = await worker.recognize(canvas)
      await worker.terminate()

      const fields = parseMrzFromText(data.text)
      if (!fields) {
        setError(t('notFound'))
        return
      }
      if (onImage) onImage(file)
      onResult(fields)
    } catch {
      setError(t('failed'))
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: dash.primary }}
      >
        <ScanLine size={16} />
        {busy ? t('reading', { progress }) : t('button')}
      </button>
      <p className="mt-1.5 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
        {busy ? t('readingHint') : t('cameraHint')}
      </p>
      {error && (
        <p className="mt-1.5 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#FDEAEA', color: '#EF4444' }}>
          {error}
        </p>
      )}
    </div>
  )
}
