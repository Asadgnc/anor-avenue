-- 032: Oda taşımasında oransal (proration) fatura düzeltmesi
-- Misafir konaklama ortasında oda değiştirdiğinde geçmiş geceler eski fiyatta,
-- kalan geceler yeni fiyatta tutulur. Bu farkı taşımak için price_adjustment
-- kolonu eklenir. Kanonik fatura formülü artık:
--   total_amount = room_rate * nights + price_adjustment
-- Böylece room_rate her zaman ileriye dönük güncel gecelik fiyatı gösterir,
-- total_amount ise oransal doğru tutarı verir. extend/edit işlemleri de bu
-- formülü kullanır (aksi halde taşıma düzeltmesi silinirdi).

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS price_adjustment numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.reservations.price_adjustment IS
  'Oda tasimasinda gecmis gecelerin eski fiyatta tutulmasindan dogan fatura duzeltmesi (birikimli). Kanonik fatura: room_rate*nights + price_adjustment.';
