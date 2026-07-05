-- Migration 015: Pasaport tarama (MRZ) alanları + şema hijyeni
-- Tarih: 2026-07-05
-- Gerekçe: Telefonla pasaport MRZ taraması, mevcut alanlara ek olarak pasaport
--   son geçerlilik tarihi ve cinsiyet üretir; guests tablosunda bunlar yoktu.
--   Ayrıca ham MRZ satırı denetim/yeniden-ayrıştırma için saklanır.
--   Bu dosya ayrıca canlıda mevcut ama repoda DDL'i olmayan registratsiya
--   sütunlarını hijyen amacıyla belgeler (migration 009/010 deseni).
--
-- Tümüyle idempotent (IF NOT EXISTS). Yeni sütunlar NULL default → mevcut
--   satırları bozmaz.
-- ---------------------------------------------------------------------------

-- === Yeni: pasaport tarama alanları ===
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS passport_expiry DATE;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS mrz_raw TEXT;

-- sex yalnızca MRZ'den gelen 'M'/'F' değerlerini alır (boş bırakılabilir)
DO $$ BEGIN
  ALTER TABLE public.guests ADD CONSTRAINT guests_sex_check
    CHECK (sex IS NULL OR sex IN ('M', 'F'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === Hijyen: canlıda mevcut, repoda belgelenmemiş registratsiya sütunları ===
-- (guests — E-Mehmon manuel akışı)
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS visa_number TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS visa_expiry DATE;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS pinfl TEXT;

-- (guest_registrations)
ALTER TABLE public.guest_registrations ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.guest_registrations ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.guest_registrations ADD COLUMN IF NOT EXISTS tourist_tax_amount NUMERIC;
ALTER TABLE public.guest_registrations ADD COLUMN IF NOT EXISTS tourist_tax_paid BOOLEAN DEFAULT false;
