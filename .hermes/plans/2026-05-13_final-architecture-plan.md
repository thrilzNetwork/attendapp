# Attenda — Final Architecture & Implementation Plan

**Date:** May 13, 2026
**Status:** Approved — ready to commit

---

## Part 1: Clover Multi-Tenant Architecture

### One Clover app, many restaurants

```
                    ┌──────────────────────────────┐
                    │   Attenda (Thrilz Network)    │
                    │   1 Clover Developer App       │
                    │   client_id: RKPZ9Q0C33X66    │
                    └──────────┬───────────────────┘
                               │
        Each restaurant connects via OAuth independently
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │ Joe's Crab  │     │ Prime Italian│     │ Smith & W.  │
   │ merchant: A │     │ merchant: B │     │ merchant: C │
   │ token: tokA │     │ token: tokB │     │ token: tokC │
   └──────────────┘     └──────────────┘     └──────────────┘
```

Hotels have **zero Clover relationship** — they're context only. Each restaurant is the Clover entity. The same Clover app ID serves unlimited restaurants across unlimited hotels.

### How a restaurant connects

- **Already has Clover:** OAuth one-click → `merchant_id` + tokens stored in `partners` table → `clover_enabled = true` → menu auto-syncs
- **No Clover yet:** Attenda referral → Clover signs them up → ships terminal ($99-$599) → same OAuth flow

### How an order flows

```
1. Guest at Hotel → Nearby → Joe's Crab → sees menu (synced from Clover)
2. Guest places order → Clover API creates order → appears on Joe's terminal
3. Joe accepts → cooks → marks ready → Attenda triggers Uber Direct
4. Driver delivers to room → Clover processes payment
5. Settlement: $32 order → Restaurant $30.40 (95%) + Attenda $1.60 (5%) + Uber $6.99
```

### Clover capabilities used

| Capability | Status |
|------------|--------|
| Menu API (sync items) | Library built (`lib/clover.ts`) |
| Order API (create orders) | Library built, not wired to UI yet |
| Payment processing | Clover handles directly ✅ |
| Kitchen display | Clover handles |
| Webhooks (status updates) | Route built (`api/clover-webhook`) |
| OAuth (one-click connect) | **NOT built — priority #1** |
| Reporting | Clover handles |

### Decisions made

| Question | Answer |
|----------|--------|
| Payment flow | **Clover handles directly** — less PCI burden on us |
| Restaurant outreach | **We do it** — Alejandro is a hotelier and developer, controls both sides |
| Delivery fallback | **Qualify tenants before agreement** — only onboard restaurants where Uber Direct is available |

---

## Part 2: Shuttle — Auto-Generate Google Sheets

### How it works

```
Admin creates blank Google Sheet → pastes URL into Attenda Hotel Settings
                                          │
                                          ▼
                              Clicks "Initialize Shuttle Sheet"
                                          │
                              Attenda auto-creates via Sheets API:
                              ✅ SCHEDULE tab (default times, 8 rows)
                              ✅ REQUESTS tab (14-column headers)
                              ✅ DRIVERS tab (5-column headers)
                              ✅ Deletes empty "Sheet1"
                                          │
                              Admin shares sheet with service account
                              (Editor access) → Done. Forever.
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
            Guest submits transport                      Staff sees full sheet
            → auto-appends to                            in Shuttle tab (iframe)
              REQUESTS tab                               Status updates manually
```

### Guest → Sheet sync

Guest fills `/transport` form → hits submit:
- **Supabase** `requests` table ← primary
- **Email** notification ← existing
- **Google Sheet** REQUESTS tab ← auto-append via Sheets API (new)

### Guest-facing schedule view

New toggle on `/transport` page:
- **Request Ride** — existing form (default)
- **Shuttle Schedule** — read-only embed of SCHEDULE tab only

---

## Part 3: Financials

### Current Monthly Cost: $0

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Free | $0 |
| Vercel | Free (Hobby) | $0 |
| Resend | Free (100 emails/day) | $0 |
| OpenStreetMap | Free | $0 |
| Google Sheets API | Free | $0 |
| Clover | Developer account | $0 |
| **TOTAL** | | **$0/mo** |

### Scaling costs

| Scale | Monthly Cost | Trigger |
|-------|-------------|---------|
| 0–10 hotels | **$0** | — |
| 10–25 hotels | **$25** | Supabase Pro (DB + bandwidth) |
| 25–50 hotels | **$45** | + Vercel Pro (bandwidth) |
| 50–100 hotels | **$65** | + Resend Growth (email volume) |

### Per-hotel revenue (5% of in-room food orders)

| Model | Orders/day | Avg order | Monthly | Annual |
|-------|-----------|-----------|---------|--------|
| Conservative (12% adoption) | 6.2 | $32 | $299 | $3,588 |
| Aggressive (20% adoption) | 10.4 | $38 | $593 | $7,116 |

### At scale

| Hotels | Conservative Annual | Aggressive Annual |
|--------|--------------------|--------------------|
| 5 | $17,940 | $35,580 |
| 10 | $35,880 | $71,160 |
| 20 | $71,760 | $142,320 |
| 50 | $179,400 | $355,800 |

---

## Part 4: Implementation Plan

### Priority 1 — Clover OAuth (1 day)

Restaurant clicks "Connect Clover" → OAuth redirect → authorize → tokens auto-saved. Replaces current manual token entry.

**Files:**
- New: `src/app/api/clover-oauth/route.ts` — handle OAuth callback
- `src/app/staff/page.tsx` — Replace Clover token fields with "Connect Clover" button
- `src/lib/supabase.ts` — No changes needed (fields already exist)

### Priority 2 — Wire order creation to UI (2-3 hours)

`lib/clover.ts` has `createCloverOrder()` — it works. Need to wire the guest's "Place Order" button.

**Files:**
- `src/app/nearby/detail/page.tsx` — Wire order button to Clover API
- `src/app/nearby/page.tsx` — Quick-order flow

### Priority 3 — Auto-generate shuttle sheets (2 hours)

Google Sheets API + service account. Admin pastes URL → clicks button → sheet auto-built.

**One-time setup:**
- Create Google Service Account (5 min in Cloud Console)
- Enable Sheets API
- Add `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_KEY` to Vercel env

**Files:**
- New: `src/lib/google-sheets.ts` — Sheets API client
- New: `src/app/api/sheets-init/route.ts` — POST handler
- New: `src/app/api/transport-sync/route.ts` — Append guest requests
- `src/lib/supabase.ts` — Add `googleSheetUrl`, `serviceAccountEmail` to HotelConfig
- `src/app/staff/page.tsx` — Replace Operations Sheet section with auto-init
- `src/app/transport/page.tsx` — Sheet sync call + guest ScheduleView toggle
- `package.json` — Add `googleapis`, `google-auth-library`

### Priority 4 — Settlement automation (1 day)

After `ORDER_COMPLETE` webhook → calculate Attenda fee → store in `attenda_fees` table → monthly partner report.

### Priority 5 — Guest schedule view (30 min)

Toggle on `/transport`: "Request Ride" vs "Shuttle Schedule" — embeds SCHEDULE tab only.

---

## TL;DR

- **One Clover app** → unlimited restaurants → unlimited hotels. Zero per-tenant Clover cost.
- **Shuttle sheet auto-generated** on admin URL paste. Guest requests sync automatically.
- **Current cost: $0/mo.** Scales to $25 at ~10 hotels. Per-hotel revenue: $299-593/mo.
- **Build order:** Clover OAuth → wire orders → shuttle sheets → settlement → guest schedule view.
- **We own outreach.** Alejandro controls both hotel operations and tech platform.
