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

## Mevcut Durum (Session Log)

- [x] CLAUDE.md oluşturuldu
- [x] Proje mimarisi kararlaştırıldı (Next.js 15 + Supabase + pnpm)
- [x] Roller tanımlandı: admin, manager, receptionist, housekeeper, accountant
- [x] OTA kararı: iCal/channel manager, kendi kodumuzda değil — Booking.com en sona bırakıldı
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
- [x] Mobil optimizasyon: admin sidebar drawer + guest site sticky CTA
- [x] Admin panel: tüm sayfalarda Düzenle butonu + inline edit form (misafir, rezervasyon, oda)
- [x] Admin panel: ödeme silme (DeletePaymentButton)
- [x] Email bildirimi: Resend API entegrasyonu — admin bildirim + misafir onay emaili (uz/ru/en)
  - guest-site/src/lib/email.ts + actions.ts güncellendi
  - Vercel env: RESEND_API_KEY + ADMIN_NOTIFICATION_EMAIL + EMAIL_FROM gerekli
- [x] Admin panel: Ayarlar sayfası — oda tipi fiyatları düzenlenebilir (/settings)
- [x] Admin panel: Personel yönetimi — davet gönder + hesap sil (/staff)
- [x] SidebarNav: Personel ve Ayarlar linkleri eklendi
- [x] Admin panel: kritik UI bug fix — kaydet sonrası sayfa güncellenmiyor sorunu
  - AddPaymentFormClient: ödeme kaydedince liste otomatik yenileniyor (router.refresh)
  - RoomsManager EditRoomRow: oda düzenlenince satır güncelleniyor (router.refresh)
  - RoomsManager AddRoomForm: oda eklenince liste yenileniyor + form sıfırlanıyor
  - RoomsManager: React Fragment key hatası düzeltildi
  - housekeeping/actions.ts: service_role client kullanılıyor (RLS bypass)
  - /api/reports/export route eklendi — Excel/CSV indirme çalışıyor
- [x] Admin panel + Guest site: RLS sonsuz özyineleme (infinite recursion) hatası düzeltildi
  - `profiles_select_admin` policy kendine referans veriyordu → tüm join sorgular 500 hatası veriyordu
  - SECURITY DEFINER `get_user_role()` fonksiyonuyla policy yeniden yazıldı
  - Etkilenen sayfalar düzeldi: rezervasyonlar, misafirler, ödemeler, kayıt (registratsiya)
- [x] Guest site: kritik bug + iyileştirmeler
  - actions.ts: mansard oda tipi DB adı 'Mansard Lüks'→'Delüks' düzeltildi (mansard rezervasyonlar çalışmıyordu)
  - BookingForm: oda tipi ve tarihler URL parametrelerinden otomatik dolduruluyor (?roomType=luxury&checkIn=...)
  - Tüm sayfalarda (ana sayfa, odalar, oda detay, rezervasyon formu) fiyatlar artık Supabase'den çekiliyor
    → Admin Settings'den fiyat değiştirince yeniden deploy sonrası guest site'de de güncelleniyor

- [x] Guest site: odalar sayfasında tarih bazlı müsaitlik kontrolü (Müsait/Doldu badge'leri)
- [x] Guest site: BookingWidget tarihleri odalar sayfasında korunuyor + oda detaydan booking'e geçiyor
- [x] Guest site: rezervasyon başarı ekranına "Bosh sahifaga" butonu eklendi
- [x] Admin panel: dashboard — bugünkü giriş/çıkış listesi + pending rezervasyon uyarı banner'ı
- [x] Admin panel: rezervasyon takvimi önceki/sonraki 14 günlük navigasyon (CalendarNav)
- [x] Admin panel: rezervasyon liste görünümü (/reservations/list) — arama + durum filtresi
- [x] Admin panel: no-show eylemi — giriş tarihi geçmiş pending/confirmed rezervasyonlarda
- [x] Admin panel: misafir listesi arama (GuestListClient)
- [x] Admin panel: SidebarNav'a "Rezervasyon Listesi" linki eklendi
- [x] Admin panel: rol bazlı erişim kontrolü tamamlandı
  - Middleware: her rol için izin verilen path listesi — yetkisiz sayfa → /dashboard?blocked=1
  - SidebarNav: role + userEmail prop alıyor, filtrelenmiş nav gösteriyor, footer'da kullanıcı bilgisi + renkli rol badge
  - Layout (server): user_metadata.role + email çekip SidebarNav'a iletir
  - Staff sayfası: rol artık profiles tablosundan doğru okunuyor + satır içi "Rol Değiştir" dropdown
  - Staff/actions.ts: changeRoleAction eklendi (user_metadata + profiles senkronize); inviteStaffAction artık profiles satırı da oluşturuyor
  - Dashboard: ?blocked=1 ile "Erişim yok" banner'ı
  - DB: tüm kullanıcıların user_metadata.role → profiles.role senkronize edildi (SQL ile)

- [x] Guest site: otel fotoğrafları yerleştirildi
  - Hero: `hotel-exterior.jpeg` arka plan olarak (gerçek dış cephe)
  - Oda kartları (ana sayfa + odalar sayfası): her oda tipi için gerçek fotoğraf
  - YENİ "Experience" bölümü: gerçek kahvaltı masası + avlu + lobi fotoğrafları
  - About bölümü: servis fotoğrafı sol tarafa eklendi
  - Oda detay galeri: her oda için 4 fotoğraf (yatak odası, banyo, servis, görünüm)
- [x] Ödeme sayfası UI: /[locale]/pay/[code] — Payme + Click (yakında, "soon" badge'li), Nakit (hemen çalışıyor)
  - BookingForm başarı ekranına "Hozir to'lash / Оплатить сейчас / Pay Now" butonu eklendi
  - Rezervasyon özeti + toplam tutar gösteriliyor
- [x] iCal export kaldırıldı — kullanıcı kararıyla devre dışı
- [x] Admin panel: Otel Profili — /settings'e eklendi (otel adı, adres, telefon, e-posta, web, giriş/çıkış saati)
  - `hotel_settings` tablosu Supabase'e eklendi (tek satır, RLS korumalı)
  - Fatura ve onay e-postalarında kullanılacak

## Sonraki Adımlar (Kalan — sadece merchant hesabı sonrası)
1. Payme/Click/Uzum gerçek entegrasyon — UI + endpoint hazır, sadece merchant credentials bekleniyor

## Deploy Bilgisi
- Vercel: her iki uygulama canlıda ✅
- Supabase: qvpflkspmisxcnfnyeve — canlı ve bağlı ✅

---

## Proje Sahibi Notu

Kod bilmeyen ama projeyi yöneten bir üniversite öğrencisiyle çalışıyorsun.
- Kararları açıkla, jargon kullandıktan sonra parantez içinde Türkçe açıkla
- Her oturumun sonunda "Mevcut Durum" bölümünü güncelle
- Hata çıkarsa kullanıcıya sormadan düzelt, ama ne yaptığını söyle
- Büyük mimari kararlar için seçenekleri listele, öner, onay bekle
- Tasarım kararlarını her zaman görsel referansla açıkla
