# Design System — Anor Avenue Hotel

## Felsefe
Az ama güçlü. Fotoğraf yeri geldiğinde kullan, doldurmak için değil.
3D: sadece belirli sayfalarda, lazy load zorunlu.

---

## Renk Paleti (Design Tokens)

```css
/* /guest-site/src/styles/tokens.css */
:root {
  /* Ana renkler */
  --color-primary: #1A1A2E;        /* Koyu lacivert — güven, lüks */
  --color-primary-light: #2D2D4E;
  --color-accent: #C9A96E;         /* Altın — premium his */
  --color-accent-light: #E8C98A;

  /* Nötr */
  --color-surface: #FAFAF8;        /* Kırık beyaz — steril değil, sıcak */
  --color-surface-alt: #F2F0EB;
  --color-text: #1C1C1C;
  --color-text-muted: #6B6B6B;
  --color-border: #E5E2DA;

  /* Durum renkleri */
  --color-success: #2D6A4F;
  --color-warning: #D4A017;
  --color-error: #C62828;
  --color-info: #1565C0;

  /* Admin panel — farklı ama tutarlı */
  --color-admin-bg: #0F0F1A;
  --color-admin-sidebar: #16213E;
  --color-admin-card: #1E1E3A;

  /* Spacing */
  --space-unit: 8px;

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;

  /* Shadow */
  --shadow-card: 0 2px 16px rgba(0,0,0,0.08);
  --shadow-elevated: 0 8px 32px rgba(0,0,0,0.12);
}
```

---

## Tipografi

```css
/* Font: Cormorant Garamond (lüks his) başlıklar + Inter (okunabilirlik) gövde */
/* next/font ile self-host — Google CDN kullanma */

--font-heading: 'Cormorant Garamond', Georgia, serif;
--font-body: 'Inter', system-ui, sans-serif;

/* Skala */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-hero: clamp(2.5rem, 5vw, 4rem);
```

---

## Fotoğraf Kullanım Kuralları

### Ne zaman kullanılır
- Hero section: 1 adet, tam ekran, WebP, optimize
- Oda detay sayfası: max 4-5 adet galeri
- Atmosfer bölümleri: 2-3 adet, metin ile dengeli

### Ne zaman kullanılmaz
- Doldurmak için arka plan olarak
- Küçük kartlarda (ikon veya renk blok kullan)
- Admin panelde (data odaklı, görsel dikkat dağıtır)

### Teknik
```jsx
// Her zaman next/image
import Image from 'next/image'

<Image
  src="/hotel-photos/room-luxury-01.webp"
  alt="Lüks oda, şehir manzarası"
  width={1200}
  height={800}
  priority={isHero}  // hero ise true, diğerleri false (lazy)
  quality={85}
/>
```

---

## 3D Kullanım Kuralları

### Nerede kullanılır
- Oda sanal tur sayfası (ayrı route: `/rooms/[id]/tour`)
- Ana sayfada küçük dekoratif 3D element (isteğe bağlı — performans testinden sonra)

### Zorunlu kurallar
```jsx
// SADECE dynamic import ile — lazy load zorunlu
import dynamic from 'next/dynamic'

const HotelRoom3D = dynamic(
  () => import('@/components/3d/HotelRoom3D'),
  {
    ssr: false,               // 3D server'da render olmaz
    loading: () => <RoomImageFallback />,  // yüklenirken fotoğraf göster
  }
)
```

### Performans eşiği
- 3D bileşen bundle'ı 200KB'dan büyük olmamalı
- Yavaş bağlantıda (3G simülasyon) 5 saniyede görünür olmalı

---

## Component Kuralları

### İsimlendirme
- Component dosyaları: `PascalCase.tsx` → `RoomCard.tsx`
- Sayfalar: `page.tsx` (Next.js App Router standardı)
- Util/hook: `camelCase.ts` → `useReservation.ts`

### Klasör yapısı
```
/components/
  ui/           ← temel (Button, Input, Modal, Badge)
  hotel/        ← otel-özel (RoomCard, BookingForm, PriceDisplay)
  3d/           ← sadece 3D bileşenler
  admin/        ← sadece admin panel bileşenleri
```

### Bileşen yazım standardı
```tsx
// Props interface her zaman açık
interface RoomCardProps {
  room: Room;
  onSelect: (roomId: string) => void;
  isSelected?: boolean;
}

// Default export
export default function RoomCard({ room, onSelect, isSelected = false }: RoomCardProps) {
  // ...
}
```

---

## Admin Panel vs Misafir Sitesi — Fark

| | Misafir Sitesi | Admin Panel |
|---|---|---|
| Tema | Açık, sıcak, lüks | Koyu, veri odaklı |
| Font | Cormorant + Inter | Sadece Inter |
| 3D | Evet (seçili sayfa) | Hayır |
| Fotoğraf | Evet (az, özenli) | Hayır |
| Animasyon | CSS, ince | Minimal |
| Öncelik | Duygu + dönüşüm | Hız + okunabilirlik |
