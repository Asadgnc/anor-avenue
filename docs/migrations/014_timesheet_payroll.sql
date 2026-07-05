-- Migration 014: Timesheet (Puantaj) + Payroll (Bordro)
-- Apply in Supabase Dashboard → SQL Editor

-- Daily attendance / shift log
CREATE TABLE IF NOT EXISTS staff_shifts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_date   DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'present'
                 CHECK (status IN ('present','absent','sick','leave','holiday')),
  start_time   TIME,
  end_time     TIME,
  break_min    INTEGER NOT NULL DEFAULT 0,
  notes        TEXT,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, shift_date)
);

-- Monthly payroll periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year         INTEGER NOT NULL,
  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','finalized','paid')),
  notes        TEXT,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (year, month)
);

-- Per-staff payroll line items
CREATE TABLE IF NOT EXISTS payroll_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id      UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  profile_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  base_salary    NUMERIC(14,2) NOT NULL DEFAULT 0,
  bonus          NUMERIC(14,2) NOT NULL DEFAULT 0,
  deduction      NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount     NUMERIC(14,2) GENERATED ALWAYS AS (base_salary + bonus - deduction) STORED,
  currency       TEXT NOT NULL DEFAULT 'UZS',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_id, profile_id)
);

-- RLS
ALTER TABLE staff_shifts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items   ENABLE ROW LEVEL SECURITY;

-- staff_shifts: staff sees own shifts; admin/manager/receptionist sees all; admin/manager writes
CREATE POLICY "shifts_select_own" ON staff_shifts FOR SELECT
  USING (
    profile_id = auth.uid()
    OR get_user_role() IN ('admin','manager','receptionist','accountant')
  );

CREATE POLICY "shifts_insert" ON staff_shifts FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','manager'));

CREATE POLICY "shifts_update" ON staff_shifts FOR UPDATE
  USING (get_user_role() IN ('admin','manager'));

CREATE POLICY "shifts_delete" ON staff_shifts FOR DELETE
  USING (get_user_role() IN ('admin','manager'));

-- payroll_periods: admin/manager/accountant read; admin/manager write
CREATE POLICY "payroll_periods_select" ON payroll_periods FOR SELECT
  USING (get_user_role() IN ('admin','manager','accountant'));

CREATE POLICY "payroll_periods_insert" ON payroll_periods FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','manager'));

CREATE POLICY "payroll_periods_update" ON payroll_periods FOR UPDATE
  USING (get_user_role() IN ('admin','manager'));

-- payroll_items: same as periods
CREATE POLICY "payroll_items_select" ON payroll_items FOR SELECT
  USING (get_user_role() IN ('admin','manager','accountant'));

CREATE POLICY "payroll_items_insert" ON payroll_items FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','manager'));

CREATE POLICY "payroll_items_update" ON payroll_items FOR UPDATE
  USING (get_user_role() IN ('admin','manager'));

CREATE POLICY "payroll_items_delete" ON payroll_items FOR DELETE
  USING (get_user_role() IN ('admin','manager'));
