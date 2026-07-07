# CLAUDE.md — Anor Avenue Hotel System

## Temel Çalışma Kuralları

- **Görsel değişikliklerde ekran görüntüsüyle göster** — "tamamlandı" yazısı yetmez, tarayıcıda aç ve screenshot al.
- **Eksik veri varsa uydurma, kullanıcıya sor** — adres, fiyat, politika, koordinat gibi gerçek bilgiler bilinmiyorsa placeholder/tahmin yazma; "bu bilgiyi sağlar mısın?" diye sor.

---

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
│   ├── session-log.md               ← tamamlanan görevlerin geçmiş kaydı
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

## Oda Bazlı Veri Modeli — KRİTİK (30 Haziran 2026 kararı)

Otelin 12 gerçek odası birbirinden farklı fiziksel özelliklere sahip
(pencere sayısı, manzara kalitesi, jakuzi/küvet, izolasyon, fiyat farkı).
Bu bilgi `room_types` tablosunda DEĞİL, `rooms` tablosunda tutulur.

**Detaylı oda verisi:** `docs/rooms-data.md` dosyasına bak — her odanın
tam özellik tablosu, fiyatı ve fotoğraf klasör planı orada.

### Fiyat kuralı
- Fiyatın tek doğru kaynağı: `rooms_with_effective_price` view'i
  (`COALESCE(rooms.price_override, room_types.base_price)`)
- Hiçbir yerde `room_types.base_price`'ı doğrudan "bu odanın fiyatı" diye kullanma
- Frontend ve admin panel sorguları bu view'den okumalı, ham `rooms` tablosundan değil

### Bağlantılı oda kuralı (303 ↔ 304)
Bu sadece bilgi amaçlı bir DB ilişkisi (`connecting_room_id`). Otomatik kapı
kontrolü, ortak rezervasyon paketi YOK — personel istek üzerine fiziksel kapıyı
açar, sistemde hâlâ 2 ayrı rezervasyon olarak işlenir.

---

## Guest-Site İçerik Genişletme — Öncelik Sırası (30 Haziran 2026)

Mevcut `guest-site/src/messages/*.json` dosyaları çok yetersiz (43 satır,
sadece nav/hero/footer). Otel hakkında gerçek bilgi (konum, mutfak, güvenlik,
hizmetler) hiç yok. Bu Faz 4'ün eksik kısmı.

**Önerilen yeni içerik bölümleri** (öncelik sırasıyla, animasyon/3D'den ÖNCE):

1. Konum bölümü — metro 5dk, Yunusabad Dehqon Bazaar 10dk, otobüs durağı 3dk,
   çevrede 5 yemekhane + 4 market + ATM
2. Mutfak/ortak alan bölümü — 7/24 açık mutfak, kahvaltı (paket bazlı, helal/
   taze/günlük), buzdolabı kullanım hakkı, çay/kahve/mikrodalga, vending machine
3. Bahçe & atmosfer — kuşlar, oturma alanı, sigara alanı, "villa hissi"
4. Güvenlik — 7/24 kamera, yangın söndürücü
5. Hizmetler — 24/7 resepsiyon, ücretsiz tur/yönlendirme, indirimli yemek
   siparişi, günlük temizlik, çamaşırhane + buharlı ütü, indirimli rent-a-car

**Sıralama kuralı:** Bu içerik genişlemesi, hero animasyonundan ve booking/ödeme
entegrasyonundan ÖNCE yapılmalı.

**Yasak:** Yeni içerik eklerken stok fotoğraf kullanma. Gerçek görsel yoksa
metin-öncelikli bölüm tasarla (ikon + kısa açıklama).

---

## Hero Animasyon Notu (henüz onaylanmadı)

Mert "nar çarpışması" konsepti önerdi. Konsept henüz karara bağlanmadı —
**Claude Code bu animasyonu UYGULAMAYA BAŞLAMASIN**, önce Mert ile netleştirilecek.

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

- iCal entegrasyonu şimdilik devre dışı bırakıldı (kullanıcı kararı)
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

## Mevcut Durum

Detaylı geçmiş: `docs/session-log.md`

### Canlı sistem (7 Temmuz 2026 itibarıyla)
- Admin panel: Vercel canlı ✅ (sin1 bölgesi, PWA, web push, ~1sn Channex senkron)
- Guest site: Vercel canlı ✅ (3 dil uz/ru/en, gerçek oda fotoğrafları, çok-oda rezervasyon)
- Supabase: qvpflkspmisxcnfnyeve ✅ (25+ migration, RLS, Realtime, pg_net trigger)
- Channex: staging ortamı aktif ✅ (müsaitlik+fiyat akıyor; Booking.com/Airbnb bağlantısı kullanıcıda)
- Google Cloud Vision: pasaport MRZ tarama aktif ✅

### Bekleyen migration (kullanıcı SQL Editor'den uygulayacak — DEPLOY'DAN ÖNCE!)
- `docs/migrations/029_fiscal_receipt_fields.sql` — payments'a fiş (Soliq QR) alanları
- `docs/migrations/030_bill_period_fiscal.sql` — bill_payments'a dönem + fiş alanları
- (028 `payment_method 'card'` zaten uygulandı ✅ — dosya kayıt için duruyor)
- ⚠️ Bu iki migration uygulanmadan yeni kod deploy edilirse /reservations/[id],
  /payments ve /bills sayfaları kolon eksikliğinden hata verir (SELECT'ler bu kolonları okuyor).

### Kritik notlar
- Silme yetkisi (7 Tem 2026): TÜM işlemsel tablolarda DELETE artık yalnızca admin
  (`get_user_role() = 'admin'`, migration `031_admin_only_delete.sql` — canlıya uygulandı).
  Test verisi (rezervasyon/depo/ödeme vb.) temizlendi; roller+ayarlar korundu. Panelde
  rezervasyon detay + depo ürününe admin-only "Sil" butonu var. Tek admin: Muzaffar.
- Middleware: `admin-panel/src/middleware.ts` — kökde değil, `src/` içinde (yoksa hiç çalışmaz)
- Fiyat kaynağı: `rooms_with_effective_price` view'i — `room_types.base_price`'a dokunma
- Vercel deploy: repo KÖKÜNDEN çalıştır (`admin-panel/` klasöründen değil)
- Channex env: staging'de `staging.channex.io`; ücretli geçişte `secure.channex.io` + yeni key

### Ödeme modeli (7 Temmuz 2026 kararı — DEĞİŞTİ)
- Web sitede online ödeme YOK. Misafir oda seçince resepsiyoniste push (ad+telefon) gider,
  resepsiyonist arar. Ödeme GİRİŞTE (peşin) alınır — nakit veya kart (terminal).
- Payme/Click/Uzum online entegrasyonu iptal; guest-site `pay/[code]` artık onay sayfası.
- Terminali yazılıma bağlama fikri iptal. Kart ödemesi panele elle girilir (`method='card'`).
- Fiş (çek): terminal/fatura fişindeki Soliq QR (`ofd.soliq.uz/epi?...`) `FiscalQrScanButton`
  ile okutulup `payments.fiscal_url` / `bill_payments.fiscal_url`'e kaydedilir (jsqr, ücretsiz).

### Sonraki adımlar
- Guest-site: eksik oda fotoğrafları (101/102/103/301) — `photos-incoming/`e at, `process-photos.mjs` çalıştır
- Channex: sahte-profil testi — `staging.channex.io`'da Booking.com test property (5868189 vb.)
  ekle, oda+fiyat eşle, test kartıyla (4111 1111 1111 1111) rezervasyon yap → panelde düşüyor mu bak
- Faz 2 (3D): Anor Baba maskotu `.glb` gelince

---

## Deploy Bilgisi
- Vercel: her iki uygulama canlıda ✅ (admin-panel + guest-site)
- Supabase: qvpflkspmisxcnfnyeve — canlı ve bağlı ✅
- Prod admin URL: anor-avenue-admin-panel.vercel.app
- Webhook URL: https://anor-avenue-admin-panel.vercel.app/api/webhooks/channex?secret=<CHANNEX_WEBHOOK_SECRET>

---

## Proje Sahibi Notu

Kod bilmeyen ama projeyi yöneten bir üniversite öğrencisiyle çalışıyorsun.
- Kararları açıkla, jargon kullandıktan sonra parantez içinde Türkçe açıkla
- Her oturumun sonunda "Mevcut Durum" bölümünü güncelle
- Hata çıkarsa kullanıcıya sormadan düzelt, ama ne yaptığını söyle
- Büyük mimari kararlar için seçenekleri listele, öner, onay bekle
- Tasarım kararlarını her zaman görsel referansla açıkla
