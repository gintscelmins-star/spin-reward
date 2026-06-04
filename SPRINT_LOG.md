## Sprint 01 — Foundation (2026-06-04)
**Branch:** sprint/01-foundation
**Status:** ✅ PASS

### Delivered:
- [x] Next.js 16.2.7 App Router setup
- [x] Supabase client
- [x] Types defined
- [x] /spin route loads venue + prizes from Supabase
- [x] /review placeholder
- [x] /redeem/[token] placeholder
- [x] /admin placeholder
- [x] Build passes 0 TS errors

### Test checklist:
- [ ] /spin?venue=demo-lasertag&session=test → venue name visible
- [ ] /spin?venue=INVALID → "nav atrasta"
- [ ] /review → placeholder visible
- [ ] /redeem/test → placeholder visible

### Next sprint:
- Spin wheel SVG component
- Weighted random prize selection
- Prize reveal + QR code
- Supabase spin insert
