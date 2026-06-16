-- Phase 2: baked personalized result MP4
alter table game_results
  add column if not exists share_video_url text;

-- Storage buckets (run once in dashboard or with supabase storage create)
-- bucket: card-templates  (public read — template videos per class)
-- bucket: cards-rendered  (public read — rendered per-player MP4s)

-- Update RPC to also return share_video_url
create or replace function get_result_by_token(p_token text)
returns table (
  id              uuid,
  session_id      uuid,
  callsign        text,
  team            text,
  top_class       text,
  rating          numeric,
  kd_ratio        numeric,
  kd_plusminus    integer,
  accuracy        numeric,
  shots_fired     integer,
  hits            integer,
  injuries        integer,
  team_hit_pct    numeric,
  share_token     text,
  share_video_url text,
  created_at      timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    id, session_id, callsign, team, top_class,
    rating, kd_ratio, kd_plusminus, accuracy,
    shots_fired, hits, injuries, team_hit_pct,
    share_token, share_video_url, created_at
  from game_results
  where share_token = p_token
  limit 1;
$$;

grant execute on function get_result_by_token(text) to anon, authenticated;
