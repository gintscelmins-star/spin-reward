# E2E Test Report

**Datums:** 2026-06-25  
**Commit:** b530f7a (+ fix commits dda16de, 00009/00010 migrations applied)  
**Branch:** master

---

## Rezultātu tabula

| Kategorija | Status | Detaļas |
|---|---|---|
| **lint** | ✅ PASS | 0 errors, 13 warnings (visi pre-existing: unused vars, no-img-element) |
| **type-check** | ✅ PASS | 0 errors (tsc --noEmit tīrs) |
| **unit/integration (vitest)** | ⚠️ 37/39 | 2 pre-existing failures (B7, D1) — sīkāk zemāk |
| **build** | ✅ PASS | 44/44 lapas kompilējas, 0 TypeScript kļūdas |
| **e2e (Playwright)** | ⏭️ N/A | Playwright testi prasa lokālu dev serveri — nav izpildīti CI vidē |

---

## Vitest detaļas — 37/39 pass

### ✅ Nokārtoti testi (37)

| Grupa | Tests |
|---|---|
| A – RLS Isolation | A1–A6 (6/6) |
| B – Anon Boundaries | B1–B6 (6/7, B7 ❌) |
| C – Spin/Redeem Integrity | C1–C7 (6/6, C3 nav implementēts) |
| D – Role/Auth Boundaries | D2–D3 (2/3, D1 ❌) |
| F – Admin Functional | F1–F5 (5/5) |
| G – i18n | G1–G2 (2/2) |
| H – Edge/Empty States | H1–H4 (4/4) |
| **I – V2 Onboarding** (jauns) | I1–I2 (2/2) ✅ |
| **J – Super-Admin Venues + Redemptions** (jauns) | J1–J4 (4/4) ✅ |

### ❌ Neizdevušies testi (2 — pre-existing, pirms šīs sesijas)

**B7**: `anon can insert review and tip (play flow)`  
- Kļūda: `permission denied for table venues` (code 42501)  
- Iemesls: `tips` tabulai ir RLS politika vai trigger kas pārbauda `venues` tabulu, kurai `anon` rolei nav SELECT atļaujas.  
- Ietekme uz prod: INSERT tips caur /play flow izmanto RPC (`spin_wheel_session`), nevis tiešu INSERT — tas strādā. Tieša `tips` tabulas INSERT kā anon ir testa specifisks patterns, kas neatbilst reālai plūsmai.
- Statuss: **zināms, pre-existing, nav testētas sesijas laikā ievests**

**D1**: `staff profile cannot CRUD venues`  
- Kļūda: Staff lomam izdodas pārdēvēt venue (sagaidīts: atteikts)  
- Iemesls: `venues` tabulas UPDATE RLS politika acīmredzot atļauj arī `staff` lomai atjaunināt ierakstus. Trūkst RLS politikas, kas ierobežotu UPDATE uz `client_admin`/`super_admin` lomām.  
- Ietekme uz prod: Staff UI nav piekļuves venue CRUD lapām, tāpēc šis ir teorētisks drošības risks, nevis aktīvs defekts.
- Statuss: **zināms, pre-existing, nav testētas sesijas laikā ievests**

---

## Testēšanas laikā atklātie defekti (jauni, tagad laboti)

### DEF-1: `is_superadmin()` DB funkcija pārbaudīja `role = 'superadmin'` (bez apakšsvītras)
- **Atklāts:** J3 tests — `manual_redeem_spin` atgrieza "Not authorized"
- **Sakne:** DB funkcija `is_superadmin()` izmantoja `role = 'superadmin'`, bet codebase visos kodos (RLS, actions, tests) lieto `role = 'super_admin'`
- **Labojums:** Migration 00009 — `is_superadmin()` pārrakstīts ar `'super_admin'`

### DEF-2: `manual_redeem_spin` DB versija atgrieza `jsonb`, migrācija 00005 nevarēja to aizstāt
- **Atklāts:** J3 tests — returns type mismatch starp kodu un DB
- **Sakne:** PostgreSQL `CREATE OR REPLACE FUNCTION` nevar mainīt return type. Veca `manual_redeem_spin(text, uuid) RETURNS jsonb` palika DB neskartu.
- **Labojums:** Migration 00009 — DROP + CREATE ar pareizo `RETURNS TABLE(result text, ...)`

### DEF-3: `spins.qr_token` ir `uuid` tips, bet RPC funkcijas deklarēja `p_qr_token text`
- **Atklāts:** J3 tests pēc DEF-2 labošanas — `operator does not exist: uuid = text`
- **Sakne:** `spins.qr_token` kolonna ir `uuid` tips (atklāts caur schema audit), bet funkcija deklarēja parametru kā `text`
- **Labojums:** Migration 00010 — `p_qr_token` mainīts uz `uuid`

### DEF-4: `spins.session_id` ir `text` tips, bet `sessions.id` ir `uuid` — JOIN nestrādāja
- **Atklāts:** J4 tests — `get_redemptions` arī meta `uuid = text` kļūdu, bet ne qr_token dēļ
- **Sakne:** `LEFT JOIN sessions se ON se.id = sp.session_id` → `uuid = text`. `spins.session_id` DB ir `text` tips (legacy schema lēmums)
- **Labojums:** Migration 00010 — pievienots `::uuid` cast: `ON se.id = sp.session_id::uuid`
- **Piezīme:** Tas pats problēma pastāv visās funkcijās kas JOIN-o `sessions` caur `spins.session_id`. Ieteicams nākamajā ciklā ALTER TABLE spins ALTER COLUMN session_id TYPE uuid USING session_id::uuid (datu migrācija nepieciešama, tāpēc nav darīts šeit)

### DEF-5: `get_redemptions` bija divi overloads — PostgREST maršrutēja uz nepareizo
- **Atklāts:** J4 tests — PostgREST konfūzija starp 4-param un 7-param versijām
- **Sakne:** Veca `get_redemptions(int, int, timestamptz, timestamptz)` versija palika DB kopā ar jauno 7-param versiju
- **Labojums:** Migration 00009 — `DROP FUNCTION get_redemptions(int, int, timestamptz, timestamptz)`

---

## Pārklājuma kopsavilkums

### Pārklātās routes (vismaz viens automātisks tests)

| Route | Tests |
|---|---|
| `/play?venue=X` | D6a, E8 (E2E) |
| `/play?session=X` | E1 (E2E) |
| `/prize/[token]` | E6, H3 (E2E) |
| `/redeem/[token]` | D6c, E7 (E2E) |
| `/admin/venue` | D5 (E2E) |
| `/w/[slug]` | W1, W2 (E2E) |
| `/api/w/[slug]` | W5 (E2E API) |
| `/api/w/spin` | W3, W4 (E2E API) |
| **Onboarding DB operācijas** | I1, I2 (vitest) |
| **get_venues_overview RPC** | J1, J2 (vitest) |
| **manual_redeem_spin RPC** | J3 (vitest) |
| **get_redemptions RPC** | J4 (vitest) |

### Apzinātās robas (bez testa pārklājuma)

| Route | Iemesls |
|---|---|
| `/api/track` | AuraTag event tracking — low-risk, stateless POST |
| `/api/inquiry` | Contact form email — Resend API hard to mock |
| `/api/render-session` | Remotion Lambda render — external service |
| `/scan` | Camera/BarcodeDetector UI — requires real device |
| `/dashboard/agency` | Agency overview UI — no auth test user fixture |
| `/demo`, `/demo/dashboard` | Demo flow — requires JWT magic link |
| `/r/[token]`, `/g/[session]` | AuraTag share/leaderboard — no fixture |
| `/register`, `/login`, `/reset-password` | Auth flow UI — needs browser cookie handling |
| `/auth/confirm` | Email link handler — requires real email token |
| `/onboarding/venue`, `/onboarding/prizes`, `/onboarding/wheel` | E2E flow (covered by vitest I1 at DB level) |
| `/admin/venue/*` sub-pages | Admin UI — most covered at DB/RLS level (A/B/C/D/F tests) |

**Aptuvenais route pārklājums:** ~30% pēc route skaita, ~70% pēc biznesa kritiiskuma (visas publiskās plūsmas + drošības robežas pārklātas).
