## EKLENECEK BÖLÜM — tasks.md'ye entegre edilecek (30 Haziran 2026)

Aşağıdaki yeni fazı "Faz 5 — İyileştirmeler" bölümünden önce, ayrı bir
"Faz 4c" olarak ekle.

---

## Faz 4c — Gerçek Oda Verisi & İçerik Genişletme (Yeni — 30 Haziran 2026)

### Veritabanı
- [ ] `SELECT room_number FROM rooms ORDER BY room_number;` ile mevcut oda
      numaralarını doğrula — beklenen: 101,102,103,201,202,301,302,303,304,401,402,403
- [ ] `docs/migrations/005_room_attributes.sql` uygula (Supabase MCP ile)
- [ ] `docs/migrations/006_seed_room_attributes.sql` uygula (oda numaraları
      eşleşmiyorsa önce script içindeki WHERE koşullarını düzelt)
- [ ] Doğrulama sorgusu çalıştır, sonucu Mert'e veya claude.ai'a göster

### Guest-site kod değişiklikleri
- [ ] `roomMeta`/`roomData` sabit yapılarını (`page.tsx`, `rooms/page.tsx`)
      `rooms_with_effective_price` view'inden dinamik veri çekecek şekilde değiştir
- [ ] Oda fotoğraf path'lerini `room_number` bazlı dinamik yapıya geçir
      (bkz. `docs/rooms-data.md` — fotoğraf henüz yok, placeholder mantığı kullan)
- [ ] Oda listesi sayfasına sıralama ekle: fiyat (artan/azalan), manzara kalitesi
- [ ] Oda listesi sayfasına filtre ekle: jakuzili/küvetli, kat
- [ ] Her oda tipi kartı yerine gerçek 12 odanın ayrı ayrı gösterildiği görünüm

### İçerik (uz/ru/en — messages/*.json)
- [ ] Konum bölümü metni (metro, pazar, market, ATM mesafeleri)
- [ ] Mutfak/ortak alan bölümü metni
- [ ] Bahçe & atmosfer bölümü metni
- [ ] Güvenlik bölümü metni
- [ ] Hizmetler bölümü metni (resepsiyon, tur, temizlik, çamaşırhane, rent-a-car)
- [ ] Yukarıdaki bölümler için yeni section component'leri (anasayfa + varsa ayrı
      "Hizmetler" ve "Konum" sayfaları)

### Beklemede (Mert onayı gerekiyor, henüz başlama)
- [ ] Hero "nar" animasyonu — konsept netleşmedi, claude.ai'da görüşülüyor
- [ ] Gerçek oda fotoğrafı çekimi sonrası `/hotel-photos/rooms/` klasörlerinin
      doldurulması ve stok fotoğrafların kaldırılması

### Sona bırakılanlar (Mert kararı — teslim öncesi)
- [ ] Booking sisteminde gerçek oda seçimi (şu an sadece tip seçiliyor,
      sistem otomatik müsait odayı atıyor) — UX iyileştirmesi sonra
- [ ] Payme/Click/Uzum canlı merchant entegrasyonu — zaten beklemede
