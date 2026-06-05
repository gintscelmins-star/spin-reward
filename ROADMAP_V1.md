# ROADMAP V1 — SpinReward

No anonīma MVP uz multi-tenant SaaS ar 3 lomām, seat-billing un atribūciju.
Prioritāte = dependency secība + ieņēmumu atbloķēšana. Nebūvē augstāku slāni, pirms zemākais stāv.

---

## PROGRESS (resume punkts)
- ✅ **V1.1** Auth + RBAC + RLS izolācija
- ✅ **V1.2** Super-admin (venue CRUD, seats, client_admin provisioning + reset/delete patch)
- ✅ **V1.3a** Klienta admin: balvas + personāls CRUD (+ seat enforce, super_admin edit-any)
- ✅ **V1.3b** Novērtējumu jautājumi CRUD + venue statistika
- ✅ **V1.4a** activities + bookings (manuāli) + staff-aktivētā sesija + QR
- ⏭️ **NĀKAMAIS: V1.4b** — play plūsmas pārrakste uz sesiju: welcome → dinamiskie review (review_questions) → Google → spin, viss piesaistīts session/staff_id/activity/booking; per-staff reitings
- ⬜ V1.4c copy_strings (rediģējami LV/EN teksti) · V1.4d QR-loss recovery + Google reconciliation + ingestion adapteri · V1.5 vizuālie modeļi + skaņa

DB migrācijas pielietas līdz **0008**. Viss kods uz `preview-test` branch.

---

## KRITISKĀ ATZIŅA
MVP ir 100% anonīms. Tavs admin, klienta admin, seat-billing, darbinieku ID/atribūcija un per-staff novērtējumi **prasa auth + lomas + RLS izolāciju pa venue**. Tas ir pamats. Bez tā neviens admin modulis nav uzbūvējams. Tāpēc V1.1.

**Svarīgi:** klienta (apmeklētāja) `/play` plūsma PALIEK anonīma — apmeklētāji nelogojas. Auth tiek pievienots TIKAI adminam un personālam. Esošā spēles plūsma netiek salauzta, tikai paplašināta ar staff atribūciju.

---

## PRIORITĀŠU LOĢIKA (kāpēc šī secība)
1. **V1.1 Auth/RBAC** — atbloķē visu pārējo (dependency).
2. **V1.2 Super-admin** — atbloķē maksājošu klientu onboarding (ieņēmumi).
3. **V1.3 Klienta admin** — pašapkalpošanās vērtība, ko klients pērk (ieņēmumi).
4. **V1.4 Plūsma + atribūcija + lasertag** — produkta reālā operacionālā loģika.
5. **V1.5 Vizuālie modeļi + skaņa** — diferenciācija, polish (pēdējais, nav blockeris pirmajam klientam).

---

## SPRINT V1.1 — AUTH + RBAC + MULTI-TENANT (pamats)
**Mērķis:** lomas, datu izolācija pa venue. Bez tā nekas no admina nestrādā.

Iekšā:
- Supabase Auth (email/parole, magic link)
- 3 lomas: `super_admin` (Gints), `client_admin` (venue īpašnieks), `staff` (personāls)
- RLS izolācija: client_admin/staff redz TIKAI sava venue datus; super_admin redz visu
- `/play` un `/redeem` paliek publiski (anon caur RPC)

Datu modeļa delta:
```
profiles (
  id uuid pk references auth.users,
  role text check (role in ('super_admin','client_admin','staff')),
  venue_id uuid references venues,   -- null super_admin
  full_name text, active bool
)
```
- RLS politikas pārrakstīt visām tabulām pēc `profiles.role` + `venue_id`

SPOF / risks:
- Auth refaktors skar esošās RLS politikas — testēt, ka anon `/play` flow neapstājas.
- `security definer` RPC jāpārbauda, lai tie respektē venue izolāciju (pievienot venue check).

---

## SPRINT V1.2 — SUPER-ADMIN MODULIS (Gints)
**Mērķis:** onboardēt un pārvaldīt klientus. Atbloķē maksājošus klientus.

Iekšā:
- Venue CRUD — pievienot / atslēgt (deaktivēt) klientu
- **Seat pārvaldība** — apstiprināt lietotāju (personāla) skaitu; tas ir billing pamats (klients maksā par katru lietotāju)
- Edit-any: super_admin var rediģēt jebkuru klienta puses konfigurāciju, ja klientam rodas vajadzība
- Klientu saraksts ar statusu (active, seats, plan)

Datu modeļa delta:
```
venues + seats int, plan text, billing_status text
```
SPOF: seat overage loģika — ja klients pievieno vairāk staff nekā seats, jāflago (enforce V1.3).

---

## SPRINT V1.3 — KLIENTA ADMIN MODULIS (venue īpašnieks)
**Mērķis:** pašapkalpošanās konfigurācija + statistika. Tā ir vērtība, ko klients pērk.

Iekšā:
- **Balvas/pakalpojumi CRUD ar % (vinests)** — esošā `prizes` tabula (probability_weight = vinests %), pievienot UI
- **Personāls CRUD** — pievienot darbiniekus; katram sava tip karte (`stripe_tip_link`/Revolut) + unikāls staff ID
- **Seat enforce** — nevar pievienot vairāk staff nekā venue.seats (vai flago overage)
- **Dienas spin limits** — klients nosaka, cik spinu dienā drīkst izmantot personāls (per staff vai per venue)
- **Konfigurējami novērtējuma jautājumi pa venue** — apkalpošana / atmosfēra / ēdiens / spēle / instruktors; klients ieslēdz pēc vajadzības (bāris ≠ spēļu istaba)
- **Statistikas dashboard** — spini (kas griezts, kas vinnēts, kurš darbinieks aktivizēja), per-staff novērtējumi

Datu modeļa delta:
```
staff + daily_spin_limit int, staff_code text unique

review_questions (
  id, venue_id, label, type text check (type in ('stars','thumbs')),
  sort_order int, active bool
)
review_answers (
  id, review_id references reviews, question_id references review_questions, rating int
)
```
SPOF: vecā `reviews.rating` (single) → migrē uz `review_answers` (multi); saglabā backward-compat vai migrē datus.

---

## SPRINT V1.4 — PLŪSMA + ATRIBŪCIJA + LASERTAG MODULIS
**Mērķis:** reālā operacionālā plūsma ar staff atribūciju un spēļu piesaisti.

Modelis: **staff-aktivēta sesija**. Darbinieks (ielogojies) → "Aktivizēt spin" → izvēlas spēli → sistēma izveido `session` ar staff_id + activity + laiku → rāda QR `/play?session={id}` → klients skenē → viss spins/review piesaistās šai sesijai.

Iekšā:
- Staff aktivizē savu QR (sesija nes staff_id) → rāda klientam
- Jaunā klienta plūsma: **Welcome** ("Paldies par apmeklējumu! Novērtējiet mūs un grieziet laimes ratu ar balvām!") → 1-3 novērtējuma jautājumi (dinamiski no `review_questions`) → Google review → spin → balva + QR
- **QR zaudēšanas novēršana** — balvas QR nosūta uz SMS (Twilio) / e-pastu (Resend) + atkārtoti atverams links; ja klients aizver netīšām, balva nepazūd
- **Lasertag modulis** — instruktors izvēlas: Lasertag / Airsoft / Reball / Kartingi / VR / Pixeli / Paintball → sistēma fiksē spin laiku + piesaista konkrētai spēlei → var autentificēt par kuru spēli un kuram klientam novērtējums saņemts
- **Dienas spin limita enforce** — sesijas izveidē pārbaude pret staff.daily_spin_limit
- **Per-staff personiskais novērtējums** — agregējas no review_answers, kur session.staff_id = X (instruktora reitings), saglabājas DB
- **ANTI-FRAUD = data-binding + atbildība (NE OTP — berze nogalina konversiju):** klienta identitāte nāk no rezervācijas (kalendāra), kur jau ir vārds + telefons + laiks + spēle. Sesija piesaistās rezervācijai → atsauksme/spin savelkas: spēle ↔ klients ↔ laiks ↔ instruktors. Aizpildot atsauksmi, klienta vārds parādās no rezervācijas.
  - **Google = vienīgais reālais autorizators** (klients logojas Google, lai iesniegtu). Sistēma nevar to apstiprināt per-review, BET fiksē venue `user_ratings_total` (Places API) un rāda **atsauksmes-bez-Google attiecību per instruktors**. Augsta attiecība → flag → jautājumi instruktoram.
  - Robeža: tā ir atturēšana + atbildība, ne ciets bloks. Pieņemams kompromiss zemai berzei.

Datu modeļa delta:
```
activities (id, venue_id, name, active)   -- venue-konfigurējams spēļu saraksts

sessions (
  id uuid pk, venue_id, staff_id references staff,
  activity_id references activities, status, created_at
)
spins + session_id uuid references sessions, staff_id, activity_id
spins + customer_contact text  -- opcionāls, QR atkārtotai nosūtīšanai

-- ANTI-FRAUD / klienta identitāte no rezervācijas
bookings (
  id uuid pk, venue_id, customer_name, customer_phone,
  activity_id references activities, starts_at, ends_at,
  source text,       -- 'google_calendar' | 'booking_system' | 'manual'
  external_id text   -- dedup ar avotu
)
sessions + booking_id uuid references bookings   -- lasertag sesija piesaistās rezervācijai
venue_google_snapshots (id, venue_id, user_ratings_total, captured_at)  -- Google reconciliation

copy_strings (
  id, scope ('global'|'venue'), venue_id (null=global),
  key text, locale ('lv'|'en'), value text
)   -- rediģējami lokalizēti saskarsmes teksti; venue override → global fallback
```
- `spin_wheel` RPC: pieņem `session_id`, ielasa staff_id + activity no sesijas, ieraksta spinā
- Play plūsma lasa atrisinātos copy_strings (NE hardkodētus tekstus)
SPOF: SMS/e-pasta piegāde var krist → balvas QR VIENMĒR jābūt atkārtoti atveramam caur links, ne tikai SMS.

---

## SPRINT V1.5 — VIZUĀLIE MODEĻI + SKAŅA (polish)
**Mērķis:** diferenciācija, klients izvēlas izskatu. Nav blockeris pirmajam klientam.

Iekšā:
- Vairāki rata vizuālie modeļi: **vienkāršs / elegants / luxury** — venue izvēlas (`venues.wheel_theme`)
- Krāšņs animēts rats ar **skaņas efektiem** (kazino stila, kā references attēlā)
- Vispārējs UI refinement pa visiem ekrāniem

Datu modeļa delta:
```
venues + wheel_theme text default 'simple'   -- 'simple'|'elegant'|'luxury'
```
SPOF: skaņa mobilajā prasa user gesture (autoplay bloķēts) — atskaņot tikai pēc "Griezt" klikšķa.

---

## ARHITEKTŪRAS LĒMUMI (fiksēti)
1. `/play` + `/redeem` paliek **anonīmi** (apmeklētāji nelogojas). Auth tikai admin + staff.
2. Ieejas punkts mainās: no statiska venue QR → uz **staff-aktivētu sesijas QR** (vajadzīga atribūcija).
3. **Seat = billing vienība.** Super-admin nosaka seats; client-admin nevar pārsniegt.
4. Balvas QR **vienmēr atkārtoti atverams** (links), SMS/e-pasts ir papildu, ne vienīgais.
5. Novērtējuma jautājumi **datu-vadīti** (`review_questions`), ne hardkodēti — katram venue savi.
6. **Super_admin edit-any:** klienta config lapas (balvas/personāls/jautājumi) pieņem `?venueId=X`; super_admin izvēlas venue un rediģē jebko. RLS jau atļauj.
7. **Saskarsmes teksti rediģējami + lokalizēti** (`copy_strings`), ne hardkodēti — venue override → global fallback (LV/EN). Būvē V1.4.
8. **Anti-fraud = data-binding + atbildība, NE OTP.** Klienta identitāte no rezervācijas (kalendāra); atsauksme savelkas spēle↔klients↔laiks↔instruktors. Google = ārējais autorizators + reconciliation (reviews-bez-Google attiecība per instruktors → flag). Atturēšana, ne ciets bloks.

## ZINĀMAIS PARĀDS (pēc v1)
Stripe Connect (tip tracking vietā Revolut links) · multi-venue vienam client_admin · analytics eksports · white-label custom domēns/branding · `spin_wheel` rate-limit · audit log.
