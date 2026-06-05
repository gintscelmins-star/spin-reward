-- =====================================================================
-- 0004 — V1.2 Super-admin: venues + billing kolonnas, seats pārvaldība.
--         Super-admin onboardo klientus, nosaka seats (billing vienība).
-- =====================================================================

-- ---- VENUES: billing un seat kolonnas ----
alter table venues
  add column if not exists seats          int  not null default 1 check (seats >= 0),
  add column if not exists plan           text not null default 'starter'
    check (plan in ('starter','growth','multi')),
  add column if not exists billing_status text not null default 'trial'
    check (billing_status in ('trial','active','suspended','cancelled'));
