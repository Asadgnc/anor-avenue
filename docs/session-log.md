# Session Log — Anor Avenue Hotel System

Geçmiş oturum notları. CLAUDE.md'den taşındı (7 Temmuz 2026).

---

## 7 Temmuz 2026 — Test verisi temizliği + silme yetkisi admin'e kilitlendi

- [x] Elle girilen tüm test verisi silindi (service_role, FK sırasıyla): 21 rezervasyon,
  23 misafir, 11 ödeme, depo (16 hareket + 13 alım + 11 ürün), 4 refakatçi, 4 oda denetimi,
  2 kayıt, 2 bahçe görevi, 2 puantaj, bordro (2 dönem + 1 kalem), 1'er not/etiket/sadakat.
  Korunanlar dokunulmadı: profiles(4), rooms(12), room_types(3), hotel_settings(1),
  pricing_rules, recurring_bills, kanal ayarları.
- [x] Kullanıcı kararları: test payments de silindi ("asla silinmez" kuralının bilinçli
  tek seferlik istisnası), depo kataloğu dahil sıfırlandı, expenses+bill_payments+puantaj/
  bordro dahil edildi, pricing_rules korundu.
- [x] Migration `028_admin_only_delete.sql` — tüm işlemsel tablolarda DELETE artık yalnızca
  admin (`get_user_role() = 'admin'`). manager/receptionist içeren eski politikalar daraltıldı,
  DELETE politikası olmayan tablolara admin-only eklendi. Canlıya uygulandı + doğrulandı.
- [x] Uygulama katmanı: `deleteRoomItemAction` ve CRM (not/etiket) silme admin-only'a daraltıldı;
  yeni `deleteReservationAction` (bağlı çocuk kayıtları + ödeme temizler) ve
  `deleteInventoryProductAction` (ürün + hareket + alım) eklendi.
- [x] UI: rezervasyon detayına "Tehlikeli bölge" admin-only silme kartı; depo ürün satırına
  admin-only "Sil" butonu (3 dilde çeviri: uz/ru/uz-cyrl). Yalnızca admin görür.
- [x] `pnpm build` (admin-panel) hatasız (exit 0). Tek admin: Muzaffar.

---

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
  - Renk token'ları güncellendi; pastel "tonlu bölgeler" sonradan kaldırıldı (beğenilmedi)

- [x] Admin panel: Temizlikçi "Günlük Özet" sayfası (/housekeeping/overview)
  - DB migration 006: `reservations` tablosuna `breakfast_included` + `expected_check_in_time` eklendi

- [x] Admin panel: tam tasarım yenileme — "Lacivert + Altın" kurumsal tema (2 Temmuz 2026)
  - Palet: koyu lacivert sidebar (#16233B), açık gri zemin (#F8FAFC), beyaz kartlar, altın vurgu
  - globals.css + dashboardTheme.ts birleştirildi; AppTopbar eklendi

- [x] Admin panel: Rol Bazlı Panel Genişlemesi (2 Temmuz 2026)
  - Migration 007: room_items, room_inspections, inventory_purchases, garden_tasks
  - /depo, /finance, /garden sayfaları; stok takibi (inventory_products + inventory_movements)

- [x] Admin panel: TAM çok dillilik — Rusça (varsayılan) + Özbekçe Latin + Özbekçe Kiril (3-4 Temmuz 2026)
  - next-intl; 3 sözlük dosyası 736+ anahtar; kodda Türkçe yok

- [x] Admin panel: middleware yanlış konumdaydı — KRİTİK düzeltme (4 Temmuz 2026)
  - `admin-panel/middleware.ts` → `admin-panel/src/middleware.ts` taşındı
  - Next.js `src/` klasörü varken middleware'i SADECE `src/middleware.ts`'den yükler

- [x] Açılış öncesi ERP modülleri (5 Temmuz 2026)
  - Faz 1: Registratsiya (migration 010 canlı) — pasaport/vize/PINFL + E-Mehmon yükleme
  - Faz 2: Muhasebe defteri (migration 011 canlı) — accounting_ledger VIEW, revenue_category
  - Faz 3: Kamu faturaları (migration 012 canlı ama 012b eksik → /bills kırık)
  - Faz 4: CRM + sadakat (migration 013) — guest_notes, guest_tags, loyalty_points
  - Faz 5: Puantaj + Bordro (migration 014) — staff_shifts, payroll_periods, payroll_items

- [x] Pasaport tarama: tesseract.js → Google Cloud Vision + rehberli kamera (5 Temmuz 2026)
  - `src/lib/mrz.ts` TD3 parser; `PassportScanButton.tsx` getUserMedia tam ekran modal
  - Migration 015: guests +passport_expiry/sex/mrz_raw
  - GOOGLE_CLOUD_VISION_API_KEY Vercel'de kurulu ✅

- [x] Channex kanal yöneticisi (5-6 Temmuz 2026)
  - Migration 017: channex_variants (6 varyant, 12 oda eşleştirmesi) canlı ✅
  - Migration 018: room_type_tiers — Standard 300k / Deluxe 500k / Luxury 800k canlı ✅
  - İki yönlü senkron: DB→Channex müsaitlik+fiyat; OTA webhook→rezervasyon
  - Env: CHANNEX_API_KEY (staging), CHANNEX_BASE_URL, CHANNEX_WEBHOOK_SECRET canlı ✅

- [x] Guest-site rezervasyon motoru (6 Temmuz 2026)
  - `availability.ts`: çok-oda kombinasyon + en ucuz sıralama
  - `/availability` sayfası; `bookRoomCombination` action
  - Migration 019 (EXCLUDE çakışma kısıtı) + 020 (may_extend) CANLIDA UYGULANMIŞ ✅

- [x] Dashboard oda paneli — tıklanabilir oda + hızlı giriş/rezervasyon (6 Temmuz 2026)
  - Migration 024: passport_scans tablosu + private passports bucket canlı ✅
  - RoomCell sheet; walk-in sihirbazı; yarı kayıt banner

- [x] Guest-site: gerçek oda fotoğrafları + oda-bazlı detay (6 Temmuz 2026)
  - `scripts/process-photos.mjs` (sharp → WebP); 8 oda fotoğrafı işlendi (101/102/103/301 eksik → fallback)

- [x] Admin panel: PWA + hız + ~1sn Channex senkron + web push (7 Temmuz 2026)
  - Vercel bölgesi sin1 (Singapur — Supabase ile aynı ✅)
  - Migration 025: get_dashboard_data() + get_nav_badges() RPC canlı ✅
  - Migration 026: push_subscriptions canlı ✅; VAPID anahtarları Vercel'de
  - Migration 027: pg_net DB trigger → /api/webhooks/supabase canlı ✅
  - @serwist/next PWA; manifest + nar ikonları; /~offline sayfası

- [x] Büyük denetim: Güvenlik · Senkron · Rezervasyon · "Bugün" ekranı (7 Temmuz 2026)
  - `src/lib/require-role.ts`: KRİTİK güvenlik açıkları kapatıldı (inviteStaff/deleteStaff herkese açıktı)
  - `src/lib/reservation-service.ts`: createReservationCore tek çekirdek; moveRoomAction + extendStayAction
  - Dashboard "Bugün" ekranı: 4 KPI çipi + giriş/çıkış listeleri + MobileTabBar
  - Deploy: commit b3abc3a, prod READY (sin1), Playwright doğrulaması ✅
