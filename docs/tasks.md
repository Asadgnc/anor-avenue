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

---

## Faz 4 — Misafir Sitesi

- [x] Ana sayfa (hero + odalar önizleme + hakkımızda + iletişim)
- [x] Odalar listesi sayfası (detaylı kart listesi)
- [x] Rezervasyon formu (misafir bilgileri + oda tipi + tarih)
- [x] Rezervasyon → Supabase'e yazılıyor (pending durum, çakışma kontrolü)
- [x] Çok dil sistemi (uz/ru/en)
- [x] SEO meta tags (title, description)
- [x] Oda detay sayfası (galeri + fiyat + rezervasyon butonu)
- [ ] Ödeme sayfası (Payme/Click — merchant hesabı gerekli)

---

## Faz 5 — İyileştirmeler (Deneme Sonrası)

- [ ] Booking.com iCal senkronu — en son yapılacak, şimdilik pas
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
