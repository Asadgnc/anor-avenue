-- Migration 011: Muhasebe defteri + Gelir kategorisi
-- Faz 2 — Accounting Ledger + Revenue Category
--
-- APPLY ON SUPABASE DASHBOARD → SQL Editor before deploying code changes.
-- This is idempotent — safe to run multiple times.

-- 1. payments tablosuna revenue_category kolonu ekle
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS revenue_category TEXT NOT NULL DEFAULT 'accommodation';

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_revenue_category_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_revenue_category_check
  CHECK (revenue_category IN ('accommodation', 'breakfast', 'extra_service', 'deposit', 'other'));

-- 2. Birleşik muhasebe defteri view'i (income + expense entries)
DROP VIEW IF EXISTS accounting_ledger;
CREATE VIEW accounting_ledger AS
  SELECT
    id,
    'income'::TEXT                             AS entry_type,
    COALESCE(paid_at, created_at)              AS entry_date,
    amount,
    currency,
    revenue_category                           AS category,
    method::TEXT                               AS sub_info,
    reservation_id,
    notes                                      AS description
  FROM payments
  WHERE status = 'completed'
  UNION ALL
  SELECT
    id,
    'expense'::TEXT                            AS entry_type,
    created_at                                 AS entry_date,
    total_amount                               AS amount,
    currency,
    category,
    area                                       AS sub_info,
    NULL::UUID                                 AS reservation_id,
    product_name                               AS description
  FROM inventory_purchases;

-- Grant read access for authenticated users (view inherits RLS from base tables)
GRANT SELECT ON accounting_ledger TO authenticated;
