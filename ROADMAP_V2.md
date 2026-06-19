# ROADMAP V2 — Spillit

No V1 (multi-tenant SaaS + Spin Reward + AuraTag) uz V2: monetizācija, pašapkalpošanās, white-label.
Prioritāte = ieņēmumu atbloķēšana + biznesa autonomija. Nebūvē augstāku slāni, pirms zemākais stāv.

---

## STATUS: Kas ir izdarīts (V1 + S-sprinti kopsavilkums)

- ✅ **V1.1** — Auth + RBAC + RLS izolācija (Supabase Auth, 3 lomas + agency_admin)
- ✅ **V1.2** — Super-admin (venue CRUD, seats, client_admin provisioning + reset/delete)
- ✅ **V1.3** — Klienta admin (balvas, personāls, jautājumi, teksti, statistika)
- ✅ **V1.4a** — Activities + bookings (manuāli + CSV) + staff-aktivētā sesija + QR
- ✅ **V1.4b** — Session play flow + atribūcija (staff/activity)
- ✅ **V1.4c** — copy_strings rediģējami LV/EN teksti
- ✅ **V1.4d-1** — QR-loss recovery (/prize lapa + SMS ar Twilio)
- ✅ **V1.5** — Animētais rats + skaņa + UI polish (PrizeWheel, FunWheel, Wheel komponentes)
- ✅ **S1** — Widget DB schema (wheels, wheel_segments, wheel_form_fields, leads)
- ✅ **S2** — Widget: public embed (widget.js) + spin flow (/api/w/spin) + e-pasts + webhook URL
- ✅ **S3** — Widget: embed kods UI + analytics (/dashboard/widgets/[id]/analytics) + preview + agency overview (/dashboard/agency)
- ✅ **Demo** — Magic-link demo piekļuve (/demo, /api/demo/request-access, demo_magic_links)
- ✅ **AuraTag** — game_sessions, game_results, /r/[token], /g/[session], share_events, OG attēls, Remotion Phase 1
- ✅ **CI/CD** — GitHub Actions (lint → type-check → test → build) + Vercel deploy

Pabeigto sprinta migrācijas līdz **00004_demo_support**.

---

## NĀKAMIE SOĻI

---

## V2.1 — Redemption & Prize management

**Mērķis:** Slēgt lopu uz balvu izlietošanu — izsekot, apstiprināt, novērst viltojumus.

**Kas iekšā:**
- QR skenēšana pie kases (mobils vai stacionārs) → `/redeem/[token]`
- `prize_code` validācija endpoint: verificē kodu, maina `spins.status = 'redeemed'`
- "Izlietots" statuss ar `redeemed_at` timestamp
- Redemption history admin lapā: kas, kad, kurš darbinieks apstiprināja
- Brīdinājums ja tiek mēģināts atkārtoti izlietot vienu kodu

**DB delta:**
```sql
spins + redeemed_by_staff_id uuid references staff  -- kurš apstiprināja
leads + redeemed boolean default false
leads + redeemed_at timestamptz
```

**SPOF / risks:**
- QR var tikt kopēts/printēts — vajag server-side validāciju, ne tikai QR izskatu
- Offline redemption (nav interneta pie kases) — fallback uz kodu manuālu ievadi

**Apjoms:** M (3–5 dienas)

---

## V2.2 — Billing & Stripe

**Mērķis:** Pārvērst platformu par pašapkalpošanās SaaS ar automatizētu maksājumu iekasēšanu.

**Kas iekšā:**
- Stripe subscription checkout (monthly/annual)
- Plan enforcement — feature flags pēc `venues.plan` vērtības
  - Free: tikai Spin Reward + Staff Rating
  - Starter/Pamata/Viss: atbloķē attiecīgos moduļus
- Rēķini un maksājumu vēsture admin lapā
- `venues.billing_status` izmaiņas: `active`, `trialing`, `past_due`, `cancelled`
- Webhook no Stripe → automātisks plāna atjauninājums

**DB delta:**
```sql
venues + stripe_customer_id text
venues + stripe_subscription_id text
venues + plan_expires_at timestamptz
billing_events (id, venue_id, event_type, amount_cents, created_at)
```

**SPOF / risks:**
- Stripe webhook verifikācija jāveic ar `STRIPE_WEBHOOK_SECRET`
- Graceful degradation — ja klients nemaksā, neizslēdz uzreiz, dod 7 dienu grācijas periodu
- Esošie klienti manuāli pārsūtīti uz Stripe — nav automātiskas migrācijas

**Apjoms:** L (7–10 dienas)

---

## V2.3 — Venue self-onboarding

**Mērķis:** Ļaut jauniem klientiem reģistrēties un uzstādīt pirmo ratu bez super_admin iejaukšanās.

**Kas iekšā:**
- Publiska reģistrācijas forma (nosaukums, e-pasts, parole)
- E-pasta verifikācija ar Supabase Auth
- Onboarding wizard (3 soļi):
  1. Venue info (nosaukums, kategorija, logotips)
  2. Pirmā balva (vienkārša forma ar 3 balvām)
  3. Pirmais rats (auto-slug, default segmenti)
- Pēc pabeigšanas → redirect uz `/dashboard/widgets`
- Super_admin informēšana (Resend e-pasts) par jaunu reģistrāciju

**DB delta:**
```sql
venues + onboarded_at timestamptz  -- kad pabeigts onboarding wizard
venues + category text             -- 'lasertag', 'restaurant', 'bar', u.c.
```

**SPOF / risks:**
- Spam reģistrācijas — rate limit + e-pasta verifikācija
- Trialā nepabeigtā onboardinga venue uzkrājās — vajag cleanup job

**Apjoms:** M (4–6 dienas)

---

## V2.4 — Remotion Phase 2 (personalizēts video)

**Mērķis:** Katrs AuraTag spēlētājs saņem personalizētu MP4 ar saviem stats.

**Kas iekšā:**
- Remotion Lambda aktivizēšana production vidē
- Per-player personalizēts MP4 (`callsign`, `kd_ratio`, `accuracy`, `shots_fired` iegults video)
- AWS Lambda + S3 → Supabase Storage `cards-rendered`
- `game_results.share_video_url` aizpildīšana
- `/api/render-session` jau uzbūvēts — vajag tikai production env vars

**Konfigurācija:**
```
REMOTION_AWS_REGION=eu-central-1
REMOTION_LAMBDA_FN=remotion-render-XXXX
REMOTION_SERVE_URL=https://your-remotion-serve-url
```

**DB delta:** Nav (share_video_url kolonna jau eksistē)

**SPOF / risks:**
- Lambda cold start — pirmais render var aizņemt 15–30s
- Render kļūme = spēlētājs saņem template video (fallback jau iestrādāts)
- AWS izmaksas: ~$0.05–0.20 uz render — jāmonitorē apjoms

**Apjoms:** L (5–8 dienas, galvenokārt infrastruktūra)

---

## V2.5 — Advanced analytics

**Mērķis:** Dziļāka datu analīze, kas palīdz klientiem saprast sava biznesa tendences.

**Kas iekšā:**
- UTM izsekošana widget leads (utm_source, utm_medium, utm_campaign — jau glabājas DB)
- Konversijas funnel vizualizācija: skatījumi → formas atvēršana → iesniegšana
- Export uz CSV (leads saraksts, analytics dati)
- E-pasta atskaites (iknedēļas kopsavilkums ar Resend — top metrics)
- Salīdzinājums pa periodiem (šī nedēļa vs. iepriekšējā)

**DB delta:**
```sql
leads + funnel_step text  -- 'view', 'form_open', 'submitted'
analytics_snapshots (id, wheel_id, date, views, leads, spins, captured_at)
```

**SPOF / risks:**
- E-pasta biežums — klients var atrakstīties; vajag preferences
- CSV eksports lieliem datiem — paginācija vai async generation

**Apjoms:** M (4–6 dienas)

---

## V2.6 — White-label & custom domain

**Mērķis:** Enterprise klienti var paslēpt Spillit branding un izmantot savu domēnu.

**Kas iekšā:**
- Pielāgots logotips/krāsas uz widget (daļēji jau ir: `brand_color`, `logo_url`)
- `show_powered_by` toggle jau eksistē — vajag tikai enforcement
- Custom subdomain (venue.spillit.lv) ar Vercel Domains API
- Remove Spillit branding pilnībā (Enterprise plāns)
- Pielāgots e-pasta sūtītājs (venue@customdomain.com ar Resend custom domain)

**DB delta:**
```sql
venues + custom_domain text      -- 'spini.mazaisbar.lv'
venues + domain_verified_at timestamptz
venues + email_from_domain text  -- pielāgots sūtītājs
```

**SPOF / risks:**
- DNS verifikācija var kavēties (propagācija līdz 48h)
- Vercel Domains API rate limits
- Custom domain SSL sertifikāti — automātiski ar Let's Encrypt caur Vercel

**Apjoms:** L (8–12 dienas)

---

## ZINĀMAIS PARĀDS

*(No ROADMAP_V1.md + papildinājumi pēc audita)*

| Parāda vienums | Prioritāte | Piezīmes |
|---|---|---|
| Stripe Connect (tip tracking) | M | Pašlaik Revolut links — nav izsekošanas; Stripe Connect dod pilnu tips vēsturi |
| Multi-venue vienam client_admin | M | Pašlaik client_admin = 1 venue; agency_admin risina daļēji |
| `spin_wheel` rate-limit | H | Bez rate-limit var spiest bezgalīgi (API layer) |
| Audit log | L | Nav izsekošanas, kas rediģēja ko un kad |
| V1.4d-2: Google reconciliation | L | venues.user_ratings_total izsekošana; atlikts pēc MVP |
| V1.4d-3: Calendar→bookings | L | Google Calendar ingestion; atlikts pēc MVP |
| Seat overage enforcement | M | Pašlaik tikai flagošana, nav cietā bloka |
| Analytics export (CSV) | M | Nav CSV eksporta widget leads sarakstam |
| E-pasta triggers no widget spin | M | Pašlaik webhook URL — nav built-in e-pasta sekvences |
| RLS pārbaude agency_admin wheels | H | Jāverificē, ka agency_admin redz tikai savas org venues wheels |
| Vitest `fileParallelism: false` | H | Obligāts, pretējā gadījumā testi kļūst nestabili |

---

## ARHITEKTŪRAS LĒMUMI (fiksēti)

1. **`/play` + `/redeem` + `/r/[token]` + `/w/[slug]` paliek anonīmi.** Auth tikai admin + staff.
2. **Staff-aktivēta sesija = spin pamats.** Darbinieks logojas → aktivizē → QR → klients skenē.
3. **Seat = billing vienība.** Super-admin nosaka seats; client_admin nevar pārsniegt.
4. **Balvas QR vienmēr atkārtoti atverams** (links), SMS ir papildu.
5. **Novērtējuma jautājumi datu-vadīti** (`review_questions`), ne hardkodēti.
6. **Widget: iframe izolācija.** `widget.js` inject iframe → `postMessage` komunikācija ar host lapu.
7. **Vienas puses widget sesija:** `localStorage` bloķē dubultspēlēšanu; server-side `one_spin_per_email` check.
8. **Agency loma:** `profiles.organization_id` → filtrē venues; super_admin redz visu.
9. **Remotion Phase 1:** template video (nav personalizācijas); Phase 2 aktivizējas ar REMOTION_* env.
10. **Demo:** magic-link (bez Supabase Auth sesijas), `is_demo=true` venue, rate-limit 3/24h.
11. **Anti-fraud:** data-binding (sesija ↔ booking ↔ staff) + Google reconciliation. Atturēšana, ne ciets bloks.
12. **ALLOWED_ROLES = `['client_admin', 'agency_admin', 'super_admin']`** — šis saraksts pārbaudāms `actions.ts` un visos route handlers.

---

*Izveidots: 19.06.2026. Bāzēts uz koda audita.*
