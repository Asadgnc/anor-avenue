-- Migration 008: RLS düzeltmeleri, Realtime aboneliği, Stok kataloğu (inventory_products + inventory_movements)
-- Tarih: 2026-07-02

-- ============================================================
-- 1. reservations SELECT politikasına housekeeper ekle
-- ============================================================
DROP POLICY IF EXISTS "Rezervasyonları görebilir" ON reservations;
CREATE POLICY "Rezervasyonları görebilir" ON reservations
  FOR SELECT USING (get_user_role() IN ('admin','manager','receptionist','accountant','housekeeper'));

-- ============================================================
-- 2. guests tablosu SELECT politikası (şu an hiç yok — default deny)
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "Misafirleri görebilir" ON guests
    FOR SELECT USING (get_user_role() IN ('admin','manager','receptionist','accountant','housekeeper'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. room_types tablosu SELECT politikası (şu an hiç yok — default deny)
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "Oda tiplerini görebilir" ON room_types
    FOR SELECT USING (get_user_role() IN ('admin','manager','receptionist','accountant','housekeeper'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. Supabase Realtime publikasyonu
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE reservations';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE rooms';
  END IF;
END $$;

-- ============================================================
-- 5. inventory_products tablosu (stok kataloğu)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_products (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text    NOT NULL,
  category   text    NOT NULL CHECK (category IN ('cleaning','kitchen','food','beverage','decoration','room_furniture','replacement')),
  on_hand    numeric NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Stok ürünlerini görebilir" ON inventory_products
    FOR SELECT USING (get_user_role() IN ('admin','manager','receptionist','accountant','housekeeper'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. inventory_movements tablosu (hareket defteri — giriş ve çıkış)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid    NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  type        text    NOT NULL CHECK (type IN ('in','out')),
  quantity    numeric NOT NULL CHECK (quantity > 0),
  destination text    NOT NULL DEFAULT 'general' CHECK (destination IN ('room','garden','kitchen','reception','general')),
  room_id     uuid    REFERENCES rooms(id) ON DELETE SET NULL,
  moved_by    uuid    REFERENCES profiles(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Sadece admin hareket geçmişini görebilir
DO $$ BEGIN
  CREATE POLICY "Hareketleri admin gorebilir" ON inventory_movements
    FOR SELECT USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 7. inventory_purchases tablosuna product_id kolonu ekle
--    (geriye dönük uyumluluk — nullable)
-- ============================================================
ALTER TABLE inventory_purchases ADD COLUMN IF NOT EXISTS
  product_id uuid REFERENCES inventory_products(id) ON DELETE SET NULL;
