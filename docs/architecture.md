# Mimari Kararlar — Anor Avenue Hotel

## Teknoloji Seçimleri ve Gerekçeleri

### Next.js 15 (App Router)
**Neden:** SSG (Static Site Generation) misafir sitesinde SEO ve hız için kritik. Özbekistan'da internet yavaş — statik sayfalar sunucudan değil CDN'den gelir.
**Alternatif reddedilen:** Vite/React SPA — SEO için server-side rendering yok.

### Supabase (PostgreSQL + RLS + Auth)
**Neden:** Ücretsiz tier yeterli, RLS ile rol bazlı erişim veritabanı seviyesinde, Realtime müsaitlik için built-in.
**Dikkat:** Free tier'da 500MB storage, 2GB bandwidth — deneme için yeterli.

### pnpm
**Neden:** npm'den hızlı, disk tasarrufu. Next.js 15 ile daha iyi compatibility.
**Kural:** yarn veya npm kullanma, komutları karıştırma.

### TanStack Query
**Neden:** Client-side cache yönetimi, loading/error state otomatik, useEffect ile veri çekme antipattern.

### Zod
**Neden:** Server Action'larda tip güvenli validasyon. "any" kullanmamak için zorunlu.

---

## Mimari Kararlar

### Monorepo mu, ayrı repo mu?
**Karar:** Tek repo, iki ayrı Next.js uygulaması.
```
anor-avenue/
├── guest-site/
├── admin-panel/
└── packages/
    └── shared/   ← ortak tipler ve utils
```
**Gerekçe:** Ortak Supabase tipler ve util fonksiyonları paylaşılabilir.

### Rezervasyon çakışma önleme
**Karar:** Server Action + PostgreSQL transaction + SELECT FOR UPDATE lock.
```typescript
// Server Action'da
await supabase.rpc('create_reservation_safe', {
  p_room_id: roomId,
  p_check_in: checkIn,
  p_check_out: checkOut,
})
// Supabase function içinde FOR UPDATE lock var
```
**Kural:** Bu mantık ASLA client'a taşınmaz, ASLA AI'a bırakılmaz.

### OTA Senkronu
**Karar:** Deneme döneminde iCal (Nobeds veya benzeri).
**Gerekçe:** Kendi gerçek zamanlı OTA push kodu = overbooking riski.
**Gelecek:** Booking.com Connectivity API — deneme sonrası değerlendirme.

### Çok Dil Mimarisi
**Karar:** `next-intl` ile `[locale]` prefix.
```
/uz/odalar
/ru/nomerlar
/en/rooms
```
**Varsayılan:** uz (Özbekçe)
**Dil tespiti:** Accept-Language header + cookie (değiştirince sakla)

---

## Güvenlik Kararları

### API Anahtarları
- `NEXT_PUBLIC_` prefix: sadece anon Supabase key (kamuya açık, RLS koruyor)
- `service_role` key: sadece server, asla client'a gitme

### RLS Prensipleri
- Her tablo RLS açık — istisna yok
- "Herkese açık" bile explicitly belirtilmeli
- Yeni tablo eklersen RLS policy de ekle

### Input Validasyon
- Server Action giriş = Zod parse
- Başarısız parse = 400 dön, işlem yapma

---

## Performans Kararları

### Misafir Sitesi Sayfa Stratejisi
| Sayfa | Strateji | Neden |
|-------|----------|-------|
| Ana sayfa | SSG | İçerik değişmez, CDN'den gelsin |
| Odalar listesi | SSG + ISR | Nadiren değişir |
| Rezervasyon | SSR | Gerçek zamanlı fiyat + müsaitlik |
| Başarı sayfası | SSG | Statik |

### Admin Panel
Tüm admin sayfaları: SSR (dinamik veri, cache uygun değil)

---

## Deployment Planı

1. Supabase: ücretsiz tier (proje.supabase.co)
2. Guest site: Vercel (ücretsiz hobby plan)
3. Admin panel: Vercel (aynı hesap, ayrı proje)

**Önemli:** Her iki site aynı Supabase projesini kullanır, ayrı Supabase açma.
