'use client'

// Reusable passport MRZ scanner with a guided live camera.
//
// Tapping the button opens a full-screen camera overlay with an alignment frame
// so staff can fill the view with the passport data page (and its bottom MRZ
// lines) without glare — the single biggest factor in OCR success. The captured
// frame is sent to Google Cloud Vision via a server action, the TD3 machine-
// readable zone is parsed with check digits, and the structured fields are handed
// back to the host form. On devices without camera access it falls back to the
// native file picker. It never saves anything on its own — the host decides what
// to do with the result and the raw image.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ScanLine, X, Camera, Loader2, RefreshCw } from 'lucide-react'
import { scanPassportAction } from '@/lib/actions/scan-passport'
import type { MrzFields } from '@/lib/mrz'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  onResult: (fields: MrzFields) => void
  onImage?: (file: File) => void
  className?: string
}

const MAX_SIDE = 2000

// Draw a picked file onto a canvas, cap the largest side, return a JPEG data URL.
// Used only for the desktop / no-camera fallback path.
async function fileToJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image load failed'))
      el.src = url
    })
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function PassportScanButton({ onResult, onImage, className }: Props) {
  const t = useTranslations('scan')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [open, setOpen] = useState(false) // camera overlay visible
  const [busy, setBusy] = useState(false) // OCR request in flight
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  // Always release the camera when the component goes away.
  useEffect(() => () => stopStream(), [stopStream])

  // Attach the live stream once the <video> is mounted.
  useEffect(() => {
    if (open && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [open])

  function closeCamera() {
    stopStream()
    setOpen(false)
    setBusy(false)
    setError(null)
  }

  async function openCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      setOpen(true)
    } catch {
      // No camera / permission denied / unsupported → native picker fallback.
      fileInputRef.current?.click()
    }
  }

  // Shared: send a JPEG data URL to Vision, apply or surface the result.
  async function runOcr(dataUrl: string, file: File): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      const result = await scanPassportAction(dataUrl)
      if ('error' in result) {
        setError(result.error === 'not_found' ? t('notFound') : t('failed'))
        return false
      }
      if (onImage) onImage(file)
      onResult(result.fields)
      return true
    } catch {
      setError(t('failed'))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth || busy) return

    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight))
    const w = Math.round(video.videoWidth * scale)
    const h = Math.round(video.videoHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(video, 0, 0, w, h)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
    const file = new File([blob ?? new Blob()], `passport-${Date.now()}.jpg`, { type: 'image/jpeg' })

    const ok = await runOcr(dataUrl, file)
    if (ok) closeCamera()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    const dataUrl = await fileToJpeg(file)
    await runOcr(dataUrl, file)
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      <button
        type="button"
        onClick={openCamera}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: dash.primary }}
      >
        <ScanLine size={16} />
        {busy && !open ? t('readingHint') : t('button')}
      </button>
      <p className="mt-1.5 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
        {t('cameraHint')}
      </p>

      {/* Error from the desktop / fallback path (overlay shows its own inline). */}
      {error && !open && (
        <p className="mt-1.5 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#FDEAEA', color: '#EF4444' }}>
          {error}
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          {/* Live camera — full frame so what you see is what gets captured. */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-contain"
          />

          {/* Alignment guide + hint (visual only, does not capture events). */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
            <p className="mb-4 max-w-md text-center text-sm font-medium text-white/95 bg-black/50 rounded-lg px-3 py-2">
              {t('align')}
            </p>
            <div className="relative w-[88%] max-w-[520px] aspect-[1.42/1] rounded-xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              {/* MRZ strip marker near the bottom of the data page. */}
              <div className="absolute inset-x-3 bottom-3 h-[14%] rounded-md border-2 border-dashed border-amber-300/90 flex items-end justify-end">
                <span className="m-1 text-[10px] font-bold tracking-widest text-amber-300">MRZ</span>
              </div>
            </div>
          </div>

          {/* Inline error + retake, keeps the camera open. */}
          {error && (
            <div className="absolute inset-x-0 top-4 flex justify-center px-4 pointer-events-none">
              <p className="max-w-md text-center text-xs px-3 py-2 rounded-lg bg-red-500/95 text-white">
                {error}
              </p>
            </div>
          )}

          {/* Busy overlay while Vision reads the frame. */}
          {busy && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white">
              <Loader2 size={40} className="animate-spin" />
              <p className="mt-3 text-sm">{t('readingHint')}</p>
            </div>
          )}

          {/* Controls */}
          <button
            type="button"
            onClick={closeCamera}
            aria-label={t('cancel')}
            className="absolute top-4 right-4 z-20 grid place-items-center h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X size={22} />
          </button>

          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-6 pb-8 pt-6 bg-gradient-to-t from-black/70 to-transparent">
            {error ? (
              <button
                type="button"
                onClick={() => setError(null)}
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-60"
              >
                <RefreshCw size={18} />
                {t('retake')}
              </button>
            ) : (
              <button
                type="button"
                onClick={capture}
                disabled={busy}
                aria-label={t('capture')}
                className="grid place-items-center h-16 w-16 rounded-full bg-white ring-4 ring-white/40 disabled:opacity-60 active:scale-95 transition-transform"
              >
                <Camera size={26} className="text-black" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
