-- ============================================================
-- 031_admin_only_delete.sql
-- Amaç: Elle girilen işlemsel/test verisi tablolarında SATIR SİLME (DELETE)
--       yetkisini YALNIZCA admin rolüne kilitle.
--
-- Neden: Sahibi test rezervasyon + depo kayıtlarını temizledi; bundan sonra
--        bu kayıtları silmeyi sadece admin yapabilmeli. Bugün bazı tablolarda
--        manager/receptionist de silebiliyordu, çoğunda ise hiç DELETE
--        politikası yoktu (RLS default-deny → panelden kimse silemiyordu).
--
-- Desen: get_user_role() = 'admin'  (mevcut helper fonksiyon)
-- Idempotent: DROP POLICY IF EXISTS ... + CREATE POLICY
--
-- NOT: Korunan config tablolarına (rooms, room_types, recurring_bills,
--      hotel_settings, sales_channels, channel_rates, channex_variants,
--      profiles) dokunulmaz. bill_payments/recurring_bills/announcements/
--      rooms/room_types zaten admin-only olduğu için buraya alınmadı.
-- ============================================================

-- ---- 1) Mevcut GENİŞ politikaları admin-only'a daralt (eski adları düşür) ----
DROP POLICY IF EXISTS "guest_notes_delete"         ON guest_notes;
DROP POLICY IF EXISTS "guest_tags_delete"          ON guest_tags;
DROP POLICY IF EXISTS "guests_delete"              ON guests;
DROP POLICY IF EXISTS "inventory_purchases_delete" ON inventory_purchases;
DROP POLICY IF EXISTS "loyalty_points_delete"      ON loyalty_points;
DROP POLICY IF EXISTS "payroll_items_delete"       ON payroll_items;
DROP POLICY IF EXISTS "shifts_delete"              ON staff_shifts;
DROP POLICY IF EXISTS "pricing_rules_delete"       ON pricing_rules;

-- ---- 2) Tüm hedef tablolar için tek tip admin-only DELETE politikası ----
-- (yeni ad: <tablo>_admin_delete — tekrar çalıştırılabilir olsun diye önce düşür)
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    -- daraltılanlar
    'guest_notes','guest_tags','guests','inventory_purchases','loyalty_points',
    'payroll_items','staff_shifts','pricing_rules',
    -- yeni eklenenler (önceden DELETE politikası yoktu)
    'reservations','guest_registrations','reservation_companions','room_inspections',
    'passport_scans','availability','housekeeping_tasks','payments',
    'inventory_movements','inventory_requests','inventory_products','garden_tasks',
    'expenses','payroll_periods'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_admin_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (get_user_role() = ''admin''::user_role);',
      t || '_admin_delete', t
    );
  END LOOP;
END $$;
