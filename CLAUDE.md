# Attenda — CLAUDE.md

## Identity
Multi-tenant hospitality SaaS platform. Staff operations + guest app + vendor/partner dashboard. Live at **attendaapp.com**.

## Stack
- **Framework:** Next.js 16 App Router (Turbopack), TypeScript, Tailwind CSS, Lucide icons
- **Database:** Supabase PostgreSQL (project `zhhhyrodqndeyjxveszu`) — multi-tenant with RLS
- **Hosting:** Netlify Pro (`attenda-app` site, d1e7cbed-354f-4090-9173-a7d68340bf29), `@netlify/plugin-nextjs`
- **Auth:** Custom — staff email/PIN login + JWT; hotel scope derived from `staff_accounts` table server-side (never trust JWT metadata for tenant ID)
- **Real-time:** Supabase Realtime (WebSockets) for live request/order/message updates
- **Payments:** Stripe
- **Email:** Resend
- **GPS:** Bouncie API
- **AI Voice:** ElevenLabs
- **CI:** GitHub — repo `thrilzNetwork/attendapp` (private)

## Key URLs
- **Prod:** https://attendaapp.com
- **GitHub:** https://github.com/thrilzNetwork/attendapp
- **Supabase:** https://zhhhyrodqndeyjxveszu.supabase.co

## Deploy
```bash
npm run build          # must pass before deploy
netlify deploy --prod --build
```
Build ignores ESLint errors (`eslint.ignoreDuringBuilds: true`). Typecheck separately: `npm run typecheck`. DO NOT deploy with typecheck errors.

## Branch Strategy
- `main` → production. Push/merge directly to main triggers deploys.
- Feature branches for anything non-trivial.

## Code Architecture

### Routes (`src/app/`)
- `/app` — Guest-facing pages (welcome, requests, transport, nearby, safety, etc.)
- `/staff` — Staff dashboard (tasks, requests, shuttle, schedules, KPIs)
- `/admin` — Hotel admin (property settings, staff management, room management, QR codes)
- `/superadmin` — Attenda team only (cross-property management, health metrics)
- `/partner` — Vendor/partner iPad dashboard (order fulfillment, menu management)
- `/api/*` — Server-side API routes (multi-tenant, service-role client via `getSupabaseAdmin()`)
- `/blog` — Marketing blog

### API Pattern
All API routes in `src/app/api/[feature]/route.ts`:
1. Call `getCaller(req)` → returns `{ hotel_id, staff_id, role, is_superadmin }`
2. Resolve hotel scope with `resolveHotelScope()` for multi-tenant isolation
3. Use `supabaseAdmin` client (service-role key) for all DB operations
4. `callerOwnsRow()` pattern for ownership checks
5. Return `NextResponse.json()` with proper status codes

### Supabase Clients
- **`src/lib/supabase.ts`** — Anon client (public reads, guest inserts)
- **`src/lib/supabase-admin.ts`** — Service-role admin client for server-side writes
  - `getSupabaseAdmin()` — factory
  - `getCaller(req)` — extracts auth from `staff_accounts` (anti-spoofing)
  - `isSuperAdmin(userId)` — checks `superadmin_config` table
  - `verifySession(token)` — validates Supabase JWT
  - `getAgentRequests()`, `updateAgentRequest()`, `subscribeAgentCalls()`, `subscribeAgentRequests()`

### Key Components
- `src/components/` — reusable UI: AirportSchedule, CookieBanner, GuestAuthModal, GuestSheets, PaymentSheet, TaxiCallerRide
- `src/components/agent/` — AI voice agent UI
- `src/components/blog/` — blog components
- `src/components/hubs/` — hub/tool assignment UI
- `src/components/landing/` — marketing landing components
- `src/components/ops-tools/` — shuttle, compset, housekeeping, maintenance, forecast
- `src/components/staff/` — staff-specific tooling

### Key Libraries / Utilities
- `src/lib/guest-context.tsx` — Guest auth state (React context)
- `src/lib/geocode.ts` — Address → lat/lng
- `src/lib/stripe.ts` — Stripe session/payment helpers
- `src/lib/bouncie.ts` — Bouncie GPS vehicle tracking
- `src/lib/uber-direct.ts` — Uber Direct delivery integration
- `src/lib/ssrf.ts` — SSRF protection for outgoing fetches
- `src/lib/fees.ts` — Fee calculation
- `src/lib/delivery/` — Delivery logic
- `src/lib/rides/` — Ride/transport logic
- `src/lib/api-auth.ts` — API route authentication
- `src/lib/taxicaller.ts` — Taxi Caller integration
- `src/lib/notify-lead.ts` — Lead notification emails
- `src/lib/opsStore.ts` — Ops tool state management

### Environment Variables (see `.env.example` for full list + comments)
```
NEXT_PUBLIC_SUPABASE_URL=https://zhhhyrodqndeyjxveszu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_KEY=<service_role key>
NEXT_PUBLIC_SUPERADMIN_API_KEY=<shared api key>
NEXT_PUBLIC_BOUNCIE_CLIENT_ID=attenda
BOUNCIE_CLIENT_SECRET=<bouncie secret>
NEXT_PUBLIC_BOUNCIE_REDIRECT_URI=https://attendaapp.com/api/bouncie/callback
BOUNCIE_WEBHOOK_SECRET=<bouncie api key>
NEXT_PUBLIC_APP_URL=https://attendaapp.com
RESEND_API_KEY=re_...
UBER_DIRECT_CUSTOMER_ID=
UBER_DIRECT_CLIENT_ID=
UBER_DIRECT_CLIENT_SECRET=
UBER_DIRECT_WEBHOOK_SECRET=
```

## Key Conventions
- **Mobile-first** — bottom nav bar on mobile, sidebar on desktop
- **Dates** — stored as ISO strings in DB, displayed in hotel timezone via `localDate()` helper
- **Tenant isolation** — every table has `hotel_id`, enforced at DB level via RLS
- **Anti-spoofing** — hotel_id always derived server-side from `staff_accounts` table, never from JWT claims
- **CSP** — strict Content-Security-Policy in `next.config.mjs`; Stripe/Supabase/Maps allowlisted
- **Admin client** — all server-side API routes use `supabaseAdmin`, never the anon client for writes
- **Fonts** — Inter + Plus_Jakarta_Sans from Google Fonts
- **Tests** — Vitest (`npm test`). Run tests before any refactor.

## Database
~30+ tables in `zhhhyrodqndeyjxveszu`. Key tables:
- `hotels` — one row per property (slug, name, timezone, wifi, welcome_letter)
- `staff_accounts` — staff per hotel (pin_code, role: staff/manager/admin)
- `guests` — active guest sessions per hotel (name, room, checkout date)
- `requests` — guest service requests (type: check-in/housekeeping/towels/maintenance etc., status: pending/in_progress/done)
- `agent_configs`, `agent_calls`, `agent_requests` — AI voice agent
- `shuttle_bookings` — shuttle rides
- `compset` — competitor rate tracking
- `work_orders`, `fnb_inventory`, `meal_covers` — maintenance & F&B
- `patrol_logs`, `incident_logs` — security
- `hubs`, `hub_assignments` — role-based tool assignment
- `vendor_expenses`, `forecast_data`, `partner_links` — ops & partnerships
- `superadmin_config` — super admin settings

See `supabase-schema.sql` and `supabase/migrations/` for full schema history.

## Migration Instructions
```bash
cd ~/Projects/attenda
supabase db push --linked   # push local migrations to linked remote
```
After migration changes, update `supabase-schema.sql` to reflect the current state.

## Current State
- Prod is live at attendaapp.com
- 1 hotel onboarded (test/seed data)
- Shuttle ops + agent + compset built, being validated
- GTM: shuttle-ops wedge for airport/cruise hotels, $497/mo, validate at 1 property (Best Western) then scale to 10+

## Critical Rules
1. **Never change a page** to add a feature — always ADD a new tab/section
2. **Never commit or deploy with typecheck errors** — run `npm run typecheck`
3. **Never print or share secrets** from `.env.local` or `.env.production`
4. **Never trust JWT metadata for tenant ID** — always query `staff_accounts` server-side
5. **Always use `supabaseAdmin`** in API routes, never the anon client for writes
6. Never overwrite the main layout/landing page without explicit instruction
