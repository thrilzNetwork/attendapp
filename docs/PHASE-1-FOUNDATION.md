# PHASE 1 — FOUNDATION: Feature Audit & Navigation Proposal

**Governing document:** `docs/PRODUCT-REORGANIZATION-DIRECTION.md` (the law — 38 sections)
**Codebase state:** B1/V1 classic app, main = `a5dff17` (Aug 27) + this doc
**Date:** September 9, 2026
**Status:** Proposal — Ale approves nav + audit before Phase 2 starts

---

## DELIVERABLE 1 — FEATURE AUDIT (what exists today)

The staff app (`/staff`) has **25 nav tabs across 4 sections** + 2 special-role tabs.
`src/app/staff/page.tsx` is a **4,956-line monolith** with **9 entire views defined inline** inside it.
Total view code: **16,234 lines** across `src/components/staff/`.

### Today (5 tabs)
| Nav label | Component | Lines | Job |
|---|---|---|---|
| Dashboard | DailyBriefView | 866 | What is happening now |
| Requests | OrdersView | 515 | What someone requested |
| To-Dos | PositionTodosView | **1,574** | What I'm responsible for (biggest module) |
| KPIs | KpisView | 428 | How we're performing |
| Schedules | SchedulesView | 1,001 | Who works when |

### Operations (8 tabs)
| Nav label | Component | Lines | Job |
|---|---|---|---|
| Transportation | ShuttleView | 1,350 | Transportation only (incl. Bouncie GPS 457) |
| Compset | CompsetView | 592 | Competitors |
| Forecast | ForecastView | 417 | What's coming |
| Culture | CultureView | 672 | People / recognition |
| Right Answers | IncidentKBView (inline p.4457) | ~300 | SOPs / how we do things |
| Learning & HR | LearningHRView | 725 | Training |
| Marketplace | MarketplaceView | 255 | Community vendors |
| Property Info | PropertyInfoView (inline p.3837) | ~90 | Guest-facing property facts |

### Admin (9 tabs)
| Nav label | Component | Lines | Job |
|---|---|---|---|
| Revenue | RevenueView | 339 | What we measure ($) |
| Reports | ReportsView | 524 | Aggregations/exports |
| Staff Callouts | CalloutsView | 480 | Absences — **§23: REMOVE, fold into People** |
| Property Settings | HotelSettingsView | 1,044 | Config |
| Staff Management | StaffView (inline p.2302) | ~600 | People records |
| Partners & Menu | PartnersView | 1,213 | Vendor menus |
| Vendors | VendorsView | 1,259 | Vendor mgmt |
| QR Codes | QrCodesView (inline p.2893) | ~350 | QR generation |
| Room Management | RoomsView | 472 | Room statuses |
| AI Agent | AgentDashboard | 335 | AI ops |

### Platform (1) / Vendor (1)
| Nav label | Component | Lines | Job |
|---|---|---|---|
| All Properties | SuperAdminView | 862 | Corporate view (superadmin only) |
| Vendor Dashboard | VendorDashboard (inline p.2004) | ~300 | Vendor role home |

### DEAD CODE (verified — zero navigation paths reach any of it)
| Ghost surface | Where | Evidence |
|---|---|---|
| `messages` tabPanel | page.tsx:1082 | No `setTab('messages')` anywhere in src/ |
| `guests` tabPanel | page.tsx:1132 | No `setTab('guests')` anywhere |
| `leaderboard` tabPanel | page.tsx:1053 | No `setTab('leaderboard')` anywhere |
| `checklists_tab` tabPanel | page.tsx:1059 | No `setTab('checklists_tab')` anywhere |
| `shuttle_schedule` tabPanel | page.tsx:1088 | No `setTab('shuttle_schedule')` anywhere |
| `FrontDeskView` (656 lines) | page.tsx:74 import | Imported, not in NAV, never navigable |
| 5 ops-tools imports (518 lines) | page.tsx:64–69 | CallAroundView, DailyLogsView, NoShowsView, RoomMovesView, BankCountView — imported, never rendered |
| `'sops'` in NavTab type | page.tsx:128 | Type member with no panel |

**Dead total: 5 ghost tabPanels + ~1,500 dead lines.** Removing them is presentation cleanup, not a feature change — allowed under §2.

---

## DELIVERABLE 2 — DUPLICATION REPORT (§1 violations)

**The rule (§1):** every type of information has ONE owner. Do not recreate the same module inside three different areas.

| Data / feature | Surfaces that render it | Violation |
|---|---|---|
| **Requests** (`requests` table) | OrdersView, DailyBriefView, ReportsView, SuperAdminView, FrontDeskView (dead), ShuttleView, CultureView, page inline | **8 surfaces — worst violation.** Requests live in Orders; Dashboard/Reports should *link*, not re-render |
| **Schedules** (`getStaffSchedules`) | SchedulesView, DailyBriefView, ShuttleView, FrontDeskView (dead) | 4 surfaces |
| **Forecast** (`getWeeklyForecast`) | ForecastView, DailyBriefView, SchedulesView, FrontDeskView (dead) | 4 surfaces |
| **KPI data** (`kpi_submissions` / op-records) | KpisView, DailyBriefView, ReportsView | 3 surfaces |
| **Bank count** | ReportsView, PositionTodosView | 2 surfaces (BankCountView is the dead 3rd) |
| **Callouts** | CalloutsView, SuperAdminView, page | 3 surfaces (§23 kills the standalone one) |
| **Checklist concepts** | PositionTodosView (1,574 l.), dead ChecklistsTabView, checklist sections inside DailyBrief | Same job in 2 live places |
| **Schedule surfaces** | SchedulesView + dead ShuttleScheduleView | 2 schedule UIs |
| **Culture vs Leaderboard** | CultureView (live) + dead LeaderboardView | Leaderboard already absorbed — ghost confirms |

**Structural finding:** `page.tsx` (4,956 lines) holds 9 inline views. Extraction is mechanical but must happen before nav groups mean anything — a "group" of tabs pointing into a monolith can't be reorganized safely.

---

## DELIVERABLE 3 — NAVIGATION PROPOSAL (§30's 6 groups)

Current sections (Today/Operations/Admin/Platform) → proposed §30 groups. **No functionality changes — only grouping, labels, and order.** 25 tabs → 21 (5 ghosts removed, callouts folded, marketplace + property info stay).

### 🌤 TODAY *(opens on sign-in — what's happening + what I do)*
1. **Dashboard** — live snapshot, freshness stamp (§3–4)
2. **Requests** — the queue
3. **To-Dos** — my responsibilities
4. **Schedules** — who works when
5. **KPIs** — how we're performing

### 🔧 OPERATIONS — property tools
6. **Transportation**
7. **Room Management**
8. **QR Codes**
9. **Property Info**

### 📈 PERFORMANCE — numbers & planning
10. **Forecast**
11. **Compset**
12. **Revenue**
13. **Reports**

### 👥 PEOPLE — staff & recognition
14. **Culture** (leaderboards/rewards live here — leaderboard ghost stays dead)
15. **Staff Management** (callouts fold in here per §23 — absence is a staff matter, not a nav item)
16. **Learning & HR**

### 📖 KNOWLEDGE — how we do things
17. **Right Answers** (SOPs)
18. **Learning Hub** *(= Learning & HR, renamed per §30)*

### ⚙️ MANAGEMENT — setup & partners
19. **Property Settings**
20. **Partners & Menu**
21. **Vendors**
22. **AI Agent**
23. **All Properties** *(superadmin only)*
24. **Vendor Dashboard** *(vendor role only)*

**Role gating stays as-is this phase** (roles per NAV entry unchanged). Role-map defaults in Deliverable 4 inform Phase 2+ only.

---

## DELIVERABLE 4 — ROLE MAP (§32 defaults)

Roles in code: `admin | staff | superadmin | vendor | manager | supervisor`.

| Group | Staff | Management (admin/mgr/sup) | Corporate (superadmin) |
|---|---|---|---|
| Today | Dashboard, Requests, To-Dos, Schedules | + KPIs | all |
| Operations | Transportation (view), Property Info | + Room Mgmt, QR Codes | all |
| Performance | — (own stats in Dashboard/Culture only) | Forecast, Compset, Revenue, Reports | all |
| People | Culture, Learning & HR | + Staff Management | all |
| Knowledge | Right Answers, Learning Hub | same | all |
| Management | — | Property Settings, Partners, Vendors, AI Agent (admin-only today — stays) | + All Properties |
| Vendor | Vendor Dashboard only | — | — |

Key defaults: staff sees **Today + Operations(view) + People(self) + Knowledge** — no Performance, no Management. Management sees everything operational. Corporate sees platform. Matches existing NAV roles array; proposed group boundaries don't fight it.

---

## DELIVERABLE 5 — DATA-OWNERSHIP TABLE (§1: one owner per data type)

| Data | Owner screen (the ONE place it lives) | Everyone else |
|---|---|---|
| Guest requests | **Requests** (OrdersView) | Dashboard shows *count + link* only |
| To-Dos / checklists | **To-Dos** (PositionTodosView) | Dashboard shows *my items due today* only |
| Schedules | **Schedules** (SchedulesView) | Dashboard shows *today's shifts*; Shuttle shows *its drivers' shifts* |
| Forecast | **Forecast** (ForecastView) | Dashboard shows *this week's pickup*; Schedules shows *staffing vs forecast* |
| KPIs | **KPIs** (KpisView) | Dashboard shows *3 cards max*; Reports aggregates read-only |
| Revenue / night audit | **Revenue** (RevenueView) | Reports aggregates; Dashboard shows *run-rate* only |
| Comp set | **Compset** (CompsetView) | Reports aggregates |
| Recognition / leaderboards | **Culture** (CultureView) | — |
| SOPs | **Right Answers** (IncidentKBView) | — |
| Training / HR | **Learning Hub** (LearningHRView) | — |
| Transportation | **Transportation** (ShuttleView) | — |
| Room statuses | **Room Management** (RoomsView) | Dashboard shows *OOO count only* |
| Hotel config / wifi / phones | **Property Settings** (HotelSettingsView) | Property Info renders guest-facing subset read-only |
| Partners & menus | **Partners & Menu** (PartnersView) | Marketplace + Requests render menus read-only |
| Vendors | **Vendors** (VendorsView) | — |
| QR codes | **QR Codes** (QrCodesView) | — |
| AI agent | **AI Agent** (AgentDashboard) | — |
| All-properties | **All Properties** (SuperAdminView) | — |
| Property facts (guest-facing) | **Property Info** (PropertyInfoView) | Guest app reads config read-only |

**Rule going forward:** if a screen needs another owner's data, it renders a *summary with a link* (§38 "Is this info already somewhere else?") — never a second editor or a full re-render.

---

## §38 TEST — applied to the 24 proposed screens

| Screen | What is this for? | Who uses it? | Decision it helps make | Pass? |
|---|---|---|---|---|
| Dashboard | What's happening now | Everyone | What to do next | ✅ |
| Requests | Guest/staff needs | Everyone | Accept/assign/complete | ✅ |
| To-Dos | My responsibilities | Everyone | Check off work | ✅ |
| Schedules | Who works when | Everyone | Cover shifts | ✅ |
| KPIs | How we perform | Management | Adjust ops | ✅ |
| Transportation | Move guests | Everyone (staff view) | Run routes | ✅ |
| Room Management | Room states | Housekeeping/mgmt | Assign/hold rooms | ✅ |
| QR Codes | Guest entry points | Management | Deploy QR | ✅ |
| Property Info | Guest-facing facts | Everyone | Answer guest questions | ✅ |
| Forecast | What's coming | Management | Staff/buy accordingly | ✅ |
| Compset | Competitor rates | Management | Price decisions | ✅ |
| Revenue | Money in | Management | Track performance | ✅ |
| Reports | Aggregations/exports | Management | Review & share | ✅ |
| Culture | Recognition | Everyone | Celebrate/engage | ✅ |
| Staff Management | People records | Management | Hire/schedule/manage | ✅ |
| Learning Hub | Training | Everyone | Complete training | ✅ |
| Right Answers | SOPs | Everyone | Do it right | ✅ |
| Property Settings | Config | Management | Set up property | ✅ |
| Partners & Menu | Vendor offerings | Management | Enable ordering | ✅ |
| Vendors | Vendor mgmt | Management | Manage partners | ✅ |
| AI Agent | Automation | Management | Configure AI | ✅ |
| All Properties | Portfolio view | Corporate | Compare properties | ✅ |
| Vendor Dashboard | Vendor orders | Vendor role | Fulfill orders | ✅ |
| ~~Staff Callouts~~ | Absences | Management | **Folded into Staff Management (§23)** | moved |

---

## PROPOSED PHASE 2 SCOPE (after approval — do NOT start)

Per §phases: Dashboard + My Day + Requests + To-Dos + Schedule + Forecast.
- Dashboard rebuild per §3–4: Manager Brief, Hotel Snapshot (Rooms Sold / Occ% / Arrivals / Departures / In-House / OOO) with freshness stamp, one CTA each
- Requests as the single owner of `requests` (strip re-renders elsewhere)
- To-Dos as the single owner of position-todo data
- Schedule/Forecast as their own owners with cross-links
- Enforce data-ownership table above
- Extract the 9 inline views from page.tsx as touching each area

## RULES DURING PHASE 2 (from the directive)

1. Don't rebuild the engine — B1 functionality stays; presentation/nav rebuilds (§2)
2. **No new features**
3. **No fake data** — honest empty states with a CTA (§35)
4. Every screen passes the §38 test
5. `npm run typecheck` must pass before any commit/deploy
6. Never touch visual design language yet (Phase 5)

---

*End of Phase 1 deliverables. Ale approves nav + audit → Phase 2 begins.*