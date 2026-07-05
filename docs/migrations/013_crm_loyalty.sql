-- Migration 013: CRM + Guest Loyalty
-- Apply in Supabase Dashboard → SQL Editor

-- Guest notes (staff can add internal notes to a guest profile)
CREATE TABLE IF NOT EXISTS guest_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id    UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guest tags  (e.g. 'vip', 'regular', 'problematic', 'allergic', custom)
CREATE TABLE IF NOT EXISTS guest_tags (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id  UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,
  UNIQUE (guest_id, tag)
);

-- Loyalty points ledger
CREATE TABLE IF NOT EXISTS loyalty_points (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id     UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  delta        INTEGER NOT NULL,  -- positive = earn, negative = redeem
  reason       TEXT NOT NULL,     -- e.g. 'stay', 'manual_adjustment', 'redeem'
  reference_id UUID,              -- reservation id or NULL
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Computed balance view (for display)
CREATE OR REPLACE VIEW guest_loyalty_balance AS
SELECT guest_id, SUM(delta) AS balance
FROM loyalty_points
GROUP BY guest_id;

-- RLS
ALTER TABLE guest_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_tags  ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

-- guest_notes: all staff can read; admin/manager/receptionist can write
CREATE POLICY "guest_notes_select" ON guest_notes FOR SELECT
  USING (get_user_role() IN ('admin','manager','receptionist','housekeeper','accountant'));

CREATE POLICY "guest_notes_insert" ON guest_notes FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','manager','receptionist'));

CREATE POLICY "guest_notes_delete" ON guest_notes FOR DELETE
  USING (get_user_role() IN ('admin','manager'));

-- guest_tags: same rules as notes
CREATE POLICY "guest_tags_select" ON guest_tags FOR SELECT
  USING (get_user_role() IN ('admin','manager','receptionist','housekeeper','accountant'));

CREATE POLICY "guest_tags_insert" ON guest_tags FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','manager','receptionist'));

CREATE POLICY "guest_tags_delete" ON guest_tags FOR DELETE
  USING (get_user_role() IN ('admin','manager','receptionist'));

-- loyalty_points: admin/manager/accountant full; receptionist read+insert
CREATE POLICY "loyalty_points_select" ON loyalty_points FOR SELECT
  USING (get_user_role() IN ('admin','manager','receptionist','accountant'));

CREATE POLICY "loyalty_points_insert" ON loyalty_points FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','manager','receptionist'));

CREATE POLICY "loyalty_points_delete" ON loyalty_points FOR DELETE
  USING (get_user_role() IN ('admin','manager'));
