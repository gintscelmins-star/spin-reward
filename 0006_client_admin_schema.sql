-- =====================================================================
-- 0006 — V1.3 klienta admin schema: staff lauki + review_questions/answers
-- (PIEZĪME: jau pielikts DB; šis fails ir version control vajadzībām)
-- =====================================================================

-- ---- STAFF papildinājumi ----
alter table staff
  add column if not exists daily_spin_limit int,          -- null = bezgalīgs
  add column if not exists staff_code text unique;

-- ---- REVIEW_QUESTIONS (konfigurējami pa venue) ----
create table if not exists review_questions (
  id         uuid primary key default gen_random_uuid(),
  venue_id   uuid not null references venues(id) on delete cascade,
  label      text not null,
  type       text not null default 'stars' check (type in ('stars','thumbs')),
  sort_order int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---- REVIEW_ANSWERS (multi-jautājumu atbildes; venue_id denormalizēts RLS dēļ) ----
create table if not exists review_answers (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references reviews(id) on delete cascade,
  question_id uuid references review_questions(id),
  venue_id    uuid not null references venues(id) on delete cascade,
  rating      int  not null,
  created_at  timestamptz not null default now()
);

-- ---- RLS: review_questions ----
alter table review_questions enable row level security;
create policy "public read active questions" on review_questions for select using (active = true);
create policy "super all questions"          on review_questions for all    using (auth_role()='super_admin') with check (auth_role()='super_admin');
create policy "client manage questions"      on review_questions for all    using (auth_role()='client_admin' and venue_id = auth_venue_id()) with check (venue_id = auth_venue_id());

-- ---- RLS: review_answers ----
alter table review_answers enable row level security;
create policy "anon insert answers" on review_answers for insert with check (true);
create policy "super read answers"  on review_answers for select using (auth_role()='super_admin');
create policy "client read answers" on review_answers for select using (auth_role()='client_admin' and venue_id = auth_venue_id());
