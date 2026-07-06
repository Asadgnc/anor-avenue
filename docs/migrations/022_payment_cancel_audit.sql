-- 022_payment_cancel_audit.sql
-- Ödeme güvenliği: ödemeler artık SİLİNMEZ, "iade/iptal" olarak işaretlenir
-- (status='refunded') + kim-ne-zaman iptal etti denetim izi tutulur.
-- Idempotent — tekrar çalıştırılabilir.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id);
