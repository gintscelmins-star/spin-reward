-- =====================================================================
-- 0003 — V1.1 Auth/RBAC: profiles, staff, helper funkcijas, trigger,
--         pilna RLS pārrakstīšana visām tabulām pēc auth_role().
-- =====================================================================

-- ---- HELPER FUNKCIJAS ----
create or replace function auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_venue_id()
returns uuid language sql stable security definer set search_path = public as $$
  select venue_id from profiles where id = auth.uid();
$$;

-- ---- PROFILES ----
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'staff' check (role in ('super_admin','client_admin','staff')),
  venue_id   uuid references venues(id),  -- null priekš super_admin
  full_name  text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "own profile read"       on profiles for select using (id = auth.uid());
create policy "super read profiles"    on profiles for select using (auth_role() = 'super_admin');
create policy "super manage profiles"  on profiles for all    using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');
create policy "client read venue profs" on profiles for select using (auth_role() = 'client_admin' and venue_id = auth_venue_id());

-- ---- TRIGGER: jaunajam auth.user automātiski izveido profilu ar loma='staff' ----
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'staff');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---- STAFF ----
create table if not exists staff (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references venues(id) on delete cascade,
  name            text not null,
  role            text,
  phone           text,
  stripe_tip_link text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table staff enable row level security;
create policy "public read active staff" on staff for select using (active = true);
create policy "client manage staff"      on staff for all    using (auth_role() = 'client_admin' and venue_id = auth_venue_id()) with check (venue_id = auth_venue_id());
create policy "super all staff"          on staff for all    using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');

-- tips.staff_id pievienots kā nullable FK uz staff
alter table tips add column if not exists staff_id uuid references staff(id);

-- ---- RLS ATJAUNOJUMI: venues ----
create policy "client read own venue"   on venues for select using (auth_role() = 'client_admin' and id = auth_venue_id());
create policy "client update own venue" on venues for update using (auth_role() = 'client_admin' and id = auth_venue_id()) with check (id = auth_venue_id());
create policy "super all venues"        on venues for all    using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');

-- ---- RLS ATJAUNOJUMI: prizes ----
create policy "client manage prizes" on prizes for all    using (auth_role() = 'client_admin' and venue_id = auth_venue_id()) with check (venue_id = auth_venue_id());
create policy "super all prizes"     on prizes for all    using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');

-- ---- RLS ATJAUNOJUMI: spins ----
create policy "client read spins" on spins for select using (auth_role() = 'client_admin' and venue_id = auth_venue_id());
create policy "super read spins"  on spins for select using (auth_role() = 'super_admin');

-- ---- RLS ATJAUNOJUMI: reviews ----
create policy "client read reviews" on reviews for select using (auth_role() = 'client_admin' and venue_id = auth_venue_id());
create policy "super read reviews"  on reviews for select using (auth_role() = 'super_admin');

-- ---- RLS ATJAUNOJUMI: tips ----
create policy "client read tips" on tips for select using (auth_role() = 'client_admin' and venue_id = auth_venue_id());
create policy "super read tips"  on tips for select using (auth_role() = 'super_admin');
