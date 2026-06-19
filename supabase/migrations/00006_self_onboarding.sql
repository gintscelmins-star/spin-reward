-- V2.3: Venue Self-Onboarding
-- Adds onboarding columns to venues and a rate-limiting table for registration

-- ── venues additions ───────────────────────────────────────────────────────────
ALTER TABLE venues ADD COLUMN IF NOT EXISTS onboarded_at  timestamptz;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS category      text;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- ── registration_attempts (rate limiting) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS registration_attempts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  ip_hash    text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_attempts_email_time
  ON registration_attempts(email, created_at);

ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;
-- No SELECT policy — only service role writes (bypasses RLS)
