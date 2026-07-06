-- ─────────────────────────────────────────────────────────────────────────────
-- 019 — Overbooking DB kısıtı (Faz D)
--
-- Uygulama katmanındaki "önce oku, sonra yaz" çakışma kontrolü eşzamanlı iki
-- isteğe karşı yarış (TOCTOU) barındırır. Bu kısıt, aynı oda + çakışan tarih
-- aralığı için ikinci rezervasyonu DB seviyesinde reddeder → overbooking imkânsız.
--
-- Yarı-açık aralık '[)': bir odanın çıkış günü = yeni girişin günü ÇAKIŞMA DEĞİL.
-- Yalnızca aktif durumlar (iptal/no-show hariç) kısıtlanır.
--
-- ⚠️ UYGULAMADAN ÖNCE: canlıda mevcut çakışan (aktif) rezervasyon OLMAMALI.
--    Aşağıdaki kontrol sorgusu 0 satır dönmeli; dönmezse önce veriyi temizleyin.
--
-- Kontrol sorgusu (ayrı çalıştırın, bu migration'a dahil değil):
--   SELECT a.id, b.id, a.room_id
--   FROM reservations a JOIN reservations b
--     ON a.room_id = b.room_id AND a.id < b.id
--    AND a.status IN ('pending','confirmed','checked_in')
--    AND b.status IN ('pending','confirmed','checked_in')
--    AND daterange(a.check_in, a.check_out, '[)') && daterange(b.check_in, b.check_out, '[)');
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_no_overlap;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed', 'checked_in'));
