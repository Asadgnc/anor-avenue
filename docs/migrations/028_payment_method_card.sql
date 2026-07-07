-- 028: "card" ödeme türü (girişte terminalden kart ile ödeme)
-- Not: ALTER TYPE ... ADD VALUE bir transaction bloğunda tek başına çalıştırılmalı.
-- Supabase SQL Editor'de bu dosyayı TEK BAŞINA çalıştırın.

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'card';
