# Düzeltme Talimatı — Amenities Sayfası (30 Haziran 2026)

## 1. Yanlış konum — KRİTİK, hemen düzelt

`guest-site/src/components/hotel/LocationSection.tsx` içindeki Google Maps
iframe'i **uydurulmuş/placeholder koordinat** kullanıyor, gerçek otel adresiyle
alakası yok. Gerçek adres doğrulandı: **Akilata Street 13, Tashkent, Yunusobod, Uzbekistan**.

Düzeltme: iframe `src` attribute'unu gerçek adres ile yeniden oluştur.
En güvenli yöntem — koordinat uydurmak yerine Google Maps'in adres bazlı
embed formatını kullan:

```jsx
<iframe
  src="https://www.google.com/maps?q=Akilata+Street+13,+Tashkent,+Uzbekistan&output=embed"
  width="100%"
  height="100%"
  style={{ border: 0 }}
  allowFullScreen
  loading="lazy"
  referrerPolicy="no-referrer-when-downgrade"
  title="Anor Avenue Hotel location"
/>
```

**Önemli kural (gelecekte de geçerli):** Adres veya koordinat bilgisi elinde
yoksa ASLA tahmini/placeholder koordinat üretme. Bunun yerine haritayı
boş bırak veya yorum satırıyla "gerçek adres bekleniyor" notu düş, bana sor.

## 2. Renk ritmi — amenities sayfası akışı

Şu an sıralama: KitchenSection (white) → GardenSection (**charcoal/koyu**) →
SecuritySection (cream) → ServicesSection (white). GardenSection'ın koyu
arka planı akışı kesiyor, sayfa içinde tutarsız görünüyor.

Düzeltme: `GardenSection.tsx` içindeki ana `backgroundColor: 'var(--color-charcoal)'`
değerini `var(--color-cream)` olarak değiştir, iç kart arka planını da
`var(--color-charcoal-soft)` yerine `var(--color-white)` yap (KitchenSection'daki
kart stiliyle tutarlı olacak şekilde). Metin renklerini de açık temaya göre
güncelle (`--color-white` yerine `--color-text-primary`/`--color-text-secondary`).

Sonuç sıralama: Kitchen (white) → Garden (cream) → Security (cream) →
Services (white) — daha yumuşak bir geçiş olacak. Security ve Garden'ın
art arda ikisinin de cream olması sorun değil, komşu olmayan section'lar
arası kontrast önemli olan, bitişik aynı renk iki section kabul edilebilir.

## 3. Booking sayfası görsel tutarlılığı

`guest-site/src/app/[locale]/book/page.tsx` ve `BookingForm.tsx` dosyalarını
incele — bu sayfa eski tasarımla yazılmış, yeni amenities sayfasıyla aynı
görsel kaliteyi/diline sahip değil (Mert'in geri bildirimi: "tasarımı,
seçimleri, kolaylığı ve diğer sayfalarla uyumluluğu olmalı").

ÖNEMLİ SINIRLAMA: Bu sadece görsel/CSS bir iyileştirme. Booking
mantığına (Server Action, validasyon, DB sorguları, oda atama algoritması)
DOKUNMA — Mert booking sisteminin işlevsel kısmını bilinçli olarak teslim
öncesine bıraktı. Sadece component'in HTML/CSS yapısını, mevcut tokens.css
paletini ve diğer sayfalardaki spacing/typography kalıplarını kullanarak
güncelle.

Yapılacaklar:
- BookingForm.tsx'in görsel düzenini diğer sayfalardaki form/card stiliyle
  hizala (border-radius, shadow, spacing tutarlılığı)
- Adım adım ilerleme hissi varsa (oda tipi → tarih → bilgiler) bunun görsel
  olarak daha net ayrıştırılması
- Mobilde test et

Bu adımdan sonra durup ekran görüntüsü iste, ben veya Mert onaylamadan
ileri gitme.
