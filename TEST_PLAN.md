# SpinReward — End-to-End Testa Modelis

Divi slāņi:
- **AUTOMĀTISKAIS** (Claude Code palaiž): security, RLS izolācija, integritāte, funkcionālie data-līmeņa + E2E.
- **MANUĀLAIS** (Gints): UX, vizuālis, skaņa, reāls telefons, scan plūsma.

Testa dati: 2 venue (izolācijas pārbaudei) + 2 client_admin + 1 staff. Setup/teardown caur service_role.

---

## A. SECURITY — RLS IZOLĀCIJA (kritiskais)
Mērķis: venue A lietotājs NEKAD nepiekļūst venue B datiem.

| # | Tests | Sagaidāms |
|---|---|---|
| A1 | client_admin A lasa venue B prizes | 0 rindas (RLS bloķē) |
| A2 | client_admin A lasa venue B staff | 0 rindas |
| A3 | client_admin A lasa venue B bookings | 0 rindas |
| A4 | client_admin A lasa venue B reviews/tips/sessions | 0 rindas |
| A5 | client_admin A raksta/dzēš venue B prize | atteikts (0 affected / kļūda) |
| A6 | client_admin A raksta venue B copy_strings override | atteikts |
| A7 | staff A lasa/raksta venue B sessions/bookings | atteikts |

## B. SECURITY — ANON ROBEŽAS + PII
Mērķis: anonīms apmeklētājs nepiekļūst jutīgiem datiem; PII neaizplūst.

| # | Tests | Sagaidāms |
|---|---|---|
| B1 | anon tieši lasa `prizes` (svari!) | 0 rindas (tikai caur RPC) |
| B2 | anon tieši lasa `bookings` (telefons!) | 0 rindas |
| B3 | anon tieši lasa `sessions` / `profiles` | 0 rindas |
| B4 | anon izsauc `get_session_context` | atgriež vārdu, NEatgriež customer_phone |
| B5 | anon izsauc `get_wheel_prizes` | balvu nosaukumi, BEZ probability_weight |
| B6 | anon izsauc `get_copy` | atrisināti teksti |
| B7 | anon insert review/tip/review_answer | atļauts (play flow) |

## C. SECURITY — SPIN / REDEEM INTEGRITĀTE
Mērķis: iznākumu nevar viltot; vienreizējība; krājuma kontrole.

| # | Tests | Sagaidāms |
|---|---|---|
| C1 | spin_wheel ar 70/30 svariem × 1000 reizes | sadalījums ≈ 70/30 (±5%) |
| C2 | spin_wheel_session 2× tai pašai sesijai | 1. ok; 2. → sesija `used`, atteikts |
| C3 | prize ar remaining=1, 2 spini | 2. spins neizvēlas izsmelto balvu |
| C4 | check_spin uz active token | result='active', status DB NEMAINĀS |
| C5 | redeem_spin 2× | 1.→redeemed; 2.→already_redeemed |
| C6 | redeem_spin uz expired (expires_at pagātnē) | 'expired', status→expired |
| C7 | spin_wheel uz inactive venue | venue_not_found / no_prizes |

## D. SECURITY — LOMU / AUTH ROBEŽAS
| # | Tests | Sagaidāms |
|---|---|---|
| D1 | staff mēģina venue CRUD (super_admin op) | atteikts |
| D2 | client_admin maina venue.seats | atteikts (tikai super_admin) |
| D3 | seat enforce: pievieno staff > venue.seats | 'seat_limit_reached' |
| D4 | daily_spin_limit pārsniegts | sesija atteikta |
| D5 | nepieslēdzies lietotājs atver /admin | redirect /login |
| D6 | jebkurš atver /play, /redeem, /prize | atļauts (publiski) |

## E. FUNKCIONĀLIE — PLŪSMA (E2E, Playwright)
| # | Tests | Sagaidāms |
|---|---|---|
| E1 | session plūsma: welcome→jautājumi→spin→reveal | iziet bez kļūdām; klienta vārds parādās |
| E2 | review ≥4★ | Google poga parādās |
| E3 | review <4★ | Google poga NEparādās (iekšējs) |
| E4 | reviews + review_answers ar staff_id/activity_id | DB aizpildīts (atribūcija) |
| E5 | spin → spins.staff_id/activity_id aizpildīts | atribūcija DB |
| E6 | reveal QR → /prize/{token} ielādē balvu | recovery strādā |
| E7 | /redeem/{token} → apstiprināt → izsniegts | norakstīts |
| E8 | anon plūsma /play?venue= | strādā, NEsalauzta |

## F. FUNKCIONĀLIE — ADMIN
| # | Tests | Sagaidāms |
|---|---|---|
| F1 | prize CRUD + % aprēķins | pareizs vinests % |
| F2 | staff CRUD + tip karte | saglabājas |
| F3 | review_questions CRUD | parādās plūsmā |
| F4 | copy_strings venue override | sit global plūsmā |
| F5 | super_admin edit-any ?venueId=X | rediģē citu venue |

## G. I18N
| # | Tests | Sagaidāms |
|---|---|---|
| G1 | get_copy lv vs en | atšķirīgi teksti |
| G2 | venue override → global fallback | override uzvar; ja nav, global |
| G3 | LV/EN pārslēgs plūsmā | teksti mainās |

## H. EDGE / TUKŠIE STĀVOKĻI
| # | Tests | Sagaidāms |
|---|---|---|
| H1 | venue bez balvām → spin | saprotama kļūda, ne crash |
| H2 | sesija ar nederīgu ID | "nederīga sesija" |
| H3 | /prize ar fake token | "nederīgs kods" |
| H4 | tukšs review_questions saraksts | plūsma neaizķeras |

---

## MANUĀLAIS (Gints — pēc tam)
- [ ] Rats vizuāli krāšņs (segmenti, zelta rāmis, gaismiņas, mirdzums)
- [ ] Skaņa: griešanās ratchet + uzvaras fanfara; mute strādā
- [ ] Confetti reveal brīdī
- [ ] Mobilajā: rats centrēts, lasāms, plūsma gluda (reāls telefons!)
- [ ] QR scan ar kasiera telefonu → /redeem → apstiprināt
- [ ] /prize links pa SMS (ja Twilio creds)
- [ ] Welcome ar īstu klienta vārdu no rezervācijas
- [ ] Kopējā plūsma "jūtas" labi (berze, ātrums, skaidrība)
- [ ] LV un EN teksti izskatās dabiski
