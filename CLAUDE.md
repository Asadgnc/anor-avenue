# CLAUDE.md — Anor Avenue Hotel System

## Proje Genel Bakış
İki ayrı Next.js uygulaması:
1. **`/guest-site`** — Misafirler için tanıtım + direkt rezervasyon (hızlı, SEO, çok dilli: UZ/RU/EN)
2. **`/admin-panel`** — Otel yönetim paneli (PMS + akıllı dashboard, sadece personel)

Otel: Taşkent, Özbekistan. ~10-12 oda, 4 kat.
- Bodrum (-1): standart/bütçe odalar
- 2-3. kat: lüks odalar
- 4. kat (mansard): lüks + eğimli tavan, özel kategori

Proje sahibi kod bilmiyor. Her kararı açıkla, jargon kullandıktan sonra parantez içinde açıkla.

---

## Stack (Teknoloji Yığını)

```
Runtime:     Node.js 20+
Package:     pnpm (npm veya yarn kullanma)
Framework:   Next.js 15 (App Router)
Language:    TypeScript (strict mode, any yasak)
DB:          Supabase (PostgreSQL + RLS + Realtime)
Auth:        Supabase Auth
Styling:     Tailwind CSS v4
Validation:  Zod
Data fetch:  TanStack Query (client) + Server Actions (mutation)
Payment:     PayTechUz (Payme + Click + Uzum)
i18n:        next-intl (uz/ru/en)
3D:          React Three Fiber — SADECE lazy load, belirli sayfalarda
```

---

## Komutlar

```bash
# Geliştirme
pnpm dev

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint

# Supabase lokal
pnpm supabase start
pnpm supabase db push
pnpm supabase gen types typescript --local > src/types/supabase.ts
```

---

## Klasör Yapısı

```
anor-avenue/
├── CLAUDE.md                        ← bu dosya (her oturumda okunur)
├── docs/
│   ├── architecture.md              ← mimari kararlar
│   ├── database-schema.md           ← tablo yapısı ve ilişkiler
│   ├── design-system.md             ← renk, font, component kuralları
│   ├── api-contracts.md             ← endpoint listesi
│   └── tasks.md                     ← [ ] görev takibi
├── guest-site/
│   ├── CLAUDE.md                    ← misafir sitesine özel kurallar
│   ├── src/
│   │   ├── app/[locale]/
│   │   ├── components/
│   │   │   ├── ui/                  ← temel bileşenler
│   │   │   ├── hotel/               ← otel-özel bileşenler
│   │   │   └── 3d/                  ← SADECE 3D, lazy loaded
│   │   ├── styles/
│   │   │   └── tokens.css           ← design tokens (buradan sapma yok)
│   │   └── messages/
│   │       ├── uz.json
│   │       ├── ru.json
│   │       └── en.json
└── admin-panel/
    ├── CLAUDE.md                    ← panel-özel kurallar
    └── src/
        ├── app/
        ├── components/
        └── lib/
```

---

## Mimari Kurallar

### Veri Akışı
- DB mutation = yalnızca Server Actions (`'use server'`)
- Her Server Action = Zod ile validate edilmeli
- Client-side doğrudan DB çağrısı YASAK
- TanStack Query sadece okuma için

```typescript
// DOĞRU
'use server'
const schema = z.object({ roomId: z.string().uuid() })
export async function createReservation(formData: FormData) {
  const validated = schema.parse(Object.fromEntries(formData))
}

// YANLIŞ
async function fetchFromClient() {
  const { data } = await supabase.from('reservations').select() // ← CLIENT'TA YAPMA
}
```

### Rezervasyon Mantığı — KRİTİK
- Çekirdek rezervasyon/oda kilitleme mantığı ASLA AI'a bırakılmaz
- Çakışma kontrolü = DB constraint + server action, client değil
- Overbooking önleme = PostgreSQL `FOR UPDATE` lock

### TypeScript
- `any` kullanma — her tip açık olmalı
- Supabase tipleri: `pnpm supabase gen types` ile üret, elle yazma

---

## Supabase Kuralları

- RLS (Row Level Security) her tabloda zorunlu — istisnasız
- Admin operasyonlar: `service_role` sadece server tarafında
- Realtime: sadece `availability` tablosu (diğerlerinde açma, pahalı)
- `.env.local` dışında hiçbir yerde API key olmasın

### Roller (RLS Politikaları)
| Rol | Erişim |
|-----|--------|
| admin | Her şey |
| manager | Operasyon + finans + raporlar, sistem ayarları sınırlı |
| receptionist | Rezervasyon, check-in/out, ödeme alma; fiyat/ayar yok |
| housekeeper | Sadece oda temizlik durumu + kendi görevleri |
| accountant | Finans/fatura/rapor; rezervasyona dokunamaz |

---

## Tasarım Sistemi — Kurallar

### Görsel Felsefe
- Fotoğraflar: az ama güçlü — hero, oda detay, atmosfer (3-5 adet max per sayfa)
- Fotoğraf kaynağı: SADECE `/public/hotel-photos/` klasörü
- 3D: yalnızca seçili sayfalarda (örn. oda sanal tur), lazy load zorunlu
- Animasyon: CSS transform/transition tercih, WebGL sadece 3D bileşenlerinde

### Performans (Özbekistan internet = yavaş — KRİTİK)
- Görseller: WebP, `next/image` ile optimize, lazy load
- Misafir sitesi: SSG öncelikli, SSR sadece rezervasyon sayfasında
- Font: `next/font` ile self-host, Google CDN değil
- `<img>` kullanma — her zaman `next/image`

### Çok Dil
- Varsayılan: `uz` (Özbekçe)
- `next-intl` ile `[locale]` prefix
- Dil tespiti: otomatik + cookie

---

## Ödeme Entegrasyonu

- Kütüphane: `PayTechUz` (Payme + Click + Uzum — Stripe/PayPal Özbekistan'da çalışmıyor)
- Webhook'lar: `/app/api/webhooks/payme/` ve `/app/api/webhooks/click/`
- Nakit ödeme de desteklenmeli (walk-in misafirler)
- TÜM ödeme logları `payments` tablosuna yazılır, asla silinmez

---

## OTA Senkronu

- Deneme döneminde: iCal senkronu (Nobeds veya benzeri ücretsiz channel manager)
- Kendi kodumuzda gerçek zamanlı OTA push YOK — overbooking riski
- Booking.com API: ileride eklenebilir, deneme döneminde değil

---

## Yasal Zorunluluklar (Özbekistan)

- Yabancı misafir kaydı (registratsiya) yasal zorunluluk
- Admin panelde "Misafir Kayıt" modülü bu gereksinimi karşılamalı
- 1C muhasebe uyumu: Excel/1C export formatı desteklenmeli

---

## Kesinlikle Yapma

- `any` kullanma
- `useEffect` ile veri çekme — TanStack Query kullan
- Rezervasyon mantığını client'ta yapma
- `<img>` kullanma — `next/image` kullan
- `.env.local` dışında API key
- `localStorage` kullanma (SSR kırılır)
- Büyük değişiklik öncesi onay almadan devam etme — kullanıcıya söyle, bekle
- Tailwind dışında inline style yazma

---

## Mevcut Durum (Session Log)

- [x] CLAUDE.md oluşturuldu
- [x] Proje mimarisi kararlaştırıldı (Next.js 15 + Supabase + pnpm)
- [x] Roller tanımlandı: admin, manager, receptionist, housekeeper, accountant
- [x] OTA kararı: iCal/channel manager, kendi kodumuzda değil
- [x] Ödeme: Payme + Click (PayTechUz)
- [x] Tasarım: az fotoğraf + CSS animasyon + 3D sadece özel sayfalarda
- [x] Supabase projesi oluşturuldu (qvpflkspmisxcnfnyeve)
- [x] DB şeması + RLS migration'ları çalıştırıldı (5 migration)
- [x] Admin panel scaffolding tamamlandı
- [x] Guest site scaffolding tamamlandı
- [x] Design tokens (`tokens.css`) oluşturuldu
- [x] Font'lar (`next/font`) eklendi — Inter + Playfair Display
- [x] Guest site: middleware + [locale] routing + ana sayfa
- [x] Guest site: odalar sayfası + rezervasyon formu → Supabase'e yazıyor
- [x] Guest site: oda detay sayfası uz/ru/en (galeri placeholder, fiyat, rezervasyon butonu)
- [x] Admin panel: login + dashboard + rezervasyon takvimi
- [x] Admin panel: odalar, misafirler, temizlik, ödemeler sayfaları
- [x] Admin panel: rezervasyon detay + check-in/check-out + ödeme ekleme
- [x] Admin panel: misafir detay + yeni misafir formu
- [x] Admin panel: günlük rapor sayfası + CSV/Excel indirme
- [x] Admin panel: fatura yazdırma (/reservations/[id]/invoice — yeni sekmede açılır)
- [x] Admin panel: registratsiya modülü (/registrations — durum takibi, filtre)
- [x] Admin panel: dashboard 30 günlük ADR/RevPAR/doluluk bar grafikleri
- [x] Personel hesabı: Muzaffar (admin) — a.kenja3683@gmail.com
- [x] TypeScript — her iki uygulama hatasız

## Sonraki Adımlar
1. `pnpm dev` ile her iki uygulamayı test et — `cd admin-panel && pnpm dev`
2. Gerçek otel fotoğraflarını `/public/hotel-photos/` klasörüne ekle
3. Vercel'e deploy
4. Payme/Click entegrasyonu (merchant hesabı onaylandıktan sonra)

---

## Proje Sahibi Notu

Kod bilmeyen ama projeyi yöneten bir üniversite öğrencisiyle çalışıyorsun.
- Kararları açıkla, jargon kullandıktan sonra parantez içinde Türkçe açıkla
- Her oturumun sonunda "Mevcut Durum" bölümünü güncelle
- Hata çıkarsa kullanıcıya sormadan düzelt, ama ne yaptığını söyle
- Büyük mimari kararlar için seçenekleri listele, öner, onay bekle
- Tasarım kararlarını her zaman görsel referansla açıkla
