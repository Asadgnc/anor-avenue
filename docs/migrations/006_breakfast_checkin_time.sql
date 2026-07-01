-- 006: Rezervasyonlara kahvaltı dahil mi + beklenen giriş saati sütunları
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS breakfast_included BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expected_check_in_time TIME;
