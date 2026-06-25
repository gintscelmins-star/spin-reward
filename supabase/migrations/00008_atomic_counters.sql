-- 00008_atomic_counters.sql
-- Atomic counter helpers for Widget V2 to prevent lost updates under concurrent load.
-- All three functions issue a single UPDATE without a preceding SELECT, making them safe
-- under parallel requests (no read-modify-write race).

CREATE OR REPLACE FUNCTION increment_wheel_view(p_wheel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE wheels
  SET total_views = COALESCE(total_views, 0) + 1,
      updated_at  = now()
  WHERE id = p_wheel_id;
$$;

CREATE OR REPLACE FUNCTION increment_wheel_counters(p_wheel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE wheels
  SET total_leads = COALESCE(total_leads, 0) + 1,
      total_spins = COALESCE(total_spins, 0) + 1,
      updated_at  = now()
  WHERE id = p_wheel_id;
$$;

CREATE OR REPLACE FUNCTION decrement_segment_stock(p_segment_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE wheel_segments
  SET remaining = GREATEST(0, remaining - 1)
  WHERE id = p_segment_id
    AND remaining IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION increment_wheel_view(uuid)      TO service_role;
GRANT EXECUTE ON FUNCTION increment_wheel_counters(uuid)  TO service_role;
GRANT EXECUTE ON FUNCTION decrement_segment_stock(uuid)   TO service_role;
