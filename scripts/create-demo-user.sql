-- Run this in Supabase Dashboard → SQL Editor
-- Creates demo@spillit.lv / gunsnlasers as client_admin for Guns n Lasers

DO $$
DECLARE
  new_uid uuid := gen_random_uuid();
BEGIN

  -- 1. Insert into auth.users directly
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_uid,
    'authenticated',
    'authenticated',
    'demo@spillit.lv',
    crypt('gunsnlasers', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    now(), now()
  );

  -- 2. Insert identity record (needed for email login)
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'demo@spillit.lv',
    new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', 'demo@spillit.lv'),
    'email',
    now(), now(), now()
  );

  -- 3. Upsert profile (handles case where trigger already created it)
  INSERT INTO public.profiles (id, role, venue_id, full_name, active)
  VALUES (new_uid, 'client_admin', 'a69edc53-8385-46ec-b24f-fc287a7a0e32', 'GUNSnLASERS Demo', true)
  ON CONFLICT (id) DO UPDATE SET
    role     = 'client_admin',
    venue_id = 'a69edc53-8385-46ec-b24f-fc287a7a0e32',
    full_name = 'GUNSnLASERS Demo',
    active   = true;

  RAISE NOTICE 'Created user % (demo@spillit.lv)', new_uid;
END;
$$;
