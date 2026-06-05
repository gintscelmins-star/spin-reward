-- =====================================================================
-- 0007 — Seat limit enforce (DB trigger, nevar apiet)
-- (PIEZĪME: jau pielikts DB; šis fails ir version control vajadzībām)
-- =====================================================================
create or replace function enforce_seat_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_seats int;
  v_count int;
begin
  if new.active is not true then
    return new;
  end if;
  select seats into v_seats from venues where id = new.venue_id;
  select count(*) into v_count from staff
    where venue_id = new.venue_id and active = true and id <> new.id;
  if (v_count + 1) > v_seats then
    raise exception 'seat_limit_reached';
  end if;
  return new;
end; $$;

drop trigger if exists trg_enforce_seat_limit on staff;
create trigger trg_enforce_seat_limit
  before insert or update on staff
  for each row execute function enforce_seat_limit();
