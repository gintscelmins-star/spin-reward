# ARHITEKTŪRA — Spillit

Tehnisko lēmumu, sistēmas struktūras un komponentu savstarpējo savienojumu apraksts.

---

## 1. PROJEKTA STRUKTŪRA

```
spin-reward/
├── app/                          # Next.js 16 App Router maršruti
│   ├── page.tsx                  # Landing page (LV/EN toggle)
│   ├── moduli/page.tsx           # Moduļu + cenu saraksts
│   ├── play/page.tsx             # Spin Reward klienta plūsma (anon)
│   ├── prize/[token]/page.tsx    # Balvas QR + detaļas (anon)
│   ├── redeem/[token]/page.tsx   # Kasieres apstiprināšana (anon)
│   ├── r/[token]/page.tsx        # AuraTag share karte (anon)
│   ├── g/[session]/page.tsx      # AuraTag leaderboard (anon)
│   ├── w/[slug]/page.tsx         # Widget iframe lapa (anon)
│   ├── [venueSlug]/page.tsx      # Venue publiskā lapa
│   ├── login/page.tsx            # Supabase Auth login
│   ├── demo/
│   │   ├── page.tsx              # Demo pieprasījuma lapa
│   │   ├── dashboard/page.tsx    # Demo admin panelis
│   │   └── access/route.ts       # Demo token verifikācija + redirect
│   ├── scan/route.ts             # AuraTag QR → aktīvā sesija
│   ├── admin/                    # Venue admin panelis
│   │   ├── page.tsx              # Novirza pēc lomas
│   │   ├── venue/                # Klienta admin lapas
│   │   │   ├── page.tsx          # Galvenā vadības lapa
│   │   │   ├── prizes/           # Balvu CRUD
│   │   │   ├── ledger/           # Balvu grāmatvedība
│   │   │   ├── staff/            # Darbinieku pārvaldība
│   │   │   │   └── [staffId]/    # Per-darbinieka stats
│   │   │   ├── activities/       # Aktivitāšu tipi
│   │   │   ├── bookings/         # Rezervāciju kalendārs
│   │   │   ├── stats/            # Statistikas pārskats
│   │   │   ├── questions/        # Atsauksmju jautājumi
│   │   │   ├── texts/            # copy_strings UI teksti
│   │   │   ├── instructions/     # Venue instrukcijas
│   │   │   └── upsell/           # Moduļu upsell lapa
│   │   ├── today/page.tsx        # Šodienas sesiju saraksts
│   │   ├── session/page.tsx      # Aktīvā sesija + QR
│   │   └── venues/               # Super-admin venue pārvaldība
│   │       ├── page.tsx          # Visu venue saraksts
│   │       ├── [id]/page.tsx     # Venue iestatījumi
│   │       └── new/page.tsx      # Jauna venue izveide
│   ├── dashboard/                # Widget builder + agency
│   │   ├── widgets/
│   │   │   ├── page.tsx          # Ratu saraksts
│   │   │   ├── new/page.tsx      # Jauna rata izveide
│   │   │   └── [id]/
│   │   │       ├── segments/     # Segmentu konfigurācija
│   │   │       ├── form/         # Formas lauki + GDPR
│   │   │       ├── preview/      # Tiešraides priekšskatījums
│   │   │       ├── embed/        # Embed kods + QR
│   │   │       └── analytics/    # Analytics pārskats
│   │   └── agency/page.tsx       # Multi-venue pārskats
│   └── api/
│       ├── w/
│       │   ├── [slug]/route.ts   # GET widget config (publisks)
│       │   └── spin/route.ts     # POST spin (publisks)
│       ├── widget/
│       │   └── [slug]/analytics/ # GET analytics (auth)
│       ├── inquiry/route.ts      # POST kontaktforma
│       ├── track/route.ts        # POST AuraTag events
│       ├── redeem/route.ts       # POST balvas apstiprināšana
│       ├── render-session/       # POST Remotion render
│       └── demo/
│           ├── request-access/   # POST demo magic link
│           └── verify/           # POST token verifikācija
├── components/
│   ├── PrizeWheel.tsx            # Animētais laimes rats
│   ├── FunWheel.tsx              # Alternatīvs rats
│   ├── Wheel.tsx                 # Bāzes rata komponente
│   ├── SessionFlow.tsx           # Klienta spin flow
│   ├── WheelSubNav.tsx           # Widget dashboard nav
│   ├── LogoutButton.tsx
│   ├── ContactForm.tsx
│   ├── ClientTypeSection.tsx
│   ├── admin/LaserstatsBanner.tsx
│   └── share/
│       ├── ShareCard.tsx         # AuraTag stats + video
│       └── ShareSheet.tsx        # Dalīšanās apakšlapa
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # createClient() — SSR (cookies)
│   │   ├── admin.ts              # getAdmin() — service role
│   │   ├── client.ts             # createClient() — browser
│   │   └── public.ts             # createPublicClient() — anon
│   ├── resend.ts                 # sendInquiryEmail()
│   ├── email.ts                  # sendDemoAccessEmail()
│   ├── twilio.ts                 # sendSms()
│   ├── fmt.ts                    # fmtDate/Time/DateTime
│   ├── result.ts                 # AuraTag GameResult tipi
│   ├── track.ts                  # Share event utils
│   └── demo-auth.ts              # Demo token verifikācija
├── public/
│   └── widget.js                 # Embed skripts (vanilla JS)
├── supabase/
│   └── migrations/               # SQL migrācijas (00001–00004)
├── .github/
│   └── workflows/
│       ├── ci.yml                # Lint + type-check + test + build
│       └── deploy.yml            # Vercel deploy
├── docs/
│   ├── SPILLIT_MODULI.md         # Moduļu un API apraksts
│   ├── ARCHITECTURE.md           # Šis fails
│   └── how-it-works.md           # AuraTag share how-it-works
├── AGENTS.md                     # Aģentu instrukcijas (tech stack, patterns)
├── CLAUDE.md                     # Claude Code entry point (@AGENTS.md)
├── ROADMAP_V1.md                 # V1 pabeigto sprinti
├── ROADMAP_V2.md                 # V2 plāns
└── package.json                  # Atkarības
```

---

## 2. AUTH ARHITEKTŪRA

### Lomas un piekļuve

```
Supabase Auth (auth.users)
        |
        v
    profiles tabula
    ┌─────────────────────────────────────────────────────┐
    │ id          → auth.users.id                         │
    │ role        → 'super_admin' | 'client_admin' |      │
    │               'agency_admin' | 'staff'              │
    │ venue_id    → venues.id (null ja super_admin)       │
    │ organization_id → (null ja nav agency)              │
    └─────────────────────────────────────────────────────┘
              |
    ┌─────────┼──────────┬──────────────┐
    |         |          |              |
super_admin  client_admin  agency_admin  staff
    |         |          |              |
 Visi venues  Savs venue  Org venues    Sesijas
 Visi dati   savi dati   sava org      aktivizēšana
```

### RLS politikas

```
Tabula           | Anon | staff | client_admin | agency_admin | super_admin
reviews          |  -   |  -    |  Savs venue  |      -       | Visi
spins            |  -   |  -    |  Savs venue  |      -       | Visi
vouchers         |  -   |  -    |  Savs venue  |      -       | Visi
review_answers   |  -   |  -    |  Savs venue  |      -       | Visi
game_sessions    |  -   |  -    |  Savs venue  |      -       | Visi
game_results     |  -   |  -    |  Savs venue  |      -       | Visi
share_events     |  -   |  -    |      -       |      -       | Service role
wheels           |  -   |  -    |  Savs venue  | Savas org    | Visi
leads            |  -   |  -    |  Savs venue  | Savas org    | Visi
```

SECURITY DEFINER funkcijas (anon pieejamas):
- `get_result_by_token(token)` — AuraTag rezultāts
- `get_session_results(session_id)` — AuraTag leaderboard
- `redeem_spin(qr_token)` — balvas apstiprināšana

### Auth plūsma diagramma

```
Browser request
    |
    v
createClient() [lib/supabase/server.ts]
    → @supabase/ssr → cookies()
    |
    v
supabase.auth.getUser()
    → validē JWT no cookie
    |
    v
profiles SELECT WHERE id = user.id
    → iegūst role + venue_id
    |
    ├── role ∉ ALLOWED_ROLES → 403/redirect
    |
    └── role ∈ ALLOWED_ROLES
            |
            ├── client_admin: filtrē pēc venue_id
            ├── agency_admin: filtrē pēc organization_id
            └── super_admin: bez filtriem
```

---

## 3. DB SHĒMA KOPSAVILKUMS

### Visas tabulas vienuviet

| Tabula | Mērķis | Galvenās kolonnas |
|---|---|---|
| `venues` | Venue konfigurācija | name, slug, active, seats, plan, billing_status, wheel_theme, google_place_id, meta_pixel_id, is_demo, organization_id |
| `profiles` | Lietotāju lomas | id (= auth.users), role, venue_id, organization_id, full_name, active |
| `staff` | Darbinieki | name, venue_id, stripe_tip_link, active, daily_spin_limit, staff_code |
| `activities` | Aktivitāšu tipi | name, venue_id, active |
| `bookings` | Rezervācijas | booking_ref, customer_name, customer_phone, activity_id, staff_id, starts_at, ends_at, player_count, status, source |
| `sessions` | Spin sesijas | venue_id, staff_id, activity_id, booking_id, status, created_at |
| `spins` | Rata griezieni | session_id, prize_id, status, qr_token, redeemed_at, venue_id, staff_id, activity_id |
| `prizes` | Balvu katalogs | name, probability_weight, valid_days, remaining, venue_id, active |
| `reviews` | Klientu atsauksmes | session_id, rating, comment, staff_id, google_redirected, venue_id |
| `review_answers` | Detālas atbildes | review_id, question_id, rating, venue_id |
| `review_questions` | Jautājumu konfigurācija | venue_id, label, type, sort_order, active |
| `tips` | Dzeramnaudas | staff_id, amount_cents, status, venue_id |
| `staff_evaluations` | Vadītāja novērtējumi | staff_id, venue_id, rating, notes, evaluated_at |
| `copy_strings` | Lokalizēti teksti | scope, venue_id, key, locale, value |
| `wheels` | Widget rata konfigurācija | venue_id, organization_id, name, slug, type, active, trigger_type, style_theme, webhook_url, total_views, total_leads |
| `wheel_segments` | Rata sektori | wheel_id, label, color, prize_type, prize_code, auto_code, probability_weight, stock, remaining |
| `wheel_form_fields` | Formas lauki | wheel_id, field_type, label, required, sort_order |
| `leads` | Widget iesniegtie dati | wheel_id, venue_id, segment_id, email, name, phone, form_data, prize_code, gdpr_consent, utm_source |
| `game_sessions` | AuraTag spēles sesija | venue_id, started_at, ended_at, status |
| `game_results` | Spēlētāju rezultāti | session_id, callsign, team, top_class, rating, kd_ratio, accuracy, share_token, share_video_url |
| `share_events` | Share izsekošana | share_token, event_type, network, anon_id, referer |
| `demo_magic_links` | Demo piekļuve | email, token, expires_at, used_at, ip_address |
| `module_inquiries` | Kontaktformas | name, company, phone, email, message, modules[] |

### RPC funkcijas

| Funkcija | Anon | Apraksts |
|---|---|---|
| `get_result_by_token(p_token)` | Jā | AuraTag spēlētāja dati |
| `get_session_results(p_session)` | Jā | Sesijas visi spēlētāji |
| `get_bookings(p_venue_id, from, to)` | Nē | Rezervācijas ar JOIN |
| `get_prize_ledger_dated(venue_id, from, to)` | Nē | Balvu ledger ar datumu |
| `get_staff_reviews(venue_id, staff_id, from, to)` | Nē | Per-darbinieka atsauksmes |
| `redeem_spin(qr_token)` | Nē | Balvas apstiprināšana |

---

## 4. API DIZAINS

### REST principi

- **Publiskas** routes: bez auth, CORS `*` (widget embed)
- **Auth** routes: Supabase JWT cookie + profiles role check
- **Admin** routes: service role (`getAdmin()`) DB operācijām

### Kļūdu formāts

```json
{ "error": "error_code_vai_teksts" }
```

HTTP kodi:
- `400` — Bad request (trūkst lauku, JSON parse error)
- `401` — Nav auth (nav JWT)
- `403` — Nav tiesību (nepareiza loma)
- `404` — Nav atrasts
- `409` — Konflikts (`already_spun`)
- `422` — Neapstrādājams (`no_segments`, `out_of_stock`)
- `429` — Rate limit
- `500` — Server error
- `503` — Serviss nav konfigurēts (Remotion nav env vars)

### CORS

Widget API (`/api/w/*`) pieņem pieprasījumus no jebkuras izcelsmes:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

---

## 5. WIDGET ARHITEKTŪRA

```
Klienta mājaslapa (jebkurš domēns)
┌────────────────────────────────────────┐
│  <script src="app.spillit.lv/widget.js"│
│           data-wheel="SLUG">           │
└──────────────┬─────────────────────────┘
               │ (1) Lejupielādē skriptu
               v
        public/widget.js
        ───────────────
        (2) fetch /api/w/{slug}
               │
               v
        /api/w/[slug] (GET, publisks)
        ← { active, trigger_type, trigger_value,
            display_type, style_theme, ... }
               │
        (3) Uzstāda trigerus
        ┌──────┴─────────────────────────────┐
        │ delay | exit_intent | scroll_pct   │
        │ element_click | inline | direct    │
        └──────┬─────────────────────────────┘
               │ (4) Triggers aktivizējas
               v
        showPopup() vai showInline()
               │
        (5) Izveido overlay + iframe
        iframe.src = /w/{slug}?mode=popup
               │
               v
        /w/[slug] (Next.js page, getAdmin())
        ─────────────────────────────────────
        (6) Ielādē wheels + segments + form_fields
               │
               v
        WheelPage komponente (React 19)
        ─────────────────────────────────────
        (7) Lietotājs aizpilda formu + spin
               │
        (8) POST /api/w/spin
               │
               v
        /api/w/spin (POST, publisks, getAdmin())
        ─────────────────────────────────────────
        (9)  Pārbauda one_spin_per_email
        (10) Svērtā izloze no aktīviem segmentiem
        (11) INSERT leads
        (12) Decrementē remaining (ja stock)
        (13) Inkrementē total_leads, total_spins
        (14) Webhook POST (ja webhook_url)
        ← { segment, prize_code, segment_index }
               │
        (15) Rāda balvu klientam
               │
        (16) postMessage({type:'spillit:converted'})
               │
               v
        widget.js: aizver overlay
        localStorage.setItem('spillit_{slug}', now)
```

---

## 6. E-PASTS UN WEBHOOK PIPELINE

### Resend e-pasts

```
Kontaktforma (app/page.tsx vai /moduli)
    → POST /api/inquiry
    → module_inquiries INSERT
    → sendInquiryEmail() [lib/resend.ts]
    → Resend API POST /emails
    → uz gints@spillit.lv

Demo pieprasījums (/demo/page.tsx)
    → POST /api/demo/request-access
    → demo_magic_links INSERT
    → sendDemoAccessEmail() [lib/email.ts]
    → Resend API POST /emails
    → uz pieprasītāja e-pastu (magic link, 1 stunda)
```

### Webhook (widget spin)

```
POST /api/w/spin (veiksmīga izloze)
    → wheels.webhook_url != null
    → fetch(webhook_url, {
        method: 'POST',
        body: { email, name, phone, prize_code, segment_label, wheel_slug }
      })
    → Klients saņem notifikāciju (Zapier, Make, custom endpoint)
```

### SMS (Twilio, QR zaudēšanas novēršana)

```
Spin plūsma → klients norāda tālruni
    → sendSms(phone, qrUrl) [lib/twilio.ts]
    → Twilio REST API
    → Klients saņem SMS ar /prize/{token} saiti
```

---

## 7. CI/CD PIPELINE

```
git push → master/main
    │
    ├── GitHub Actions: ci.yml
    │   ├── Job: lint-and-type-check
    │   │   ├── npm ci
    │   │   ├── npm run lint (eslint)
    │   │   └── npm run type-check (tsc --noEmit)
    │   │
    │   ├── Job: test (pēc lint-and-type-check)
    │   │   ├── npm ci
    │   │   └── npm test -- --passWithNoTests (vitest run)
    │   │
    │   └── Job: build (pēc test)
    │       ├── npm ci
    │       └── npm run build (next build)
    │
    └── GitHub Actions: deploy.yml (paralēli, push uz master)
        └── amondnet/vercel-action@v25
            └── vercel --prod
```

Secrets CI:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`, `DEMO_JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`

Secrets Vercel deploy:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## 8. DEPLOYMENT

### Platforma: Vercel

- Production URL: `https://app.spillit.lv`
- Node.js: 20 (GitHub Actions)
- Next.js Turbopack (dev mode): `next dev`
- Build: `next build` (standard)

### Vides mainīgie Vercel Production

```
Obligāti:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  RESEND_API_KEY
  DEMO_JWT_SECRET
  NEXT_PUBLIC_APP_URL=https://app.spillit.lv
  NEXT_PUBLIC_SITE_URL=https://app.spillit.lv

Opcionāli (SMS):
  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_PHONE_NUMBER

Opcionāli (Remotion Phase 2):
  REMOTION_AWS_REGION
  REMOTION_LAMBDA_FN
  REMOTION_SERVE_URL
```

### Supabase

- Projekts: `heseorbhzcmanfkxqkkg.supabase.co`
- Storage buckets: `card-templates` (publisks), `cards-rendered` (publisks)
- RLS ieslēgts visām tabulām

---

## 9. ZINĀMIE IEROBEŽOJUMI

| Ierobežojums | Apraksts | Risks |
|---|---|---|
| Widget counter ne-atomisks | `total_views`, `total_leads`, `total_spins` tiek atjaunināti ar read-then-update, nevis `INCREMENT` — iespējama sacensība | Zems (counter, ne kritisks) |
| Remotion Phase 2 nav aktīvs | `/api/render-session` strādā tikai ar REMOTION_* env — bez tiem atgriež 503 | Zems (fallback video strādā) |
| Webhook bez retry | Ja klienta webhook endpoint ir bojāts, ziņa pazūd (fire-and-forget) | Vidējs |
| Demo rate limit nav IP-balstīts | Rate limit pārbauda tikai e-pastu (3/24h), ne IP | Zems |
| Seat overage bez cieta bloka | Pašlaik tikai flagošana — klients var pievienot vairāk staff nekā seats | Vidējs |
| `spin_wheel` bez rate-limit | Nav rate-limit uz `/api/w/spin` — teorētiski var sūtīt bezgalīgi | Vidējs (one_spin_per_email palīdz) |
| Agency RLS validācija | Nepieciešams verifikācija, ka agency_admin redz tikai savas org venues wheels caur RLS | Augsts (drošība) |
| AuraTag leaderboard bez paging | Lieli sesijas rezultāti tiek ielādēti uzreiz — potenciāli lēni | Zems (mazas sesijas) |
| CSV imports bez async | Lieli CSV faili tiek apstrādāti sinhroni — potenciāls timeout | Zems |
| Vitest `fileParallelism` | Ja nav `fileParallelism: false`, testi var kļūt nestabili uz šīs Next.js versijas | Augsts (CI) |

---

*Dokuments izveidots: 19.06.2026. Bāzēts uz koda audita (master branch).*
