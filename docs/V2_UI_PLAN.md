# Attenda V2 UI — Implementation Plan

**Status: PLAN ONLY. No deploys. No data-layer rewrites. UI-first.**
**Sources:** Approved V2 mockups (Aug 2026 batch, 12 designs) + Ales' written brief (See→Act→Complete→Verify).
**Hard constraint from Ales:** "Approved V2 without messing code too much — just UI etc."

---

## 1. Approved screens (what the mockups define)

| # | Screen | Mockup highlights |
|---|--------|-------------------|
| 1 | **Dashboard** | "What's going on today?" — 6 KPI cards (Open Requests 28 / Inspections Today 12 / Work Orders 18 / Arrivals 32 / Occupancy 85% / My Open Tasks 14), Today's Activity feed, Department Status bars, Critical Alerts rail, Occupancy donut, Recent Activity, Quick Actions, Customize Dashboard + Refresh, "Data as of 8:30 AM" |
| 2 | **SOPs** | SOP Library table (name / department / version / last updated / owner / status), SOP Details rail with Acknowledgement Progress + Acknowledge button, Required Acknowledgements, Most Viewed, overdue alerts |
| 3 | **Inspections** | Queue table (name / area / type / assignee / due / score / status), Inspection Details rail (checklist %, score breakdown bars, Open Inspection CTA, Assign Follow-up), Open Corrective Actions, Top Failed Areas |
| 4 | **Maintenance** | Work-order table (room/area, category/asset, priority, assignee, due, status), Maintenance Details rail (checklist completion, parts history, Open Work Order CTA), PM Due This Week, Parts Watch |
| 5 | **Housekeeping** | Room board (checkout/stayover/inspected/dirty/clean tabs, assigned-to, due time, overdue flags), Summary rail (labor spend, cost/clean, minutes/room, productivity trend), Supply Watch, "Open Housekeeping Board" |
| 6 | **Transportation** | Trip table (route, type badge, driver, vehicle, departing, from→to, pax, status, ETA), Overview rail (trips, pax, on-time %, MPG, revenue), Vehicles Status, Drivers On Duty, fuel log, Operational Alerts |
| 7 | **Schedule & Forecast** | Department staffing table (staffed/needed, open shifts, hourly coverage bars), Weekly Forecast table (occupancy → rooms → labor hours → labor %), Labor Mix donut, Open Shifts, Schedule Accuracy |
| 8 | **Revenue (Attenda)** | Banner: "This is Attenda revenue only. Not PMS, rooms, or hotel revenue." Channel table (Shuttle 40.9% / F&D 25.1% / Taxi 15.5% / Marketplace 12.0% / Other 6.6%), trend chart, Top Products, Payouts & Balance |
| 9 | **Vendors** | Directory (category, contact, status, rating, on-time %, spend MTD, contract end), Contract Expirations rail, Vendor Performance, Spend by Category donut, Top Issues |
| 10 | **Staff Management** | Directory (role, dept, on-shift, performance), Roles & Permissions, Department Overview, Upcoming Training, Attendance donut, Quick Actions |
| 11 | **Property Settings** | Profile / config / integrations (Connected/Warning chips) / system status, Room Inventory donut, Recent Property Updates, 6-up Quick Actions |
| 12 | **Logo** | Teal "A" mark, navy "Attenda" wordmark, "operating system for hotels" tagline |

**Batch 2 (second drop, same day):** F&B ×2 — clean version (outlets table: Breakfast Area / Lobby Bar / Dinner Service / Room Service with revenue, covers, avg check, food-cost %, labor-cost %, On Track/Watch pills; F&B Summary rail; Top Selling Items; Cost Control Alerts; Daily Trend) AND Reeco version (Inventory Overview by category with On Track/Low/Reorder status + days of stock, Budget vs Orders donut, Order Schedule with suppliers, **"Send Orders to Reeco" hand-off card** — exactly the brief's organize→hand-off principle) · Reports — Overview/Tasks & Checklists/Cash Counts/Inspections/Attendance/Incidents/Training/Revenue/Custom tabs, Tasks & Checklists table, Tasks by Department donut, Top Performers, Overdue Tasks, Cash Counts Summary + variance · Transportation — Trips/Guest Rides/On-Time %/Gallons+MPG/Cost KPIs, Today's Shuttle Schedule, Fleet Status cards (fuel, maintenance, next service), Cost Overview (fuel 54% / maintenance 20% / supplies 10% / other 16%), Trip Summary donut, Top Routes, Maintenance Alerts · Schedules deep variant "Schedules, Forecast & Models" — Budgeted Schedule by Position (per-day hours, green/red over-plan coding), Model Selection card (e.g. Peak Season Model, effective dates, based-on occupancy/ADR), Labor Forecast / Position Models / Budget vs Actual tabs · Staff Management — tabs Users / Team Roster / Roles & Permissions / Availability / **Attendance & Callouts** / Training Status / Performance / Documents (confirms callouts fold-in) · Vendors — tabs Overview/All Vendors/Contracts/Invoices/POs/Categories/Performance, Upcoming Payments + Contracts Expiring Soon rails · Revenue (Attenda) final — take-rate KPI, channel table, payouts & balance.

**Still no mockups:** My Day, Training / Attenda University (screens only appear as nav items).

**Canonical sidebar (from the trimmed-nav mockups + Ales' Compset approval):** Dashboard · My Day · Right Answers (SOPs) · Inspections · Maintenance · Housekeeping · F&B · Transportation · Compset · Schedule & Forecast · Training · Revenue (Attenda) · Property Settings · Staff Management · Vendors · Reports. Requests NOT in nav (surfaces in Dashboard/My Day). Older mocks show a wider legacy nav (To-Dos, KPIs, Culture, Marketplace, Room Management, AI Agent, Contracts, Invoices, Shuttle+Taxi split) — treat those as the CURRENT app being restyled, not the V2 nav.

---

## 2. Design system (extracted, ready to tokenize)

### Color tokens
```
--bg-page:        #F6F8FA   (cool off-white)
--bg-card:        #FFFFFF
--border:         #E5EAF0
--ink:            #16233B   (navy headings — matches wordmark)
--ink-2:          #5B6B7E   (secondary text)
--brand:          #14A8A0   (teal — logo mark)
--brand-deep:     #0E7C74   (primary buttons, active nav text)
--brand-tint:     #E4F5F3   (active nav bg, selected accents)
--red:            #DC2626 / tint #FDECEC   (open, overdue, failed, critical)
--amber:          #D97706 / tint #FEF4E4   (needs attention, delayed, review)
--green:          #16A34A / tint #E7F6EC   (completed, active, good)
--blue:           #2F6FEB / tint #EAF1FD   (in progress, scheduled)
--purple:         #7C5CE0 / tint #F1EDFB   (dept/category chips)
```

### Type
- Stack already in repo: **Inter + Plus Jakarta Sans** — no change needed.
- Page title: 28–30px / 800. Greeting: 13px with 👋. Subtitle: 13px `--ink-2`. KPI number: 26px / 700. Table body: 13px. Meta/labels: 11–12px.

### Signature components (build once, reuse everywhere)
1. **KPI card** — pastel icon tile (28px radius-8), big number, label, sub-line (delta or alert, colored).
2. **Status pill** — tint bg + colored text: Open / In Progress / Scheduled / Completed / Needs Attention / Delayed / Failed / Review / Published.
3. **Segmented filter tabs** — pill group (All / Checkout / Stayover…).
4. **Data table** — 13px, avatar + primary text, pill column, kebab menu, hover row, **selected row = teal border + tint**.
5. **ActionRail (the ACTION panel)** — "X Details": icon tile, meta rows (label/value), progress bar(s), notes, full-width primary CTA, secondary row (Update Status / Assign Follow-up / Download Report).
6. **Panel** — white card, 16px radius, header + "View all →" link.
7. **Operational Alerts panel** — icon + one-line + chevron rows, red/amber severity.
8. **Quick Actions panel** — icon + bold verb + gray description.
9. **Page header pattern** — greeting / H1 / subtitle + right side (Customize · Refresh) + "Data as of 8:30 AM ↻".

### Layout
- **Sidebar 240px**: logo lockup top, nav with rounded active state, hotel switcher + © footer bottom.
- **Topbar**: search with ⌘K, bell (red badge), chat icon, avatar + name/role dropdown.
- **Content grid**: KPI strip (6) → main 2/3 WORK table + 1/3 right rail (details + alerts + quick actions) → bottom 4-up panels.
- **This IS the formula**: KPI strip = NOW · table = WORK · ActionRail = ACTION.
- **Desktop-first** (Ales, Aug 2026): build the desktop screens exactly as mocked. Mobile adaptation comes after, only if needed: sidebar → drawer, KPI strip → horizontal scroll, ActionRail → bottom sheet.

---

## 3. Code mapping (reality: `staff/page.tsx` 4,956 lines, 22 view components)

| V2 screen | Today | Action | Risk |
|---|---|---|---|
| Dashboard | `DailyBriefView` | **RESTYLE** to mockup | Low — data already fetched |
| My Day | `todos` only | **NEW** (awaiting mock) | New file |
| SOPs | `knowledge` tab ("Right Answers") | **RESTYLE** + rename | Low |
| Requests | `orders` tab | **DEMOTE** from nav; route stays, reachable from Dashboard/My Day | Low |
| Inspections | ❌ none | **NEW** — needs tables (P4) | Schema + new |
| Maintenance | ❌ none; `work_orders` table EXISTS | **NEW** on existing table | Medium |
| Housekeeping | `RoomsView` partial | **REBUILD/EXPAND** | Medium |
| F&B | ❌ none; `fnb_inventory` exists | **NEW** (awaiting mock) | Deferred |
| Transportation | `ShuttleView` + Bouncie live | **RESTYLE + ADD** vehicles/drivers/fuel panels | Medium |
| Schedule & Forecast | `SchedulesView` + `ForecastView` separate | **MERGE** into one screen | Medium |
| Training / University | `LearningHRView` | **RENAME + RESTYLE** | Low |
| Revenue (Attenda) | `RevenueView` | **RESTYLE + RELABEL** + banner + payouts panel | Low |
| Property Settings | `HotelSettingsView` | **RESTYLE + EXPAND** (integrations = real ones only) | Low |
| Staff Management | `staff_mgmt` | **RESTYLE + FOLD IN** Callouts tab | Medium |
| Vendors | `VendorsView` | **RESTYLE + EXPAND** (contracts, renewals) | Low |
| Reports | `ReportsView` | **RESTYLE** (Attenda-activity framing) | Low |

**Survivors needing a home (not in V2 mockups):** Compset, Culture, Leaderboard, Marketplace, QR Codes, AI Agent, Partners & Menu, Messages, Property Info, KPIs, Superadmin "All Properties".
**Proposal:** Partners & Menu + QR Codes + AI Agent + Property Info → inside Property Settings · Callouts → Staff Management · Marketplace → Vendors (supplier side) + Revenue (channel) · Culture + Leaderboard → Staff Management · Messages → topbar chat icon (mockup has one) · KPIs → Dashboard/My Day widgets · **Compset → STAYS in sidebar (Ales approved — rate tracking is in V2 scope)** · Superadmin stays.

**File strategy:** every new/rebuilt screen = its own file under `src/components/v2/`. `page.tsx` only gets: NAV array edit, new tabPanel slots, redirect for moved tabs. The file must get SMALLER over V2, not bigger.

**Iron rule for P0–P2: zero changes to effects, subscriptions, or fetch logic** — we just stabilized this file (`a5dff17`); V2 UI must not reopen the loop bug.

---

## 4. Phases

**P0 — Foundation** *(unblocks everything; no visible data change)*
- `v2/tokens.css` (section 2 values) + `ScreenShell` + `ActionRail` + shared pills/tables/panels.
- NAV rebuild to canonical sidebar + TAB_PERMS entries + redirects for demoted tabs.
- DoD: every existing tab renders inside the new shell, typecheck + tests green, diff touches no hooks.

**P1 — Approved restyles with existing data:** Dashboard, Revenue, SOPs.
**P2 — Approved restyles:** Vendors, Staff Management, Property Settings, Schedule & Forecast merge.
**P3 — Approved new screens on existing tables:** Maintenance, Housekeeping board, Transportation panels.
**P4 — Inspections** (only schema addition: `inspections`, `inspection_items`, `corrective_actions` + RLS). Screen ships read-only → interactive.
**P5 — Awaiting mockups:** My Day, F&B, Training/University, Reports polish.

Each phase gate: `npm run typecheck` ✅ → `npm test` ✅ → visual pass on localhost:3456 → **Ales approves before next phase. No `netlify deploy` at any point.**

---

## 5. Data gaps the mockups assume (defer, don't block)
- Acknowledgements tracking (SOPs) → tiny table, optional P5.
- Cleaning minutes / supplies par levels (Housekeeping) → fields on rooms/supplies, P5.
- Fuel log / vehicle docs (Transportation) → new table, P5.
- Integrations status (Property Settings) → show REAL integrations only (Stripe, Supabase, Resend, Bouncie, Twilio); no fake Kaba/Duetto rows.

## 6. Written-in rules (from the brief — apply at every review)
1. Every screen = NOW / WORK / ACTION. No exceptions for "quick" pages.
2. If a metric can't lead to source/owner/next action → it doesn't get a prominent card.
3. Revenue = Attenda Channel Revenue only. Never PMS/ADR/occupancy language.
4. Staff Management stays out of payroll/medical/SSN/HR-file territory.
5. Reports never claim to be the official PMS/accounting record.

## 7. Open decisions (need Ales)
1. **Sidebar conflict:** Dashboard mock shows Requests + Training in nav; the other 10 mocks show the trimmed 14-item sidebar. Proposal: trimmed sidebar + Training/University kept, **Requests out of nav**.
2. ✅ RESOLVED (Ales): Compset stays in the sidebar — rate tracking is approved V2 scope.
3. Send My Day / F&B / Training mockups when ready — or green-light building them from the formula + brief.