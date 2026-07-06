-- Migration 024: Dashboard oda paneli — hızlı giriş/rezervasyon + pasaport arşivi
-- Tarih: 2026-07-06
-- Gerekçe: Dashboard'da odaya tıklayınca açılan panelden hızlı giriş (walk-in)
--   alınabilecek. "Dolu işaretle → sonra pasaportları sırayla okut" akışı için:
--   (1) reservations.registration_pending → tam kaydı sonra tamamlanacak "yarı
--       kayıt"ları işaretler (dashboard'da gösterilir).
--   (2) passport_scans → her taranan pasaportun görselini SADECE admin görebilecek
--       şekilde arşivler (görsel private `passports` bucket'ta, tablo yol + MRZ tutar).
--   (3) reservation_companions'a pasaport alanları → çok-odalı girişte refakatçilerin
--       taranan verisi kaybolmasın.
--
-- Tümüyle idempotent (IF NOT EXISTS). Yeni sütunlar NULL/false default → mevcut
--   satırları bozmaz.
-- ---------------------------------------------------------------------------

-- === (1) Yarı kayıt işareti ===
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS registration_pending BOOLEAN NOT NULL DEFAULT false;

-- === (2) Pasaport görsel arşivi (admin-only) ===
CREATE TABLE IF NOT EXISTS public.passport_scans (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  guest_id       UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  slot_index     INT NOT NULL DEFAULT 0,        -- konaklamadaki kişi sırası (0 = birincil)
  storage_path   TEXT NOT NULL,                 -- private `passports` bucket içindeki yol
  mrz_raw        TEXT,                           -- ham MRZ satırları (denetim/yeniden-ayrıştırma)
  scanned_by     UUID REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS passport_scans_reservation_idx
  ON public.passport_scans(reservation_id);

ALTER TABLE public.passport_scans ENABLE ROW LEVEL SECURITY;

-- Pasaport görselleri hassas PII → yalnızca admin okuyabilir.
DO $$ BEGIN
  CREATE POLICY passport_scans_select_admin ON public.passport_scans
    FOR SELECT USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert pratikte service_role ile yapılır (RLS bypass); yine de ön büro rolleri
-- için açık bir INSERT politikası bırakıyoruz.
DO $$ BEGIN
  CREATE POLICY passport_scans_insert_frontdesk ON public.passport_scans
    FOR INSERT WITH CHECK (get_user_role() IN ('admin','manager','receptionist'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === (3) Refakatçi pasaport alanları ===
ALTER TABLE public.reservation_companions ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE public.reservation_companions ADD COLUMN IF NOT EXISTS passport_expiry DATE;
ALTER TABLE public.reservation_companions ADD COLUMN IF NOT EXISTS sex TEXT;

DO $$ BEGIN
  ALTER TABLE public.reservation_companions ADD CONSTRAINT companions_sex_check
    CHECK (sex IS NULL OR sex IN ('M', 'F'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === (4) Private `passports` storage bucket ===
-- Erişim tamamen server-side service_role imzalı URL ile (registrations bucket deseni);
-- storage.objects üzerinde ek policy yok. Sadece admin sayfası imzalı URL üretir.
INSERT INTO storage.buckets (id, name, public)
VALUES ('passports', 'passports', false)
ON CONFLICT (id) DO NOTHING;
