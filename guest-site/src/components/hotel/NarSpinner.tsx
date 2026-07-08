import Image from 'next/image'

// Hero'nun sağında yavaşça dönen nar amblemi.
// Görsel: /public/anor-nar.png — NAR.jpeg'in birebir kırpılmış hali (renkler değiştirilmedi).
// Sadece dekoratif; küçük ekranlarda gizli (yer kaplamasın).
// Dış katman konumlandırır (translateY), iç katman döner (transform çakışmasın diye ayrı).
export default function NarSpinner() {
  return (
    <div
      aria-hidden
      className="hidden lg:block"
      style={{
        position: 'absolute',
        right: 'clamp(2rem, 8vw, 7rem)',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 'clamp(220px, 22vw, 340px)',
        height: 'clamp(220px, 22vw, 340px)',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <div
        className="anor-nar-spin"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '28%',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 60px rgba(201,169,110,0.20)',
        }}
      >
        <Image
          src="/anor-nar.png"
          alt=""
          fill
          sizes="340px"
          style={{ objectFit: 'cover' }}
          priority
        />
      </div>
    </div>
  )
}
