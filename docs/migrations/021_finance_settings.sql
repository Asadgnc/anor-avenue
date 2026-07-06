-- 021_finance_settings.sql
-- Muhasebe altyapısı: tek para birimine çevirme kuru + turizm vergisi oranı.
-- hotel_settings tek satırlıdır (id = 1). Idempotent — tekrar çalıştırılabilir.
--
-- usd_rate            : 1 USD kaç UZS (Muhasebe raporlarında USD → UZS çevrimi için).
-- tourist_tax_per_night: yabancı misafir başına gece başına turizm vergisi (UZS).
--                        0 = otomatik hesap kapalı (elle girilir).

ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS usd_rate NUMERIC(12,2) NOT NULL DEFAULT 12000;

ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS tourist_tax_per_night NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Varsayılanı mevcut tek satıra da uygula (kolon önceden eklenmişse dokunmaz).
UPDATE public.hotel_settings
  SET usd_rate = 12000
  WHERE id = 1 AND (usd_rate IS NULL OR usd_rate = 0);
