# CLAUDE.md — SpinReward (Venue Engagement Platform)

Šis fails ir Claude Code pastāvīgā atmiņa. Lasi to katras sesijas sākumā un seko tam stingri.

---

## PRODUKTS
White-label Venue Engagement SaaS. 3 moduļi vienā lineārā klienta plūsmā:
**Laimes Rats → Atsauksme (gate) → Balvas reveal → Tip.**
Klients: restorāni, bāri, escape rooms, lasertag, spa, bowlings.

## STEKS
- Next.js 14 (App Router, TypeScript, Tailwind), `--no-src-dir`, alias `@/*`
- Supabase (Postgres + RPC + RLS + Edge Functions)
- Vercel (deploy), GitHub (repo)
- qrcode (QR ģenerācija), Make.com + Twilio (automācija)

---

## DEVOPS PROTOKOLS (galvenais)
Strādā pilnīgi autonomi. Cilvēks norādīs, kad apstāties.

1. **Nekad neprasi apstiprinājumu** failu rediģēšanai/izveidei. Izpildi pilnībā.
2. Katram uzdevumam seko ciklam:
   **analyze → implement → build verify → commit → push.**
3. **Build verify pirms commit (obligāti):**
   ```
   npm run lint
   npm run build
   ```
   Ja build krīt → labo → atkārto, līdz iet cauri. NEKAD necommito salūzušu build.
4. **Git pēc katra pabeigta soļa:**
   ```
   git add -A
   git commit -m "<tips>: <īss apraksts>"   # feat / fix / chore / refactor
   git push
   ```
5. Ja kļūda — diagnostē cēloni (ne simptomu), izlabo, verificē, commit. Bez round-trip cilvēkam, ja vien nav bloķējoša izvēle.
6. Pēc katra soļa: īss kopsavilkums (kas izdarīts, build status, commit hash). Bez ūdens.

---

## DROŠĪBAS NOTEIKUMI (nepārkāpjami)
1. **Laimes rata iznākumu nosaka TIKAI serveris** — `spin_wheel` RPC (weighted random + spin ieraksts + `remaining` dekrements vienā atomiskā transakcijā). Klients nekad nezina svarus un nevar viltot.
2. **`service_role` atslēga NEKAD nenonāk klienta bundle.**
   - `lib/supabase.ts` = anon klients (client-safe, `NEXT_PUBLIC_` mainīgie)
   - `lib/supabase-admin.ts` = service_role, pirmā rinda `import 'server-only';`
3. **RLS:** `prizes`/`spins` anon nesasniedz tieši — tikai caur SECURITY DEFINER RPC. `venues`/`staff` lasāmi (active=true), `reviews`/`tips` ierakstāmi.
4. **Partneru/klienta dati:** SMS un paziņojumos nekad nesūti klienta personas datus — tikai balvas/tehniskos parametrus.

---

## WINDOWS-SPECIFISKI (build stabilitāte)
1. **Importu reģistrs EXACT pret failu nosaukumiem** (case-insensitive FS met "modules differ only in casing" un uzkaras HMR). `@/components/Wheel`, `@/lib/supabase`.
2. Pēc casing/struktūras izmaiņām vai dīvainām cache kļūdām: `rmdir /s /q .next && npm run dev`.
3. `.env.local` izmaiņas stājas spēkā tikai pēc dev servera restarta.

---

## KODA KONVENCIJAS
- Modulārs, DRY, viena atbildība uz komponentu. Loģiku ekstraktē uz `hooks/` vai `lib/`.
- Klienta plūsma = paplašināma state machine: `idle | review | reveal | tip`. Nesalej soļu loģiku.
- `useEffect` vienmēr ar pareizu dependency array. Nekad `setState` render body'ī.
- RPC atgriež **masīvu** (table) → `spin_wheel` rezultāts = `data[0]`.
- Mobile-first, viens ekrāns uz soli, viena CTA. Bez izvēles paradoksa.

## SUPABASE
- Migrācijas: `supabase/migrations/NNNN_apraksts.sql`
- RPC: `spin_wheel(p_venue_slug, p_session_id)`, `redeem_spin(p_qr_token)`, `get_wheel_prizes(p_venue_slug)`
- MVP venue konfigurācija (prizes/staff/google_place_id) = Supabase Studio. Custom admin = v1.1.

## DEPLOY (Vercel)
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **KRITISKI:** Vercel anon key == Supabase anon key (pārbaudi divreiz — biežākā prod kļūda).

## ZINĀMAIS PARĀDS (v1.1)
Stripe Connect (tip tracking, šobrīd Revolut link = `pending` mūžīgi) · custom admin · SMS balvas · multi-venue · white-label branding · analytics · `spin_wheel` rate-limit.
