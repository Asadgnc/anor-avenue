# rooms-data.md — Gerçek Oda Verisi (Anor Avenue Hotel)

Bu dosya 12 gerçek odanın fiziksel özelliklerini içerir. Mert'in (proje sahibi)
30 Haziran 2026 tarihli açıklamasından derlenmiştir. Claude Code bu dosyayı
guest-site içerik üretimi, oda sıralama/filtreleme mantığı ve fotoğraf yerleşimi
için referans almalı.

**Kaynak gerçeklik:** Bu dosyadaki bilgi DB'deki `rooms` tablosunun
`migrations/005_room_attributes.sql` ve `migrations/006_seed_room_attributes.sql`
ile uygulanmış hali ile birebir örtüşmelidir. Tutarsızlık görürsen DB'yi
referans al, bu dosyayı güncelle.

---

## Genel oda yapısı

| Oda | Kat | Tip | Pencere | Manzara | Jakuzi | Küvet | İzole | Bağlantılı | Fiyat (UZS/gece) |
|---|---|---|---|---|---|---|---|---|---|
| 101 | Bodrum (-1) | Standart | 3 | standard | - | - | - | - | 350.000 |
| 102 | Bodrum (-1) | Standart | 1 | standard | - | - | - | - | 350.000 |
| 103 | Bodrum (-1) | Standart | 2 | standard | - | - | - | - | 350.000 |
| 201 | 2 | Lüks | - | good | - | - | - | - | 600.000 |
| 202 | 2 | Deluxe | - | good | ✓ | - | ✓ | - | 950.000 |
| 301 | 3 | Lüks | - | good | - | - | - | - | 600.000 |
| 302 | 3 | Lüks | - | good | - | - | - | - | 600.000 |
| 303 | 3 | Lüks | - | premium | - | - | - | 304 | 600.000 |
| 304 | 3 | Deluxe | - | premium | - | ✓ | - | 303 | 900.000 |
| 401 | 4 (mansard) | Lüks | - | premium | - | - | - | - | 600.000 |
| 402 | 4 (mansard) | Lüks | - | premium | - | - | - | - | 600.000 |
| 403 | 4 (mansard) | Deluxe (suit) | - | premium | - | - | - | - | 850.000 |

**Önemli notlar:**
- **Görünürlük (7 Temmuz 2026 kararı):** 101/102/103 (Standart) `rooms.is_public=false` —
  guest-site ve Channex/OTA'da HİÇ görünmez, yalnızca walk-in misafirlere admin
  panelden satılır. Dışa dönük her yüzeyde sadece Deluxe + Luxury vardır.
- Bodrum katın sadece yarısı yer altında — bu nedenle "bodrum" algısı yanıltıcı, içerik metinlerinde "geniş ve ferah, doğal ışık alan" vurgusu yapılmalı, "bodrum" kelimesi misafire dönük metinlerde kullanılmamalı (örn. "-1. kat" veya "Bahçe katı" denebilir — Mert onaylarsa).
- 202: bina köşesinde izole giriş, en sakin oda. Premium duş başlığı/seçenekleri var (201'de de var).
- 303 ↔ 304: iç koridorla bağlanabilir, kapı varsayılan kapalı. Misafir aile/grup geldiğinde personel açar. Bu **iki ayrı rezervasyon** olarak satılır — tek "aile odası" paketi DB'de yok (Mert'in kararı, 30 Haziran 2026).
- 403: içinde 2 oda olan suit yapı, ama **tek rezervasyon birimi**, bölünmüyor.
- 4. kat (401-403) en iyi manzara grubu — fotoğraf çekiminde öncelik burası olmalı.

---

## Fotoğraf dosya yapısı (planlanan, henüz çekilmedi)

```
/guest-site/public/hotel-photos/
  rooms/
    101/cover.jpg, bed.jpg, window.jpg, bathroom.jpg
    102/cover.jpg, bed.jpg, window.jpg, bathroom.jpg
    103/cover.jpg, bed.jpg, window.jpg, bathroom.jpg
    201/cover.jpg, bed.jpg, shower.jpg, view.jpg
    202/cover.jpg, jacuzzi.jpg, bed.jpg, entrance.jpg, view.jpg
    301/cover.jpg, bed.jpg, view.jpg
    302/cover.jpg, bed.jpg, view.jpg
    303/cover.jpg, bed.jpg, view.jpg, connecting-door.jpg
    304/cover.jpg, bathtub.jpg, bed.jpg, view.jpg, connecting-door.jpg
    401/cover.jpg, bed.jpg, view.jpg
    402/cover.jpg, bed.jpg, view.jpg
    403/cover.jpg, suite-room-1.jpg, suite-room-2.jpg, view.jpg
  common/
    exterior-day.jpg, exterior-evening.jpg
    garden-seating.jpg, garden-birds.jpg
    kitchen-wide.jpg, kitchen-breakfast.jpg
    reception.jpg
    corridor-3rd-floor.jpg
    laundry.jpg
    vending-machine.jpg
    hallway-greenery.jpg
```

**Kural:** Her oda klasöründe ilk/kapak görsel her zaman `cover.jpg`. Kod bu path'i
`room_number`'dan dinamik üretmeli: `/hotel-photos/rooms/${room.room_number}/cover.jpg`.
Şu anki kod (`guest-site/src/app/[locale]/page.tsx` ve `rooms/page.tsx` içindeki
`roomMeta`/`roomData` sabitleri) tek bir statik foto path'i tip bazında tanımlıyor —
bu yapı oda bazlı dinamik path'e geçirilmeli.

**Fotoğraflar henüz çekilmedi.** Bu klasör yapısı placeholder olarak kurulabilir,
ama gerçek görsel olmayan odalar için stok fotoğraf KULLANILMAMALI — bunun yerine
nötr bir "yakında" placeholder veya mevcut gerçek fotoğraflardan (hotel-exterior,
hotel-courtyard, hotel-breakfast-real, hotel-bathroom-jacuzzi) en yakın anlamlısı
geçici olarak kullanılabilir, ama bu durum kodda yorum satırıyla işaretlenmeli.

---

## Yapılmaması gerekenler

- Stok fotoğraf dosyalarını (3d-rendering-*, wooden-hut-*, senior-woman-*,
  woman-laying-bed-*, top-view-assorted-*, croissant-boiled-egg-*) gerçek oda
  görseli gibi sunma — bunlar yer tutucu, gerçek çekim gelince silinecek.
- Oda fiyatını `room_types.base_price`'tan direkt okuma — `price_override` varsa
  o geçerli. Bkz. `rooms_with_effective_price` view'i.
- 303/304 bağlantısını otomatik kapı kontrol sistemiymiş gibi kodlama — bu sadece
  bilgi/not amaçlı bir DB ilişkisi, fiziksel kapıyı personel elle yönetiyor.
