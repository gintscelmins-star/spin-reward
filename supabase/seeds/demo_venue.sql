-- ============================================================
-- DEMO VENUE SEED — "Melnie Lāči" Sports Bārs
-- Idempotents: DELETE demo data first, then INSERT
-- Requires migration: demo_support (is_demo column)
-- ============================================================

DO $$
DECLARE
  v_id   uuid := '11111111-1111-1111-1111-111111111111';
  act_id uuid := '44444444-4444-4444-4444-000000000001';
  s1     uuid := '22222222-2222-2222-2222-000000000001'; -- Artūrs
  s2     uuid := '22222222-2222-2222-2222-000000000002'; -- Ieva
  s3     uuid := '22222222-2222-2222-2222-000000000003'; -- Mārtiņš
  p1     uuid := '33333333-3333-3333-3333-000000000001'; -- Bezmaksas alus
  p2     uuid := '33333333-3333-3333-3333-000000000002'; -- 10% atlaide
  p3     uuid := '33333333-3333-3333-3333-000000000003'; -- Bezmaksas kafija
  p4     uuid := '33333333-3333-3333-3333-000000000004'; -- Īpašais kokteilis
  p5     uuid := '33333333-3333-3333-3333-000000000005'; -- Labāk vēlreiz!
BEGIN
  -- Notīrī esošos demo datus (ja ir)
  DELETE FROM staff_evaluations WHERE venue_id = v_id;
  DELETE FROM reviews           WHERE venue_id = v_id;
  DELETE FROM spins             WHERE venue_id = v_id;
  DELETE FROM activities        WHERE venue_id = v_id;
  DELETE FROM staff             WHERE venue_id = v_id;
  DELETE FROM prizes            WHERE venue_id = v_id;
  DELETE FROM venues            WHERE id = v_id;

  -- ── Venue ──────────────────────────────────────────────
  INSERT INTO venues (
    id, name, slug, plan, billing_status, seats,
    default_locale, active, uses_sessions, mode,
    module_google_enabled, module_tips_enabled, is_demo
  ) VALUES (
    v_id, 'Melnie Lāči', 'melnie-laci-demo', 'growth', 'active', 5,
    'lv', true, true, 'business',
    true, true, true
  );

  -- ── Activity ───────────────────────────────────────────
  INSERT INTO activities (id, venue_id, name, active)
  VALUES (act_id, v_id, 'Sports bāra vizīte', true);

  -- ── Staff ──────────────────────────────────────────────
  INSERT INTO staff (id, venue_id, name, role, active, tips_enabled) VALUES
    (s1, v_id, 'Artūrs Kalniņš',  'cashier', true, true),
    (s2, v_id, 'Ieva Ozola',      'admin',   true, true),
    (s3, v_id, 'Mārtiņš Bērziņš', 'cashier', true, false);

  -- ── Prizes (weights sum = 100) ─────────────────────────
  INSERT INTO prizes (id, venue_id, name, description, probability_weight, expires_days, active, prize_type) VALUES
    (p1, v_id, 'Bezmaksas alus',                     'Izvēlies jebkuru alu no mūsu izvēles',          25, 30, true, 'physical'),
    (p2, v_id, '10% atlaide nākamajam apmeklējumam', 'Derīgs 30 dienas no izsniegšanas brīža',         20, 30, true, 'physical'),
    (p3, v_id, 'Bezmaksas kafija',                   'Espresso, americano vai kapučīno',               15, 30, true, 'physical'),
    (p4, v_id, 'Īpašais kokteilis',                  'Bārmenis izvēlas pārsteigumu tieši Tev',         10, 30, true, 'physical'),
    (p5, v_id, 'Labāk vēlreiz!',                     'Šoreiz nepaveicās — nāc atkal un mēģini vēlreiz!', 30, 7, true, 'physical');

  -- ── Spins: 47 ieraksti, pēdējās 30 dienas ─────────────
  -- Sadalījums pēc svara (20 vienumu cikls):
  --   alus×5 (25%), atlaide×4 (20%), kafija×3 (15%), kokteilis×2 (10%), neuzvarēja×6 (30%)
  INSERT INTO spins (venue_id, prize_id, qr_token, status, spun_at, expires_at, staff_id)
  SELECT
    v_id,
    CASE (n % 20)
      WHEN  0 THEN p1  WHEN  1 THEN p1  WHEN  2 THEN p1  WHEN  3 THEN p1  WHEN  4 THEN p1
      WHEN  5 THEN p2  WHEN  6 THEN p2  WHEN  7 THEN p2  WHEN  8 THEN p2
      WHEN  9 THEN p3  WHEN 10 THEN p3  WHEN 11 THEN p3
      WHEN 12 THEN p4  WHEN 13 THEN p4
      ELSE p5
    END,
    gen_random_uuid(),
    CASE
      WHEN n % 3 = 0 THEN 'redeemed'
      WHEN n % 13 = 0 AND n % 3 != 0 THEN 'expired'
      ELSE 'active'
    END,
    now() - ((46 - n) * INTERVAL '16 hours') - ((n % 6) * INTERVAL '2 hours 17 minutes'),
    now() + INTERVAL '30 days',
    CASE (n % 3)
      WHEN 0 THEN s1
      WHEN 1 THEN s2
      ELSE s3
    END
  FROM generate_series(0, 46) AS g(n);

  -- ── Reviews: 12 (7×5★, 4×4★, 1×3★) ───────────────────
  INSERT INTO reviews (venue_id, rating, comment, google_redirected, created_at, staff_id) VALUES
    (v_id, 5, 'Lieliska vieta! Personāls ļoti draudzīgs, noteikti atgriezīšos.',        true,  now() - INTERVAL '28 days', s1),
    (v_id, 5, 'Ļoti patika atmosfēra un labais serviss. Alus bija auksts un garš!',      true,  now() - INTERVAL '25 days', s2),
    (v_id, 5, 'Brīnišķīga pieredze, noteikti ieteikšu draugiem.',                        true,  now() - INTERVAL '22 days', s3),
    (v_id, 5, 'Spins bija patīkams pārsteigums — uzvarēju bezmaksas alu!',               false, now() - INTERVAL '19 days', s1),
    (v_id, 5, 'Artūrs ir super! Vienmēr ar smaidu un gatavs palīdzēt.',                  true,  now() - INTERVAL '16 days', s2),
    (v_id, 5, 'Vislabākais sports bārs pilsētā. Noteikti atgriezīšos.',                  true,  now() - INTERVAL '13 days', s3),
    (v_id, 5, 'Ideāla vieta korporatīvam pasākumam — viss organizēts perfekti.',          true,  now() - INTERVAL '10 days', s1),
    (v_id, 4, 'Labs serviss, nedaudz gaidīts pie bāra vakara piebrukumā.',                true,  now() - INTERVAL '8 days',  s2),
    (v_id, 4, 'Forša ideja ar spinu ritenīti, papildina vizīti.',                         false, now() - INTERVAL '6 days',  s3),
    (v_id, 4, 'Patika atmosfēra, nākamreiz cerēsim uz vēl labāku apkalpošanu.',          true,  now() - INTERVAL '4 days',  s1),
    (v_id, 4, 'Cenas atbilstošas, personāls laipns un atsaucīgs.',                       false, now() - INTERVAL '2 days',  s2),
    (v_id, 3, 'Varētu būt ātrāks serviss vakaros, citu iemeslu nav.',                    false, now() - INTERVAL '1 day',   s3);

  -- ── Staff evaluations: 15 (Artūrs×8, Ieva×4, Mārtiņš×3) ─
  -- Artūrs: avg 4.6 (5+5+4+5+4+5+5+4 = 37/8 = 4.625)
  INSERT INTO staff_evaluations (venue_id, staff_id, eval_date, rating, notes, created_at) VALUES
    (v_id, s1, CURRENT_DATE - 56, 5, 'Ātrā apkalpošana, klienti apmierināti.',                          now() - INTERVAL '56 days'),
    (v_id, s1, CURRENT_DATE - 49, 5, 'Labi pārvaldīja vakara piebrukumu.',                               now() - INTERVAL '49 days'),
    (v_id, s1, CURRENT_DATE - 42, 4, 'Dažkārt aizmirst informēt klientus par dienas speciāliem.',        now() - INTERVAL '42 days'),
    (v_id, s1, CURRENT_DATE - 35, 5, 'Izcils komandas spēlētājs, palīdzēja jaunajiem kolēģiem.',         now() - INTERVAL '35 days'),
    (v_id, s1, CURRENT_DATE - 28, 4, 'Klientu apkalpošana augstā līmenī, reti neprecizitātes.',          now() - INTERVAL '28 days'),
    (v_id, s1, CURRENT_DATE - 21, 5, 'Precīzs ar kasē, nav atšķirību pēc mēneša maiņas.',               now() - INTERVAL '21 days'),
    (v_id, s1, CURRENT_DATE - 14, 5, 'Jauno produktu zināšanas — uzlabojums salīdzinot ar iepriekšo.',   now() - INTERVAL '14 days'),
    (v_id, s1, CURRENT_DATE - 7,  4, 'Klientu atsauksmes par Artūru konsekventi pozitīvas.',             now() - INTERVAL '7 days');

  -- Ieva: avg 4.75 (5+5+5+4 = 19/4)
  INSERT INTO staff_evaluations (venue_id, staff_id, eval_date, rating, notes, created_at) VALUES
    (v_id, s2, CURRENT_DATE - 42, 5, 'Lieliski koordinē vakara maiņu — viss rit kā pulkstenis.',          now() - INTERVAL '42 days'),
    (v_id, s2, CURRENT_DATE - 28, 5, 'Patstāvīgi risina konfliktus, neprasa vadības iesaisti.',           now() - INTERVAL '28 days'),
    (v_id, s2, CURRENT_DATE - 14, 5, 'Zina katru produktu — klientu favorīte un labs mentors kolēģiem.', now() - INTERVAL '14 days'),
    (v_id, s2, CURRENT_DATE - 5,  4, 'Neliela kavēšanās ar vairāku galdu apkalpošanu vienlaicīgi.',       now() - INTERVAL '5 days');

  -- Mārtiņš: avg 4.33 (4+4+5 = 13/3)
  INSERT INTO staff_evaluations (venue_id, staff_id, eval_date, rating, notes, created_at) VALUES
    (v_id, s3, CURRENT_DATE - 28, 4, 'Precīzs un uzticams kasē.',                                         now() - INTERVAL '28 days'),
    (v_id, s3, CURRENT_DATE - 14, 4, 'Var uzlabot proaktīvu komunikāciju ar regulārklientiem.',            now() - INTERVAL '14 days'),
    (v_id, s3, CURRENT_DATE - 3,  5, 'Šonedēļ lieliski paveicis darbu vakara maiņās, klienti slavē.',    now() - INTERVAL '3 days');

END;
$$;
