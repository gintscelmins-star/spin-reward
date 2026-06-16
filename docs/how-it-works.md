# GUNSnLASERS — Share Result: How It Works

## Overview

Players receive a personal shareable link after each laser tag game. Tapping the link opens a video card with their stats and a share button.

---

## Data Flow

### 1. Game Ends (venue staff → admin panel)

- Staff creates a `game_sessions` row (POST via admin panel or API, not yet built)
- Each player's result is inserted into `game_results` with auto-generated `share_token` (8-byte hex)
- QR code already printed at venue points to `/scan?venue=<venue_id>`

### 2. Player Scans QR

`GET /scan?venue=<venue_id>`
→ looks up latest `active` game_session for that venue  
→ redirects to `/g/<session_id>`

### 3. Session Leaderboard `/g/[session]`

- Calls `get_session_results(p_session)` SECURITY DEFINER RPC
- Shows ranked player list; each row links to `/r/<share_token>`

### 4. Personal Result Card `/r/[token]`

- Server fetches result via `get_result_by_token(p_token)` RPC (anon-accessible via SECURITY DEFINER)
- Renders `generateMetadata` → OG tags (og:image, og:video, twitter:card=player)
- Client component `ShareCard` plays the class video, shows stats grid
- `ShareSheet` opens on "DALĪTIES" button click

### 5. OG Image `/r/[token]/opengraph-image`

- Dynamic `ImageResponse` (1200×630) rendered server-side
- Shows callsign, class badge, team colour, rating, K:D, accuracy on dark bg
- Cached automatically by Next.js unless `force-dynamic`

### 6. Share Tracking

Every view and network click fires `POST /api/track`:
- Client: `navigator.sendBeacon` → fetch fallback (`lib/track.ts`)
- Server: sets/reads `gnl_aid` cookie (first-party anon UUID, 1 year, httpOnly)
- Inserts into `share_events` using service role (bypasses RLS — no anon policy on table)

---

## Database Tables

| Table | Purpose |
|---|---|
| `game_sessions` | One row per laser tag game; links to `venues` |
| `game_results` | One row per player per game; has `share_token` |
| `share_events` | View + share-click analytics |

## Security

- `game_results` and `game_sessions` RLS: only venue staff / super_admin can write
- `get_result_by_token` + `get_session_results`: SECURITY DEFINER, granted to `anon` — safe because they only expose the specific row requested by token/session
- `share_events`: no anon policy → service role writes only
- `SUPABASE_SERVICE_ROLE_KEY` must be in Vercel Production env (server-only)

## Phase 2 (not yet implemented)

- Baked MP4 with overlay stats burned into video
- Awaiting decision on video generation approach (FFmpeg edge function vs pre-generated)
