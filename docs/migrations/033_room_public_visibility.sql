-- 033_room_public_visibility.sql
-- Bodrum kat Standart odalar (101/102/103) genel satıştan gizlenir.
-- is_public=false → oda guest-site ve OTA'da görünmez; admin panelde tam çalışır
-- (walk-in misafirlere verilmeye devam eder).
-- is_active operasyonel durum, is_public pazarlama görünürlüğü — ikisi ayrı.

BEGIN;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.rooms.is_public IS
  'false = oda guest-site ve OTA''da gizli; sadece admin panel (walk-in). is_active operasyonel, is_public pazarlama görünürlüğü.';

UPDATE public.rooms SET is_public = false WHERE room_number IN ('101','102','103');

-- View r.* ile tanımlı: yeni kolon listenin ortasına düştüğü için
-- CREATE OR REPLACE VIEW çalışmaz (42P16). Bağımlı DB nesnesi yok
-- (yalnızca uygulama kodu okur) → güvenli DROP + CREATE, tek transaction.
DROP VIEW IF EXISTS public.rooms_with_effective_price;

CREATE VIEW public.rooms_with_effective_price AS
SELECT
  r.*,
  rt.name AS room_type_name,
  rt.max_occupancy,
  rt.amenities AS room_type_amenities,
  COALESCE(r.price_override, rt.base_price) AS effective_price
FROM rooms r
JOIN room_types rt ON rt.id = r.room_type_id;

COMMENT ON VIEW public.rooms_with_effective_price IS
  'Oda bazlı fiyat override view''i (fiyatın tek doğru kaynağı). Guest-site public yüzeyleri is_public=true filtresi eklemeli.';

-- security_invoker BİLEREK yok: anon istemci oda verisini yalnızca bu
-- RLS-bypass eden owner view üzerinden okuyabiliyor.
GRANT SELECT ON public.rooms_with_effective_price TO anon, authenticated, service_role;

COMMIT;
