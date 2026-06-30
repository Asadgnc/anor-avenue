-- ============================================================
-- 006 — Gerçek 12 oda verisi: özellik güncellemesi
-- Anor Avenue Hotel
-- ÖNEMLİ: Bu script room_number değerlerinin Supabase'de zaten
-- '101','102','103','201','202','301','302','303','304',
-- '401','402','403' olarak var olduğunu varsayar.
-- Çalıştırmadan önce Claude Code şunu doğrulamalı:
--   SELECT room_number FROM rooms ORDER BY room_number;
-- Eğer numaralar farklıysa (örn. 'M01' gibi), bu script'teki
-- WHERE room_number = '...' satırları güncellenmeli.
-- ============================================================

-- ── Bodrum kat (-1) — Standart ──────────────────────────────
UPDATE rooms SET window_count = 3, view_quality = 'standard' WHERE room_number = '101';
UPDATE rooms SET window_count = 1, view_quality = 'standard' WHERE room_number = '102';
UPDATE rooms SET window_count = 2, view_quality = 'standard' WHERE room_number = '103';

-- ── Giriş katı (2) — Lüks / Deluxe ──────────────────────────
UPDATE rooms SET view_quality = 'good' WHERE room_number = '201';
UPDATE rooms SET
  has_jacuzzi = true,
  is_isolated = true,
  view_quality = 'good',
  price_override = 950000  -- 850.000 taban + 100.000 jakuzi farkı
WHERE room_number = '202';

-- ── 3. kat — Lüks / Deluxe ──────────────────────────────────
UPDATE rooms SET view_quality = 'good' WHERE room_number = '301';
UPDATE rooms SET view_quality = 'good' WHERE room_number = '302';
UPDATE rooms SET
  view_quality = 'premium',
  connecting_room_id = (SELECT id FROM rooms WHERE room_number = '304')
WHERE room_number = '303';
UPDATE rooms SET
  has_bathtub = true,
  view_quality = 'premium',
  price_override = 900000,  -- 850.000 taban + 50.000 küvet farkı
  connecting_room_id = (SELECT id FROM rooms WHERE room_number = '303')
WHERE room_number = '304';

-- ── 4. kat (mansard) — en iyi manzara ───────────────────────
UPDATE rooms SET view_quality = 'premium' WHERE room_number = '401';
UPDATE rooms SET view_quality = 'premium' WHERE room_number = '402';
UPDATE rooms SET
  view_quality = 'premium',
  notes = COALESCE(notes || ' | ', '') || 'Suit yapı: içinde 2 oda, tek rezervasyon birimi olarak satılır, bölünmez.'
WHERE room_number = '403';

-- Doğrulama sorgusu (Claude Code çalıştırdıktan sonra kontrol etsin)
-- SELECT room_number, floor, view_quality, has_jacuzzi, has_bathtub,
--        window_count, is_isolated, price_override
-- FROM rooms ORDER BY floor, room_number;
