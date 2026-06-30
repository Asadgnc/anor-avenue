# Guest-Site İçerik Genişletme — Claude Code Talimatı (30 Haziran 2026)

## 1. Çeviri dosyalarını birleştir

`content_en.json`, `content_ru.json`, `content_uz.json` dosyalarındaki yeni
anahtarları (`location`, `kitchen`, `garden`, `security`, `services`,
`roomFeatures`, `nav.amenities`) mevcut
`guest-site/src/messages/en.json` / `ru.json` / `uz.json` dosyalarına
**merge et** — üzerine yazma, mevcut `nav`, `hero`, `rooms`, `booking`,
`footer` anahtarlarını koru, sadece `nav.amenities` mevcut `nav` objesine
eklenecek.

## 2. Yeni component'ler oluştur

`guest-site/src/components/hotel/` altına:

- `LocationSection.tsx` — `location.*` anahtarlarını kullanan bölüm.
  İkon + metin listesi (metro, bazaar, bus, dining, markets, atm).
  Mümkünse basit bir statik harita görseli veya Google Maps embed
  (iframe, lazy load) — şimdilik ikon listesi yeterli, harita opsiyonel.
- `KitchenSection.tsx` — `kitchen.*` anahtarlarını kullanan 4 kartlık bölüm
  (open247, equipped, space, vending).
- `GardenSection.tsx` — `garden.*` anahtarlarını kullanan tek görsel +
  metin bölümü.
- `SecuritySection.tsx` — `security.items.*` listesi, güven vurgulu kısa
  bölüm (3 madde).
- `ServicesSection.tsx` — `services.*` altındaki 6 hizmeti kart grid
  olarak göster (reception, housekeeping, laundry, dining, rentACar, staff).

**Tasarım kuralı:** Mevcut `tokens.css` ve `--color-gold`/`--color-charcoal`
paletini kullan, design-system.md'deki "az fotoğraf, doldurmak için değil"
kuralına uy — bu yeni bölümlerde GERÇEK fotoğraf yoksa ikon + metin kullan,
stok fotoğraf KOYMA.

## 3. Yeni sayfa: Olanaklar / Amenities

`guest-site/src/app/[locale]/amenities/page.tsx` oluştur. Bu sayfa
`KitchenSection`, `GardenSection`, `SecuritySection`, `ServicesSection`
component'lerini sırayla render etsin. `Navbar`'a (`nav.amenities` çevirisini
kullanarak) bu sayfaya link ekle.

`LocationSection` ayrı sayfa olmayacak — anasayfada `AboutSection`'dan hemen
sonra eklenecek (kısa, harita odaklı, ayrı sayfayı hak etmiyor).

## 4. Anasayfa güncellemesi

`guest-site/src/app/[locale]/page.tsx` içine `AboutSection`'dan sonra
`LocationSection`'ı ekle. Diğer 4 bölüm (kitchen/garden/security/services)
yeni `/amenities` sayfasında kalacak, anasayfayı şişirmeyecek.

## 5. Oda özellik etiketleri

`roomFeatures.*` çevirilerini oda detay sayfasında (`rooms/[type]/page.tsx`)
ve oda listesinde kullan — örn. 202 için `jacuzzi` + `isolated` + 
`premiumShower` etiketleri, 304 için `bathtub` + `viewPremium` + 
`connecting` etiketleri gösterilsin. Bu etiketler `rooms_with_effective_price`
view'inden gelen `has_jacuzzi`, `has_bathtub`, `is_isolated`, `view_quality`,
`connecting_room_id` alanlarına göre koşullu render edilmeli.

## Yapma

- Stok fotoğraf ekleme (bkz. docs/rooms-data.md "Yapılmaması gerekenler")
- Hero animasyonuna dokunma (henüz onaylanmadı)
- Booking/ödeme akışına dokunma (Mert kararı: en sona bırakılacak)
- Mevcut `roomMeta`/`roomData` sabit yapılarını bu görevde değiştirme —
  bu ayrı bir görev (Faz 4c'deki "rooms_with_effective_price view'ine bağlama")
