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
- [x] Admin panel: tasarım yenileme — "Tonlu Bölgeler" (kullanıcı: sol menü çok koyu, sağ taraf tamamen beyaz/karışık)
  - Renk token'ları güncellendi (`globals.css` + `dashboardTheme.ts`): sidebar `#171335`→`#2E2A52` (açık), zemin `#F6F5F9` (sıcak nötr)
  - Yeni: kategori bazlı tonlu zemin renkleri (mor/yeşil/turuncu/mavi) + sıcak vurgu rengi `#D97757`
  - Yeni paylaşılan bileşen `SectionZone.tsx` — kartları beyaz kenarlıklı kutular yerine renkli zeminlere gruplar
  - Dashboard, Rezervasyon Listesi, Raporlar, Ödemeler sayfaları zone'lara bölündü (Genel Bakış/Operasyon/Finans/Filtrele)
  - Tüm panelde beyaz kartlarda kenarlık yerine yumuşak gölge (`shadow-card`) kullanılıyor
  - ⚠️ Ekran görüntüsüyle doğrulanamadı — bu ortamda giriş bilgisi ve headless tarayıcı aracı yoktu, kullanıcının tarayıcıda kontrol etmesi gerekiyor

- [x] Admin panel: Temizlikçi "Günlük Özet" sayfası (/housekeeping/overview)
  - Yeni sayfa: yarınki girişler, bugünkü çıkışlar, şu an dolu odalar
  - Her satırda: oda no, misafir adı, kişi sayısı, Mahalliy/Xorijiy badge'i, kahvaltı durumu
  - Yarınki girişlerde beklenen giriş saati gösterimi
  - Üst bölümde hızlı istatistik (yarınki giriş sayısı, bugünkü çıkış sayısı, yarın sabah kahvaltı kişi sayısı)
  - SidebarNav: "Günlük Özet" linki eklendi (admin/manager/receptionist/housekeeper görebilir)
  - DB migration 006: `reservations` tablosuna `breakfast_included BOOLEAN DEFAULT false` + `expected_check_in_time TIME` eklendi
  - Yeni rezervasyon formu: kahvaltı checkbox + beklenen giriş saati alanı eklendi
  - Rezervasyon düzenleme formu: aynı alanlar eklendi
  - Rezervasyon detay sayfası: kahvaltı + beklenen saat bilgisi gösterimi eklendi

- [x] Admin panel: tam tasarım yenileme — "Lacivert + Altın" kurumsal tema (2 Temmuz 2026)
  - Kullanıcı onayıyla seçilen palet: koyu lacivert sidebar (#16233B), açık gri zemin (#F8FAFC), beyaz kartlar, altın vurgu (#B45309 metin / #D9A441 koyu zeminde)
  - İki çakışan stil sistemi birleştirildi: globals.css token'ları + dashboardTheme.ts aynı palete eşlendi (eski inline stilli ~25 sayfa otomatik yeni renkleri aldı)
  - Pastel "tonlu bölgeler" (SectionZone) kaldırıldı → şeffaf zemin + büyük harfli bölüm başlığı (önceki tasarım kullanıcı tarafından beğenilmemişti)
  - Sidebar: yüzen kart yerine tam yükseklik; aktif linkte altın sol çubuk + altın ikon; logo kutusu altın
  - Yeni ortak üst bar (AppTopbar): tüm sayfalarda sayfa adı + bildirim zilleri + kullanıcı kartı; DashboardTopbar silindi, dashboard'a "Hoş geldin" başlığı geldi
  - Grafikler griden lacivert/mavi/altın tonlarına geçti (--chart-1..5 token'ları)
  - Gölge yerine tek yükseklik dili: ince çizgi (ring-1); --shadow-card da buna eşlendi
  - Tam sınıf geçişi yapılan sayfalar: payments, reports, reservations/list, ReservationCalendar (+ tabular-nums, StatusBadge, hover durumları)
  - Takvimde "bugün" sütunu altın vurgulu (bg-gold-soft)
  - Sabit hex renkler temizlendi (text-[#15112B] → text-foreground vb.)
  - `pnpm build` başarılı; kök package.json eklendi (pnpm dev artık kökten çalışıyor)
  - ⚠️ Ekran görüntüsü alınamadı (headless tarayıcı yok) — kullanıcı tarayıcıda doğrulayacak

- [x] Admin panel: Rol Bazlı Panel Genişlemesi (2 Temmuz 2026)
  - DB migration 007: `cleaned` enum değeri + room_items, room_inspections, inventory_purchases, garden_tasks tabloları
  - Dashboard sadeleştirildi: Finans bölümü kaldırıldı; Genel Bakış → Toplam/Dolu/Boş Oda + Konaklayan Kişi (tıklanamaz)
  - StatCard: href + deltaPercent opsiyonel
  - Temizlik: cleaned durumu + rol bazlı butonlar + /housekeeping/[roomId] denetim sayfası
  - Oda Eşya Yönetimi: /rooms/[id] (admin); RoomsManager'a "Eşyalar →" linki
  - /depo: herkes alım girebilir; kategori→form→kayıt
  - /finance: sadece admin; gelir/gider UZS+USD ayrı toplamlar
  - /garden: görev listesi + bahçe malzemeleri
  - SidebarNav + middleware: yeni roller ve sayfalar eklendi
  - pnpm build başarılı ✓

- [x] Admin panel: Rol bazlı kişiselleştirme, anlık senkron, depo stok takibi (2 Temmuz 2026)
  - DB migration 008: reservations RLS'e housekeeper eklendi (Günlük Özet artık housekeeper için çalışıyor)
  - guests ve room_types tablolarına SELECT politikası eklendi (join'lar artık boş dönmüyor)
  - Supabase Realtime: reservations + rooms tabloları publication'a eklendi
  - RealtimeRefresher.tsx: layout'a mount — herhangi bir profilde değişiklik olunca tüm açık ekranlar ~0.5 sn'de yenilenir
  - AppTopbar: zil (bekleyen rezervasyon) ve mesaj kutusu (bekleyen ödeme) sadece erişim yetkisi olan rollerde görünür; housekeeper/accountant görmez
  - HousekeepingBoard: yeni temizlik akışı — housekeeper kendi ekranında "cleaned" durumunu "Temiz" olarak görür, kart tıklaması ve denetim linki yok; resepsiyonist "Denetle" butonuyla inspection sayfasına gider
  - housekeeping/actions.ts: submitRoomInspectionAction artık denetim sonrası odayı otomatik 'clean' yapar; sadece admin/manager/receptionist denetim yapabilir
  - inventory_products tablosu: stok kataloğu + mevcut adet (on_hand)
  - inventory_movements tablosu: hareket defteri (giriş/çıkış, kim/ne zaman/kaç/nereye)
  - depo/actions.ts: addPurchaseAction artık ürünü inventory_products'ta bul/oluştur + on_hand artır + hareket kaydı ekler; consumeStockAction: on_hand düşür + hareket kaydet; getProductMovementsAction: sadece admin, ürün geçmişi döner
  - Depo sayfası: "Ürünler" bölümü (stok + Kullan butonu, admin: Geçmiş butonu) + "Alım Geçmişi" bölümü (housekeeper görmez); temizlikçide "Yeni Alım" butonu yok
  - pnpm build başarılı ✓
  - ⚠️ Ekran görüntüsü alınamadı — kullanıcı tarayıcıda doğrulayacak

- [x] Admin panel: TAM çok dillilik — Rusça (varsayılan) + Özbekçe Latin + Özbekçe Kiril (3-4 Temmuz 2026)
  - next-intl kurulumu: `[locale]` routing, `locales: ['ru','uz','uz-cyrl']`, `defaultLocale: 'ru'`
  - Tüm sayfa/form/bileşen/hata mesajı/yorum satırı Türkçeden arındırıldı — kodda dahi Türkçe yok
  - 3 sözlük dosyası (`src/messages/{ru,uz,uz-cyrl}.json`), her biri 736 anahtar, yapı birebir eşit
  - Copilot regresyon düzeltmesi: Copilot mekanik translit ile uz-cyrl'de 227 değeri bozmuştu
    (ў→о', Сўнги→Со'нгги, йўқ→ё'қ) — doğru Kiril imlaya geri getirildi; `commit cff0ffc`
  - invoice.invoiceLabel'daki Türkçe "Fatura" kalıntısı 3 dilden de temizlendi → "Квитанция/Kvitansiya"
  - Kullanılmayan ölü grafik bileşenleri silindi (MetricCharts, RevenueAreaChart — hiçbir yerde import edilmiyordu, içlerinde Türkçe vardı)
  - ConfirmButton çeviriye bağlandı (common.confirm/cancel)
  - `next build` başarılı (63 sayfa, 3 dil prerender) ✓
  - ⚠️ Ekran görüntüsü alınamadı — kullanıcı tarayıcıda 3 dilde doğrulayacak; commit yapıldı, henüz PUSH edilmedi (kullanıcı onayı bekleniyor)

- [x] Admin panel: i18n kritik hata düzeltmesi (4 Temmuz 2026)
  - **Kök neden 1 — Çift `<html>`:** `src/app/layout.tsx` `<html><body>` render ediyordu; `[locale]/layout.tsx`
    da kendi `<html>`'ini render ediyordu → iç içe geçmiş geçersiz DOM → localhost'ta binlerce hydration hatası.
    Düzeltme: `src/app/layout.tsx` artık sadece `<>{children}</>` (passthrough).
  - **Kök neden 2 — Sabit `/ru` redirect'leri:** `middleware.ts`'de 3 redirect hedefi `/ru/...` olarak
    hardcode'du → uz/uz-cyrl kullanıcısı her zaman Rusçaya fırlatılıyordu. Düzeltme: `detectLocale()` fonksiyonu
    URL önekinden dili tespit eder, redirect'ler `/${locale}/...` kullanır.
  - **Kök neden 3 — 22 sayfada öneksiz `redirect('/login')`:** Tüm dashboard sayfaları `redirect('/login')`
    çağırıyordu (dil öneki yok) → middleware bunları `/ru/login`'e çeviriyordu → uz/uz-cyrl oturumu Rusçaya düşüyordu.
    Düzeltme: Tüm sayfalarda `redirect(\`/\${await getLocale()}/login\`)` pattern'i uygulandı.
  - Auth callback (`/api/auth/callback`) sabit `/ru/...` yerine cookie'den dil tespiti yapıyor.
  - `src/app/[locale]/not-found.tsx` eklendi — 3 dilde çevrili 404 sayfası.
  - favicon.ico geri yüklendi (git restore).
  - `pnpm build` başarılı (64 sayfa, 3 dil, sıfır hata) ✓

- [x] Admin panel: GERÇEK KÖK NEDEN bulundu — middleware yanlış konumdaydı (4 Temmuz 2026)
  - **Şikayet:** Dil değişikliğinden sonra localhost'ta tüm sayfalar 404 / açılmıyor, butonlar çalışmıyor,
    diller karışıyor. Önceki oturumların "i18n düzeltmeleri" sorunu çözmedi çünkü YANLIŞ dosyayı düzenliyorlardı.
  - **Tek gerçek kök neden:** `middleware.ts` proje kökündeydi (`admin-panel/middleware.ts`) ama uygulama
    `src/app/` altında. Next.js `src/` dizini kullanılınca middleware'i SADECE `src/middleware.ts`'den yükler.
    Kökteki middleware HİÇ ÇALIŞMIYORDU. Kanıt: minimal middleware'e eklenen `x-mw-ran` header'ı yanıtta görünmedi.
  - **Sonuç:** middleware çalışmadığı için next-intl `localePrefix:'never'` rewrite'ı (`/login` → iç olarak
    `/ru/login`) hiç uygulanmıyordu → tüm öneksiz yollar (`/login`, `/dashboard` …) 404 veriyordu. Auth koruması
    ve dil tespiti de sessizce devre dışıydı. `/ru/login` gibi önekli URL'ler doğrudan 200 dönüyordu (kafa karıştırıcı).
  - **Düzeltme (komple, tek satırlık kök çözüm):** `middleware.ts` → `src/middleware.ts` taşındı, kökteki silindi.
    İçerik aynen korundu (auth + rol + next-intl). Başka hiçbir sayfa/kod değişmedi — gerek yoktu.
  - **Kapsamlı test (localhost:3100, gerçek admin girişiyle a.kenja3683@…):**
    - 17 sayfa × 3 dil = 51 yükleme → hepsi 200, sıfır hata sayfası, sıfır eksik çeviri
    - Dinamik detay sayfaları (rezervasyon/oda/misafir/fatura/denetim) × 3 dil → hepsi 200
    - Dil değiştirme: `<html lang>` + içerik her dilde doğru değişiyor (ru/uz/uz-cyrl birbirine karışmıyor)
    - Auth: girişsiz `/dashboard` → `/login`'e yönleniyor (koruma artık gerçekten çalışıyor)
    - Çeviri anahtarı pariteti: 3 dosya da 802 anahtar, birebir eşit — eksik/fazla yok
  - `pnpm build` başarılı (ƒ Middleware artık derleniyor — önce yok sayılıyordu) ✓
  - Not: Önceki oturumun önekli `redirect(\`/${locale}/login\`)` yamaları artık gereksiz ama zararsız
    (next-intl 'never' modunda önekli URL'i öneksize geri yönlendirir). Churn olmasın diye dokunulmadı.

- [x] Açılış öncesi ERP genişleme planı onaylandı (5 Temmuz 2026) — plan: `.claude/plans/adaptive-noodling-petal.md`
  - Karar: açmadan önce 4 ERP modülü (Muhasebe+Vergi, Kamu faturaları, CRM+sadakat, Puantaj+Bordro)
    + registratsiya manuel akışı tamamlanacak. E-Mehmon API / channel manager / kamu-fatura API'si
    kullanıcı araştırması bekliyor (kodu bloklamaz).

- [x] Faz 0 — Şema hijyeni (5 Temmuz 2026)
  - Keşif: canlı DB'de room_items/room_inspections/inventory_purchases/garden_tasks/reservation_companions
    tablolarının RLS'i AÇIK ve politikaları var — "korumasız PII" açığı YOK (repo DDL'i eksikti sadece).
  - `docs/migrations/009_schema_hygiene.sql` eklendi — canlı durumu birebir belgeler (idempotent, CANLIYA
    UYGULANMADI, sadece tekrarlanabilirlik). get_advisors: kritik açık yok (rooms_with_effective_price
    SECURITY DEFINER view ERROR'u ayrı iş — fiyat view'i, riskli, elleme).

- [x] Faz 1 — Registratsiya (yabancı kayıt) manuel akışı tamamlandı (5 Temmuz 2026)
  - `docs/migrations/010_registration_fields.sql` CANLIYA UYGULANDI: guests +visa_number/visa_expiry/pinfl;
    guest_registrations +registration_number/submitted_at/tourist_tax_amount/tourist_tax_paid; private
    storage bucket `registrations` (PII, public değil).
  - Yeni detay sayfası `registrations/[id]/page.tsx` + `RegistrationDetailForm.tsx`: pasaport/vize/PINFL,
    kayıt no, turist vergisi düzenleme (inline-edit); "Podana"ya geçince submitted_at damgalanıyor;
    E-Mehmon PDF/görsel yükleme → private bucket, imzalı URL ile görüntüleme.
  - `registrations/actions.ts`: saveRegistrationDetailsAction + uploadRegistrationDocumentAction (Zod +
    service_role + rol geçidi admin/manager/receptionist). Liste sayfasına "Detay →" linki.
  - 3 dile (ru/uz/uz-cyrl) `registrations.detail` namespace + errors anahtarları eklendi.
  - `next build` başarılı (yeni ƒ /[locale]/registrations/[id] rotası). Middleware /registrations/* zaten kapsıyor.
  - ⚠️ Tarayıcı doğrulaması kullanıcıda: gerçek yabancı rezervasyonda kayıt → alan doldur → PDF yükle → görüntüle.

- [x] Faz 2 — Muhasebe defteri + Vergi raporu (5 Temmuz 2026)
  - `docs/migrations/011_accounting_ledger.sql` CANLIYA UYGULANDI
  - `payments.revenue_category` alanı + CHECK constraint; `accounting_ledger` VIEW (3-yönlü UNION)
  - Finance sayfası: ay filtresi + kategori breakdown çubuğu + 12 aylık özet tablo
  - Ödeme formu: revenue_category dropdown eklendi

- [x] Faz 3 — Kamu faturaları + Yaklaşan ödemeler (5 Temmuz 2026)
  - `docs/migrations/012_recurring_bills.sql` CANLIYA UYGULANDI
  - `recurring_bills` + `bill_payments` tabloları + RLS + accounting_ledger'a eklendi
  - `/bills` sayfası: aylık ödemeler, durumlar (pending/paid/overdue), geçmiş 3 ay
  - Dashboard: 7 günlük yaklaşan fatura uyarı banner'ı
  - SidebarNav + middleware: tüm rollere bills eklendi

- [x] Faz 4 — CRM + Misafir sadakati (5 Temmuz 2026)
  - `docs/migrations/013_crm_loyalty.sql` — CANLIYA UYGULANMALI
  - `guest_notes` + `guest_tags` + `loyalty_points` tabloları + RLS + `guest_loyalty_balance` view
  - Misafir detay sayfasına CRM bölümü: preset/özel teglar, sadakat puanı geçmişi + manuel ayar, personel notları
  - 3 dilde `guests.crm` namespace eklendi

- [x] Faz 5 — Puantaj + Bordro (5 Temmuz 2026)
  - `docs/migrations/014_timesheet_payroll.sql` — CANLIYA UYGULANMALI
  - `staff_shifts` + `payroll_periods` + `payroll_items` tabloları + RLS
  - `/timesheet` sayfası: haftalık görünüm, gün × personel matrisi, vardiya ekle/düzenle/sil
  - `/payroll` sayfası: dönem oluştur (draft→finalized→paid), personel başına maaş/prim/kesinti
  - SidebarNav + middleware güncellendi; `pnpm build` başarılı ✓

- [x] Telefonla pasaport tarama (MRZ/OCR) — ücretsiz, cihazda, API'siz (5 Temmuz 2026)
  - Plan: `.claude/plans/optimized-gathering-quokka.md`. Karar: ücretli AI YOK — pasaportun MRZ
    bölümü telefonda `tesseract.js` (açık kaynak, ücretsiz) ile okunur, check-digit ile doğrulanır.
  - Koordinasyon ilkesi: tarama asla boşta başlamaz; her zaman zaten bakılan kaydın içinden → veri
    yanlış rezervasyona gidemez, YENİ SAYFA açılmaz. Tek paylaşılan bileşen 3 mevcut ekrana gömüldü.
  - Yeni: `src/lib/mrz.ts` (saf-TS TD3 parser + check-digit + ISO ülke haritası; 21 birim testi geçti),
    `src/components/admin/PassportScanButton.tsx` (capture kamera + canvas ön işleme + lazy tesseract).
  - Gömüldü: RegistrationDetailForm (controlled + tarama, görsel private `registrations` bucket'a belge
    olarak da kaydolur), WalkInForm GuestCard, NewReservationForm — hepsi ad/soyad/pasaport/uyruk/DOB/
    son-geçerlilik/cinsiyet doldurur; checksum tutmayan alan kırmızı "⚠" ile işaretlenir, personel onaylar.
  - `docs/migrations/015_passport_scan_fields.sql`: guests +passport_expiry/sex/mrz_raw (+ canlı-only
    registratsiya sütunları hijyen). ⚠️ CANLIYA HENÜZ UYGULANMADI — server action'lar bu sütunlara
    yazdığı için migration uygulanmadan rezervasyon oluşturma/kayıt kaydetme HATA verir.
  - i18n: 3 dile `scan.*` namespace + `registrations.detail.fields` içine passportExpiry/sex/sexMale/
    sexFemale (970 anahtar × 3 dil, tam parite). `pnpm build` başarılı; tesseract lazy → bundle şişmedi.
  - Parkta (kullanıcı bilgisi bekleniyor): ARCA/ERA fiskal POS (cihaz VAR — satıcıdan API doküman + terminal
    ID lazım), Channex OTA (hesap YOK), turizm vergisi otomatik hesabı (güncel BHM oranı lazım).
  - ⚠️ Tarayıcı/telefon doğrulaması kullanıcıda: gerçek pasaportla kamera → alan doldurma testi.

## Sonraki Adımlar
- ⚠️ ÖNCELİK: Migration 015 kullanıcı tarafından Supabase Dashboard > SQL Editor'den uygulanacak
  (MCP salt-okunur, uygulanamadı). Uygulanmadan rezervasyon oluşturma/kayıt kaydetme bozulur.
- Migration 013 ve 014 Supabase Dashboard'a uygulanacak (kullanıcı yapacak)
- Payme/Click/Uzum gerçek entegrasyon — UI + endpoint hazır, sadece merchant credentials bekleniyor

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
