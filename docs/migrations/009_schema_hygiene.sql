-- Migration 009: Şema hijyeni — canlıda mevcut ama repoda DDL'i olmayan tablolar
-- Tarih: 2026-07-05
-- Gerekçe: room_items, room_inspections, inventory_purchases, garden_tasks ve
--   reservation_companions tabloları doğrudan Supabase'e uygulanmış; CREATE TABLE
--   DDL'i hiçbir migration dosyasında yoktu. Bu dosya CANLI DURUMU birebir belgeler
--   (get_advisors ile doğrulandı: bu tabloların hepsinde RLS AÇIK ve politikaları var).
--
-- NOT: Bu migration CANLIYA UYGULANMADI — nesneler zaten mevcut. Tamamen tekrarlanabilirlik
--   (fresh `supabase db reset` / yeni ortam kurulumu) içindir. Tümüyle idempotent; canlıda
--   çalıştırılırsa hiçbir şeyi değiştirmez (IF NOT EXISTS + duplicate_object koruması).
-- ---------------------------------------------------------------------------

-- === room_items — odadaki beklenen eşya listesi (denetim referansı) ===
CREATE TABLE IF NOT EXISTS public.room_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid NOT NULL REFERENCES public.rooms(id),
  name          text NOT NULL,
  expected_qty  integer NOT NULL DEFAULT 1,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.room_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY room_items_select ON public.room_items FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY room_items_write ON public.room_items FOR ALL
    USING (get_user_role() = ANY (ARRAY['admin','manager']::user_role[]))
    WITH CHECK (get_user_role() = ANY (ARRAY['admin','manager']::user_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === room_inspections — resepsiyon/temizlik oda denetim kayıtları ===
CREATE TABLE IF NOT EXISTS public.room_inspections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        uuid NOT NULL REFERENCES public.rooms(id),
  reservation_id uuid REFERENCES public.reservations(id),
  inspected_by   uuid REFERENCES public.profiles(id),
  all_ok         boolean NOT NULL DEFAULT true,
  problem_note   text,
  damage_ok      boolean NOT NULL DEFAULT true,
  damage_note    text,
  missing_items  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.room_inspections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY room_inspections_select ON public.room_inspections FOR SELECT
    USING (get_user_role() = ANY (ARRAY['admin','manager','receptionist','housekeeper']::user_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY room_inspections_insert ON public.room_inspections FOR INSERT
    WITH CHECK (get_user_role() = ANY (ARRAY['admin','manager','receptionist','housekeeper']::user_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === inventory_purchases — depo alım geçmişi ===
CREATE TABLE IF NOT EXISTS public.inventory_purchases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category        text NOT NULL CHECK (category = ANY (ARRAY['cleaning','kitchen','food','beverage','decoration','room_furniture','replacement'])),
  area            text NOT NULL DEFAULT 'general' CHECK (area = ANY (ARRAY['general','rooms','garden','kitchen','reception'])),
  product_name    text NOT NULL,
  quantity        numeric NOT NULL,
  unit_price      numeric,
  total_amount    numeric NOT NULL,
  currency        text NOT NULL CHECK (currency = ANY (ARRAY['UZS','USD'])),
  place           text NOT NULL,
  entered_by      uuid REFERENCES public.profiles(id),
  brought_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  product_id      uuid REFERENCES public.inventory_products(id)
);
ALTER TABLE public.inventory_purchases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY inventory_purchases_select ON public.inventory_purchases FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY inventory_purchases_insert ON public.inventory_purchases FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY inventory_purchases_update ON public.inventory_purchases FOR UPDATE
    USING (get_user_role() = ANY (ARRAY['admin','manager']::user_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY inventory_purchases_delete ON public.inventory_purchases FOR DELETE
    USING (get_user_role() = ANY (ARRAY['admin','manager']::user_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === garden_tasks — bahçe görev listesi ===
CREATE TABLE IF NOT EXISTS public.garden_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  note        text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','done'])),
  created_by  uuid REFERENCES public.profiles(id),
  done_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.garden_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY garden_tasks_select ON public.garden_tasks FOR SELECT
    USING (get_user_role() = ANY (ARRAY['admin','manager','receptionist','housekeeper']::user_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY garden_tasks_insert ON public.garden_tasks FOR INSERT
    WITH CHECK (get_user_role() = ANY (ARRAY['admin','manager','receptionist','housekeeper']::user_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY garden_tasks_update ON public.garden_tasks FOR UPDATE
    USING (get_user_role() = ANY (ARRAY['admin','manager','receptionist','housekeeper']::user_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === reservation_companions — rezervasyondaki refakatçi/yanındaki kişiler ===
CREATE TABLE IF NOT EXISTS public.reservation_companions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id      uuid NOT NULL REFERENCES public.reservations(id),
  first_name          text NOT NULL,
  last_name           text NOT NULL,
  nationality         text,
  date_of_birth       date,
  relationship        text,
  marriage_cert_shown boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);
ALTER TABLE public.reservation_companions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY staff_all_companions ON public.reservation_companions FOR ALL
    USING (get_user_role() = ANY (ARRAY['admin','manager','receptionist']::user_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
