-- Migration 012: Recurring Bills + Bill Payments
-- Faz 3 — Kamu Faturaları + Yaklaşan Ödemeler
-- Apply on Supabase Dashboard → SQL Editor

-- 1. recurring_bills — fatura şablonları
CREATE TABLE IF NOT EXISTS recurring_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'utility'
                    CHECK (category IN ('utility', 'rent', 'salary', 'subscription', 'other')),
  estimated_amount NUMERIC(12, 2),
  currency        TEXT NOT NULL DEFAULT 'UZS',
  due_day         INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2. bill_payments — aylık ödeme kayıtları
CREATE TABLE IF NOT EXISTS bill_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID NOT NULL REFERENCES recurring_bills(id) ON DELETE CASCADE,
  due_date    DATE NOT NULL,
  paid_date   DATE,
  amount      NUMERIC(12, 2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'UZS',
  status      TEXT NOT NULL DEFAULT 'paid'
                CHECK (status IN ('paid', 'overdue')),
  notes       TEXT,
  paid_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bill_id, due_date)
);

-- 3. RLS
ALTER TABLE recurring_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_bills_select" ON recurring_bills
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "recurring_bills_insert" ON recurring_bills
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager', 'accountant'));

CREATE POLICY "recurring_bills_update" ON recurring_bills
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'manager', 'accountant'));

CREATE POLICY "recurring_bills_delete" ON recurring_bills
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "bill_payments_select" ON bill_payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bill_payments_insert" ON bill_payments
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager', 'accountant', 'receptionist'));

CREATE POLICY "bill_payments_update" ON bill_payments
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'manager', 'accountant'));

CREATE POLICY "bill_payments_delete" ON bill_payments
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'manager'));

-- 4. Accounting ledger view güncelleme (bill_payments dahil)
DROP VIEW IF EXISTS accounting_ledger;
CREATE VIEW accounting_ledger AS
  SELECT
    id,
    'income'::TEXT AS entry_type,
    COALESCE(paid_at, created_at) AS entry_date,
    amount,
    currency,
    revenue_category AS category,
    method::TEXT AS sub_info,
    reservation_id,
    notes AS description
  FROM payments
  WHERE status = 'completed'
  UNION ALL
  SELECT
    id,
    'expense'::TEXT AS entry_type,
    created_at AS entry_date,
    total_amount AS amount,
    currency,
    category,
    area AS sub_info,
    NULL::UUID AS reservation_id,
    product_name AS description
  FROM inventory_purchases
  UNION ALL
  SELECT
    id,
    'expense'::TEXT AS entry_type,
    COALESCE(paid_date::TIMESTAMPTZ, created_at) AS entry_date,
    amount,
    currency,
    'bill'::TEXT AS category,
    status AS sub_info,
    NULL::UUID AS reservation_id,
    NULL AS description
  FROM bill_payments
  WHERE status = 'paid';

GRANT SELECT ON accounting_ledger TO authenticated;
GRANT SELECT ON recurring_bills TO authenticated;
GRANT SELECT ON bill_payments TO authenticated;
