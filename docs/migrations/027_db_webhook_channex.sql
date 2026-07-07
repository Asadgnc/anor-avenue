-- 027_db_webhook_channex.sql
-- Catch-all Channex senkronu: reservations/rooms tablosunda HER değişiklik
-- (hangi uygulamadan gelirse gelsin, elle SQL dahil) admin panelin
-- /api/webhooks/supabase endpoint'ini çağırır → müsaitlik ~1-2 sn'de Channex'e gider.
--
-- ⚠️ Bu dosyadaki <INTERNAL_SYNC_SECRET> yer tutucudur — canlıya uygulanırken
-- admin-panel/.env.local'daki gerçek INTERNAL_SYNC_SECRET ile değiştirilmiştir.
-- (Gerçek secret repo'ya yazılmaz.)

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_admin_panel_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://anor-avenue-admin-panel.vercel.app/api/webhooks/supabase',
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', '<INTERNAL_SYNC_SECRET>'
    ),
    timeout_milliseconds := 5000
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_panel_reservations ON public.reservations;
CREATE TRIGGER trg_notify_admin_panel_reservations
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_panel_change();

-- rooms: yalnızca müsaitliği etkileyen değişiklikler (status / aktiflik / varyant eşleşmesi)
DROP TRIGGER IF EXISTS trg_notify_admin_panel_rooms ON public.rooms;
CREATE TRIGGER trg_notify_admin_panel_rooms
  AFTER INSERT OR DELETE OR UPDATE OF status, is_active, channex_variant_id ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_panel_change();
