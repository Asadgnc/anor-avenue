-- Migration 018: Oda tipi katmanlarini tek modele hizala + occupancy fiyat turetme
-- Tarih: 2026-07-05
-- Apply on Supabase Dashboard -> SQL Editor
--
-- Karar (kullanici onayli): 3 katman Standard < Deluxe < Luxury.
--   Baz fiyat = 2 kisilik. Ekstra kisi = +150.000. Guest-site + panel bu bazi gosterir;
--   Channex occupancy varyantlari base + (occ-2)*150000 ile turetilir.
--   Baz fiyatlar: Standard 300.000, Deluxe 500.000, Luxury 800.000.
-- Idempotent.
-- ---------------------------------------------------------------------------

-- 1) room_types baz fiyatlari (2 kisilik) + aciklama duzelt (mansard/eski ifadeler temizlendi)
UPDATE public.room_types SET base_price = 300000,
  description = 'Standart oda — uygun fiyatli, konforlu'
  WHERE name = 'Standard';
UPDATE public.room_types SET base_price = 500000,
  description = 'Delyuks oda — genis, yuksek konfor'
  WHERE name = 'Deluxe';
UPDATE public.room_types SET base_price = 800000,
  description = 'Lyuks oda — en ust segment, en genis'
  WHERE name = 'Luxury';

-- 2) Channex varyant OTA fiyatlari = tier base + (occupancy-2)*150000
--    (label prefix ile room_types'a eslesir: 'Standard Double' -> 'Standard')
UPDATE public.channex_variants v
  SET ota_price = rt.base_price + (v.occupancy - 2) * 150000
  FROM public.room_types rt
  WHERE v.label LIKE rt.name || '%';
