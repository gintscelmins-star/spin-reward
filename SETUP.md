# CI/CD Setup — GitHub Actions Secrets

GitHub Actions CI (`ci.yml`) requires these repository secrets to run tests and build.

## How to add secrets

1. Go to **GitHub → spin-reward repo → Settings → Secrets and variables → Actions**
2. Click **"New repository secret"** for each entry below

## Required secrets

| Secret name | Where to find the value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → Project API keys → `service_role` `secret` |
| `RESEND_API_KEY` | Resend Dashboard → API Keys → create or copy existing key |
| `DEMO_JWT_SECRET` | Any random 32+ char string — generate with: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://www.spillit.lv` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.spillit.lv` |

## Current Supabase project

- Project URL: `https://heseorbhzcmanfkxqkkg.supabase.co`
- Supabase Dashboard: https://supabase.com/dashboard/project/heseorbhzcmanfkxqkkg

## Notes

- The Vitest integration tests (`tests/security.test.ts`, `tests/functional.test.ts`, `tests/onboarding.test.ts`, `tests/admin-venues.test.ts`) make real Supabase calls using `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without these secrets the `test` CI job will fail with a connection error.
- `RESEND_API_KEY` and `DEMO_JWT_SECRET` are consumed at build time (`npm run build`). Without them the build job fails.
- Playwright E2E tests (`npm run test:e2e`) are **not** part of the CI pipeline — run them locally against a running dev server.
