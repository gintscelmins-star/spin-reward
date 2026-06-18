# Spillit — Moduļu, funkciju un savstarpējo savienojumu apraksts

> Šis dokuments apraksta VISAS Spillit sistēmas darbības, moduļus un to savienojumus.
> Tehnoloģijas: Next.js 16 (App Router), React 19, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS.

---

## 1. SISTĒMAS ARHITEKTŪRA

```
Spillit platforma
├── Publiskā daļa (klientiem)
│   ├── /              — Landing page (moduli, cenas, kontaktforma)
│   ├── /moduli        — Detalizēts moduļu un cenu saraksts
│   ├── /play          — Laimes rats (klienta skats)
│   ├── /prize/[token] — Balvas QR + detaļas
│   ├── /redeem/[token]— Kasieres apstiprināšanas ekrāns
│   └── /r/[token]     — LaserTag spēlētāja rezultāts (share karte)
│
├── Admin panelis (venue admins)
│   ├── /admin/venue          — Galvenā vadības paneļa lapa
│   ├── /admin/venue/prizes   — Balvu konfigurācija
│   ├── /admin/venue/ledger   — Balvu grāmatvedība
│   ├── /admin/venue/staff    — Darbinieku pārvaldība
│   ├── /admin/venue/staff/[id] — Atsevišķa darbinieka stats
│   ├── /admin/venue/activities — Aktivitāšu tipi
│   ├── /admin/venue/bookings — Rezervāciju kalendārs
│   ├── /admin/venue/stats    — Statistikas pārskats
│   ├── /admin/venue/questions— Atsauksmju jautājumi
│   ├── /admin/venue/texts    — UI tekstu pielāgošana
│   ├── /admin/venue/upsell   — Moduļu papildus piedāvājums
│   ├── /admin/today          — Šodienas/tuvāko sesiju saraksts
│   └── /admin/session        — Aktīvā sesija (QR ģenerēšana)
│
└── Super admin (sistēmas līmenī)
    ├── /admin/venues         — Visu venue saraksts
    └── /admin/venues/[id]    — Venue iestatījumi
```

---

## 2. AUTENTIFIKĀCIJA UN LOMAS

### Lomas (profiles.role)
| Loma | Piekļuve |
|---|---|
| `super_admin` | Visas venue, visi dati |
| `client_admin` | Tikai sava venue |
| `staff` | Tikai sesiju aktivizēšana |

### RLS aizsardzība (Row Level Security)
- Supabase RLS ar custom `auth_role()` un `auth_venue_id()` funkcijām
- Visi RPC ir `SECURITY DEFINER` — droši no klienta puses
- Tabulas: `reviews`, `spins`, `vouchers`, `review_answers` — aizsargātas

---

## 3. DATUBĀZES GALVENĀS TABULAS

| Tabula | Apraksts |
|---|---|
| `venues` | Venue konfigurācija: nosaukums, slug, plans, billing, moduļu toggle |
| `profiles` | Lietotāja loma un venue_id (piesaiste Supabase Auth) |
| `staff` | Darbinieki: vārds, tips karte, aktīvs/neaktīvs |
| `activities` | Aktivitāšu tipi (piem. "Lāzertags Pro"), ar default darbinieku |
| `bookings` | Rezervācijas ar visiem laukiem (skat. §4.5) |
| `sessions` | Aktīvā spin sesija, piesaistīta booking un darbiniekam |
| `spins` | Laimes rata griezieni: prize_id, status, qr_token, termiņš |
| `prizes` | Balvu katalogs: vārds, weight, termiņš, atlikums |
| `reviews` | Klientu atsauksmes: rating, comment, google_redirected |
| `review_answers` | Atbildes uz konkrētiem jautājumiem |
| `review_questions` | Konfigurējamie atsauksmju jautājumi |
| `tips` | Tips maksājumi: amount_cents, staff_id, status |
| `staff_evaluations` | Vadītāja novērtējumi darbiniekiem |
| `game_results` | AuraTag/LaserTag spēlētāju spēles rezultāti |
| `game_sessions` | AuraTag spēles sesija (vairāki spēlētāji) |
| `share_events` | Izsekošana sociālo tīklu dalīšanas notikumiem |

---

## 4. MODUĻI

### 4.1 🎡 Spin Reward — BEZMAKSAS (kodols)

**Apraksts:** Laimes rats pēc katras apmeklējuma reizes.

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

**Savienojumi:**
- `bookings` → `sessions` (1:1, pēc aktivizēšanas)
- `sessions` → `spins` (1:1)
- `spins` → `prizes` (many:1)
- `prizes` → `ledger` (stats agregācija)

**Admin funkcijas:**
- `/admin/venue/prizes` — balvu konfigurācija (svars, derīgums, atlikums)
- `/admin/venue/ledger` — izsniegtās/gaidošās/beigtās balvas pa mēnešiem

---

### 4.2 ⭐ Darbinieku novērtējums — BEZMAKSAS

**Apraksts:** Privātas atsauksmes ar 1–5 zvaigznēm + komentārs pēc sesijas.

**Darbības:**
1. Tiek ģenerēts pēc spin (tā paša sesijas flow ietvaros)
2. Klientam rādīti pielāgojami jautājumi (`review_questions` tabula)
3. Vērtējums glabājas `reviews` tabulā (rating, comment, staff_id, activity_id)
4. Detālas atbildes → `review_answers` (katrs jautājums atsevišķi)
5. Admins redz visu `/admin/venue/stats` → "Atsauksmju saraksts"

**Savienojumi:**
- `sessions` → `reviews` (1:1)
- `reviews` → `review_answers` (1:many)
- `reviews.staff_id` → `staff` (stats pa darbinieku)
- `reviews.google_redirected` → Google Review modulis

**Admin funkcijas:**
- `/admin/venue/questions` — jautājumu konfigurācija
- `/admin/venue/staff/[id]` — per-darbinieka atsauksmes pa datumu diapazoniem
- `get_staff_reviews(venue_id, staff_id, from, to)` — RPC ar filtriem

---

### 4.3 💛 Tips — no €9/mēn

**Apraksts:** Digitālā dzeramnauda caur Revolut/Stripe saiti.

**Darbības:**
1. Pēc laimes rata rezultāta — "Pateikt paldies?" ekrāns
2. Klientam redzams darbinieka vārds + Revolut/Stripe poga
3. Klikšķis → novirza uz darbinieka `stripe_tip_link`
4. Tips ieraksts → `tips` tabulā (amount_cents, status: pending/paid)

**Konfigurācija:**
- `staff.stripe_tip_link` — Revolut/Stripe URL katram darbiniekam
- `venues.module_tips_enabled` — ieslēgt/izslēgt moduli
- Darbiniekam jābūt aktīvam un ar aizpildītu saiti

**Savienojumi:**
- `sessions.staff_id` → `staff.stripe_tip_link`
- `tips` → `staff` (many:1)
- Stats: `/admin/venue/stats` → Tips sekcija

**Admin funkcijas:**
- `/admin/venue/staff/[id]` — Tips karte saites pievienošana

---

### 4.4 🔍 Google atgādinājums — no €11/mēn

**Apraksts:** Auto-piedāvājums atstāt Google atsauksmi tikai pēc labas pieredzes.

**Darbības:**
1. Pēc spin flow — ja rating ≥ slieksnis → rāda Google Review pogu
2. `reviews.google_redirected = true` ja klients noklikšķina
3. Admins redz % klientu kas tika novirzīti uz Google

**Konfigurācija:**
- `venues.module_google_enabled` — ieslēgts/izslēgts
- `venues.google_place_id` — Google Places ID (ģenerē pareizo saiti)

**Savienojumi:**
- `reviews.google_redirected` → stats aprēķinos
- `venues.google_place_id` → URL formēšana: `https://search.google.com/local/writereview?placeid=<id>`

---

### 4.5 📅 Rezervāciju sistēma — Paplašinātā (Papildu)

**Apraksts:** Pilna rezervāciju pārvaldība ar visiem laukiem, weekly skats, CSV imports.

**Bookings tabulas lauki:**
| Lauks | Tips | Apraksts |
|---|---|---|
| `id` | uuid | Primārā atslēga |
| `booking_ref` | text | Auto-ģenerēts cilvēkam lasāms kods |
| `venue_id` | uuid | Venue piesaiste |
| `customer_name` | text | Klienta vārds |
| `customer_phone` | text | Tālrunis |
| `activity_id` | uuid | Aktivitātes tips |
| `staff_id` | uuid | Piešķirtais instruktors |
| `starts_at` | timestamptz | Sākuma laiks |
| `ends_at` | timestamptz | Beigu laiks |
| `player_count` | integer | Spēlētāju skaits |
| `player_age_group` | text | Bērni / Pieaugušie / Jaukts |
| `occasion` | text | Gadījuma tips |
| `advance_paid` | boolean | Avanss samaksāts |
| `advance_amount` | numeric | Avansa summa |
| `notes` | text | Piezīmes |
| `status` | text | pending / confirmed / cancelled / completed |
| `source` | text | manual / csv / google_calendar / booking_system |

**Gadījuma tipi (occasion):** Dzimšanas diena, Korporatīvs, Atpūta, Vecpuišu ballīte, Cits

**Galvenās darbības:**
- Nedēļas skats ar ← → navigāciju, "Šī nedēļa" poga
- Klienta filtri: statuss, aktivitāte, instruktors, gadījums
- `+ Pievienot` → pilns modāls ar visiem laukiem
- `👁 Detaļas` → read-only modal ar kopējamu booking_ref
- `▶ Spin` → `activateBooking()` tieši no tabulas rindas
- `↑ Importēt CSV` → fails → priekšskatījums → batch insert

**CSV kolonnas:** `vards, talrunis, aktivitate, sakums, beigas, speletaji`

**RPC:** `get_bookings(p_venue_id, p_from, p_to)` — atgriež visus bookings ar JOIN aktivitāte+darbinieks+has_spin

**Savienojumi:**
- `bookings` → `sessions` (pēc aktivizēšanas, `booking_id` FK)
- `sessions` → `spins` → `prizes`
- `sessions` → `reviews`
- `bookings.activity_id` → `activities`
- `bookings.staff_id` → `staff`

---

### 4.6 📦 Balvu Ledger — (Iekļauts pamatkomplektā)

**Apraksts:** Grāmatvedības pārskats par izsniegtajām balvām.

**Darbības:**
- Filtrēšana pa mēnešiem ar ← → navigāciju
- `get_prize_ledger_dated(venue_id, from, to)` RPC

**Rādītāji katrai balvai:**
| Kolonna | Apraksts |
|---|---|
| Izsniegtas | Redeemed spins — norakstāmas kā izmaksas |
| Gaida | Active (termiņā) spins — saistība |
| Beidzies | Expired spins — var norakstīt |
| Atlikums | Fiziskais krājums (ja iestatīts) |
| Derīgums | QR koda derīgums dienās |

**Brīdinājumi:** Sarkana rinda ja `remaining < 5`

**Savienojumi:**
- `prizes` → `spins` (LEFT JOIN pa status un datumu)
- CSV eksports grāmatvedībai

---

### 4.7 📣 Spin+Meta — no €11/mēn

**Apraksts:** Facebook/Instagram pikseļa integrācija laimes ratā.

**Darbības:**
1. Kad klients skenē QR un atver spin lapu → Meta pikselis tiek iedarbināts
2. Klients tiek pievienots Facebook Custom Audience
3. Retargetinga reklāmas tiek rādītas faktiskajiem apmeklētājiem

**Priekšrocība pār mājaslapas pikseli:** Šis pikselis aktivizējas tikai tad, kad klients FIZISKI ir bijis vietā.

**Konfigurācija:** Meta Pixel ID jāievada venues iestatījumos.

---

### 4.8 📋 Lead Capture — no €7/mēn

**Apraksts:** E-pasta vākšana apmaiņā pret bonusu.

**Darbības:**
1. Spin flow ietvaros — pēc balvas — e-pasta forma
2. "Ievadi e-pastu → saņem papildu atlaidi/bonusu"
3. GDPR piekrišanas checkbox
4. Export uz Mailchimp/Brevo vai CSV

---

### 4.9 🎂 Leads sildīšana — no €7/mēn

**Apraksts:** Automātisks atgādinājums klientiem pirms nākamās gadadienas.

**Darbības:**
1. Sesijas laikā atzīmē klienta dzimšanas dienu/īpašo datumu
2. Gadu vēlāk — automātisks SMS/e-pasts ar personalizētu piedāvājumu
3. Pilnīgi automatizēts — bez manuālas iejaukšanās

---

### 4.10 🎫 Digital Stamps — no €10/mēn

**Apraksts:** Digitālā lojalitātes kartīte (bez fiziskas kartes).

**Darbības:**
1. Katrs apmeklējums += 1 zīmogs
2. Pēc N apmeklējumiem → auto-balva QR kods
3. Progress tiek rādīts klientam
4. Analīze: aktīvie vs. neaktīvie klienti

---

### 4.11 📅 Maiņu grafiks — no €25/mēn

**Apraksts:** Elastīga maiņu pārvaldība ar WhatsApp čeklistu.

**Darbības:**
- Maiņu plānošana pa darbinieku
- WhatsApp čeklists paveiktajam darbam
- Darbinieka uzdevumu izpildes atskaite
- Reāllaika pārbaude

---

### 4.12 🎓 Onboarding — individuāli

**Apraksts:** Strukturēta jauno darbinieku apmācība.

**Darbības:**
- Video + teksta + testu moduļi
- Vadītājs seko progresam
- Automātiskas atskaites uz e-pastu

---

### 4.13 🏷️ AuraTag — individuāli (skat. §5 - LaserTag stats)

Sīkāks apraksts atsevišķā sadaļā zemāk.

---

## 5. LASERTAG STATS / AURATAG MODULIS — DETALIZĒTS APRAKSTS

### 5.1 Kopsavilkums

AuraTag ir specializēts modulis lāzertaga (un līdzīgu kontaktjunktur spēļu) operatoriem. Tas ģenerē personalizētas statistikas kartes katram spēlētājam pēc katras spēles, ko spēlētāji var dalīties sociālajos tīklos.

**Divi galvenie komponenti:**
1. **`/public/laserstats/card.html`** — statiska HTML lapa ar komandasleaderboard un video karti (prototips/template)
2. **`/r/[token]`** — dinamiska Next.js lapa ar individuālā spēlētāja rezultātu

---

### 5.2 Datu struktūra

#### `GameResult` (lib/result.ts)
```typescript
interface GameResult {
  id: string
  session_id: string       // Spēles sesija (visi spēlētāji)
  callsign: string         // Spēlētāja segvārds
  team: string | null      // 'red' | 'blue' | null
  top_class: string | null // 'COMMANDO' | 'SNIPER' | 'WARRIOR'
  rating: number | null    // Kopsummārs reitings
  kd_ratio: number | null  // Kills/Deaths attiecība
  kd_plusminus: number|null// K/D +/-
  accuracy: number | null  // Precizitāte (%)
  shots_fired: number|null // Izšautie šāviņi
  hits: number | null      // Trāpījumi
  injuries: number | null  // Saņemtie trāpījumi
  team_hit_pct: number|null// % trāpījumu uz komandu biedriem
  share_token: string      // Unikāls koplietošanas tokens
  share_video_url: string|null // Personalizēts MP4 (Phase 2)
  created_at: string
}
```

#### `SessionPlayer` — visi spēlētāji vienā sesijā
```typescript
interface SessionPlayer {
  id: string
  callsign: string
  team: string | null
  top_class: string | null
  rating: number | null
  kd_ratio: number | null
  // ...tie paši lauki kā GameResult, bet bez share_video_url
}
```

---

### 5.3 Spēlētāja klases

| Klase | Apraksts |
|---|---|
| `COMMANDO` | Augstākais reitings — agresīvs spēlētājs |
| `SNIPER` | Augsta precizitāte, maz izšauto šāviņu |
| `WARRIOR` | Noklusējums — universāls spēlētājs |

Katrai klasei ir:
- Atbilstošs **promo video** (`/auratag/commando1.mp4`, u.c.)
- **Poster attēls** (video priekšskatījums)
- **Klases nosaukums** uz kartes

Funkcija: `classMedia(topClass)` → `{ video, poster, label }`

---

### 5.4 Komandu krāsu kodēšana

| Komanda | Latviskais nosaukums | Krāsa |
|---|---|---|
| `red` | Sarkanā | `#ff4d4d` |
| `blue` | Zilā | `#22dcff` |
| cits | (oriģinālais nosaukums) | `#aeb6c2` |

Funkcija: `teamLabel(team)` → `{ label, color }`

---

### 5.5 Video ģenerēšana — divas fāzes

#### Phase 1 (pašlaik aktīvs): Template fallback
- Visi spēlētāji saņem klases video (`commando1.mp4`)
- Nekāda personalizācija video iekšienē
- Ātrāk, bez papildus infrastruktūras

#### Phase 2 (nākotnē): Personalizēts MP4
- `game_results.share_video_url` tiek aizpildīts ar individuālu video saiti
- Videoklipā ir iegulti spēlētāja stats (callsign, rating, KD, precizitāte)
- Renderēts ar Remotion (`@remotion/lambda` — konfigurēts `serverExternalPackages`)
- Pēc renderēšanas → saglabāts kā CDN fails → ierakstīts `share_video_url`

Funkcija: `resultVideo(result)` — atgriež `share_video_url` vai fallback video

---

### 5.6 `/public/laserstats/card.html` — Leaderboard Template

**Mērķis:** Statisks HTML prototips/template kurā atspoguļots:

**Vizuālais dizains:**
- Tumšs militārs temats (`--bg: #07080e`, Orbitron + Chakra Petch fonts)
- Neon akcenti: ciānzils (`--cyan: #22dcff`), zelts (`--gold: #ffc63d`), sarkans (`--red: #ff4d4d`)
- Responsive grid: tabula (kreisā) + video karte (labā)

**Komponenti:**
1. **Leaderboard tabula** — visi sesijas spēlētāji ar rangu, callsign, komandu, klasi, reitingu, KD, precizitāti
2. **Tab navigācija** — pārslēgšanās starp skatiem (trophy, pulse, target, shield ikonas)
3. **Stats bloks** — detalizēti individuālie rādītāji (izšauti šāviņi, trāpījumi, injuries, komandas hit %)
4. **Video karte (9:16 formāts)**:
   - Video automātiskā atskaņošana (muted autoplay)
   - Pulzējošs atskaņošanas grozs ("breathe" animācija)
   - Skaņas pogas toggle
   - Video ilguma badge
5. **Dalīšanās pogas** — Share (violetā) un Ghost (pelēkā) pogas

---

### 5.7 `/r/[token]` — Dinamiskā Rezultātu Lapa

**URL:** `https://spillit.lv/r/<share_token>`

**Darbība:**
1. Token → `get_result_by_token(p_token)` RPC → `GameResult`
2. Ja token nav atrasts → `notFound()` (404)
3. Renderē `ResultClient` + `ShareCard` + `ShareSheet`

**Metadata dinamiskā ģenerēšana:**
```typescript
title: `${callsign} — ${top_class} | GUNSnLASERS`
description: `Reitings: X.XX · K:D: X.XX · Precizitāte: X.XX%`
og:image: /r/{token}/opengraph-image  (dinamiskais 1200×630 attēls)
og:video: {share_video_url}           (videoklips sociālajos tīklos)
twitter:card: 'player'                (video karte Twitter)
```

**Komponenti:**
- `ShareCard` — galvenā karte ar stats un video
- `ShareSheet` — dalīšanās apakšlapa (mobile bottom sheet)

---

### 5.8 Share (Dalīšanās) Sistēma

**Share URL struktūra:** `https://spillit.lv/r/<share_token>`

**Dalīšanās kanāli:**
- Facebook (OG tags → link preview ar poster attēlu)
- Twitter/X (player card ar video)
- WhatsApp (teksts + URL)
- Native Web Share API (mobilajās ierīcēs)

**Notikumu izsekošana** (`/api/track`):
```typescript
POST /api/track {
  share_token: string
  event: 'view' | 'share_click'
  network: 'facebook' | 'twitter' | 'whatsapp'
}
```
- Ieraksta `share_events` tabulā
- Uzstāda 1 gadu ilgu cookie `gnl_aid` anonīmai izsekošanai
- Ietver referreri un User-Agent

---

### 5.9 OG Attēls — Dinamiskā Ģenerēšana

**URL:** `/r/[token]/opengraph-image`

Ģenerē 1200×630 PNG attēlu ar:
- Spēlētāja callsign (liels teksts)
- Klases nosaukums (COMMANDO / SNIPER / WARRIOR)
- Galvenie rādītāji (Rating, K:D, Accuracy)
- Komandas krāsa
- GUNSnLASERS logo/zīmols

---

### 5.10 AuraTag Savienojumi ar pārējiem moduļiem

```
AuraTag (lasertag spēle)
    │
    ├── game_sessions ─── venue (1 venue var būt vairākas sesijas)
    │                          │
    │                          └── admin izskata statistiku
    │
    ├── game_results ─── share_token (unikāls katram spēlētājam)
    │        │
    │        ├── /r/[token] ──── OG image + metadata
    │        │                      │
    │        │                      └── Sociālie tīkli (FB/TW/WA)
    │        │
    │        └── share_events (izsekošana)
    │
    ├── Spin Reward (post-game spin)
    │       Pēc spēles klients var saņemt arī laimes rata QR
    │       → /play?session=<id>
    │
    └── Staff Rating (iespēja)
            Instruktora novērtēšana pēc AuraTag sesijas
```

---

### 5.11 AuraTag — Tehniskie Ierobežojumi un Nākotnes Plāni

**Phase 1 (pašlaik):**
- Video = klases template (visi COMMANDO saņem vienu un to pašu video)
- Nekāda Remotion renderēšana

**Phase 2 (plānots):**
- Remotion Lambda renderē personalizētu MP4 katram spēlētājam
- `@remotion/lambda` jau konfigurēts `serverExternalPackages`
- `/api/render-session` route gatavs rendēšanas API
- Personalizēts video → CDN → `game_results.share_video_url`

---

## 6. KLIENTU PLŪSMAS

### 6.1 Parastā Spin Reward plūsma

```
Kasiere/admins
    │
    ├─ /admin/today → redz rezervāciju sarakstu
    │
    ├─ Klikšķis "Aktivizēt" → activateBooking() server action
    │     Creates: sessions row (booking_id, activity_id, staff_id, venue_id)
    │
    ├─ /admin/session → izvēlas darbinieku + aktivitāti
    │     Generates: QR kods
    │
    └─ Drukā / parāda QR klientam
           │
           ▼
    Klients skenē QR → /play?session=<id>
           │
           ├─ Privātums / GDPR piekrišana
           ├─ Jautājumi (custom questions)
           ├─ Spin animācija
           ├─ Balvas atklāšana
           ├─ Tips piedāvājums (ja modulis aktīvs)
           ├─ Google review (ja rating augsts + modulis aktīvs)
           └─ QR kods balvai
                  │
                  ▼
    Kasiere skenē /redeem/<qr_token>
           │
           └─ APSTIPRINĀT poga → redeemed_at → zaļš ekrāns
```

### 6.2 Rezervācijas aktivizēšana no Booking saraksta

```
/admin/venue/bookings (nedēļas skats)
    │
    ├─ Tabulas rinda → klikšķis ▶ Spin
    │     → activateBooking(booking_id, venueId, activity_id, staff_id)
    │     → returns { sessionId } → router.refresh()
    │
    ├─ Tabulas rinda → 👁 → Detaļu modāls
    │     → "Aktivizēt Spin" poga modālā
    │
    └─ Tabulas rinda → Rediģēt
          → EditModal ar visiem laukiem
```

### 6.3 AuraTag spēlētāja plūsma

```
Lāzertaga sesija beidzas
    │
    └─ Sistēma ģenerē game_results (pa spēlētāju)
           │
           ├─ Katram spēlētājam: unikāls share_token
           │
           └─ SMS/ekrāna kods → /r/<share_token>
                  │
                  ├─ Redz savus stats + video (klases based)
                  ├─ Sees leaderboard (pārējie sesijas spēlētāji)
                  ├─ "DALĪTIES" → ShareSheet
                  │     ├─ Facebook (OG image + link)
                  │     ├─ Twitter (player card)
                  │     ├─ WhatsApp (teksts + URL)
                  │     └─ Native share (mobils)
                  │
                  └─ Notikums → /api/track → share_events
```

---

## 7. ADMIN STATISTIKAS PĀRSKATS

### 7.1 `/admin/venue/stats` — Galvenie rādītāji

**Periodi:** 7d / 30d / Viss

| Sekcija | Dati |
|---|---|
| Spini | Kopā, Aktīvs, Izpirkts, Beidzies |
| Balvu sadalījums | Histogramma pa balvām |
| Atsauksmes | Kopā, Google redirect % |
| Jautājumu vidējais | Vidējais vērtējums katram jautājumam |
| Tips | Kopā, Summa EUR, Gaidošie |
| Atsauksmju saraksts | Pēdējās 50 atsauksmes ar rating, staff, komentārs |
| Vadītāja novērtējumi | Pēdējie 20 novērtējumi |

### 7.2 `/admin/venue/staff/[id]` — Per-darbinieka stats

- Datumu diapazons (pielāgojams, noklusējums 30 dienas)
- Kopā sesijas, ar vērtējumu, vidējais reitings
- Tabula: katrs datums → aktivitāte → vērtējums → komentārs
- `get_staff_reviews(venue_id, staff_id, from, to)` RPC
- Vadītāja novērtēšanas forma (1–5 ★ + piezīmes)

### 7.3 `/admin/venue/ledger` — Balvu grāmatvedība

- Mēneša navigācija (← →)
- `get_prize_ledger_dated(venue_id, from, to)` RPC
- Katrai balvai: izsniegtas, gaida, beidzies, atlikums, derīgums
- Sarkana iezīmēšana ja `remaining < 5`
- CSV eksports

---

## 8. RPCs (Remote Procedure Calls)

Visi RPCs ir `SECURITY DEFINER` ar `auth_role()` un `auth_venue_id()` pārbaudi.

| RPC | Parametri | Apraksts |
|---|---|---|
| `get_bookings` | venue_id, from, to | Bookings ar JOIN aktivitāte+staff+has_spin |
| `get_prize_ledger` | venue_id | Ledger bez datuma filtra (pilns) |
| `get_prize_ledger_dated` | venue_id, from, to | Ledger ar datuma filtru |
| `get_staff_reviews` | venue_id, staff_id, from, to | Per-darbinieka atsauksmes |
| `get_result_by_token` | share_token | AuraTag spēlētāja rezultāts |
| `get_session_results` | session_id | Visi sesijas spēlētāji |
| `redeem_spin` | qr_token | Balvas apstiprināšana (maina status uz 'redeemed') |

---

## 9. API MARŠRUTI

| Maršruts | Metode | Apraksts |
|---|---|---|
| `/api/inquiry` | POST | Moduļu pieteikumu forma (nosūta e-pastu ar Resend) |
| `/api/track` | POST | AuraTag share notikumu izsekošana |
| `/api/redeem` | POST | Balvas apstiprināšana (alternatīva serverAction) |
| `/api/render-session` | POST | Remotion video renderēšanas iedarbināšana (Phase 2) |

---

## 10. CENU PLĀNI

| Plāns | Cena | Iekļautie moduļi |
|---|---|---|
| **Free** | €0 | Spin Reward + Darbinieku novērtējums |
| **Starter** | €29/mēn | Free + Tips + Google atgādinājums |
| **Pamata** | €59/mēn | Starter + Spin+Meta + Digital Stamps |
| **Viss kopā** | €119/mēn | Pamata + Lead Capture + Leads sildīšana + Maiņu grafiks |
| **Onboarding** | individuāli | Pēc pieprasījuma |
| **AuraTag** | individuāli | Pēc pieprasījuma |

---

## 11. TEHNOLOĢIJU SARAKSTS

| Kategorija | Tehnoloģija |
|---|---|
| Framework | Next.js 16.2.7 (Turbopack, App Router) |
| UI | React 19, Tailwind CSS |
| Datubāze | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email + password) |
| Video | Remotion + @remotion/lambda (Phase 2) |
| E-pasts | Resend |
| Tips | Revolut / Stripe (integrācija nākotnē v1.4) |
| Datumu formāts | DD.MM.YYYY HH:MM (visā admin UI, lib/fmt.ts) |
| Deploy | Vercel |

---

## 12. INTEGRĀCIJU SAVIENOJUMA KARTE

```
Spillit
  ├── Supabase (DB + Auth + RLS)
  │     ├── reviews ←→ spins ←→ prizes
  │     ├── bookings ←→ sessions
  │     └── game_results ←→ share_events
  │
  ├── Google Places API
  │     └── venues.google_place_id → Review saite klientiem
  │
  ├── Meta (Facebook/Instagram)
  │     └── venues.meta_pixel_id → Spin+Meta modulis
  │
  ├── Revolut / Stripe
  │     └── staff.stripe_tip_link → Tips modulis (klientam)
  │
  ├── Resend (e-pasts)
  │     └── /api/inquiry → admina e-pasts par jauniem pieteikumiem
  │
  ├── WhatsApp
  │     ├── Landing page kontakts
  │     └── Maiņu grafiks (čeklisti darbiniekiem)
  │
  └── Remotion Lambda (AWS)
        └── /api/render-session → personalizēts MP4 → CDN
```

---

*Dokuments ģenerēts: 2026-06-17. Projekts: spinreward/spin-reward (master branch).*
