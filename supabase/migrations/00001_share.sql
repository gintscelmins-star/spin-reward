-- GUNSnLASERS: game sessions, results, share tracking

-- ── game_sessions ──────────────────────────────────────────────────────────
create table if not exists game_sessions (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid references venues(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  status      text not null default 'active' check (status in ('active','closed'))
);

alter table game_sessions enable row level security;

-- staff/admins can read + write sessions for their venue (via service role or auth check);
-- no anon read — public access is via SECURITY DEFINER function below
create policy "venue staff can manage sessions"
  on game_sessions for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.venue_id = game_sessions.venue_id or p.role = 'super_admin')
    )
  );

-- ── game_results ────────────────────────────────────────────────────────────
create table if not exists game_results (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references game_sessions(id) on delete cascade,
  callsign        text not null,
  team            text,                         -- 'red' | 'blue' | null
  top_class       text,                         -- 'COMMANDO' | 'SNIPER' | etc.
  rating          numeric(6,2),
  kd_ratio        numeric(6,2),
  kd_plusminus    integer,
  accuracy        numeric(6,2),                 -- percentage
  shots_fired     integer,
  hits            integer,
  injuries        integer,
  team_hit_pct    numeric(6,2),
  share_token     text unique not null default encode(gen_random_bytes(8), 'hex'),
  created_at      timestamptz not null default now()
);

alter table game_results enable row level security;

create policy "venue staff can manage results"
  on game_results for all
  using (
    exists (
      select 1 from game_sessions gs
      join profiles p on p.id = auth.uid()
      where gs.id = game_results.session_id
        and (p.venue_id = gs.venue_id or p.role = 'super_admin')
    )
  );

-- ── share_events ─────────────────────────────────────────────────────────────
-- RLS stays closed — service role bypasses; no anon policy intentionally
create table if not exists share_events (
  id          uuid primary key default gen_random_uuid(),
  share_token text not null,
  event_type  text not null,                   -- 'view' | 'share_click'
  network     text,                            -- 'facebook' | 'twitter' | 'whatsapp' | etc.
  anon_id     text,                            -- gnl_aid cookie value
  referer     text,
  ua          text,
  created_at  timestamptz not null default now()
);

alter table share_events enable row level security;
-- No policies — service role only (bypasses RLS)

-- ── get_result_by_token ──────────────────────────────────────────────────────
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
    share_token, created_at
  from game_results
  where share_token = p_token
  limit 1;
$$;

grant execute on function get_result_by_token(text) to anon, authenticated;

-- ── get_session_results ───────────────────────────────────────────────────────
create or replace function get_session_results(p_session uuid)
returns table (
  id              uuid,
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
  share_token     text
)
language sql
security definer
set search_path = public
as $$
  select
    id, callsign, team, top_class,
    rating, kd_ratio, kd_plusminus, accuracy,
    shots_fired, hits, injuries, team_hit_pct,
    share_token
  from game_results
  where session_id = p_session
  order by rating desc nulls last;
$$;

grant execute on function get_session_results(uuid) to anon, authenticated;
