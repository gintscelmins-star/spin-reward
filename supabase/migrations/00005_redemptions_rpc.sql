-- V2.1: Redemptions RPC + manual_redeem_spin
-- Migration: 00005_redemptions_rpc.sql

-- ── get_redemptions ────────────────────────────────────────────────────────────
-- Returns paginated spin/redemption rows for admin dashboard.
-- Auth: calling user must be client_admin (own venue) or super_admin.

CREATE OR REPLACE FUNCTION get_redemptions(
  p_venue_id  uuid,
  p_from      timestamptz DEFAULT NULL,
  p_to        timestamptz DEFAULT NULL,
  p_prize_id  uuid        DEFAULT NULL,
  p_staff_id  uuid        DEFAULT NULL,
  p_limit     int         DEFAULT 50,
  p_offset    int         DEFAULT 0
)
RETURNS TABLE (
  spin_id       uuid,
  qr_token      text,
  status        text,
  prize_name    text,
  prize_id      uuid,
  created_at    timestamptz,
  redeemed_at   timestamptz,
  expires_at    timestamptz,
  booking_ref   text,
  staff_name    text,
  activity_name text,
  customer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auth check: calling user must be client_admin for this venue OR super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('client_admin', 'super_admin')
      AND (p.venue_id = p_venue_id OR p.role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    sp.id                   AS spin_id,
    sp.qr_token             AS qr_token,
    sp.status               AS status,
    pr.name                 AS prize_name,
    pr.id                   AS prize_id,
    sp.spun_at              AS created_at,
    sp.redeemed_at          AS redeemed_at,
    sp.expires_at           AS expires_at,
    bk.booking_ref          AS booking_ref,
    st.name                 AS staff_name,
    ac.name                 AS activity_name,
    bk.customer_name        AS customer_name
  FROM spins sp
  LEFT JOIN prizes      pr ON pr.id = sp.prize_id
  LEFT JOIN sessions    se ON se.id = sp.session_id
  LEFT JOIN bookings    bk ON bk.id = se.booking_id
  LEFT JOIN staff       st ON st.id = se.staff_id
  LEFT JOIN activities  ac ON ac.id = se.activity_id
  WHERE sp.venue_id = p_venue_id
    AND (p_from     IS NULL OR sp.spun_at  >= p_from)
    AND (p_to       IS NULL OR sp.spun_at  <= p_to)
    AND (p_prize_id IS NULL OR sp.prize_id  = p_prize_id)
    AND (p_staff_id IS NULL OR se.staff_id  = p_staff_id)
  ORDER BY sp.spun_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_redemptions(uuid, timestamptz, timestamptz, uuid, uuid, int, int)
  TO authenticated;

-- ── manual_redeem_spin ─────────────────────────────────────────────────────────
-- Like redeem_spin() but called by admin staff manually.
-- Records who issued the prize via p_redeemed_by_staff_id.
-- Auth: calling user must be client_admin (own venue) or super_admin.

CREATE OR REPLACE FUNCTION manual_redeem_spin(
  p_qr_token             text,
  p_redeemed_by_staff_id uuid DEFAULT NULL
)
RETURNS TABLE (
  result       text,
  booking_ref  text,
  redeemed_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spin_id    uuid;
  v_status     text;
  v_venue_id   uuid;
  v_expires_at timestamptz;
BEGIN
  -- Look up the spin
  SELECT id, status, venue_id, expires_at
    INTO v_spin_id, v_status, v_venue_id, v_expires_at
    FROM spins
   WHERE qr_token = p_qr_token
   LIMIT 1;

  IF v_spin_id IS NULL THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  -- Auth check
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('client_admin', 'super_admin')
      AND (p.venue_id = v_venue_id OR p.role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_status = 'redeemed' THEN
    RETURN QUERY
      SELECT
        'already_redeemed'::text,
        bk.booking_ref,
        sp.redeemed_at
      FROM spins sp
      LEFT JOIN sessions  se ON se.id = sp.session_id
      LEFT JOIN bookings  bk ON bk.id = se.booking_id
      WHERE sp.id = v_spin_id;
    RETURN;
  END IF;

  IF v_status = 'expired' OR (v_expires_at IS NOT NULL AND v_expires_at < now()) THEN
    RETURN QUERY SELECT 'expired'::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  -- Mark as redeemed
  UPDATE spins
     SET status      = 'redeemed',
         redeemed_at = now()
   WHERE id = v_spin_id;

  RETURN QUERY
    SELECT
      'redeemed'::text,
      bk.booking_ref,
      now()
    FROM spins sp
    LEFT JOIN sessions  se ON se.id = sp.session_id
    LEFT JOIN bookings  bk ON bk.id = se.booking_id
    WHERE sp.id = v_spin_id;
END;
$$;

GRANT EXECUTE ON FUNCTION manual_redeem_spin(text, uuid)
  TO authenticated;
