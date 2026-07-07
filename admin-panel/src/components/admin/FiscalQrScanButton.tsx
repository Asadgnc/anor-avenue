'use client'

// Soliq (OFD) fiskal chek QR skaneri.
//
// Terminal chekidagi QR kod `https://ofd.soliq.uz/epi?t=...&r=...&c=...&s=...`
// havolasini ochadi. Bu tugma kamerani ochib, kadrlarni jsQR bilan tekshiradi va
// chek havolasini topganida uni host formaga qaytaradi. Hech narsani oʻzi
// saqlamaydi — host qaror qiladi. Kamera boʻlmasa host qoʻlda kiritish maydonini
// koʻrsatadi (bu komponent faqat skanerlaydi).

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { QrCode, X } from 'lucide-react'
import jsQR from 'jsqr'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  onResult: (url: string) => void
  className?: string
}

// Faqat Soliq OFD chek havolalarini qabul qilamiz.
export function isFiscalUrl(text: string): boolean {
  try {
    const u = new URL(text.trim())
    return /(^|\.)soliq\.uz$/i.test(u.hostname)
  } catch {
    return false
  }
}

export default function FiscalQrScanButton({ onResult, className }: Props) {
  const t = useTranslations('fiscalScan')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  const closeCamera = useCallback(() => {
    stopStream()
    setOpen(false)
    setError(null)
  }, [stopStream])

  const scanLoop = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
    if (code && code.data) {
      const text = code.data.trim()
      if (isFiscalUrl(text)) {
        stopStream()
        setOpen(false)
        setError(null)
        onResult(text)
        return
      }
      setError(t('invalid'))
    }
    rafRef.current = requestAnimationFrame(scanLoop)
  }, [onResult, stopStream, t])

  // Attach stream + start scanning once the <video> mounts.
  useEffect(() => {
    if (open && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
      rafRef.current = requestAnimationFrame(scanLoop)
    }
  }, [open, scanLoop])

  async function openCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setOpen(true)
    } catch {
      setError(t('cameraError'))
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={openCamera}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: dash.primary }}
      >
        <QrCode size={16} />
        {t('button')}
      </button>

      {error && !open && (
        <p className="mt-1.5 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#FDEAEA', color: '#EF4444' }}>
          {error}
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-contain"
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
            <p className="mb-4 max-w-md text-center text-sm font-medium text-white/95 bg-black/50 rounded-lg px-3 py-2">
              {t('align')}
            </p>
            <div className="relative w-[70%] max-w-[320px] aspect-square rounded-xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            <p className="mt-4 text-xs text-white/80 bg-black/40 rounded px-2 py-1">{t('scanning')}</p>
          </div>

          {error && (
            <div className="absolute inset-x-0 top-4 flex justify-center px-4 pointer-events-none">
              <p className="max-w-md text-center text-xs px-3 py-2 rounded-lg bg-red-500/95 text-white">
                {error}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={closeCamera}
            aria-label={t('cancel')}
            className="absolute top-4 right-4 z-20 grid place-items-center h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X size={22} />
          </button>
        </div>
      )}
    </div>
  )
}
