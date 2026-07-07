-- 029: Soliq fiş (çek) alanları — ödeme satırına elektronik fiş linki
-- Terminal fişindeki QR, https://ofd.soliq.uz/epi?t=...&r=...&c=...&s=... linkini açar.
-- Bu linki (fiscal_url) ve r= parametresini (fiscal_receipt_id) ödemeye kaydediyoruz.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS fiscal_url text,
  ADD COLUMN IF NOT EXISTS fiscal_receipt_id text,
  ADD COLUMN IF NOT EXISTS fiscal_scanned_at timestamptz;

COMMENT ON COLUMN public.payments.fiscal_url IS 'Soliq OFD çek QR linki (ofd.soliq.uz/epi?...)';
COMMENT ON COLUMN public.payments.fiscal_receipt_id IS 'Çek QR içindeki r= (receipt id) parametresi';
