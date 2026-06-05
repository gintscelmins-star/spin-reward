-- =====================================================================
-- 0008 — V1.4a: activities + bookings + sessions + spins linkage
-- (PIEZĪME: jau pielikts DB; šis fails ir version control vajadzībām)
-- =====================================================================

-- ---- ACTIVITIES (venue spēļu veidi) ----
create table activities (
  id         uuid primary key default gen_random_uuid(),
  venue_id   uuid not null references venues(id) on delete cascade,
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---- BOOKINGS (rezervācijas, multi-avots; satur PII -> NAV anon pieejas) ----
create table bookings (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid not null references venues(id) on delete cascade,
  customer_name  text,
  customer_phone text,
  activity_id    uuid references activities(id),
  starts_at      timestamptz,
  ends_at        timestamptz,
  source         text not null default 'manual' check (source in ('google_calendar','booking_system','manual')),
  external_id    text,
  created_at     timestamptz not null default now()
);
create index idx_bookings_venue_start on bookings(venue_id, starts_at);
create unique index uq_bookings_source on bookings(source, external_id) where external_id is not null;

-- ---- SESSIONS (staff-aktivēta) ----
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references venues(id) on delete cascade,
  staff_id    uuid references staff(id),
  activity_id uuid references activities(id),
  booking_id  uuid references bookings(id),
  status      text not null default 'active' check (status in ('active','used','expired')),
  activate_ip text,
  created_at  timestamptz not null default now()
);
create index idx_sessions_venue on sessions(venue_id, created_at);

-- ---- SPINS linkage (RPC patērēs V1.4b) ----
alter table spins
  add column if not exists session_id  uuid references sessions(id),
  add column if not exists staff_id    uuid references staff(id),
  add column if not exists activity_id uuid references activities(id);

-- ---- VENUE flag ----
alter table venues add column if not exists uses_sessions boolean not null default false;

-- ---- RLS: activities ----
alter table activities enable row level security;
create policy "super all activities"    on activities for all    using (auth_role()='super_admin') with check (auth_role()='super_admin');
create policy "client manage activities" on activities for all    using (auth_role()='client_admin' and venue_id=auth_venue_id()) with check (venue_id=auth_venue_id());
create policy "staff read activities"    on activities for select using (auth_role()='staff' and venue_id=auth_venue_id());

-- ---- RLS: bookings (PII, NAV anon) ----
alter table bookings enable row level security;
create policy "super all bookings"    on bookings for all using (auth_role()='super_admin') with check (auth_role()='super_admin');
create policy "client manage bookings" on bookings for all using (auth_role()='client_admin' and venue_id=auth_venue_id()) with check (venue_id=auth_venue_id());
create policy "staff manage bookings"  on bookings for all using (auth_role()='staff' and venue_id=auth_venue_id()) with check (venue_id=auth_venue_id());

-- ---- RLS: sessions ----
alter table sessions enable row level security;
create policy "super all sessions"    on sessions for all    using (auth_role()='super_admin') with check (auth_role()='super_admin');
create policy "client read sessions"  on sessions for select using (auth_role()='client_admin' and venue_id=auth_venue_id());
create policy "staff manage sessions" on sessions for all    using (auth_role()='staff' and venue_id=auth_venue_id()) with check (venue_id=auth_venue_id());
