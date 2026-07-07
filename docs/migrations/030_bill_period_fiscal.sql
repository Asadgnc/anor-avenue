-- 030: Fatura ödemesi — hangi tarih aralığı için + fiş linki
-- Su/svet/gaz gibi faturalarda ödeme belirli bir dönemi kapsar (ör. 3 gün / 1 ay).
-- Ödeme sonrası çıkan fişin QR linki de saklanır.

ALTER TABLE public.bill_payments
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS fiscal_url text;

COMMENT ON COLUMN public.bill_payments.period_start IS 'Ödemenin kapsadığı dönem başlangıcı';
COMMENT ON COLUMN public.bill_payments.period_end IS 'Ödemenin kapsadığı dönem sonu';
COMMENT ON COLUMN public.bill_payments.fiscal_url IS 'Soliq OFD çek QR linki (ofd.soliq.uz/epi?...)';
