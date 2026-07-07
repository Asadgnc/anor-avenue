-- 025_dashboard_rpc.sql
-- Dashboard ve navigasyon rozetlerini TEK round-trip'e indiren RPC fonksiyonları.
-- SECURITY INVOKER: RLS politikaları aynen geçerli kalır (fonksiyon çağıranın yetkisiyle çalışır).
-- recurring_bills tablosu canlıda olmayabilir (migration 012) — dinamik SQL ile korunur.

-- ── Navigasyon rozetleri (layout: bekleyen rezervasyon / ödeme / stok talebi) ──

CREATE OR REPLACE FUNCTION public.get_nav_badges()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'pendingReservations', (SELECT count(*) FROM reservations WHERE status = 'pending'),
    'pendingPayments',     (SELECT count(*) FROM payments     WHERE status = 'pending'),
    'pendingRequests',     (SELECT count(*) FROM inventory_requests WHERE status = 'pending')
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_nav_badges() TO authenticated;

-- ── Dashboard verisi (18+ sorgu → 1 çağrı) ──

CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_today date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_yesterday   date := p_today - 1;
  v_tomorrow    date := p_today + 1;
  v_month_start date := date_trunc('month', p_today)::date;
  v_month_end   date := (date_trunc('month', p_today) + interval '1 month - 1 day')::date;
  v_last_day    int  := extract(day FROM (date_trunc('month', p_today) + interval '1 month - 1 day'))::int;
  v_in7         date := p_today + 7;
  v_bills       jsonb := '[]'::jsonb;
  v_result      jsonb;
BEGIN
  -- Yaklaşan kamu faturaları: tablo canlıda yoksa sessizce boş liste
  IF to_regclass('public.recurring_bills') IS NOT NULL THEN
    EXECUTE format($q$
      SELECT COALESCE(jsonb_agg(
               jsonb_build_object('id', b.id, 'name', b.name, 'dueDateStr', to_char(b.due_date, 'YYYY-MM-DD'))
               ORDER BY b.due_date), '[]'::jsonb)
      FROM (
        SELECT rb.id, rb.name,
               make_date(extract(year FROM $1::date)::int, extract(month FROM $1::date)::int,
                         least(rb.due_day, %s)) AS due_date
        FROM recurring_bills rb
        WHERE rb.is_active
      ) b
      WHERE b.due_date BETWEEN $1 AND $2
        AND NOT EXISTS (
          SELECT 1 FROM bill_payments bp
          WHERE bp.bill_id = b.id AND bp.status = 'paid'
            AND bp.due_date BETWEEN $3 AND $4
        )
    $q$, v_last_day)
    INTO v_bills
    USING p_today, v_in7, v_month_start, v_month_end;
  END IF;

  SELECT jsonb_build_object(
    'userName', (SELECT full_name FROM profiles WHERE id = auth.uid()),

    'stats', jsonb_build_object(
      'newToday',          (SELECT count(*) FROM reservations WHERE created_at >= p_today AND created_at < v_tomorrow),
      'newYesterday',      (SELECT count(*) FROM reservations WHERE created_at >= v_yesterday AND created_at < p_today),
      'scheduledTomorrow', (SELECT count(*) FROM reservations WHERE check_in = v_tomorrow AND status NOT IN ('cancelled','no_show')),
      'scheduledToday',    (SELECT count(*) FROM reservations WHERE check_in = p_today   AND status NOT IN ('cancelled','no_show')),
      'checkinToday',      (SELECT count(*) FROM reservations WHERE check_in = p_today   AND status = 'checked_in'),
      'checkinYesterday',  (SELECT count(*) FROM reservations WHERE check_in = v_yesterday AND status IN ('checked_in','checked_out')),
      'checkoutToday',     (SELECT count(*) FROM reservations WHERE check_out = p_today   AND status = 'checked_out'),
      'checkoutYesterday', (SELECT count(*) FROM reservations WHERE check_out = v_yesterday AND status = 'checked_out')
    ),

    'rooms', (
      SELECT COALESCE(jsonb_agg(
               jsonb_build_object('id', r.id, 'room_number', r.room_number, 'floor', r.floor, 'status', r.status)
               ORDER BY r.floor, r.room_number), '[]'::jsonb)
      FROM rooms r WHERE r.is_active
    ),

    'cleaning', jsonb_build_object(
      'dirty', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('room_number', r.room_number, 'floor', r.floor)
                                  ORDER BY r.floor, r.room_number), '[]'::jsonb)
        FROM rooms r WHERE r.is_active AND r.cleaning_status = 'dirty'
      ),
      'clean', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('room_number', r.room_number, 'floor', r.floor)
                                  ORDER BY r.floor, r.room_number), '[]'::jsonb)
        FROM rooms r WHERE r.is_active AND r.cleaning_status = 'clean'
      )
    ),

    'occupancy', (
      SELECT jsonb_build_object(
        'totalRooms',    (SELECT count(*) FROM rooms WHERE is_active),
        'occupiedRooms', count(*),
        'guestCount',    COALESCE(sum(res.adults + res.children), 0)
      )
      FROM reservations res
      WHERE res.status = 'checked_in' AND res.check_in <= p_today AND res.check_out > p_today
    ),

    'recentBookings', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
      FROM (
        SELECT res.created_at,
               jsonb_build_object(
                 'id', res.id,
                 'reservation_code', res.reservation_code,
                 'check_in', to_char(res.check_in, 'YYYY-MM-DD'),
                 'adults', res.adults,
                 'guest_first', g.first_name,
                 'guest_last', g.last_name,
                 'room_number', r.room_number
               ) AS row_data
        FROM reservations res
        LEFT JOIN guests g ON g.id = res.guest_id
        LEFT JOIN rooms  r ON r.id = res.room_id
        ORDER BY res.created_at DESC
        LIMIT 5
      ) sub
    ),

    'pendingReservations', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
      FROM (
        SELECT res.created_at,
               jsonb_build_object(
                 'id', res.id,
                 'reservation_code', res.reservation_code,
                 'check_in', to_char(res.check_in, 'YYYY-MM-DD'),
                 'guest_first', g.first_name,
                 'guest_last', g.last_name
               ) AS row_data
        FROM reservations res
        LEFT JOIN guests g ON g.id = res.guest_id
        WHERE res.status = 'pending'
        ORDER BY res.created_at DESC
        LIMIT 10
      ) sub
    ),

    'pendingRegistrations', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY actual_check_in DESC), '[]'::jsonb)
      FROM (
        SELECT res.actual_check_in,
               jsonb_build_object(
                 'id', res.id,
                 'reservation_code', res.reservation_code,
                 'guest_first', g.first_name,
                 'guest_last', g.last_name,
                 'room_number', r.room_number
               ) AS row_data
        FROM reservations res
        LEFT JOIN guests g ON g.id = res.guest_id
        LEFT JOIN rooms  r ON r.id = res.room_id
        WHERE res.registration_pending = true AND res.status = 'checked_in'
        ORDER BY res.actual_check_in DESC
        LIMIT 12
      ) sub
    ),

    'upcomingBills', v_bills,

    'finance', jsonb_build_object(
      'todayRevenue', (
        SELECT COALESCE(sum(amount), 0) FROM payments
        WHERE status = 'completed' AND currency = 'UZS'
          AND paid_at >= p_today AND paid_at < v_tomorrow
      ),
      'monthRevenue', (
        SELECT COALESCE(sum(amount), 0) FROM payments
        WHERE status = 'completed' AND currency = 'UZS' AND paid_at >= v_month_start
      ),
      'pendingPayments', (SELECT count(*) FROM payments WHERE status = 'pending')
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_data(date) TO authenticated;
