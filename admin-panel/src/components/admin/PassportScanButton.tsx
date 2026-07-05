'use client'

// Reusable passport MRZ scanner. Opens the phone's rear camera (or a file picker
// on desktop), downscales the shot on-device to keep the upload small, sends it
// to Google Cloud Vision via a server action, and hands the parsed TD3 fields
// back to the host form. It never saves anything on its own — the host decides
// what to do with the result and the raw image.

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ScanLine } from 'lucide-react'
import { scanPassportAction } from '@/lib/actions/scan-passport'
import type { MrzFields } from '@/lib/mrz'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  onResult: (fields: MrzFields) => void
  onImage?: (file: File) => void
  className?: string
}

// Draw the picked image onto a canvas capped at MAX px on the largest side and
// return it as a JPEG data URL. Keeps colour (Vision reads colour fine) and
// bounds the upload size for slow connections.
async function toDownscaledJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image load failed'))
      el.src = url
    })

    const MAX = 1600
    const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)

    return canvas.toDataURL('image/jpeg', 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function PassportScanButton({ onResult, onImage, className }: Props) {
  const t = useTranslations('scan')
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return

    setBusy(true)
    setError(null)
    try {
      const dataUrl = await toDownscaledJpeg(file)
      const result = await scanPassportAction(dataUrl)

      if ('error' in result) {
        setError(result.error === 'not_found' ? t('notFound') : t('failed'))
        return
      }
      if (onImage) onImage(file)
      onResult(result.fields)
    } catch {
      setError(t('failed'))
    } finally {
      setBusy(false)
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
        {busy ? t('readingHint') : t('button')}
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
