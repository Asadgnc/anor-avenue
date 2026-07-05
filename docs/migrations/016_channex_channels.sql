-- Migration 016: Channex kanal yöneticisi + çok-kanallı fiyatlandırma
-- Tarih: 2026-07-05
-- Apply on Supabase Dashboard → SQL Editor
--
-- Gerekçe: Channex (channel manager) ile iki yönlü senkron. Her oda tipi bir
--   Channex "room_type"a (müsaitlik adedi), her (oda tipi × satış kanalı) bir
--   Channex "rate_plan"a (kanala özel fiyat) eşlenir. Kendi web sitemiz + admin
--   base fiyatı esas alır; her kanal base'e bağlı bir kuralla fiyatlanır.
--
-- Tümüyle idempotent (IF NOT EXISTS). Mevcut satırları bozmaz.
-- ---------------------------------------------------------------------------

-- === 1) room_types: Channex oda tipi eşleştirmesi ===
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS channex_room_type_id TEXT;

-- === 2) sales_channels — satış kanalları + fiyatlandırma kuralı ===
CREATE TABLE IF NOT EXISTS public.sales_channels (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key            TEXT NOT NULL UNIQUE,        -- 'direct','booking_com','airbnb','agoda','expedia'
  name           TEXT NOT NULL,               -- görünen ad
  enabled        BOOLEAN NOT NULL DEFAULT true,
  commission_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,   -- kanalın komisyonu (%)
  pricing_mode   TEXT NOT NULL DEFAULT 'offset_commission'
                   CHECK (pricing_mode IN ('offset_commission', 'percent', 'amount', 'manual', 'base')),
  markup_value   NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- percent/amount modunda kullanılır
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed kanallar (idempotent — çakışırsa dokunmaz)
INSERT INTO public.sales_channels (key, name, enabled, commission_pct, pricing_mode, sort_order) VALUES
  ('direct',      'Web sitesi / Direkt', true,  0,  'base',              0),
  ('booking_com', 'Booking.com',         true,  15, 'offset_commission', 1),
  ('airbnb',      'Airbnb',              true,  14, 'offset_commission', 2),
  ('agoda',       'Agoda',               false, 17, 'offset_commission', 3),
  ('expedia',     'Expedia',             false, 16, 'offset_commission', 4)
ON CONFLICT (key) DO NOTHING;

-- === 3) channel_rates — (oda tipi × kanal) eşleştirme + fiyat ezme ===
CREATE TABLE IF NOT EXISTS public.channel_rates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id          UUID NOT NULL REFERENCES public.sales_channels(id) ON DELETE CASCADE,
  room_type_id        UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  channex_rate_plan_id TEXT,                  -- bu hücrenin Channex rate_plan karşılığı
  price_override      NUMERIC(12, 2),         -- doluysa hesaplanan fiyatı ezer
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, room_type_id)
);

-- === 4) hotel_settings: Channex bağlantı bilgisi ===
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS channex_property_id TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS channex_last_sync TIMESTAMPTZ;

-- === 5) reservations: OTA rezervasyon izleri (idempotent webhook) ===
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS channex_booking_id TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS channex_revision_id TEXT;
-- ota_reference ve channel zaten mevcut (bkz. schema.sql)

CREATE INDEX IF NOT EXISTS idx_reservations_channex_booking
  ON public.reservations(channex_booking_id)
  WHERE channex_booking_id IS NOT NULL;

-- channel enum'a yeni değerler (booking_com/agoda zaten var)
ALTER TYPE channel ADD VALUE IF NOT EXISTS 'airbnb';
ALTER TYPE channel ADD VALUE IF NOT EXISTS 'expedia';
ALTER TYPE channel ADD VALUE IF NOT EXISTS 'other_ota';

-- === 6) RLS ===
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_channels_select" ON public.sales_channels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_channels_write" ON public.sales_channels
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "channel_rates_select" ON public.channel_rates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "channel_rates_write" ON public.channel_rates
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

GRANT SELECT ON public.sales_channels TO authenticated;
GRANT SELECT ON public.channel_rates TO authenticated;

-- updated_at trigger (mevcut update_updated_at fonksiyonu kullanılır)
DROP TRIGGER IF EXISTS trg_channel_rates_updated_at ON public.channel_rates;
CREATE TRIGGER trg_channel_rates_updated_at BEFORE UPDATE ON public.channel_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
