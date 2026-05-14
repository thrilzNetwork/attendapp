# Clover Multi-Tenant Architecture & Financial Model

**Date:** May 13, 2026
**Status:** Plan — awaiting approval

---

## Part 1: How Clover Works in Attenda's Architecture

### The key insight: One Clover app, many merchants

```
                    ┌──────────────────────────────┐
                    │   Attenda (Thrilz Network)    │
                    │   1 Clover Developer App       │
                    │   client_id:  RKPZ9Q0C33X66   │
                    │   client_secret: (stored)      │
                    └──────────┬───────────────────┘
                               │
            OAuth — each restaurant connects independently
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │ Joe's Crab  │     │ Prime Italian│     │ Smith & W.  │
   │ merchant: A │     │ merchant: B │     │ merchant: C │
   │ token: tokA │     │ token: tokB │     │ token: tokC │
   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
          │                    │                    │
          │    Each connects to Clover independently
          │    Pays Clover for their own processing
          │    Attenda takes 5% on top (our fee)
          │
          ▼
   ┌─────────────────────────────────────────────┐
   │  Clover handles:                             │
   │  • Payment processing (guest pays Clover)    │
   │  • Order routing to kitchen display/terminal │
   │  • Menu management (items, prices, photos)   │
   │  • Tax calculation, reporting                │
   │  • Hardware: Station Mini ($99) or Flex ($599)│
   └─────────────────────────────────────────────┘
```

### Attenda ≠ per-hotel Clover. Attenda = per-restaurant Clover.

| Level | Entity | Clover Relationship |
|-------|--------|---------------------|
| Platform | Attenda (Thrilz Network) | One developer app — 1 client_id |
| Tenant | Hotel (Miami Airport, Fabian Hotel, etc.) | Zero Clover relationship. Hotel just provides context. |
| Partner | Restaurant (Joe's Crab, Prime Italian) | Each has its own Clover merchant account + API token |

**This means:** Every hotel uses the same Attenda → Clover pipeline. The restaurant is the Clover entity, not the hotel. One Clover app ID serves unlimited restaurants across unlimited hotels.

### How a restaurant connects

```
Restaurant clicks "Enable In-Room Ordering"
    │
    ├── Already has Clover?
    │   └── OAuth redirect: "Attenda wants to access your Clover account"
    │       → Clover returns merchant_id + access_token + refresh_token
    │       → Stored in partners table row for that restaurant
    │       → clover_enabled = true
    │       → Menu auto-syncs immediately
    │
    └── Doesn't have Clover?
        └── Attenda referral link → Clover signup
            → Clover ships terminal ($99 Station Mini or $599 Flex)
            → Same OAuth flow after setup
```

### What Clover capabilities Attenda uses

| Capability | How We Use It | Status |
|------------|---------------|--------|
| **Menu API** | Sync restaurant's Clover menu → Supabase `partner_menu_items` | Code built (lib/clover.ts) |
| **Order API** | Create order on Clover when guest places one | Library built, not wired to UI yet |
| **Payment** | Guest pays through Clover (card on file or at terminal) | Clover handles, Attenda just routes |
| **Kitchen display** | Order appears on restaurant's Clover terminal | Clover handles |
| **Webhooks** | Clover pings us when order status changes | Route built (api/clover-webhook) |
| **OAuth** | Restaurants connect without manual token entry | NOT built — currently manual input |
| **Reporting** | Restaurant gets Clover's built-in reports | Clover handles |

### How an order flows (end-to-end)

```
1. Guest at Hotel Miami Airport → opens Attenda → Nearby → Joe's Crab
2. Attenda loads Joe's menu from Supabase (pre-synced from Clover)
3. Guest adds items → taps "Place Order"
4. Attenda calls Clover API: POST /merchants/{id}/orders
   → Order appears on Joe's kitchen display: "Room 205 — Alejandro"
5. Clover webhook fires: ORDER_CREATED → Attenda shows in staff dashboard
6. Joe taps "Accept" on terminal → ORDER_ACCEPTED → Attenda updates status
7. Joe cooks → taps "Ready" → ORDER_READY
   → Attenda triggers Uber Direct for pickup
   → Delivery fee ($6.99) added
8. Driver delivers to Room 205 → ORDER_COMPLETE
9. Settlement:
   • Clover processes guest payment ($32 food + $6.99 delivery = $38.99)
   • Clover takes their processing fee (~2.3% + $0.10 = ~$0.84)
   • Joe's Crab gets $32 - 5% Attenda fee = $30.40
   • Attenda gets $1.60 (5%)
   • Uber gets $6.99
```

---

## Part 2: Real Costs (Monthly)

### Current Stack — Free Tier

| Service | Plan | Monthly Cost | Limits |
|---------|------|-------------|--------|
| Supabase | Free | **$0** | 500MB DB, 2GB bandwidth, 50K users, 2 projects |
| Vercel | Free (Hobby) | **$0** | 100GB bandwidth, 1 concurrent build |
| Resend | Free | **$0** | 100 emails/day (3,000/month) |
| OpenStreetMap | Free | **$0** | Rate limited to 1 req/sec (fine for onboarding) |
| Clover | Developer account | **$0** | No cost to be a Clover partner |
| TOTAL | | **$0/mo** | |

### When Free Tiers Break

| Trigger | What Breaks | Fix Cost |
|---------|-------------|----------|
| 3,000+ emails/month | Resend stops sending | Resend Growth: **$20/mo** (50K emails) |
| 100GB+ Vercel bandwidth | Slow loads, errors | Vercel Pro: **$20/mo** (1TB bandwidth) |
| 500MB DB full | Can't store more | Supabase Pro: **$25/mo** (8GB DB + daily backups) |
| 2GB Supabase bandwidth | API calls fail | Included in Pro above |
| 50K Supabase users | Can't add more auth users | Not relevant — auth is for superadmin only |

**Realistic timeline to hitting limits:**
- 5 hotels × 50 rooms × 65% occupancy = ~162 guests/day using the app
- If each guest does 3 page loads + 1 message → ~650 Supabase requests/day = 19K/month
- Bandwidth: ~162 × 2MB per session = 324MB/day = ~10GB/month
- **Verdict:** Free tiers hold until ~10-15 hotels. Then Supabase Pro ($25/mo) is the first upgrade.

### Total Cost Runway

| Scale | Monthly Cost |
|-------|-------------|
| 0–10 hotels | **$0** |
| 10–25 hotels | **$25** (Supabase Pro) |
| 25–50 hotels | **$45** (+ Vercel Pro) |
| 50–100 hotels | **$65** (+ Resend Growth) |
| 100+ hotels | ~$100-200 (scaling bandwidth) |

---

## Part 3: Revenue Projections

### Per-Hotel Model (Conservative)

| Assumption | Value |
|------------|-------|
| Rooms per hotel | 80 |
| Occupancy | 65% (52 rooms/night) |
| Guests who order in-room delivery | 12% (6.2 orders/day) |
| Average food order | $32 |
| Attenda fee | 5% |
| Days per month | 30 |

| Line | Monthly | Annual |
|------|---------|--------|
| Orders | 187 | 2,244 |
| Order volume | $5,984 | $71,808 |
| **Attenda revenue (5%)** | **$299** | **$3,588** |

### Per-Hotel Model (Aggressive — higher adoption)

| Assumption | Value |
|------------|-------|
| Order adoption | 20% (10.4 orders/day) |
| Average order | $38 |

| Line | Monthly | Annual |
|------|---------|--------|
| Orders | 312 | 3,744 |
| Order volume | $11,856 | $142,272 |
| **Attenda revenue (5%)** | **$593** | **$7,116** |

### At Scale

| Hotels | Conservative Annual | Aggressive Annual |
|--------|--------------------|--------------------|
| 5 | $17,940 | $35,580 |
| 10 | $35,880 | $71,160 |
| 20 | $71,760 | $142,320 |
| 50 | $179,400 | $355,800 |
| 100 | $358,800 | $711,600 |

### Other Revenue Streams (Future)

| Stream | Model | Est. Per Hotel/Month |
|--------|-------|---------------------|
| Featured partner placement | Restaurant pays $50/mo to be #1 in list | $50 |
| Partner referral (Clover signup) | Clover pays referral bounty | $100 one-time |
| Transport commission | 10% of Uber/Lyft bookings | TBD |
| White-label fee | Charge hotel $99/mo for branded version | $99 |
| Priority support | $49/mo for 1-hour response SLA | $49 |

---

## Part 4: What Needs to Be Built

### Clover OAuth flow (highest priority)

Currently: restaurants connect by manually pasting Clover merchant ID + tokens into a form.

Needed: one-click OAuth. Restaurant clicks "Connect Clover" → redirected to Clover → authorizes → redirected back with tokens auto-saved.

**Effort:** 1 day. Clover's OAuth is standard (authorization code flow). Need:
- OAuth redirect URL in Clover app settings
- `/api/clover-oauth` route to handle callback
- Button in partner settings that opens `https://www.clover.com/oauth/authorize?client_id=...`

### Order creation wiring

Currently: `lib/clover.ts` has `createCloverOrder()` — it works. But nothing in the UI calls it when a guest places a food order.

**Effort:** 2-3 hours. Wire the "Place Order" button in `/nearby` or the restaurant detail page to call Clover.

### Settlement automation

Currently: fee tracking is conceptual. Need:
- After `ORDER_COMPLETE` webhook, calculate Attenda fee
- Store fee in `attenda_fees` table
- Monthly report for each partner

**Effort:** 1 day.

---

## Part 5: Open Questions

1. **Payment flow:** Does the guest pay through Attenda (stripe) and we settle to Clover, or does Clover handle payment directly? Recommendation: Clover handles payment — less PCI compliance burden on us.

2. **Restaurant onboarding:** Who does the outreach? Attenda (you) or the hotel? Recommendation: Attenda provides the tech + pitch deck + email templates. Hotel provides the relationship. You close the first few to prove the model, then hotels can self-serve.

3. **Exclusivity:** Does the restaurant commit to only using Attenda for in-room orders? Or can they also be on Uber Eats? Recommendation: non-exclusive at first. The 5% vs 30% math sells itself.

4. **Delivery fallback:** If Uber Direct isn't available in the area, what's plan B? Options: hotel staff delivers (no extra cost, slower), Relay ($5.99), DoorDash Drive ($8.99).

---

## TL;DR

- **One Clover app** covers every restaurant across every hotel. Zero per-tenant Clover cost.
- **Current monthly cost: $0.** Supabase free + Vercel free + Resend free + OSM free.
- **First cost trigger:** ~10-15 hotels → Supabase Pro at $25/mo.
- **Per-hotel revenue: $299-593/month** (5% of in-room food orders).
- **At 10 hotels:** $35K-71K/year revenue on $0-25/mo cost.
- **Next build priority:** Clover OAuth (one-click restaurant connect) + wire order creation to UI.
