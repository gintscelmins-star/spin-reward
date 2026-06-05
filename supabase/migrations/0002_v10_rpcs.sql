-- =====================================================================
-- 0002 — V1.0 MVP: SECURITY DEFINER RPCs (spin_wheel, redeem_spin,
--         check_spin, get_wheel_prizes). Apiet RLS drošā veidā.
-- =====================================================================

-- ---- GET_WHEEL_PRIZES (pub, anon) ----
create or replace function get_wheel_prizes(p_venue_slug text)
returns table(prize_name text, prize_description text)
language sql stable security definer set search_path = public as $$
  select p.name, p.description
  from   prizes p
  join   venues v on v.id = p.venue_id
  where  v.slug               = p_venue_slug
    and  v.active             = true
    and  p.active             = true
    and  p.probability_weight > 0
    and  (p.remaining is null or p.remaining > 0)
  order by p.created_at;
$$;

-- ---- SPIN_WHEEL (atomiskā transakcija: izvēle + remaining-- + INSERT spin) ----
create or replace function spin_wheel(p_venue_slug text, p_session_id text)
returns table(spin_id uuid, qr_token uuid, prize_name text, prize_description text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_venue_id     uuid;
  v_prize        prizes%rowtype;
  v_total_weight int;
  v_rand         int;
  v_cum          int := 0;
  v_expires      timestamptz;
  v_spin         spins%rowtype;
begin
  select id into v_venue_id from venues where slug = p_venue_slug and active = true;
  if v_venue_id is null then raise exception 'venue_not_found'; end if;

  select coalesce(sum(probability_weight),0) into v_total_weight
  from prizes
  where venue_id = v_venue_id and active = true and probability_weight > 0
    and (remaining is null or remaining > 0);

  if v_total_weight = 0 then raise exception 'no_prizes_available'; end if;

  v_rand := floor(random() * v_total_weight) + 1;

  for v_prize in
    select * from prizes
    where venue_id = v_venue_id and active = true and probability_weight > 0
      and (remaining is null or remaining > 0)
    order by created_at
    for update
  loop
    v_cum := v_cum + v_prize.probability_weight;
    exit when v_rand <= v_cum;
  end loop;

  if v_prize.remaining is not null then
    update prizes set remaining = remaining - 1 where id = v_prize.id;
  end if;

  v_expires := now() + (v_prize.expires_days || ' days')::interval;

  insert into spins (venue_id, prize_id, session_id, expires_at)
  values (v_venue_id, v_prize.id, p_session_id, v_expires)
  returning * into v_spin;

  return query select v_spin.id, v_spin.qr_token, v_prize.name, v_prize.description, v_spin.expires_at;
end;
$$;

-- ---- CHECK_SPIN (status pārbaude pirms redeem) ----
create or replace function check_spin(p_qr_token uuid)
returns table(status text, prize_name text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_spin spins%rowtype;
  v_name text;
begin
  select * into v_spin from spins where qr_token = p_qr_token;

  if v_spin.id is null then
    return query select 'not_found'::text, null::text, null::timestamptz; return;
  end if;

  select name into v_name from prizes where id = v_spin.prize_id;

  if v_spin.status = 'redeemed' then
    return query select 'already_redeemed'::text, v_name, v_spin.expires_at; return;
  end if;
  if v_spin.expires_at < now() or v_spin.status = 'expired' then
    return query select 'expired'::text, v_name, v_spin.expires_at; return;
  end if;

  return query select 'active'::text, v_name, v_spin.expires_at;
end;
$$;

-- ---- REDEEM_SPIN (atomiskā status izmaiņa) ----
create or replace function redeem_spin(p_qr_token uuid)
returns table(result text, prize_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_spin       spins%rowtype;
  v_prize_name text;
begin
  select * into v_spin from spins where qr_token = p_qr_token for update;

  if v_spin.id is null then
    return query select 'not_found'::text, null::text; return;
  end if;
  if v_spin.status = 'redeemed' then
    return query select 'already_redeemed'::text, null::text; return;
  end if;
  if v_spin.expires_at < now() or v_spin.status = 'expired' then
    update spins set status = 'expired' where id = v_spin.id;
    return query select 'expired'::text, null::text; return;
  end if;

  update spins set status = 'redeemed', redeemed_at = now() where id = v_spin.id;
  select name into v_prize_name from prizes where id = v_spin.prize_id;
  return query select 'redeemed'::text, v_prize_name;
end;
$$;
