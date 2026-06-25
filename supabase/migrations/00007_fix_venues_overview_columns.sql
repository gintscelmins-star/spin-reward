-- Fix get_venues_overview() RPC to match UI column expectations.
-- Old RPC returned: venue_id, module_google, module_tips, module_whatsapp, reviews, spins (no billing_status, no active)
-- UI expects:       id,       module_google_enabled, module_tips_enabled, module_whatsapp_enabled, review_count, spin_count, billing_status, active

DROP FUNCTION IF EXISTS public.get_venues_overview();

CREATE FUNCTION public.get_venues_overview()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  plan text,
  mode text,
  active boolean,
  billing_status text,
  module_google_enabled boolean,
  module_tips_enabled boolean,
  module_whatsapp_enabled boolean,
  review_count bigint,
  avg_rating numeric,
  spin_count bigint,
  last_activity timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    v.id,
    v.name,
    v.slug,
    v.plan,
    v.mode,
    v.active,
    v.billing_status,
    v.module_google_enabled,
    v.module_tips_enabled,
    v.module_whatsapp_enabled,
    (SELECT count(*) FROM reviews r WHERE r.venue_id = v.id),
    (SELECT round(avg(r.rating), 2) FROM reviews r WHERE r.venue_id = v.id),
    (SELECT count(*) FROM spins sp JOIN prizes p ON p.id = sp.prize_id WHERE p.venue_id = v.id),
    (SELECT max(r.created_at) FROM reviews r WHERE r.venue_id = v.id)
  FROM venues v
  WHERE auth_role() = 'super_admin'
  ORDER BY v.name;
$$;
