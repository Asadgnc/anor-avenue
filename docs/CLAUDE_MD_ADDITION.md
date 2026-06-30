## EKLENECEK BÖLÜM — CLAUDE.md'ye entegre edilecek (30 Haziran 2026 kararları)

Aşağıdaki bölümü mevcut CLAUDE.md'nin "Mimari Kurallar" bölümünden hemen sonra,
"Supabase Kuralları" bölümünden önce ekle. (Hem proje kökündeki CLAUDE.md hem de
docs/CLAUDE.md aynı içeriğe sahip görünüyor — ikisini de güncelle, yoksa
tutarsızlık oluşur.)

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

### Migration sırası (henüz uygulanmadıysa)
1. `docs/migrations/005_room_attributes.sql` — şema değişikliği (yeni kolonlar + view)
2. Önce doğrula: `SELECT room_number FROM rooms ORDER BY room_number;`
   — eğer 101-103, 201-202, 301-304, 401-403 yoksa, `006_seed_room_attributes.sql`
   içindeki `WHERE room_number = '...'` satırlarını gerçek numaralarla eşleştir
3. `docs/migrations/006_seed_room_attributes.sql` — gerçek oda verisini işle
4. Doğrulama sorgusu ile kontrol et (script sonunda yorum satırında var)

### Bağlantılı oda kuralı (303 ↔ 304)
Bu sadece bilgi amaçlı bir DB ilişkisi (`connecting_room_id`). Otomatik kapı
kontrolü, ortak rezervasyon paketi YOK — personel istek üzerine fiziksel kapıyı
açar, sistemde hâlâ 2 ayrı rezervasyon olarak işlenir.

---

## Guest-Site İçerik Genişletme — Öncelik Sırası (30 Haziran 2026)

Mevcut `guest-site/src/messages/*.json` dosyaları çok yetersiz (43 satır,
sadece nav/hero/footer). Otel hakkında gerçek bilgi (konum, mutfak, güvenlik,
hizmetler) hiç yok. Bu Faz 4'ün eksik kısmı, tasks.md'de "tamamlandı" görünse de
içerik derinliği yok.

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
entegrasyonundan ÖNCE yapılmalı. Booking ve ödeme entegrasyonu proje teslimine
yakın, en sona bırakılacak (Mert'in kararı — overbooking ve yarım entegrasyon
riskini azaltmak için).

**Yasak:** Yeni içerik eklerken stok fotoğraf kullanma. Gerçek görsel yoksa
metin-öncelikli bölüm tasarla (ikon + kısa açıklama), fotoğraf placeholder'ı
sonradan eklenecek şekilde bırak.

---

## Hero Animasyon Notu (henüz onaylanmadı)

Mert "nar çarpışması" konsepti önerdi (iki nar, biri döner, diğeri çarpar,
parçalanır). Bu konsept mimari danışman (claude.ai) tarafından kısmen
sorgulandı: "parçalanma + kan sıçraması gibi kırmızı leke" detayı marka
mesajıyla (sıcaklık, güven, ev hissi) çelişebilir. Alternatif: narın yumuşakça
açılıp tanelerinin etrafa süzülmesi.

**Bu konu henüz karara bağlanmadı — Claude Code bu animasyonu UYGULAMAYA
BAŞLAMASIN, önce Mert ile claude.ai'da netleştirilecek.**
