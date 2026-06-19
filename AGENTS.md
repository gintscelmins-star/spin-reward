<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Spillit projekta konteksts aģentiem

## TEHNOLOĢIJU STACK (precīzas versijas)

| Pakete | Versija |
|---|---|
| next | 16.2.7 |
| react | 19.2.4 |
| react-dom | 19.2.4 |
| @supabase/ssr | 0.12.0 |
| @supabase/supabase-js | ^2 |
| tailwindcss | ^4 |
| zod | ^4.3.6 |
| qrcode | ^1.5.4 |
| lucide-react | ^1.21.0 |
| canvas-confetti | ^1.9.4 |
| remotion | ^4.0.477 |
| @remotion/lambda | ^4.0.477 |
| vitest | ^4.1.8 |
| typescript | ^5 |

## TEST RUNNER

Vitest — NE Jest. Komanda: `npm test`. Konfigurācijā **obligāts** `fileParallelism: false`, citādi testi kļūst nestabili.

```bash
npm test               # vitest run (CI)
npm run test:e2e       # playwright test
npm run type-check     # tsc --noEmit
npm run lint           # eslint
```

## VIDES MAINĪGIE (.env.local)

```
# Supabase (obligāti)
NEXT_PUBLIC_SUPABASE_URL=https://heseorbhzcmanfkxqkkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# E-pasts (Resend)
RESEND_API_KEY=re_...

# Demo flow
DEMO_JWT_SECRET=...   # 32+ zīmes, random
NEXT_PUBLIC_APP_URL=https://app.spillit.lv
NEXT_PUBLIC_SITE_URL=https://app.spillit.lv

# SMS (Twilio) — opcionāls
TWILIO_ACCOUNT_SID=ACxx...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Video (Remotion Lambda) — opcionāls, Phase 2
REMOTION_AWS_REGION=eu-central-1
REMOTION_LAMBDA_FN=remotion-render-XXXX
REMOTION_SERVE_URL=https://your-remotion-serve-url
```

## AUTH PATTERNS

### Server-side (App Router server components un route handlers)

```typescript
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'

// Standarta auth pārbaude
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')  // vai return 401

const { data: profile } = await supabase
  .from('profiles')
  .select('role, venue_id, organization_id')
  .eq('id', user.id)
  .single()

if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
  redirect('/admin')  // vai return 403
}
```

### Lomas

```typescript
const ALLOWED_ROLES = ['client_admin', 'agency_admin', 'super_admin']
// staff loma — tikai /admin/session un /admin/today
```

### getAdmin() — service role (apiet RLS)

```typescript
import { getAdmin } from '@/lib/supabase/admin'
// Izmanto tikai server-side (iezīmēts ar 'server-only')
// Izmanto DB operācijām kas prasa apiet RLS (widget spin, analytics, u.c.)
const admin = getAdmin()
```

### Client-side (browser komponentes)

```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### Publisks klients (anon, bez cookies)

```typescript
import { createPublicClient } from '@/lib/supabase/public'
```

## NEXT.JS 16 KRITISKI ASPEKTI

### params un searchParams ir Promise

```typescript
// Pareizi — async atpakīšana
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { id } = await params
  const { mode } = await searchParams
  // ...
}
```

### Route handlers — async params

```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  // ...
}
```

### Server actions

```typescript
'use server'
// Faili ar server actions sākas ar 'use server' direktīvu
// Klienta komponentes importē actions atsevišķi
```

## FAILU STRUKTŪRA (galvenās vietas)

```
app/
  page.tsx                          — Landing page (LV/EN, client component)
  moduli/page.tsx                   — Moduļu saraksts + cenu plāni
  play/page.tsx                     — Spin Reward klienta plūsma
  prize/[token]/page.tsx            — Balvas QR lapa
  redeem/[token]/page.tsx           — Kasieres apstiprināšana
  w/[slug]/page.tsx                 — Widget lapa (iframe mērķis)
  r/[token]/page.tsx                — AuraTag share karte
  g/[session]/page.tsx              — AuraTag leaderboard
  demo/page.tsx                     — Demo pieprasījuma lapa
  demo/dashboard/page.tsx           — Demo admin (ar is_demo venue)
  dashboard/
    widgets/                        — Widget builder (client_admin+)
    agency/                         — Agency overview (agency_admin+)
  admin/
    venue/                          — Venue admin (client_admin+)
    venues/                         — Super-admin venue pārvaldība
  api/
    w/[slug]/route.ts               — GET widget config (publisks)
    w/spin/route.ts                 — POST spin (publisks)
    widget/[slug]/analytics/route.ts — GET analytics (auth)
    inquiry/route.ts                — POST kontaktforma
    track/route.ts                  — POST AuraTag events
    render-session/route.ts         — POST Remotion render
    demo/request-access/route.ts    — POST demo magic link

lib/
  supabase/server.ts                — createClient() — server SSR
  supabase/admin.ts                 — getAdmin() — service role
  supabase/client.ts                — createClient() — browser
  supabase/public.ts                — createPublicClient() — anon
  resend.ts                         — sendInquiryEmail()
  email.ts                          — sendDemoAccessEmail()
  twilio.ts                         — sendSms()
  fmt.ts                            — fmtDate(), fmtTime(), fmtDateTime()
  result.ts                         — AuraTag GameResult tipi
  track.ts                          — share event tracking utils
  demo-auth.ts                      — demo magic link verifikācija

components/
  PrizeWheel.tsx                    — Animētais laimes rats
  FunWheel.tsx                      — Alternatīvs rats
  Wheel.tsx                         — Bāzes rata komponente
  SessionFlow.tsx                   — Klienta spin flow
  WheelSubNav.tsx                   — Widget dashboard subnavigācija
  LogoutButton.tsx
  ContactForm.tsx
  ClientTypeSection.tsx
  admin/LaserstatsBanner.tsx
  share/ShareCard.tsx
  share/ShareSheet.tsx

public/
  widget.js                         — Embed skripts (vanilla JS, bez dep)

supabase/migrations/
  00001_share.sql                   — game_sessions, game_results, share_events
  00002_share_video_url.sql         — share_video_url kolonna
  00003_rls_client_admin.sql        — RLS politikas admin lomām
  00004_demo_support.sql            — is_demo, demo_magic_links

.github/workflows/
  ci.yml                            — lint → type-check → test → build
  deploy.yml                        — Vercel deploy (push uz master)
```

## WIDGET ARHITEKTŪRA KOPSAVILKUMS

```
Klienta mājaslapa:
  <script src="/widget.js" data-wheel="SLUG"></script>
       |
       v
  widget.js (vanilla JS, ~180 rindas)
  1. Nolasa data-wheel atribūtu
  2. Pārbauda localStorage (vai jau spēlēts)
  3. fetch /api/w/{slug} → wheel config
  4. Uzstāda trigerus (delay/exit_intent/scroll/u.c.)
  5. Izveido #spillit-overlay + iframe
       |
       v
  iframe: /w/{slug}?mode=popup  (Next.js app)
  → wheels tabula → segmenti + form_fields
  → WheelPage komponente (React)
  → e-pasta forma + optional: vārds, telefons, custom fields
  → POST /api/w/spin
       |
       v
  /api/w/spin (server-side, getAdmin()):
  → pārbauda one_spin_per_email (leads tabula)
  → izloses algoritms (svērtā)
  → INSERT leads
  → decrementē remaining (ja stock)
  → inkrementē total_leads, total_spins
  → webhook POST (ja webhook_url)
  → atgriež { segment, prize_code, segment_index }
       |
       v
  iframe: parāda balvu → postMessage({type:'spillit:converted'})
  → widget.js aizver overlay → localStorage.setItem
```

## DB TABULAS SNAPSHOT (ražošanā)

Migrācijas: 00001 līdz 00004. Galvenās tabulas (bez pilnā schema — skatīt `docs/ARCHITECTURE.md`):
- venues, profiles — multi-tenant pamats
- staff, activities, bookings, sessions, spins, prizes — Spin Reward
- reviews, review_answers, review_questions, tips, staff_evaluations — atsauksmes
- copy_strings — lokalizācija
- wheels, wheel_segments, wheel_form_fields, leads — Widget
- game_sessions, game_results, share_events — AuraTag
- demo_magic_links, module_inquiries — papildu

## SVARĪGAS KONVENCIJAS

- Datumu formāts: `DD.MM.YYYY HH:MM` (skatīt `lib/fmt.ts`)
- E-pasti: vienmēr `email.toLowerCase().trim()` pirms saglabāšanas
- Balvas kods: 8 zīmes no `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (bez 0/O/I/1)
- UUID ģenerācija: `crypto.randomUUID()` (Web API)
- Server-only imports: `import 'server-only'` `lib/supabase/admin.ts`
- CORS widget API: `Access-Control-Allow-Origin: *` uz `/api/w/*`
- AuraTag cookie: `gnl_aid` (1 gads, httpOnly, sameSite: lax)
