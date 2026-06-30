-- ============================================================
-- Migration 005 — Oda bazlı özellikler ve fiyat override
-- Anor Avenue Hotel
-- Tarih: 2026-06-30
-- Gerekçe: 12 gerçek odanın her birinin pencere sayısı, manzara
-- kalitesi, jakuzi/küvet varlığı ve fiyat farkı oda_types
-- seviyesinde tutulamıyordu. Bu migration bu bilgiyi rooms
-- tablosuna taşır.
-- ============================================================

-- Yeni enum: manzara kalitesi (sıralama/filtreleme için)
CREATE TYPE view_quality AS ENUM ('standard', 'good', 'premium');

-- rooms tablosuna yeni kolonlar
ALTER TABLE rooms
  ADD COLUMN price_override DECIMAL(10,2),
  ADD COLUMN view_quality view_quality NOT NULL DEFAULT 'standard',
  ADD COLUMN has_jacuzzi BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_bathtub BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN window_count INT,
  ADD COLUMN is_isolated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN connecting_room_id UUID REFERENCES rooms(id);

COMMENT ON COLUMN rooms.price_override IS 'Doluysa bu fiyat geçerli (gece/UZS). Boşsa room_types.base_price kullanılır.';
COMMENT ON COLUMN rooms.view_quality IS 'Manzara kalitesi: standard / good / premium — sıralama ve filtreleme için.';
COMMENT ON COLUMN rooms.has_jacuzzi IS 'Jakuzi var mı (örn. oda 202).';
COMMENT ON COLUMN rooms.has_bathtub IS 'Küvet var mı (örn. oda 304).';
COMMENT ON COLUMN rooms.window_count IS 'Pencere sayısı — özellikle bodrum katta farklılık gösteriyor (101: 3, 102: 1, 103: 2).';
COMMENT ON COLUMN rooms.is_isolated IS 'Bina köşesinde, izole girişli oda mı (örn. 202).';
COMMENT ON COLUMN rooms.connecting_room_id IS 'Bağlantılı oda (örn. 303 <-> 304). Varsayılan kapalı; personel istek üzerine açar. Sadece bilgi amaçlı, otomatik kapı kontrolü yok.';

-- Efektif fiyatı hesaplayan yardımcı view (frontend ve admin panel bunu kullanabilir)
CREATE OR REPLACE VIEW rooms_with_effective_price AS
SELECT
  r.*,
  rt.name AS room_type_name,
  rt.max_occupancy,
  rt.amenities AS room_type_amenities,
  COALESCE(r.price_override, rt.base_price) AS effective_price
FROM rooms r
JOIN room_types rt ON rt.id = r.room_type_id;

COMMENT ON VIEW rooms_with_effective_price IS 'Oda bazlı fiyat override mantığını uygulayan view. Guest-site ve admin panel buradan okumalı, ham rooms tablosundan fiyat hesaplamamalı.';
