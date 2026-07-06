-- 023_inventory_requests.sql
-- Stok ihtiyaç bildirimi: resepsiyonist/temizlikçi "X bitiyor, Y adet lazım" talebi
-- gönderir → admin panelde bildirim olarak görür ve "alındı" olarak kapatır.
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.inventory_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  quantity     NUMERIC,
  needed_by    DATE,
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  requested_by UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read requests and create them.
DROP POLICY IF EXISTS inventory_requests_select ON public.inventory_requests;
CREATE POLICY inventory_requests_select ON public.inventory_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS inventory_requests_insert ON public.inventory_requests;
CREATE POLICY inventory_requests_insert ON public.inventory_requests
  FOR INSERT TO authenticated WITH CHECK (true);

-- Resolving is done server-side with the service role; no broad update policy needed.
