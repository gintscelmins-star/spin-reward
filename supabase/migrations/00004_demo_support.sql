ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS demo_magic_links (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  token      text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  ip_address text
);

CREATE INDEX IF NOT EXISTS demo_magic_links_email_idx ON demo_magic_links(email);
CREATE INDEX IF NOT EXISTS demo_magic_links_token_idx ON demo_magic_links(token);

ALTER TABLE demo_magic_links ENABLE ROW LEVEL SECURITY;
