-- =====================================================================
-- 0001 — V1.0 MVP: bāzes tabulas (venues, prizes, spins, reviews, tips)
-- Pielikts DB pirms V1.1. Anon /play flow — viss anonīms, nav auth.
-- =====================================================================

-- ---- VENUES ----
create table if not exists venues (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text unique not null,
  google_place_id  text,
  stripe_account_id text,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table venues enable row level security;
create policy "public read active venues" on venues for select using (active = true);

-- ---- PRIZES ----
create table if not exists prizes (
  id                 uuid primary key default gen_random_uuid(),
  venue_id           uuid not null references venues(id) on delete cascade,
  name               text not null,
  description        text,
  probability_weight int  not null default 1 check (probability_weight >= 0),
  total_available    int,
  remaining          int,
  expires_days       int  not null default 30,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

alter table prizes enable row level security;
-- Prizes nav tieši pieejamas anon; tikai caur SECURITY DEFINER RPC.

-- ---- SPINS (session_id ir text MVP erā; UUID FK pievienots 0008) ----
create table if not exists spins (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references venues(id),
  prize_id     uuid references prizes(id),
  qr_token     uuid unique not null default gen_random_uuid(),
  status       text not null default 'active' check (status in ('active','redeemed','expired')),
  session_id   text,
  spun_at      timestamptz not null default now(),
  redeemed_at  timestamptz,
  expires_at   timestamptz not null
);

alter table spins enable row level security;
-- Spins nav tieši pieejamas anon; tikai caur RPC.

-- ---- REVIEWS ----
create table if not exists reviews (
  id               uuid primary key default gen_random_uuid(),
  venue_id         uuid not null references venues(id),
  session_id       text,
  rating           int  not null check (rating >= 1 and rating <= 5),
  comment          text,
  google_redirected boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table reviews enable row level security;
create policy "anon insert reviews" on reviews for insert with check (true);

-- ---- TIPS ----
create table if not exists tips (
  id                uuid primary key default gen_random_uuid(),
  venue_id          uuid not null references venues(id),
  amount_cents      int  not null check (amount_cents > 0),
  currency          text not null default 'EUR',
  stripe_payment_id text,
  status            text not null default 'pending',
  created_at        timestamptz not null default now()
);

alter table tips enable row level security;
create policy "anon insert tips" on tips for insert with check (true);
