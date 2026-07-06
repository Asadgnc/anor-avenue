-- ─────────────────────────────────────────────────────────────────────────────
-- 020 — Rezervasyon "uzatabilir / kesin çıkış" işareti (Faz C)
--
-- Resepsiyonist, çıkışı belirsiz (misafir uzatabilir) bir rezervasyonu
-- işaretleyebilir. Guest-site akıllı bulma motoru, devir günü (checkout ==
-- yeni checkin) boşalacak ama "uzatabilir" işaretli odaları öneride GÖSTERMEZ
-- (overbooking riski). Varsayılan false = kesin çıkış (mevcut davranış korunur).
--
-- Idempotent. CANLIYA UYGULANMADI — kullanıcı SQL Editor'den uygulayacak.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS may_extend BOOLEAN NOT NULL DEFAULT false;
