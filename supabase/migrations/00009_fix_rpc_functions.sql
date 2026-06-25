-- 00009_fix_rpc_functions.sql
-- Fix legacy RPC function inconsistencies discovered during test run:
--
-- 1. is_superadmin() checked role='superadmin' (no underscore) — codebase uses 'super_admin'
-- 2. manual_redeem_spin had RETURNS jsonb from a pre-migration version;
--    migration 00005 could not CREATE OR REPLACE it (return type mismatch), so old version
--    remained in DB. Fix: DROP first, then recreate with correct TABLE return.
-- 3. get_redemptions had two overloads (old 4-param no-venue-id version + new 7-param version);
--    PostgREST overload resolution caused uuid=text errors. Fix: drop the old overload.

-- ── 1. Fix is_superadmin() ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
$$;

-- ── 2. Fix manual_redeem_spin ─────────────────────────────────────────────────
-- Drop old jsonb-returning version (can't CREATE OR REPLACE with different return type)
DROP FUNCTION IF EXISTS public.manual_redeem_spin(text, uuid);

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

  -- Auth check: caller must be client_admin for this venue OR super_admin
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

GRANT EXECUTE ON FUNCTION manual_redeem_spin(text, uuid) TO authenticated;

-- ── 3. Drop old get_redemptions overload (no p_venue_id, causes PostgREST confusion) ──
DROP FUNCTION IF EXISTS public.get_redemptions(integer, integer, timestamptz, timestamptz);

GRANT EXECUTE ON FUNCTION get_redemptions(uuid, timestamptz, timestamptz, uuid, uuid, integer, integer)
  TO authenticated;
