'use client'

// HotelVideo — hafif, tembel (lazy) video oynatıcı.
//   mode="ambient"  → sessiz, döngülü; ekrana girince kendi başlar (bahçe gibi arka plan).
//   mode="feature"  → poster + oynat düğmesi; tıklanınca sesli, kontrollü oynar (tanıtım).
// Yavaş internet için preload="none": video ancak gerekince indirilir.

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type Props = {
  src: string
  poster: string
  mode?: 'feature' | 'ambient'
  label?: string
  /** CSS aspect-ratio, örn "9 / 16" (dikey telefon), "16 / 9". Varsayılan dikey. */
  ratio?: string
  className?: string
}

export default function HotelVideo({
  src,
  poster,
  mode = 'feature',
  label,
  ratio = '9 / 16',
  className,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false) // feature: kullanıcı başlattı mı

  // Ambient: görünür olunca oynat, çıkınca duraklat.
  useEffect(() => {
    if (mode !== 'ambient') return
    const el = wrapRef.current
    const vid = videoRef.current
    if (!el || !vid) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) vid.play().catch(() => {})
          else vid.pause()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [mode])

  const wrapStyle: React.CSSProperties = {
    position: 'relative',
    aspectRatio: ratio,
    width: '100%',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    backgroundColor: 'var(--color-charcoal)',
  }

  if (mode === 'ambient') {
    return (
      <div ref={wrapRef} style={wrapStyle} className={className}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {label && (
          <>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                zIndex: 1,
                color: 'var(--color-white)',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {label}
            </span>
          </>
        )}
      </div>
    )
  }

  // feature
  return (
    <div ref={wrapRef} style={wrapStyle} className={className}>
      {playing ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
          preload="metadata"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={label ? `${label} — videoyu oynat` : 'Videoyu oynat'}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            background: 'transparent',
          }}
        >
          <Image src={poster} alt={label ?? ''} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 50vw" />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.25) 100%)',
            }}
          />
          {/* Oynat butonu */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(201,169,110,0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
            }}
          >
            <span style={{ color: '#1C1C1E', fontSize: '1.6rem', marginLeft: '4px', lineHeight: 1 }}>▶</span>
          </span>
          {label && (
            <span
              style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                right: '1rem',
                zIndex: 1,
                color: 'var(--color-white)',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                textAlign: 'left',
                textShadow: '0 2px 8px rgba(0,0,0,0.55)',
              }}
            >
              {label}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
