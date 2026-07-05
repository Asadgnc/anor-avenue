-- Migration 017: Channex oda-varyantları (doluluk bazlı) + fiziksel oda ataması
-- Tarih: 2026-07-05
-- Apply on Supabase Dashboard → SQL Editor
--
-- Gerçek yapı: Channex'te 6 oda tipi (doluluk varyantı) var. Her varyant BELİRLİ
--   fiziksel odalara bağlı (kullanıcı onaylı ayrı oda havuzu modeli):
--     Standard Quadruple ← 101            (1 oda)
--     Standard Double    ← 102            (1 oda)
--     Standard Triple    ← 103            (1 oda)
--     Deluxe Double      ← 301,302,303,402 (4 oda)
--     Deluxe Triple      ← 201,403         (2 oda)
--     Luxury Double      ← 202,304,401     (3 oda)
--   Müsaitlik = varyanta bağlı boş oda sayısı. DB room_type_id'ye DOKUNULMAZ
--   (guest-site kategori fiyatı ayrı konu).
--
-- Tümüyle idempotent. 016'daki sales_channels/channel_rates artık kullanılmıyor
--   (zararsız, bırakıldı).
-- ---------------------------------------------------------------------------

-- 1) Channex varyant tablosu (6 satır) — her biri 1 Channex room_type + 1 rate_plan
CREATE TABLE IF NOT EXISTS public.channex_variants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channex_room_type_id  TEXT NOT NULL UNIQUE,
  channex_rate_plan_id  TEXT NOT NULL,
  label                 TEXT NOT NULL,
  occupancy             INTEGER NOT NULL DEFAULT 2,
  ota_price             NUMERIC(12, 2),      -- NULL → fiyat gönderilmez (panelden girilir)
  enabled               BOOLEAN NOT NULL DEFAULT true,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) rooms → varyant ataması
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS channex_variant_id UUID REFERENCES public.channex_variants(id) ON DELETE SET NULL;

-- 3) Varyantları ekle (idempotent: channex_room_type_id UNIQUE)
INSERT INTO public.channex_variants (channex_room_type_id, channex_rate_plan_id, label, occupancy, sort_order) VALUES
  ('b5a61892-bb90-4152-b2cf-4e57bcfef749', '07edd76a-ae1e-41b6-bbe8-2aecd5ee7558', 'Standard Quadruple', 4, 1),
  ('96725e79-7ef5-474c-ac44-823169684b67', 'b42640b4-6e89-41ef-a8e3-44f168346fba', 'Standard Double',    2, 2),
  ('0faab05e-6cef-49d0-9fed-0f4dda01e429', '74561e5b-f431-4050-87e6-ac15a2ee9566', 'Standard Triple',    3, 3),
  ('c06e28f9-e5bb-4b2e-b729-09afe4b64aa5', 'db2aed60-cc29-49f2-bb45-241ee0d8b70b', 'Deluxe Double',      2, 4),
  ('3bb16caa-44c6-4f17-97a7-2af18408b82f', 'f6a75548-d339-4fc1-9c5b-e5a13eafd906', 'Deluxe Triple',      3, 5),
  ('388ca8f7-ef72-4fe1-b076-701b54f627ae', 'd79e19ce-cd55-4238-ade9-43ac927a6d7c', 'Luxury Double',      2, 6)
ON CONFLICT (channex_room_type_id) DO UPDATE
  SET channex_rate_plan_id = EXCLUDED.channex_rate_plan_id,
      label = EXCLUDED.label,
      occupancy = EXCLUDED.occupancy,
      sort_order = EXCLUDED.sort_order;

-- 4) Fiziksel odaları varyantlara bağla (oda numarasına göre)
UPDATE public.rooms r SET channex_variant_id = v.id
  FROM public.channex_variants v
  WHERE v.channex_room_type_id = 'b5a61892-bb90-4152-b2cf-4e57bcfef749' AND r.room_number IN ('101');
UPDATE public.rooms r SET channex_variant_id = v.id
  FROM public.channex_variants v
  WHERE v.channex_room_type_id = '96725e79-7ef5-474c-ac44-823169684b67' AND r.room_number IN ('102');
UPDATE public.rooms r SET channex_variant_id = v.id
  FROM public.channex_variants v
  WHERE v.channex_room_type_id = '0faab05e-6cef-49d0-9fed-0f4dda01e429' AND r.room_number IN ('103');
UPDATE public.rooms r SET channex_variant_id = v.id
  FROM public.channex_variants v
  WHERE v.channex_room_type_id = 'c06e28f9-e5bb-4b2e-b729-09afe4b64aa5' AND r.room_number IN ('301', '302', '303', '402');
UPDATE public.rooms r SET channex_variant_id = v.id
  FROM public.channex_variants v
  WHERE v.channex_room_type_id = '3bb16caa-44c6-4f17-97a7-2af18408b82f' AND r.room_number IN ('201', '403');
UPDATE public.rooms r SET channex_variant_id = v.id
  FROM public.channex_variants v
  WHERE v.channex_room_type_id = '388ca8f7-ef72-4fe1-b076-701b54f627ae' AND r.room_number IN ('202', '304', '401');

-- 5) Property ID
UPDATE public.hotel_settings SET channex_property_id = '89fce9ac-412a-4103-84e7-49ba715d8960' WHERE id = 1;

-- 6) RLS
ALTER TABLE public.channex_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channex_variants_select" ON public.channex_variants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "channex_variants_write" ON public.channex_variants
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));
GRANT SELECT ON public.channex_variants TO authenticated;

DROP TRIGGER IF EXISTS trg_channex_variants_updated_at ON public.channex_variants;
CREATE TRIGGER trg_channex_variants_updated_at BEFORE UPDATE ON public.channex_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
