# Spillit — Moduļu, funkciju un savstarpējo savienojumu apraksts

> Šis dokuments apraksta VISAS Spillit sistēmas darbības, moduļus un to savienojumus.
> Tehnoloģijas: Next.js 16.2.7 (App Router), React 19.2.4, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS 4.

---

## 1. SISTĒMAS ARHITEKTŪRA

```
Spillit platforma
├── Publiskā daļa (klientiem)
│   ├── /                     — Landing page (moduļi, cenas, kontaktforma; LV/EN)
│   ├── /moduli               — Detalizēts moduļu un cenu saraksts
│   ├── /play                 — Laimes rats (klienta skats, anon)
│   ├── /prize/[token]        — Balvas QR + detaļas
│   ├── /redeem/[token]       — Kasieres apstiprināšanas ekrāns
│   ├── /r/[token]            — AuraTag spēlētāja rezultāts (share karte)
│   ├── /g/[session]          — AuraTag sesijas leaderboard
│   ├── /w/[slug]             — Web widget lapa (embed iframe mērķis)
│   ├── /[venueSlug]          — Venue publiskā lapa
│   └── /demo/dashboard       — Demo admin panelis (magic-link piekļuve)
│
├── Widget Dashboard (client_admin / agency_admin / super_admin)
│   ├── /dashboard/widgets          — Ratu saraksts (toggle active, basic stats)
│   ├── /dashboard/widgets/new      — Jauna rata izveides veidlapa
│   ├── /dashboard/widgets/[id]/segments — Segmentu (sektoru) konfigurācija
│   ├── /dashboard/widgets/[id]/form     — Formas lauki + GDPR teksts
│   ├── /dashboard/widgets/[id]/preview  — Rata priekšskatījums
│   ├── /dashboard/widgets/[id]/embed    — Embed kods + QR kods
│   ├── /dashboard/widgets/[id]/analytics — Analīze (skatījumi, leads, konversija)
│   └── /dashboard/agency          — Aģentūras multi-venue pārskats
│
├── Admin panelis (venue admins)
│   ├── /admin                    — Novirza pēc lomas
│   ├── /admin/venue              — Galvenā vadības paneļa lapa
│   ├── /admin/venue/prizes       — Balvu konfigurācija
│   ├── /admin/venue/ledger       — Balvu grāmatvedība
│   ├── /admin/venue/staff        — Darbinieku pārvaldība
│   ├── /admin/venue/staff/[id]   — Atsevišķa darbinieka stats
│   ├── /admin/venue/activities   — Aktivitāšu tipi
│   ├── /admin/venue/bookings     — Rezervāciju kalendārs
│   ├── /admin/venue/stats        — Statistikas pārskats
│   ├── /admin/venue/questions    — Atsauksmju jautājumi
│   ├── /admin/venue/texts        — UI tekstu pielāgošana
│   ├── /admin/venue/instructions — Venue instrukcijas
│   ├── /admin/venue/upsell       — Moduļu papildus piedāvājums
│   ├── /admin/today              — Šodienas/tuvāko sesiju saraksts
│   └── /admin/session            — Aktīvā sesija (QR ģenerēšana)
│
└── Super admin (sistēmas līmenī)
    ├── /admin/venues             — Visu venue saraksts
    ├── /admin/venues/[id]        — Venue iestatījumi
    └── /admin/venues/new         — Jauna venue izveide
```

---

## 2. AUTENTIFIKĀCIJA UN LOMAS

### Lomas (profiles.role)

| Loma | Piekļuve |
|---|---|
| `super_admin` | Visas venue, visi dati, widget dashboard |
| `client_admin` | Tikai sava venue; widget dashboard sava venue wheels |
| `agency_admin` | Vairākas venues vienas organizācijas ietvaros; agency overview |
| `staff` | Tikai sesiju aktivizēšana (admin/session, admin/today) |

### Auth plūsma (server-side)

```
createClient()           ← lib/supabase/server.ts (@supabase/ssr)
  → getUser()            ← pārbauda Supabase Auth sesiju
  → profiles query       ← iegūst role + venue_id + organization_id
  → role check           ← ALLOWED_ROLES = ['client_admin','agency_admin','super_admin']
  → ja nepieciešamas DB ops bez RLS → getAdmin() (lib/supabase/admin.ts, service role)
```

### RLS aizsardzība (Row Level Security)

- Supabase RLS ar custom `auth_role()` un `auth_venue_id()` funkcijām
- Visi RPC ir `SECURITY DEFINER` — droši no klienta puses
- Tabulas: `reviews`, `spins`, `vouchers`, `review_answers` — aizsargātas
- `share_events` — bez anon politikas, raksta tikai service role

---

## 3. DATUBĀZES GALVENĀS TABULAS

### 3.1 Venue / Auth tabulas

| Tabula | Apraksts |
|---|---|
| `venues` | Venue konfigurācija: nosaukums, slug, plans, billing, moduļu toggle, widget iestatījumi |
| `profiles` | Lietotāja loma un venue_id / organization_id (piesaiste Supabase Auth) |

### 3.2 Spin Reward tabulas

| Tabula | Apraksts |
|---|---|
| `staff` | Darbinieki: vārds, tips karte, aktīvs/neaktīvs |
| `activities` | Aktivitāšu tipi (piem. "Lāzertags Pro"), ar default darbinieku |
| `bookings` | Rezervācijas ar visiem laukiem |
| `sessions` | Aktīvā spin sesija, piesaistīta booking un darbiniekam |
| `spins` | Laimes rata griezieni: prize_id, status, qr_token, termiņš |
| `prizes` | Balvu katalogs: vārds, weight, termiņš, atlikums |
| `reviews` | Klientu atsauksmes: rating, comment, google_redirected |
| `review_answers` | Atbildes uz konkrētiem jautājumiem |
| `review_questions` | Konfigurējamie atsauksmju jautājumi |
| `tips` | Tips maksājumi: amount_cents, staff_id, status |
| `staff_evaluations` | Vadītāja novērtējumi darbiniekiem |
| `copy_strings` | Rediģējami lokalizēti teksti (LV/EN) |

### 3.3 Widget tabulas (jaunas)

| Tabula | Apraksts |
|---|---|
| `wheels` | Web widget rata konfigurācija |
| `wheel_segments` | Rata sektori ar balvām un krājuma kontroli |
| `wheel_form_fields` | Pielāgoti lauki formas kolekcijai |
| `leads` | Iesniegtie e-pasti + balvas kodi no widget |

### 3.4 AuraTag tabulas

| Tabula | Apraksts |
|---|---|
| `game_sessions` | Lāzertaga spēles sesija (vairāki spēlētāji) |
| `game_results` | AuraTag/LaserTag spēlētāju spēles rezultāti |
| `share_events` | Izsekošana sociālo tīklu dalīšanas notikumiem |

### 3.5 Demo / papildu tabulas

| Tabula | Apraksts |
|---|---|
| `demo_magic_links` | Demo piekļuves magic links (derīgi 1 stundu) |
| `module_inquiries` | Kontaktformas ieraksti (pieteikumi moduļiem) |

---

## 4. WIDGET MODUĻI (S1–S3)

### 4.1 Web Widget embed modulis

**Apraksts:** Laimes rats, ko var iegult jebkurā mājas lapā ar vienu `<script>` tagu.

**Embed kods:**
```html
<script src="https://app.spillit.lv/widget.js" data-wheel="SLUG"></script>
```

**Trigeris:** `public/widget.js` — vanilla JS, bez atkarībām. Atbalsta:
- `delay` — parāda pēc N sekundēm
- `exit_intent` — parāda, kad pele atstāj logu
- `scroll_pct` — parāda pēc N% scroll
- `element_click` — parāda, kad klikšķina uz `[data-spillit-trigger]` elementu
- `inline` — ievieto pie `[data-spillit-inline]` elementa
- `direct_link` — parāda uzreiz

**Popup iframe plūsma:**
```
widget.js (client mājaslapa)
  → fetch /api/w/{slug}        — iegūst wheel konfigurāciju
  → setTimeout/mouseleave/scroll
  → izveido #spillit-overlay div + iframe
  → iframe src = /w/{slug}?mode=popup
  → /w/{slug} lapa (Next.js)
  → WheelPage komponente
  → aizpilda formu → POST /api/w/spin
  → postMessage({type:'spillit:close'}) vai {type:'spillit:converted'}
  → overlay aizveras; localStorage.setItem('spillit_{slug}', Date.now())
```

**Vienas puses sesija:** `localStorage` glabā, vai lietotājs jau spēlējis (`spillit_{slug}`). Ja `one_spin_per_email=true` — DB pārbaude.

---

### 4.2 Rata izveide (Wheel Builder)

**Rata veidi:**
- `web_widget` — iegulstams jebkurā mājaslapā
- `campaign_lp` — atsevišķa kampaņas lapa

**Vizuālie temati:** `light`, `dark`, `brand`, `festive`

**Lokalizācija:** `lv`, `en`, `ru`, `lt`

**`wheels` tabulas kolonnas:**

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `venue_id` | uuid | Venue piesaiste (FK uz venues) |
| `organization_id` | uuid (null) | Organizācijas piesaiste (agency) |
| `name` | text | Rata nosaukums (admin redzams) |
| `slug` | text unique | URL draudzīgs identifikators |
| `type` | text | `web_widget` vai `campaign_lp` |
| `active` | boolean | Vai rats aktīvs (public) |
| `trigger_type` | text | `delay`, `exit_intent`, `scroll_pct`, `element_click`, `inline`, `direct_link` |
| `trigger_value` | integer (null) | Sekundes vai % atkarībā no trigger_type |
| `display_type` | text | `popup` vai `inline` |
| `style_theme` | text | `light`, `dark`, `brand`, `festive` |
| `brand_color` | text | Hex krāsa (#RRGGBB) |
| `logo_url` | text (null) | Brenda logo URL |
| `show_powered_by` | boolean | Rāda "Powered by Spillit" |
| `one_spin_per_email` | boolean | Vienas spēles limits uz e-pastu |
| `form_show_name` | boolean | Rāda vārda lauku formā |
| `form_show_phone` | boolean | Rāda telefona lauku formā |
| `form_require_name` | boolean | Vārds obligāts |
| `form_require_phone` | boolean | Telefons obligāts |
| `gdpr_text` | text (null) | GDPR piekrišanas teksts |
| `survey_enabled` | boolean | Ieslēgt aptaujas jautājumus |
| `webhook_url` | text (null) | Webhook URL (POST pēc katras spēles) |
| `locale` | text | `lv`, `en`, `ru`, `lt` |
| `total_views` | integer | Kopējie widget skatījumi (counter) |
| `total_leads` | integer | Kopējie leads (counter) |
| `total_spins` | integer | Kopējie spini (counter) |
| `created_at` | timestamptz | Izveides laiks |
| `updated_at` | timestamptz | Pēdējās izmaiņas |

---

### 4.3 Rata segmenti (Wheel Segments)

**`wheel_segments` tabulas kolonnas:**

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `wheel_id` | uuid | FK uz wheels |
| `label` | text | Segmenta teksts uz rata |
| `color` | text | Hex krāsa (#RRGGBB) |
| `prize_type` | text | Balvas veids |
| `prize_value` | integer (null) | Balvas vērtība (piem. % atlaide) |
| `prize_description` | text (null) | Pilns balvas apraksts |
| `prize_code` | text (null) | Manuāli ierakstīts kods |
| `auto_code` | boolean | Ja true — ģenerē random 8 zīmju kodu |
| `probability_weight` | integer | Svars (relatīvā varbūtība) |
| `stock` | integer (null) | Sākotnējais krājums |
| `remaining` | integer (null) | Atlikušais krājums |
| `expires_days` | integer | Koda derīguma dienas |
| `active` | boolean | Vai segments aktīvs |
| `sort_order` | integer | Kārtošanas secība |
| `created_at` | timestamptz | Izveides laiks |

---

### 4.4 Formas lauki (Wheel Form Fields)

**`wheel_form_fields` tabulas kolonnas:**

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `wheel_id` | uuid | FK uz wheels |
| `field_type` | text | Lauka veids (piem. `text`, `select`, `date`) |
| `label` | text | Lauka nosaukums lietotāja skatā |
| `placeholder` | text (null) | Placeholder teksts |
| `required` | boolean | Vai lauks obligāts |
| `sort_order` | integer | Kārtošanas secība |
| `active` | boolean | Vai lauks aktīvs |

---

### 4.5 Lead Capture

**Spin plūsma:**
```
/w/{slug} → aizpilda e-pastu (+ opcionāli: vārds, telefons, custom lauki)
  → POST /api/w/spin
    → pārbauda one_spin_per_email
    → izloses loģika (svērtā izloze no aktīviem segmentiem)
    → ieraksta leads tabulu
    → decrementē remaining (ja krājums iestatīts)
    → inkrementē total_leads + total_spins uz wheels
    → atgriež { segment, prize_code, segment_index }
  → rāda balvu klientam
```

**`leads` tabulas kolonnas:**

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `wheel_id` | uuid | FK uz wheels |
| `venue_id` | uuid | FK uz venues |
| `segment_id` | uuid | FK uz wheel_segments (uzvara) |
| `email` | text | E-pasta adrese (lowercase) |
| `name` | text (null) | Vārds |
| `phone` | text (null) | Telefona numurs |
| `form_data` | jsonb | Pielāgoto lauku vērtības |
| `prize_code` | text (null) | Izsniegts balvas kods |
| `locale` | text | Valoda |
| `trigger_type` | text (null) | Kāds triggers aktivizēja widget |
| `utm_source` | text (null) | UTM avots |
| `utm_medium` | text (null) | UTM medijs |
| `utm_campaign` | text (null) | UTM kampaņa |
| `referrer_url` | text (null) | Iepriekšējā lapas URL |
| `gdpr_consent` | boolean | GDPR piekrišana |
| `gdpr_consent_at` | timestamptz (null) | Piekrišanas laiks |
| `created_at` | timestamptz | Izveides laiks |

---

### 4.6 Webhook integrācija

`wheels.webhook_url` — ja aizpildīts, pēc katras veiksmīgas spēles tiek nosūtīts POST pieprasījums uz norādīto URL ar šādiem datiem:

```json
{
  "email": "klienta@email.lv",
  "name": "Klienta vārds",
  "phone": "+37129xxxxxx",
  "prize_code": "ABCD1234",
  "segment_label": "Segmenta nosaukums",
  "wheel_slug": "mana-kampana"
}
```

Konfigurācija: `dashboard/widgets/new` → "Webhook URL" lauks.

---

### 4.7 Analytics (Widget)

**`GET /api/widget/[slug]/analytics`** — autentificēts endpoint:

Atgriež:
- `totals`: total_views, total_leads, conversion_pct, active_days
- `daily_leads`: leads pa dienām (pēdējās 30 dienas)
- `segment_breakdown`: cik leads kuras sektors uzvarēja
- `utm_sources`: top 10 UTM avoti

**`/dashboard/widgets/[id]/analytics`** lapa — vizuāls pārskats ar bāru diagrammu, segmentu sadalījumu, UTM tabulu un pēdējiem 10 leads (e-pasts maskēts).

---

### 4.8 Agency / multi-venue pārskats

**`/dashboard/agency`** — pieejams `agency_admin` un `super_admin`:

- Org-līmeņa kopsavilkums: venues skaits, aktīvie wheels, leads šomēnes, kopējie leads
- Tabula ar katru venue: aktīvie wheels, kopējie leads, leads šomēnes, pēdējais lead
- Kārto pēc leads_month (aktīvākais augšā)

**Lomu atšķirība:**
- `agency_admin` — filtrē pēc `profiles.organization_id = venues.organization_id`
- `super_admin` — redz visu (bez filtra)

---

## 5. SPIN REWARD MODULIS

### 5.1 Kopsavilkums

Fiziskās venues klienta plūsma ar darbinieka atribūciju.

**Darbības:**
1. Admins/kasiere aktivizē sesiju → `activateBooking()` server action
2. Tiek izveidots `sessions` ieraksts ar booking_id, activity_id, staff_id
3. Klientam tiek parādīts QR kods → skenē → atver `/play?session=<id>`
4. Klientu ekrānā: privātums → jautājumi → spin animācija → balva
5. QR kods balvai → klients parāda kasierei
6. Kasiere skenē `/redeem/<qr_token>` → apstiprina → `redeemed_at` tiek uzrakstīts

**DB plūsma:**
```
sessions → spins (izveidots pēc spin) → prizes (saistīts)
spins.status: active → redeemed / expired
```

---

### 5.2 Darbinieku novērtējums

- Pielāgojami jautājumi (`review_questions` tabula)
- Vērtējums glabājas `reviews` tabulā (rating, comment, staff_id, activity_id)
- Detālas atbildes → `review_answers` (katrs jautājums atsevišķi)
- Per-darbinieka stats: `/admin/venue/staff/[id]`

---

### 5.3 Balvu Ledger

- Filtrēšana pa mēnešiem ar ← → navigāciju
- `get_prize_ledger_dated(venue_id, from, to)` RPC
- Katrai balvai: izsniegtas, gaida, beidzies, atlikums, derīgums
- Sarkana iezīmēšana ja `remaining < 5`
- CSV eksports

---

## 6. DATUBĀZES SHĒMA — PILNAIS APRAKSTS

### `venues`

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `name` | text | Venue nosaukums |
| `slug` | text unique | URL slug |
| `active` | boolean | Vai venue aktīvs |
| `seats` | integer | Atļautais darbinieku skaits |
| `plan` | text | Cenu plāns |
| `billing_status` | text | Billing statuss |
| `wheel_theme` | text | Rata vizuālais tēma (`simple`, `elegant`, `luxury`) |
| `google_place_id` | text (null) | Google Places ID |
| `meta_pixel_id` | text (null) | Meta Pixel ID |
| `is_demo` | boolean | Vai demonstrācijas venue |
| `logo_url` | text (null) | Logo attēla URL |
| `organization_id` | uuid (null) | FK uz organizāciju (agency) |
| moduļu toggle kolonnas | boolean | `module_tips_enabled`, `module_google_enabled`, u.c. |

### `profiles`

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | FK uz auth.users |
| `role` | text | `super_admin`, `client_admin`, `agency_admin`, `staff` |
| `venue_id` | uuid (null) | Venue piesaiste (null super_admin) |
| `organization_id` | uuid (null) | Organizācijas piesaiste (agency_admin) |
| `full_name` | text | Pilns vārds |
| `active` | boolean | Aktīvs |

### `game_sessions`

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `venue_id` | uuid | FK uz venues |
| `started_at` | timestamptz | Sākuma laiks |
| `ended_at` | timestamptz (null) | Beigu laiks |
| `status` | text | `active` vai `closed` |

### `game_results`

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `session_id` | uuid | FK uz game_sessions |
| `callsign` | text | Spēlētāja segvārds |
| `team` | text (null) | `red` vai `blue` |
| `top_class` | text (null) | `COMMANDO`, `SNIPER`, `WARRIOR` |
| `rating` | numeric(6,2) (null) | Kopsummārs reitings |
| `kd_ratio` | numeric(6,2) (null) | Kills/Deaths attiecība |
| `kd_plusminus` | integer (null) | K/D +/- |
| `accuracy` | numeric(6,2) (null) | Precizitāte (%) |
| `shots_fired` | integer (null) | Izšautie šāviņi |
| `hits` | integer (null) | Trāpījumi |
| `injuries` | integer (null) | Saņemtie trāpījumi |
| `team_hit_pct` | numeric(6,2) (null) | % trāpījumu uz komandu biedriem |
| `share_token` | text unique | Unikāls koplietošanas tokens (8-byte hex) |
| `share_video_url` | text (null) | Personalizēts MP4 (Remotion Phase 2) |
| `created_at` | timestamptz | Izveides laiks |

### `share_events`

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `share_token` | text | Saistīts ar game_results.share_token |
| `event_type` | text | `view` vai `share_click` |
| `network` | text (null) | `facebook`, `twitter`, `whatsapp`, u.c. |
| `anon_id` | text (null) | `gnl_aid` cookie vērtība |
| `referer` | text (null) | HTTP Referer |
| `ua` | text (null) | User-Agent |
| `created_at` | timestamptz | Notikuma laiks |

### `demo_magic_links`

| Kolonna | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `email` | text | E-pasta adrese |
| `token` | text unique | UUID-UUID formāts |
| `created_at` | timestamptz | Izveides laiks |
| `expires_at` | timestamptz | Derīguma laiks (1 stunda) |
| `used_at` | timestamptz (null) | Izlietošanas laiks |
| `ip_address` | text (null) | Pieprasītāja IP |

---

## 7. API MARŠRUTI

### 7.1 Publiskie API (bez auth)

| Maršruts | Metode | Apraksts |
|---|---|---|
| `/api/w/[slug]` | GET | Widget konfigurācija (publisks). Inkrementē total_views. `X-Spillit-Counted: 1` galvene novērš dubultskaitīšanu. |
| `/api/w/[slug]` | OPTIONS | CORS preflight |
| `/api/w/spin` | POST | Izlozes veikšana. Pieņem `{slug, email, name?, phone?, form_data?, gdpr_consent?, locale?, trigger_type?, utm_source?, utm_medium?, utm_campaign?, referrer_url?}`. Atgriež `{segment, prize_code, segment_index}`. |
| `/api/track` | POST | AuraTag share notikumu izsekošana. Pieņem `{token, event, network?}`. Raksta `share_events`. |

### 7.2 Autentificētie API

| Maršruts | Metode | Auth | Apraksts |
|---|---|---|---|
| `/api/inquiry` | POST | Nav | Moduļu pieteikumu forma. Glabā `module_inquiries`, sūta e-pastu uz gints@spillit.lv ar Resend. |
| `/api/redeem` | POST | Nav | Balvas apstiprināšana (alternatīva server action). |
| `/api/render-session` | POST | Supabase Auth | Remotion Lambda video renderēšana (Phase 2). Pieņem `{session_id}`. Renderē visus sesijas spēlētājus paralēli. |
| `/api/widget/[slug]/analytics` | GET | Supabase Auth + role check | Widget analītika. Atgriež totals, daily_leads, segment_breakdown, utm_sources. |

### 7.3 Demo API

| Maršruts | Metode | Apraksts |
|---|---|---|
| `/api/demo/request-access` | POST | Pieņem `{email}`, izveido magic link (derīgs 1 stundu), sūta demo e-pastu ar Resend. Rate limit: 3 pieprasījumi/24h uz e-pastu. |
| `/api/demo/verify` | POST | Verificē demo token. |
| `/demo/access` | GET | Route handler — novirza pēc token verifikācijas. |
| `/scan` | GET | Route handler — AuraTag QR skenēšana, novirza uz aktīvo sesiju. |

---

## 8. DASHBOARD LAPAS — PILNS SARAKSTS

### 8.1 Widget Builder (`/dashboard/`)

| Lapa | Pieejams | Apraksts |
|---|---|---|
| `/dashboard/widgets` | client_admin, agency_admin, super_admin | Ratu saraksts ar toggle active, leads skaitu, ātrās saites |
| `/dashboard/widgets/new` | client_admin, agency_admin, super_admin | Jauna rata izveide: nosaukums, tips, locale, tēma, trigeris, display, webhook URL |
| `/dashboard/widgets/[id]/segments` | client_admin, agency_admin, super_admin | Segmentu pārvaldība: pievienot/rediģēt/dzēst sektorus, svari, balvas kodi, krājums |
| `/dashboard/widgets/[id]/form` | client_admin, agency_admin, super_admin | Formas konfigurācija: vārds/telefons toggle, GDPR teksts, pielāgotie lauki |
| `/dashboard/widgets/[id]/preview` | client_admin, agency_admin, super_admin | Tiešraides priekšskatījums (pilna rata darba demonstrācija) |
| `/dashboard/widgets/[id]/embed` | client_admin, agency_admin, super_admin | Embed kods (`<script>`) + tiešās URL saite + QR kods (qrcode npm) |
| `/dashboard/widgets/[id]/analytics` | client_admin, agency_admin, super_admin | Analīze: skatījumi, leads, konversija %, bāru diagramma, segmentu sadalījums, UTM, pēdējie leads |
| `/dashboard/agency` | agency_admin, super_admin | Multi-venue pārskats: leads pa venues, aktīvie wheels |

### 8.2 Admin panelis (`/admin/`)

| Lapa | Pieejams | Apraksts |
|---|---|---|
| `/admin` | Visi autorizēti | Novirza pēc lomas |
| `/admin/venue` | client_admin, super_admin | Galvenā vadības lapa |
| `/admin/venue/prizes` | client_admin, super_admin | Balvu CRUD ar svaru un derīgumu |
| `/admin/venue/ledger` | client_admin, super_admin | Balvu grāmatvedība pa mēnešiem + CSV eksports |
| `/admin/venue/staff` | client_admin, super_admin | Darbinieku CRUD + tips saite |
| `/admin/venue/staff/[id]` | client_admin, super_admin | Per-darbinieka atsauksmes, vadītāja novērtēšanas forma |
| `/admin/venue/activities` | client_admin, super_admin | Aktivitāšu tipi (Lāzertags, Airsoft, u.c.) |
| `/admin/venue/bookings` | client_admin, super_admin | Rezervāciju nedēļas skats, CSV imports, aktivizēšana |
| `/admin/venue/stats` | client_admin, super_admin | Statistikas pārskats (7d/30d/Viss) |
| `/admin/venue/questions` | client_admin, super_admin | Atsauksmju jautājumu konfigurācija |
| `/admin/venue/texts` | client_admin, super_admin | UI tekstu pielāgošana (copy_strings) |
| `/admin/venue/instructions` | client_admin, super_admin | Venue instrukcijas |
| `/admin/venue/upsell` | client_admin, super_admin | Moduļu papildus piedāvājums |
| `/admin/today` | staff, client_admin, super_admin | Šodienas sesiju saraksts |
| `/admin/session` | staff, client_admin, super_admin | Aktīvā sesija, QR ģenerēšana |
| `/admin/venues` | super_admin | Visu venue saraksts |
| `/admin/venues/[id]` | super_admin | Venue iestatījumi |
| `/admin/venues/new` | super_admin | Jauna venue izveide |

---

## 9. CENU PLĀNI

*(No `app/moduli/page.tsx`)*

| Plāns | Cena | Iekļautie moduļi |
|---|---|---|
| **Free** | €0 | Spin Reward + Darbinieku novērtējums |
| **Starter** | €29/mēn | Free + Tips + Google atsauksmju atgādinājums |
| **Pamata** | €59/mēn | Starter + Spin+Meta + Digital Stamps (populārākais) |
| **Viss kopā** | €119/mēn | Pamata + Lead Capture + Leads sildīšana + Maiņu grafiks |
| **Onboarding** | individuāli | Pēc pieprasījuma |
| **AuraTag** | individuāli | Pēc pieprasījuma |

---

## 10. MODUĻU CENU SARAKSTS (individual add-ons)

| Modulis | Cena |
|---|---|
| Spin Reward | Bezmaksas |
| Darbinieku novērtējums | Bezmaksas |
| Tips | no €9/mēn |
| Google atsauksmju atgādinājums | no €11/mēn |
| Spin+Meta | no €11/mēn |
| Lead Capture | no €7/mēn |
| Leads sildīšana | no €7/mēn |
| Digital Stamps | no €10/mēn |
| Maiņu grafiks | no €25/mēn |
| Onboarding | individuāli |

---

## 11. INTEGRĀCIJU KARTE

### 11.1 Resend (e-pasts)

- `lib/resend.ts` — `sendInquiryEmail()` — kontaktformas ziņojums uz gints@spillit.lv
- `lib/email.ts` — `sendDemoAccessEmail()` — demo piekļuves magic link e-pasts
- From: `Spillit <noreply@spillit.lv>`

### 11.2 Twilio (SMS)

- `lib/twilio.ts` — `sendSms(to, body)` — QR zaudēšanas novēršana
- Konfigurācija: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Opcionāls — ja nav konfigurēts, balvas QR joprojām pieejams caur tiešu saiti

### 11.3 QR kods

- `qrcode` npm pakete (v1.5.4)
- Izmantots: `/dashboard/widgets/[id]/embed` — ģenerē QR uz `/w/{slug}` tiešo URL

### 11.4 Remotion Lambda (video)

- `@remotion/lambda` v4.0.477, `@remotion/cli`, `remotion`
- `/api/render-session` — renderē personalizētus MP4 AuraTag spēlētājiem
- Saglabā S3 → Supabase Storage `cards-rendered`
- Konfigurācija: `REMOTION_AWS_REGION`, `REMOTION_LAMBDA_FN`, `REMOTION_SERVE_URL`
- Phase 2 — vēl nav production aktīvs

### 11.5 Google Places

- `venues.google_place_id` → izveido `https://search.google.com/local/writereview?placeid=<id>` saiti

### 11.6 Meta (Facebook/Instagram)

- `venues.meta_pixel_id` → Spin+Meta modulis ievada pikseli `/play` lapā

### 11.7 Revolut / Stripe

- `staff.stripe_tip_link` → Tips modulis, novirza klientu uz darbinieka Revolut/Stripe saiti

```
Spillit
  ├── Supabase (DB + Auth + RLS + Storage)
  │     ├── reviews ←→ spins ←→ prizes
  │     ├── bookings ←→ sessions
  │     ├── game_results ←→ share_events
  │     └── wheels ←→ wheel_segments ←→ leads
  │
  ├── Resend (e-pasts)
  │     ├── /api/inquiry → admina e-pasts
  │     └── /api/demo/request-access → demo magic link
  │
  ├── Twilio (SMS, opcionāls)
  │     └── QR zaudēšanas SMS
  │
  ├── Remotion Lambda (AWS, Phase 2)
  │     └── /api/render-session → personalizēts MP4 → CDN
  │
  ├── qrcode (npm)
  │     └── /dashboard/widgets/[id]/embed → QR attēls
  │
  ├── Google Places API
  │     └── venues.google_place_id → Review saite klientiem
  │
  ├── Meta (Facebook/Instagram)
  │     └── venues.meta_pixel_id → Spin+Meta modulis
  │
  └── Revolut / Stripe
        └── staff.stripe_tip_link → Tips modulis
```

---

## 12. RPC FUNKCIJAS

Visi RPCs ir `SECURITY DEFINER` ar atbilstošām piekļuves pārbaudēm.

| RPC | Parametri | Apraksts |
|---|---|---|
| `get_bookings` | venue_id, from, to | Bookings ar JOIN aktivitāte+staff+has_spin |
| `get_prize_ledger` | venue_id | Ledger bez datuma filtra (pilns) |
| `get_prize_ledger_dated` | venue_id, from, to | Ledger ar datuma filtru |
| `get_staff_reviews` | venue_id, staff_id, from, to | Per-darbinieka atsauksmes |
| `get_result_by_token` | p_token | AuraTag spēlētāja rezultāts (anon pieejams) |
| `get_session_results` | p_session | Visi sesijas spēlētāji (anon pieejams) |
| `redeem_spin` | qr_token | Balvas apstiprināšana (maina status uz 'redeemed') |

---

## 13. TEHNOLOĢIJU SARAKSTS

| Kategorija | Tehnoloģija |
|---|---|
| Framework | Next.js 16.2.7 (App Router) |
| UI | React 19.2.4, Tailwind CSS 4 |
| Datubāze | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (@supabase/ssr 0.12.0) |
| Video | Remotion 4.0.477 + @remotion/lambda (Phase 2) |
| E-pasts | Resend (lib/resend.ts, lib/email.ts) |
| SMS | Twilio (lib/twilio.ts) |
| QR | qrcode 1.5.4 |
| Validācija | Zod 4.3.6 |
| Testi | Vitest 4.1.8 (`fileParallelism: false`) + Playwright |
| Deploy | Vercel (GitHub Actions → amondnet/vercel-action) |
| CI | GitHub Actions (lint → type-check → test → build) |

---

*Dokuments pārskatīts: 19.06.2026. Projekts: spinreward/spin-reward (master branch).*
