import Image from 'next/image'

// CoverImage — "orta yol" kapak görseli.
// Dikey (telefon) fotoğraflar geniş kutulara `objectFit: cover` ile konunca
// başı/tavanı kesiliyordu. Bunun yerine: fotoğrafın TAMAMI `contain` ile ortada
// gösterilir; arkası aynı fotonun bulanık (blur) büyütülmüş kopyasıyla doldurulur.
// Böylece hiçbir önemli kısım kesilmez, boşluk da estetik durur.
//
// Ebeveyn (parent) `position: relative` + belirli yükseklik/aspect-ratio + overflow:hidden
// olmalı; bu bileşen onu doldurur (inset: 0).

type Props = {
  src: string
  alt: string
  sizes?: string
  priority?: boolean
  quality?: number
}

export default function CoverImage({ src, alt, sizes = '100vw', priority, quality = 80 }: Props) {
  return (
    <>
      {/* Bulanık dolgu — arka planı doldurur */}
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes={sizes}
        quality={40}
        style={{ objectFit: 'cover', transform: 'scale(1.2)', filter: 'blur(22px)', opacity: 0.55 }}
      />
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(18,12,4,0.28)' }} />
      {/* Asıl foto — tamamı görünür */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        style={{ objectFit: 'contain' }}
      />
    </>
  )
}
