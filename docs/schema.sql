-- ============================================================
-- ANOR AVENUE HOTEL — Supabase Veritabanı Şeması
-- Supabase SQL Editor'e yapıştır ve çalıştır
-- ============================================================

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TANIMLARI
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'receptionist', 'housekeeper', 'accountant');
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'cleaning', 'maintenance', 'blocked');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
CREATE TYPE payment_method AS ENUM ('payme', 'click', 'uzum', 'cash', 'transfer');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE channel AS ENUM ('direct', 'booking_com', 'agoda', 'walk_in', 'phone');
CREATE TYPE cleaning_status AS ENUM ('clean', 'dirty', 'in_progress', 'inspected');

-- ============================================================
-- KULLANICILAR VE ROLLER
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'receptionist',
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ODA TİPLERİ VE ODALAR
-- ============================================================

CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,           -- "Standart", "Lüks", "Mansard Lüks"
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  max_occupancy INT NOT NULL DEFAULT 2,
  amenities JSONB DEFAULT '[]', -- ["wifi", "minibar", "balcony"]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT NOT NULL UNIQUE,  -- "101", "201", "M01"
  floor INT NOT NULL,                -- -1, 2, 3, 4
  room_type_id UUID NOT NULL REFERENCES room_types(id),
  status room_status DEFAULT 'available',
  cleaning_status cleaning_status DEFAULT 'clean',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MİSAFİRLER
-- ============================================================

CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  nationality TEXT,
  passport_number TEXT,    -- registratsiya (yabancı misafir zorunluluğu)
  passport_series TEXT,    -- Özbekistan'a özel
  date_of_birth DATE,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registratsiya kaydı (yabancı misafir yasal zorunluluğu — Özbekistan)
CREATE TABLE guest_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL REFERENCES guests(id),
  reservation_id UUID,      -- sonradan FK eklenecek
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registered_by UUID REFERENCES profiles(id),
  document_url TEXT,         -- yüklenen belge
  status TEXT DEFAULT 'pending'  -- pending, submitted, confirmed
);

-- ============================================================
-- REZERVASYONLAR
-- ============================================================

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_code TEXT UNIQUE NOT NULL DEFAULT ('RES-' || UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 8))),
  guest_id UUID NOT NULL REFERENCES guests(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  channel channel DEFAULT 'direct',
  status reservation_status DEFAULT 'pending',

  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,

  adults INT NOT NULL DEFAULT 1,
  children INT DEFAULT 0,
  nights INT GENERATED ALWAYS AS (check_out - check_in) STORED,

  room_rate DECIMAL(10,2) NOT NULL,   -- o anki fiyat, snapshot
  total_amount DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'UZS',

  special_requests TEXT,
  notes TEXT,                          -- personel notu
  ota_reference TEXT,                  -- Booking.com'dan gelen ID

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: çakışma önleme (overbooking engeli)
  CONSTRAINT valid_dates CHECK (check_out > check_in)
);

-- Çakışma önleme index (PostgreSQL bunu unique constraint olarak enforce eder)
-- Not: gerçek kilit Server Action içinde FOR UPDATE ile yapılır
CREATE INDEX idx_reservations_room_dates ON reservations(room_id, check_in, check_out)
  WHERE status NOT IN ('cancelled');

-- registratsiya FK
ALTER TABLE guest_registrations
  ADD CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id);

-- ============================================================
-- ÖDEMELER
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'UZS',
  method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',

  -- Ödeme sağlayıcı bilgileri
  provider_transaction_id TEXT,  -- Payme/Click'ten gelen ID
  provider_reference TEXT,
  provider_payload JSONB,         -- ham webhook verisi — log için sakla

  paid_at TIMESTAMPTZ,
  received_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- NOT: payments tablosu asla DELETE yapılmaz. Sadece status güncellenir.
);

-- ============================================================
-- FİYATLANDIRMA
-- ============================================================

CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type_id UUID REFERENCES room_types(id),  -- NULL = tüm tipler
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  rule_name TEXT,   -- "Bayram fiyatı", "Düşük sezon"
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEMİZLİK GÖREVLERİ
-- ============================================================

CREATE TABLE housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  assigned_to UUID REFERENCES profiles(id),
  task_type TEXT NOT NULL,   -- "checkout_clean", "daily", "inspection"
  status TEXT DEFAULT 'pending',  -- pending, in_progress, done
  priority INT DEFAULT 1,
  notes TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GELİR-GİDER (FİNANS)
-- ============================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,   -- "Temizlik", "Bakım", "Personel", "Genel"
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'UZS',
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,          -- yüklenen makbuz
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÜSAİTLİK TAKİBİ (Realtime için)
-- ============================================================

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  date DATE NOT NULL,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,           -- "Bakım", "Özel kullanım"
  reservation_id UUID REFERENCES reservations(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, date)
);

-- Bu tablo Realtime'da dinlenecek — diğer tablolarda Realtime kapatık tut

-- ============================================================
-- DUYURULAR / NOTLAR
-- ============================================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  target_roles user_role[],    -- hangi roller görecek
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT OTOMATİK GÜNCELLEME
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_guests_updated_at BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Yardımcı fonksiyon: kullanıcının rolünü çek
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Kendi profilini görebilir" ON profiles
  FOR SELECT USING (auth.uid() = id OR get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Sadece admin düzenleyebilir" ON profiles
  FOR UPDATE USING (get_user_role() = 'admin');

-- ROOMS — herkes görebilir, sadece admin/manager düzenler
CREATE POLICY "Odaları herkes görebilir" ON rooms
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Odaları admin/manager düzenler" ON rooms
  FOR ALL USING (get_user_role() IN ('admin', 'manager'));

-- RESERVATIONS
CREATE POLICY "Rezervasyonları görebilir" ON reservations
  FOR SELECT USING (get_user_role() IN ('admin', 'manager', 'receptionist', 'accountant'));

CREATE POLICY "Rezervasyon oluşturur" ON reservations
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'manager', 'receptionist'));

CREATE POLICY "Rezervasyon günceller" ON reservations
  FOR UPDATE USING (get_user_role() IN ('admin', 'manager', 'receptionist'));

-- PAYMENTS
CREATE POLICY "Ödemeleri görebilir" ON payments
  FOR SELECT USING (get_user_role() IN ('admin', 'manager', 'accountant', 'receptionist'));

CREATE POLICY "Ödeme ekler" ON payments
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'manager', 'receptionist'));

-- HOUSEKEEPING
CREATE POLICY "Temizlik görevlerini görebilir" ON housekeeping_tasks
  FOR SELECT USING (
    get_user_role() IN ('admin', 'manager') OR
    (get_user_role() = 'housekeeper' AND assigned_to = auth.uid())
  );

CREATE POLICY "Housekeeper kendi görevini günceller" ON housekeeping_tasks
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'manager') OR
    (get_user_role() = 'housekeeper' AND assigned_to = auth.uid())
  );

-- EXPENSES
CREATE POLICY "Giderleri görebilir" ON expenses
  FOR SELECT USING (get_user_role() IN ('admin', 'manager', 'accountant'));

CREATE POLICY "Gider ekler" ON expenses
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'manager', 'accountant'));

-- AVAILABILITY (Realtime — herkese açık okuma)
CREATE POLICY "Müsaitliği herkes görebilir" ON availability
  FOR SELECT USING (true);

CREATE POLICY "Admin/manager blok koyabilir" ON availability
  FOR ALL USING (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- ÖRNEK VERİ (Geliştirme için)
-- ============================================================

INSERT INTO room_types (name, description, base_price, max_occupancy, amenities) VALUES
  ('Standart', 'Bodrum katta konforlu oda', 350000, 2, '["wifi", "tv", "ac"]'),
  ('Lüks', '2-3. katta geniş oda, şehir manzarası', 600000, 2, '["wifi", "tv", "ac", "minibar", "bathrobe"]'),
  ('Mansard Lüks', '4. katta eğimli tavan, özel atmosfer', 850000, 2, '["wifi", "tv", "ac", "minibar", "bathrobe", "panoramic_view"]');

-- Not: Gerçek oda eklemeyi Supabase Dashboard'dan yap
-- ya da Claude Code'a sor

-- ============================================================
-- REALTİME AÇMA (sadece availability tablosu)
-- ============================================================
-- Supabase Dashboard > Database > Replication > availability tablosunu ekle
