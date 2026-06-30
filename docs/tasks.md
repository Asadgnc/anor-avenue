# Görev Takibi — Anor Avenue Hotel

Claude Code bu dosyadaki kutucukları tamamladıkça işaretler.
Her oturum başında bu dosyayı oku, devam etmeden önce nerede kaldığını anla.

---

## Faz 0 — Kurulum ✅ (Tamamlandı)

- [x] CLAUDE.md oluşturuldu
- [x] Mimari kararlaştırıldı (Next.js 15 + Supabase + pnpm)
- [x] Roller tanımlandı
- [x] OTA kararı verildi (iCal/channel manager)
- [x] Ödeme kararı verildi (PayTechUz)
- [x] Tasarım sistemi tanımlandı
- [x] Veritabanı şeması yazıldı

---

## Faz 1 — Altyapı ✅ (Tamamlandı)

- [x] Supabase projesi oluşturuldu (qvpflkspmisxcnfnyeve)
- [x] `schema.sql` Supabase'de uygulandı (4 migration mevcut)
- [x] RLS politikaları + güvenlik iyileştirmeleri tamamlandı
- [x] `guest-site` Next.js projesi scaffold edildi
- [x] `admin-panel` Next.js projesi scaffold edildi
- [x] `.env.local` dosyaları oluşturuldu (her iki proje)
- [x] Tailwind v4 kuruldu
- [x] Design tokens (`tokens.css`) oluşturuldu
- [x] Font'lar (`next/font`) eklendi
- [x] Supabase örnek verisi eklendi: 3 oda tipi, 12 oda, 2 misafir, 2 rezervasyon

---

## Faz 2 — Admin Panel Temel ✅ (Tamamlandı)

- [x] Login sayfası (email+şifre, Zod validasyon, Supabase Auth, hata mesajı)
- [x] Auth middleware (oturumsuz → /login, oturumlu → /dashboard)
- [x] Dashboard — bugünkü durum (doluluk, ADR, RevPAR, temizlik durumu)
- [x] Rezervasyon takvimi (oda × tarih grid, 15 günlük görünüm)
- [x] Yeni rezervasyon formu (misafir + oda + tarih + ön ödeme)
- [x] Check-in / check-out akışı (rezervasyon detay sayfası + Server Actions)
- [x] Oda yönetimi (ekleme, durum güncelleme, temizlik durumu)
- [x] Misafir listesi + detay sayfası + yeni misafir formu
- [x] Temizlik yönetimi (HousekeepingBoard)

---

## Faz 3 — Admin Panel Finans & Raporlar

- [x] Ödeme kaydetme (rezervasyon detay sayfasından — Payme/Click/Nakit)
- [x] Ödemeler listesi sayfası
- [x] Günlük rapor (doluluk, gelir, check-in/out listesi, yöntem dağılımı)
- [x] Fatura/makbuz yazdırma (print view)
- [x] Excel dışa aktarım (CSV formatı — Excel açar)
- [x] Misafir registratsiya modülü (yabancı misafir — Özbekistan yasal zorunluluğu)
- [x] ADR / RevPAR / doluluk grafikleri (son 30 gün)
- [x] Dashboard bugünkü giriş/çıkış listeleri + pending rezervasyon uyarı banner'ı
- [x] Rezervasyon takvimi önceki/sonraki navigasyon (14 günlük pencere)
- [x] Rezervasyon liste görünümü — arama + durum filtresi (/reservations/list)
- [x] No-show eylemi — giriş tarihi geçmiş rezervasyonlarda
- [x] Misafir listesi arama

---

## Faz 4 — Misafir Sitesi

- [x] Ana sayfa (hero + odalar önizleme + hakkımızda + iletişim)
- [x] Odalar listesi sayfası (detaylı kart listesi)
- [x] Rezervasyon formu (misafir bilgileri + oda tipi + tarih)
- [x] Rezervasyon → Supabase'e yazılıyor (pending durum, çakışma kontrolü)
- [x] Çok dil sistemi (uz/ru/en)
- [x] SEO meta tags (title, description)
- [x] Oda detay sayfası (galeri + fiyat + rezervasyon butonu)
- [x] Odalar sayfası tarih bazlı müsaitlik kontrolü — Müsait/Sınırlı/Doldu badge'leri
- [x] BookingWidget tarihleri tüm sayfalarda korunuyor (rooms → detail → book)
- [x] Ödeme sayfası UI — /[locale]/pay/[code] — Payme/Click UI hazır (merchant gelince bağlanır), Nakit hemen çalışıyor

---

## Faz 4c — Gerçek Oda Verisi & İçerik Genişletme (Yeni — 30 Haziran 2026)

### Veritabanı
- [x] `SELECT room_number FROM rooms ORDER BY room_number;` ile mevcut oda
      numaralarını doğrula — beklenen: 101,102,103,201,202,301,302,303,304,401,402,403
- [x] `docs/migrations/005_room_attributes.sql` uygula (Supabase MCP ile)
- [x] `docs/migrations/006_seed_room_attributes.sql` uygula (oda numaraları eşleşti)
- [x] Doğrulama sorgusu çalıştırıldı — tüm 12 oda doğru ✓

### Guest-site kod değişiklikleri
- [ ] `roomMeta`/`roomData` sabit yapılarını (`page.tsx`, `rooms/page.tsx`)
      `rooms_with_effective_price` view'inden dinamik veri çekecek şekilde değiştir
- [ ] Oda fotoğraf path'lerini `room_number` bazlı dinamik yapıya geçir
      (bkz. `docs/rooms-data.md` — fotoğraf henüz yok, placeholder mantığı kullan)
- [ ] Oda listesi sayfasına sıralama ekle: fiyat (artan/azalan), manzara kalitesi
- [ ] Oda listesi sayfasına filtre ekle: jakuzili/küvetli, kat
- [ ] Her oda tipi kartı yerine gerçek 12 odanın ayrı ayrı gösterildiği görünüm

### İçerik (uz/ru/en — messages/*.json)
- [x] Konum bölümü metni (metro, pazar, market, ATM mesafeleri)
- [x] Mutfak/ortak alan bölümü metni
- [x] Bahçe & atmosfer bölümü metni
- [x] Güvenlik bölümü metni
- [x] Hizmetler bölümü metni (resepsiyon, tur, temizlik, çamaşırhane, rent-a-car)
- [x] Yukarıdaki bölümler için yeni section component'leri (anasayfa + "Qulayliklar"
      sayfası — KitchenSection, GardenSection, SecuritySection, ServicesSection,
      LocationSection; navbar linki eklendi)

### Beklemede (Mert onayı gerekiyor, henüz başlama)
- [ ] Hero "nar" animasyonu — konsept netleşmedi, claude.ai'da görüşülüyor
- [ ] Gerçek oda fotoğrafı çekimi sonrası `/hotel-photos/rooms/` klasörlerinin
      doldurulması ve stok fotoğrafların kaldırılması

### Sona bırakılanlar (Mert kararı — teslim öncesi)
- [ ] Booking sisteminde gerçek oda seçimi (şu an sadece tip seçiliyor,
      sistem otomatik müsait odayı atıyor) — UX iyileştirmesi sonra
- [ ] Payme/Click/Uzum canlı merchant entegrasyonu — zaten beklemede

---

## Faz 5 — İyileştirmeler (Deneme Sonrası)

- [x] iCal export — kullanıcı kararıyla kaldırıldı (channel manager entegrasyonu şimdilik yok)
- [x] Otel Profili — /settings sayfasında düzenlenebilir form; fatura + email'de kullanılıyor (hotel_settings tablosu)
- [x] Uzum Bank ödeme seçeneği — guest-site /pay sayfasına eklendi ("soon" badge, merchant gelince bağlanır)
- [ ] AI: yorum özetleme
- [ ] AI: talep tahmini / fiyat önerisi
- [ ] 3D oda turu (isteğe bağlı, performans testinden sonra)
- [x] Mobil optimizasyon — Admin panel hamburger drawer, guest site yapışkan CTA barı
- [x] Yavaş bağlantı optimizasyonu — guest site zaten SSG (pre-rendered), JS 102kB

---

## Faz 4b — Deploy ✅ (Tamamlandı)

- [x] Vercel'e deploy edildi — her iki uygulama çalışıyor (anor-avenue-guest-site + anor-avenue-admin-panel)
- [x] Supabase bağlantısı canlı ortamda doğrulandı

---

## Bilinen Sorunlar / Notlar

- ~~Supabase'de henüz personel hesabı oluşturulmadı~~ — Muzaffar (admin) oluşturuldu ✓
- Payme/Click ödeme entegrasyonu merchant hesabı gerektiriyor — sahte değil gerçek merchant onayı alındıktan sonra entegre edilecek.
- guest-site booking formu oda tipi seçiyor; müsait oda otomatik atanıyor. Eğer tüm odalar doluysa hata mesajı gösteriyor.
