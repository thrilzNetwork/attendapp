# Attenda V2 — Build Plan

> **Status:** PROPOSAL. Analysis and planning only — no production code was written or modified
> to produce this document. Source of truth: `docs/V2_UI_PLAN.md` (canonical brief, overrides
> mockups on any conflict). Mockups: `docs/v2-mockups/*.jpg`. Nothing in this plan is built until
> the owner signs off.

---

## 1. Executive summary

**What V2 is.** A visual and structural rebuild of the staff dashboard (`/staff`) around one
formula — **NOW → WORK → ACTION** — applied to 16 named modules. Attenda stops being a generic
admin panel and becomes an execution layer: every number on screen traces to a source, an owner,
and a next action. Revenue means Attenda-generated revenue only, never PMS numbers. Reports mean
"what happened inside Attenda," never the accounting record.

**Current state.**
- `src/app/staff/page.tsx` is a 4,983-line monolith: one `NavTab` union (32 members), one `NAV`
  array driving the sidebar, and a `tabPanel()` gate that mounts-once/keeps-alive each panel.
  Most panels are already extracted as dynamic imports under `src/components/staff/*.tsx`
  (21 of them), but several — `StaffView` (~520 lines), `IncidentKBView` (~430 lines, this is
  "Right Answers"), `QrCodesView`, `ChecklistsTabView`, `ShuttleScheduleView`,
  `KnowledgeBaseView`, `PropertiesView`, and five vendor sub-panels — are still defined **inline**
  in `page.tsx`.
- `src/components/v2/` already exists and is production-quality: `tokens.css` (colors, radii,
  sidebar width), `ui.tsx` (`V2Pill`, `V2KpiCard`, `V2Panel`, `V2ScreenHeader`,
  `v2StatusTone`) and two fully-built screens, `V2Dashboard.tsx` and `V2MyDay.tsx`, both already
  wired into `page.tsx` at the `dailybrief` and `myday` tabs. **These are the pattern to repeat,
  not replace.**
- The current sidebar (`NAV` array, `page.tsx:189`) has 24 visible entries across four sections
  (Today / Operations / Admin / Platform) plus a Vendor-only entry. It does not match the brief's
  16-module target: it exposes `orders` (Requests) and `learning_hr` (Training) as primary nav
  items — the brief explicitly forbids this — and it has no F&B, Inspections, Maintenance, or
  Housekeeping entries at all.

**What this plan does.** Defines the design tokens (already mostly captured), the target sidebar,
a phase-by-phase build order that shrinks `page.tsx` instead of growing it, per-module screen
specs for the six mocked modules, placeholder specs for F&B and Reports, the guardrail checklist,
and five decision-ready open questions for the owner.

---

## 2. Design tokens (extracted from mockups, already encoded in `tokens.css`)

Verified directly against 01-dashboard, 03-vendors, 04-staff-management, 05-property-settings,
06→09-revenue, 10-schedule-forecast. `src/components/v2/tokens.css` already matches this reading;
listed here for the record and because any new screen must pull from these vars, not new ones.

**Surfaces**
| Token | Value | Use |
|---|---|---|
| `--v2-bg-page` | `#F6F8FA` | page background behind cards |
| `--v2-bg-card` | `#FFFFFF` | all cards, table containers, sidebar |
| `--v2-border` | `#E5EAF0` | card borders, table row dividers |

**Ink**
| Token | Value | Use |
|---|---|---|
| `--v2-ink` | `#16233B` | headings, primary text, wordmark navy |
| `--v2-ink-2` | `#5B6B7E` | secondary/meta text, table headers |

**Brand (teal — from `02-logo.jpg`)**
| Token | Value | Use |
|---|---|---|
| `--v2-brand` | `#14A8A0` | primary CTA fill, active donut segment, primary buttons |
| `--v2-brand-deep` | `#0E7C74` | active sidebar nav text/icon, link text, icon tint fg |
| `--v2-brand-tint` | `#E4F5F3` | active sidebar row bg, icon chip bg |

**Status (pill bg/fg pairs, verified against Dashboard alerts, Revenue vs-last-month deltas,
Vendor status/rating chips, Staff attendance donut)**
| Token | bg | fg | Meaning |
|---|---|---|---|
| red | `#FDECEC` | `#DC2626` | open, overdue, failed, critical, absent |
| amber | `#FEF4E4` | `#D97706` | needs attention, delayed, review, late |
| green | `#E7F6EC` | `#16A34A` | completed, active, good, present, on-time |
| blue | `#EAF1FD` | `#2F6FEB` | in progress, scheduled |
| purple | `#F1EDFB` | `#7C5CE0` | department/category chips (donut slice family) |

**Radii / layout**
| Token | Value |
|---|---|
| `--v2-radius-card` | 16px (`rounded-2xl`) |
| `--v2-radius-pill` | 9999px |
| `--v2-radius-tile` | 8px (icon chips) |
| `--v2-sidebar-w` | 240px |

**Typography scale (observed across all 6 mockups, consistent)**
- Page H1: 28px / extrabold / `--v2-ink`
- Greeting line (above H1): 13px / medium / `--v2-ink-2`, prefixed with a wave emoji
- Subtitle (below H1): 13px / regular / `--v2-ink-2`
- Panel title (`V2Panel` header): 14px / bold / `--v2-ink`
- KPI value: 26px / bold / `--v2-ink`
- KPI label: 12px / semibold / `--v2-ink-2`
- KPI sub-line (delta/status): 11px / semibold / status color
- Table header: 12–13px / semibold / `--v2-ink-2`, uppercase not used (sentence case)
- Table cell primary: 13px / semibold / `--v2-ink`; secondary meta line under it at 11px / `--v2-ink-2`
- Pills: 11px / bold

**Spacing rhythm**
- Page padding: `p-4 md:p-8`, content capped `max-w-[1400px] mx-auto` (already in `V2Dashboard`/`V2MyDay`)
- KPI strip → main grid gap: `mb-5`
- Card grid gaps: `gap-3` (KPI strip), `gap-4` (panel grid)
- Card internal padding: `p-4` (KPI card), `px-4 pt-3.5 pb-2.5` header + `px-4 pb-4` body (`V2Panel`)

**KPI card pattern** (`V2KpiCard`, already built): icon chip (32×32, teal tint bg) + label →
value (26px bold) → colored sub-line. Clickable, routes to the tab that owns that number — this
*is* the "metric leads to source" guardrail expressed as a component contract.

**Section/panel card pattern** (`V2Panel`, already built): white rounded-2xl card, header row
with 14px bold title + optional right-aligned action link (12px bold teal, arrow icon), body area.

**Table pattern** (seen in Vendor Directory, Staff Directory, Today's Schedule): borderless rows
divided by `--v2-border` hairlines, sentence-case column headers in `--v2-ink-2`, primary value in
`--v2-ink` semibold with a secondary meta line underneath where needed (name + email, task +
guest), status/rating as inline pill or star row, row-level "…" actions menu on the far right,
pagination footer (`Showing 1 to 8 of 64` + numbered pager).

**Status pill colors** — see Status table above; `v2StatusTone()` in `ui.tsx` already implements
the keyword→tone mapping and should be extended (not replaced) for new module vocabularies
(e.g., inspection "failed"/"passed", PM "overdue"/"scheduled").

**Quick Actions panel** — every mockup ends its screen with a 4th/5th rail card titled "Quick
Actions": 2-column grid of icon + label + one-line sub-caption buttons, teal icon, no button chrome
(matches the pattern already in `V2Dashboard`'s Quick Actions, though that one only did icon+label
— mockups show icon+label+sub-caption, see gap note in §4 Phase 1).

**Page header pattern** (`V2ScreenHeader`, already built and matches every mockup exactly):
greeting (👋 + "Good morning, Alex") → H1 title → subtitle → right side: info banner is
**not** currently part of `V2ScreenHeader` (see below) + "Customize Dashboard" secondary button +
"Refresh" primary teal button + "Data as of HH:MM" pill with dot icon.

**Gap in `V2ScreenHeader`:** every non-Dashboard mockup (Vendors, Staff Mgmt, Property Settings,
Revenue, Schedule & Forecast) adds a one-line **info banner** directly under the subtitle — a
pale-teal full-width bar with an info icon and a single sentence framing the page's purpose
("This is Attenda revenue only. Not PMS, rooms, or hotel revenue.", "Maintain strong vendor
partnerships and ensure quality service delivery."). This is not decorative — for Revenue it is
literally the guardrail statement made visible in-product. `V2ScreenHeader` needs a new optional
`banner?: string` prop. Also needs `customizeLabel`/`onCustomize` and `onRefresh` since currently
`right` is a raw slot filled ad hoc — worth formalizing since every future screen needs the same
two buttons.

---

## 3. Sidebar spec

### Final nav order (16 modules + Compset, sectioned)

Per brief §"Sidebar cleanup (decided)": Requests and Training have mockup/PDF references but are
**not** primary nav; F&B and Reports have no mockups but **are** primary nav; Staff Callouts folds
into Staff Management; do not reproduce any single mockup's sidebar verbatim (they disagree with
each other and with the brief — e.g. `04-staff-management.jpg` still shows `SOPs`, no `My Day`
sub-split, no F&B/Reports gap-filling).

```
── Today ──
  Dashboard                (dailybrief)   — module 1
  My Day                   (myday)        — module 2

── Operate ──
  Right Answers / SOPs     (knowledge)    — module 3
  Inspections              (inspections)  — module 5   [NEW]
  Maintenance              (maintenance)  — module 6   [NEW]
  Housekeeping             (housekeeping) — module 7   [NEW]
  F&B                      (fnb)          — module 8   [NEW, no mockup]
  Transportation           (shuttle)      — module 9   [rename from "Transportation" label, already exists]
  Schedule & Forecast      (schedule_forecast) — module 10 [MERGE of schedules+forecast]

── Manage ──
  Revenue (Attenda)        (revenue)      — module 12
  Property Settings        (hotel)        — module 13
  Staff Management         (staff_mgmt)   — module 14  [absorbs Staff Callouts]
  Vendors                  (vendors)      — module 15
  Reports                  (reports)      — module 16  [no mockup]

── Platform (superadmin only) ──
  All Properties           (properties)
```

Compset (`compset`) is guardrailed to stay (§7) — it doesn't map to one of the 16 modules by name
but is a decided keeper. It slots into **Operate**, after Schedule & Forecast, since it's forecast-
adjacent (competitor rate intel feeding pricing/ops decisions), not a top-line module — flagged
for owner confirmation in §8.

### What folds where

| Current tab | Becomes |
|---|---|
| `orders` (Requests, currently primary nav) | **Removed from sidebar.** Surfaces as "Active requests" panel inside Dashboard (already true in `V2Dashboard`) and "My tasks" inside My Day (already true in `V2MyDay`). Deep-link route (`?tab=orders`) kept alive for the "Open queue" / "All requests" buttons those two screens already call — it just stops being a sidebar entry. |
| `learning_hr` (Training, currently primary nav) | **Removed from sidebar.** Individual view folds into My Day (a "Training due" KPI/panel, not yet built there — see Phase 6). Manager/admin program view folds into Staff Management as an "Upcoming Training" panel (mockup 04 already shows this pattern). |
| `callouts` + inline `AdminCalloutsView` (Staff Callouts, currently separate Admin nav item) | **Removed from sidebar**, merges into Staff Management (`staff_mgmt`) as a panel — brief is explicit: *"Staff Callouts live here, not separate sidebar module."* `CalloutsView.tsx` (480 lines) and inline `AdminCalloutsView` (page.tsx:4913) both get pulled into the new `StaffManagementView`. |
| `schedules` + `forecast` (two separate tabs today) | **Merged into one module**, `schedule_forecast`, matching mockup 10 exactly (one page, department-filtered schedule grid + weekly forecast side panel). `SchedulesView.tsx` (1,001 lines) and `ForecastView.tsx` (417 lines) become data sources feeding one new `V2ScheduleForecast.tsx`; the standalone views can stay as legacy fallbacks during transition (Phase 5) or be retired once parity is confirmed. |
| `partners` (Partners & Menu, currently Admin nav) | **Ambiguous — flagged in §8.** Brief's Vendors module says "Suppliers AND revenue partners," which could mean Partners & Menu (menu/offer configuration for revenue partners) absorbs into Vendors, or stays a distinct settings surface reachable *from* Vendors. Recommend: keep `partners` out of primary sidebar, reachable from a "Manage Menu" quick action inside the new Vendors screen. Do not delete `PartnersView.tsx` — it's the menu-editing UI vendors need, just not a top-level nav slot. |
| `qrcodes` (QR Codes, currently Admin nav) | **Not one of the 16 modules.** Recommend folding into Property Settings as a panel/quick-action (mockup 05's "Manage Integrations" quick action rail is the natural home) rather than keeping a dedicated sidebar slot. Flagged in §8. |
| `agent` (AI Agent, currently Admin nav) | **Not one of the 16 modules.** Recommend folding into Property Settings → Integrations (mockup 05 shows an "Integrations" panel listing connected systems — AI Agent config fits that pattern) or keeping as a hidden/advanced route reachable via a link, not sidebar. Flagged in §8. |
| `marketplace` (currently Operations nav) | **Not one of the 16 modules**, but Revenue mockup explicitly lists "Marketplace Offers" as a revenue channel. Recommend: marketplace *configuration* (managing offers) folds into Revenue as a panel/quick-action ("Marketplace Offers" row is already a revenue channel row in mockup 06); marketplace *browsing* (if guest-facing) is out of scope for staff sidebar. Flagged in §8. |
| `culture`, `leaderboard` | Not in the 16 modules and not mentioned in the brief at all. Recommend leaving out of the V2 primary sidebar for now (neither confirmed dead nor confirmed alive) — flagged in §8, do not delete the components. |
| `rooms` (Room Management) | Not one of the 16 modules by name, but "room workload / rooms" is core to Housekeeping (module 7) and room inventory shows up in Property Settings mockup ("Room Inventory Overview" panel). Recommend: Room Management's admin CRUD (types, counts) lives inside Property Settings; live room *status* (occupied/dirty/OOO) lives inside the new Housekeeping module. `RoomsView` gets split across those two consumers rather than kept as its own nav item. |
| `todos`, `kpis`, `checklists_tab` (To-Dos, KPIs, Checklists — currently separate Today-section nav items) | These are the raw data My Day and Dashboard already consume (`V2MyDay` reads checklist instances directly via `getChecklists`/`getChecklistInstances`). Per the Screen-Formula principle, they shouldn't have their own sidebar slots once My Day fully absorbs "required reporting" and "SOP acknowledgements." Recommend collapsing them out of the sidebar once My Day's WORK section covers to-dos+KPIs+checklists in one place (Phase 6) — until then, leave as-is under the hood (components keep working, just stop rendering their own nav row). |
| `guests` (Guests, present in `tabPanel` but **absent from `NAV`** already — dead sidebar entry, live route) | No change needed; it's already not in the sidebar. Leave as an internal-only route. |
| `sops` (declared in the `NavTab` union at `page.tsx:132` but never used in `NAV` or any `tabPanel()` call) | Dead type member. Delete when touching that union (Phase 1 cleanup) — SOPs content lives inside `knowledge` (Right Answers), not a separate tab. |

### Sidebar visual spec (from mockups, unanimous across all 6)

- Logo block pinned top: Attenda mark (teal triangle, `02-logo.jpg`) + wordmark + "operating system
  for hotels" tagline in `--v2-ink-2`, 11px.
- Nav rows: 40px tall, 14px icon + 14px label, `--v2-radius-tile` hover bg, active row gets
  `--v2-brand-tint` bg + `--v2-brand-deep` text/icon (already tokenized).
- No visible section dividers/labels in the mockups themselves (unlike the current `page.tsx` NAV
  which groups under "Today/Operations/Admin/Platform" headers) — mockups render one flat list.
  Recommend **keeping** section grouping (it's a real usability win at 16+ items and the brief
  doesn't forbid it) but keep group labels minimal/quiet (11px uppercase `--v2-ink-2`, matches
  current implementation's existing style) rather than inventing new chrome.
- Property switcher pinned bottom-left (hotel icon + name/city + chevron) — already present in
  current `page.tsx` sidebar footer; keep as-is, all 6 mockups confirm this pattern.

---

## 4. Phase-by-phase build order

Every phase is UI-only. No API/DB schema changes execute in this plan — where a module needs data
that doesn't exist yet (Inspections, Maintenance, Housekeeping, F&B have no backing tables today),
that's called out as a **future work / DB gap**, not built here.

### Phase 0 — Shell & token hardening (S)
**Goal:** Make the foundation ready for 14 more screens without redoing Phase 1-6 work later.
**Files:** `src/components/v2/ui.tsx`, `src/components/v2/tokens.css`.
**Changes:**
- Add `banner?: string` prop to `V2ScreenHeader` (renders the pale-teal info bar every non-
  Dashboard mockup has).
- Add a `V2QuickActions` shared component (icon + label + sub-caption, 2-col grid) — currently
  `V2Dashboard`/`V2MyDay` hand-roll icon+label only; every other mockup's Quick Actions panel has
  a third sub-caption line. Extract once, reuse across all 14 remaining screens.
- Add a `V2Table` shared component (header row, hairline-divided body rows, optional pagination
  footer) — the Vendor Directory / Staff Directory / Today's Schedule tables are visually
  identical in structure; hand-rolling `<table>` per screen (as `V2Dashboard` does today) will
  balloon the diff on every future screen.
**Extracted OUT of `page.tsx`:** nothing yet (tokens/ui only).
**Acceptance check:** `V2Dashboard`/`V2MyDay` re-skinned to use the new `V2QuickActions`/`V2Table`
with zero visual diff (regression check, not a redesign).

### Phase 1 — Sidebar restructure (S)
**Goal:** Ship the target nav from §3 without touching any panel internals.
**Files:** `src/app/staff/page.tsx` (`NavTab` union at L125, `NAV` array at L189, `TAB_PERMS` at
L180).
**Changes:**
- Rewrite `NAV` to the §3 order/sections; remove `orders` and `learning_hr` rows (routes stay
  live, just unlisted); remove `callouts` row (component folds into Staff Mgmt in Phase 4).
- Delete dead `sops` member from `NavTab`.
- Add new `NavTab` members: `inspections`, `maintenance`, `housekeeping`, `fnb`,
  `schedule_forecast` (rename target for merged schedules+forecast).
- No panel content changes — new nav rows can render a "Coming soon" stub via `tabPanel()` until
  their phase lands, so the sidebar ships and is demoable/reviewable independent of the rest.
**Extracted OUT of `page.tsx`:** nothing (structural only).
**Acceptance check:** Owner reviews the new sidebar order live at `/staff` before any screen work
starts — this is the highest-leverage checkpoint since it's the thing hardest to change once
staff have muscle memory around it.

### Phase 2 — Vendors screen (M)
**Goal:** Rebuild `vendors` tab as a V2 screen matching `03-vendors.jpg` exactly.
**Files create:** `src/components/v2/V2Vendors.tsx`.
**Files modify:** `page.tsx` tabPanel for `vendors` (swap `VendorsView` import for `V2Vendors`).
**Components used:** `V2ScreenHeader` (+banner), `V2KpiCard` ×6, `V2Table` (Vendor Directory),
`V2Panel` ×4 (Contract Expirations, Vendor Performance, Spend by Category donut, Recent Vendor
Activity, Top Issues), `V2QuickActions`.
**Data:** Reuse `VendorsView.tsx`'s existing data-fetching (1,259 lines — mostly CRUD forms this
screen doesn't need for its dashboard read-path); pull the read queries into a shared hook or just
call the same `lib/` functions `VendorsView` already calls. Do not touch `VendorsView.tsx` yet —
it may still be needed for the CRUD modals (add vendor, edit contract) that this dashboard's
"Actions" ⋯ menu and Quick Actions ("Add New Vendor") open into.
**Extracted OUT of `page.tsx`:** nothing (VendorsView was already external).
**Scope:** M — six-KPI strip + one big table + five side panels, but all patterns already proven
in `V2Dashboard`.
**Acceptance check:** Side-by-side against `03-vendors.jpg` — KPI values, table columns, and all
five side-panel titles/contents present; guardrail check: "Total Spend (MTD)" and "Avg Vendor
Rating" both trace to source (vendor row / rating field) not an opaque aggregate.

### Phase 3 — Property Settings screen (M)
**Goal:** Rebuild `hotel` tab matching `05-property-settings.jpg`.
**Files create:** `src/components/v2/V2PropertySettings.tsx`.
**Files modify:** `page.tsx` tabPanel for `hotel`.
**Components used:** `V2ScreenHeader` (+banner), `V2KpiCard` ×6, `V2Panel` ×5 (Property
Information w/ image, System Configuration, Room Inventory Overview donut, Recent Property
Updates, Integrations, Alerts & System Status), `V2QuickActions`.
**Data:** `HotelSettingsView.tsx` (1,044 lines) already has all the CRUD forms this screen's
"Edit"/"Manage" buttons open into — same pattern as Phase 2, dashboard-ify the read path, keep the
edit forms as the modal/drawer target.
**Note:** This is also the landing spot for QR Codes and AI Agent per the sidebar-fold
recommendation in §3 (pending owner sign-off in §8) — if approved, add "Manage QR Codes" and
"AI Agent Config" rows to the Integrations panel or Quick Actions.
**Extracted OUT of `page.tsx`:** `QrCodesView` (currently inline at `page.tsx:2920`, ~146 lines) —
move to `src/components/staff/QrCodesView.tsx` as a real file *now*, dynamic-import it, so it can
be opened as a drawer/modal target from this screen without living in the monolith.
**Scope:** M.
**Acceptance check:** Side-by-side against mockup; Integrations panel must show real connection
status, not hardcoded "Connected" chips — guardrail: no fabricated data.

### Phase 4 — Staff Management screen (L)
**Goal:** Rebuild `staff_mgmt` matching `04-staff-management.jpg`, absorbing Staff Callouts.
**Files create:** `src/components/v2/V2StaffManagement.tsx`.
**Files modify:** `page.tsx` — remove `callouts` tabPanel/nav row; `staff_mgmt` tabPanel now points
to `V2StaffManagement`.
**Components used:** `V2ScreenHeader` (+banner), `V2KpiCard` ×6, `V2Table` (Staff Directory),
`V2Panel` ×5 (Roles & Permissions, Department Overview, Upcoming Training, Staff Performance,
Attendance Overview donut), `V2QuickActions`.
**Data:** This is the single largest extraction in the plan. `StaffView` is currently 520+ lines
**inline** in `page.tsx` (L2329) — first move it verbatim to
`src/components/staff/StaffView.tsx` (mechanical extraction, Phase 4a), *then* build
`V2StaffManagement` as the new dashboard-style front end that opens `StaffView`'s existing
add/edit modals for mutations. Fold in `CalloutsView.tsx` (480 lines) and inline
`AdminCalloutsView` (`page.tsx:4913`, extract to file first) as the "Attendance Overview" /
callouts panel — brief: *"NEVER payroll/medical/SSN/HR files"* applies directly here, this panel
shows operational attendance events only, no HR document access.
**Extracted OUT of `page.tsx`:** `StaffView` (~520 lines) and `AdminCalloutsView` (~130 lines) —
net ~650 lines removed from the monolith.
**Scope:** L — biggest data surface (roles, departments, training, performance, attendance all in
one screen) plus a genuine extraction, not just a re-skin.
**Acceptance check:** Guardrail check is mandatory here and should block ship: confirm no
panel/field surfaces payroll, medical, or SSN data — brief calls this out explicitly as a redline,
not a style note.

### Phase 5 — Revenue screen (M)
**Goal:** Rebuild `revenue` matching the best-of-four synthesis of `06`–`09-revenue-variant-*.jpg`.
**Files create:** `src/components/v2/V2Revenue.tsx`.
**Files modify:** `page.tsx` tabPanel for `revenue`.
**Variant diff (what to take from each):**
- **06 (base):** Top-right rail = Payouts & Balance + Top Products/Services in the trend column.
  Bottom row: Revenue by Channel donut / Recent Revenue Activity / Payouts & Balance / Quick
  Actions.
- **07 (variant b):** Identical to 06 but Payouts & Balance moves to the bottom row (4th slot),
  freeing Top Products/Services to sit directly under the trend chart. Marginal reflow, same data.
- **08 (variant c):** Replaces the right-column "Top Products/Services" with "Revenue by Channel"
  (a ranked list, not a donut) directly under the trend chart, and swaps the bottom-row donut card
  for "Top Performing Channels" (bar-style ranked list) — i.e. this variant tries **list-based**
  channel breakdowns instead of a donut in two places at once.
- **09 (variant d):** Same layout as 06 but Take Rate reads 12.4% instead of 06's 12.1%/14.2%
  (data-only diff, not a layout difference) — essentially a data-refresh pass on the 06 layout.
- **Recommendation:** Build on **06/07's** layout (donut retained — it's the strongest "at a
  glance" read and matches the Dashboard's Occupancy Overview donut pattern, keeping visual
  language consistent app-wide) with **07's** ordering (Top Products under the trend chart, since
  that's more directly actionable than Payouts & Balance in that slot) and 08's "Top Performing
  Channels" ranked-bar card added as a 6th bottom-row panel *instead of* replacing the donut — best
  of all three rather than picking one verbatim. Flagged for owner confirmation in §8 since this
  is a genuine judgment call across four near-duplicate mocks.
**Components used:** `V2ScreenHeader` (+banner — this banner is the Revenue guardrail statement,
non-negotiable), `V2KpiCard` ×6, `V2Panel` ×6 (Revenue Overview table, Revenue Trend chart, Top
Products/Services, Revenue by Channel donut, Recent Revenue Activity, Payouts & Balance),
`V2QuickActions`.
**Data:** `RevenueView.tsx` (339 lines) already scopes to Attenda-channel revenue only per the
brief — confirm on inspection that no PMS/ADR/occupancy field has leaked in before reusing its
queries.
**Extracted OUT of `page.tsx`:** nothing (already external).
**Scope:** M.
**Acceptance check:** Every KPI/panel must be traceable to an Attenda transaction record — spot-
check "Attenda Take Rate" and "Avg Order Value" trace to real per-transaction fee/amount fields,
not a hardcoded ratio. Guardrail language ("This is Attenda revenue only. Not PMS, rooms, or hotel
revenue.") must render as the banner, unconditionally, every load.

### Phase 6 — Schedule & Forecast screen (L)
**Goal:** Merge `schedules` + `forecast` tabs into one screen matching `10-schedule-forecast.jpg`.
**Files create:** `src/components/v2/V2ScheduleForecast.tsx`.
**Files modify:** `page.tsx` — remove separate `schedules`/`forecast` nav rows, add merged
`schedule_forecast` row; both `tabPanel()` calls collapse into one.
**Components used:** `V2ScreenHeader` (+banner), `V2KpiCard` ×6, department-filter tab strip
(`All Departments` / `Front Office` / `Housekeeping` / `Maintenance` / `F&B` / `Other` — reuse the
pill-tab pattern already in `V2Panel`'s MTD/YTD toggle in Revenue), `V2Table` (Today's Schedule,
staffed/needed + hourly grid), `V2Panel` ×4 (Weekly Forecast, Labor Mix donut, Open Shifts,
Schedule Accuracy donut), `V2QuickActions`.
**Data:** `SchedulesView.tsx` (1,001 lines) and `ForecastView.tsx` (417 lines) both stay as-is
short-term; the new screen's read path composes both existing data sources into one view. Do not
merge the underlying components yet — only the presentation layer. Full backend merge (if ever
needed) is future work, not this plan.
**Extracted OUT of `page.tsx`:** nothing new (both already external); this phase's win is nav
simplification (2 sidebar rows → 1) not monolith shrinkage.
**Scope:** L — the hourly staffing grid (7 time-slot columns × N departments) is the most complex
single table in any of the six mockups.
**Acceptance check:** Confirm "Labor Cost %" reads "of Revenue" per mockup (`24.1% of Revenue`) —
this is the one spot in this module where a financial-sounding metric appears; verify it's framed
as a labor efficiency indicator, not dressed up as a PMS/finance number (stays inside the "match
labor to demand" framing the brief gives this module, not a financial forecast).

### Phase 7 — Right Answers (SOPs) rebuild, no mockup image (M)
**Goal:** Bring the existing `knowledge` tab into the V2 shell. No image mockup exists (PDF p2
referenced but not in `docs/v2-mockups/`) — build from the brief's description: *"Searchable
manager-maintained KB: SOP library, categories, departments, versions, status, last update, simple
Q/A."*
**Files create:** `src/components/v2/V2RightAnswers.tsx`.
**Files modify:** `page.tsx` — extract inline `IncidentKBView` (`page.tsx:4484`, ~430 lines) to
`src/components/staff/IncidentKBView.tsx` first (mechanical move), then build the V2 front end
around it. There's also a second, apparently-unused inline `KnowledgeBaseView`
(`page.tsx:3261`, ~336 lines) — confirm which is actually live via the `knowledge` tabPanel
(currently `IncidentKBView`, `page.tsx:1147`) before deciding whether `KnowledgeBaseView` is dead
code to delete or an alternate path to reconcile. Flagged in §8.
**Screen concept (NOW/WORK/ACTION applied, no image to trace):**
- NOW: KPI strip — Total SOPs, Categories, Recently Updated (7d), Departments Covered, Search
  Volume (30d) if tracked, Pending Q/A.
- WORK: searchable/filterable SOP table (title, category, department, version, status, last
  updated, owner) — this is the module's WORK queue even though it's reference material, not a
  task queue; the "action" per brief is "how do we do this correctly," so the WORK section is
  find-the-answer, not complete-a-task.
- ACTION: right rail — Recently Updated, Ask a Question / Suggest an Edit (Q/A submission,
  `KbSuggestions` functions already exist in `opsStore` per the imports at `page.tsx:103`), Quick
  Actions (New SOP, New Category — admin only).
**Scope:** M.
**Acceptance check:** Explicitly NOT an autonomous agent per brief — no chat-style "ask AI"
framing; it's a searchable library with a suggest/approve workflow (`createKbSuggestion` /
`approveKbSuggestion` already exist in `opsStore.ts`).

---

## 5. Per-module screen specs (six mocked modules)

### 5.1 Dashboard — ALREADY BUILT (`V2Dashboard.tsx`)
- **Layout zones:** Header (greeting/title/subtitle/dataAsOf, no banner in this one mockup) → 5-up
  KPI strip (Open Requests, Inspections Today, Work Orders, Arrivals Today, Occupancy, My Open
  Tasks — mockup shows 7, current build has 5; gap noted below) → 2-col main (Today's Activity,
  Occupancy Overview donut) + 1-col rail (Department Status, Recent Activity) + far rail (Critical
  Alerts, Quick Actions).
- **Gap vs mockup:** mockup's KPI strip has 7 cards (Open Requests / Inspections Today / Work
  Orders / Arrivals Today / Occupancy / My Open Tasks — that's 6 actually, recount: Open Requests,
  Inspections Today, Work Orders, Arrivals Today, Occupancy, My Open Tasks = 6); current
  `V2Dashboard` has 5 (Active requests, Completed today, Avg response, Staff on duty, Occupancy).
  "Inspections Today" and "Work Orders" cards don't exist yet because those modules (Inspections,
  Maintenance) have no backing data — correctly deferred, not a bug. Revisit this KPI strip once
  Phase 8+ (Inspections/Maintenance, out of this plan's scope) lands real data.
- **Current build already correctly implements:** Department Status (mockup) → mapped to "Today's
  plan" panel in current build (different framing, same NOW/WORK role) — minor naming gap only,
  not a structural one.

### 5.2 My Day — ALREADY BUILT (`V2MyDay.tsx`)
- **Layout zones:** Header → 4-up KPI strip (My shift, My tasks, My checklists, Required
  reporting) → 2-col main (My tasks table, My checklists w/ inline checkbox completion) + 1-col
  rail (Required reporting, Quick actions, Reference summary).
- **No PDF p11 image available to trace pixel-for-pixel** — brief's text description is satisfied:
  personal schedule ✓, assigned tasks ✓, required reporting/KPIs ✓ (KPI log CTA), SOP
  acknowledgements — not yet present (gap, low priority, add as a panel row once Right Answers
  (Phase 7) exposes an ack-tracking field), training — not yet present (gap, ties to Phase 6 nav
  fold of `learning_hr`), announcements — not yet present (gap), deadlines — implicitly covered by
  task/checklist due states.
- **Recommend as Phase 6.5 (S, after Phase 7):** add "Training due" and "Announcements" panels to
  My Day now that Training/Requests are confirmed out of the sidebar and need a home — this is the
  module that absorbs them per brief.

### 5.3 Vendors — see Phase 2 for build detail
- **Zones:** Header+banner → 6 KPI (Total Vendors, New This Month, Contracts Expiring, Avg Vendor
  Rating, On-Time Delivery, Total Spend MTD) → Vendor Directory table (filterable All/Active/
  Preferred/Inactive, search, columns: Name, Category, Contact, Status, Rating, On-Time Delivery,
  Spend MTD, Contract End, ⋯actions) + right rail (Contract Expirations list, Vendor Performance
  metrics-with-bars) → bottom row (Spend by Category donut, Recent Vendor Activity, Top Issues,
  Quick Actions).
- **Action panel:** ⋯ per-row menu (edit, contact, deactivate — opens `VendorsView` modals);
  Contract Expirations rows are themselves the ACTION surface (click → renewal flow).

### 5.4 Staff Management — see Phase 4 for build detail
- **Zones:** Header+banner → 6 KPI (Total Staff, On Shift Now, Open Shifts, Training Due,
  Compliance Rate, Performance Avg) → Staff Directory table (filterable All/On Shift/By
  Department/By Role/Inactive, columns: Name, Role, Department, Status, Performance ⋯) + right
  rail (Roles & Permissions counts, Department Overview table) → bottom row (Upcoming Training,
  Staff Performance ranked list, Attendance Overview donut — **this is where Callouts folds in**,
  Quick Actions).
- **Action panel:** ⋯ per-row (edit staff, assign permission, schedule); Quick Actions (Add Staff
  Member, Schedule Staff, Assign Permissions, Review Timesheets, Send Announcement).
- **Guardrail reminder:** Attendance Overview shows Present/Late/Absent counts only — no medical
  reason codes, no payroll linkage, per brief redline.

### 5.5 Property Settings — see Phase 3 for build detail
- **Zones:** Header+banner → 6 KPI (Property Profile name, Operating Since, Time Zone, Total
  Rooms, Departments, System Version) → Property Information card (with property photo) +
  System Configuration list (date/time format, week start, notifications, auto-assignment, SLA
  tracking, data retention, backup, API access) + right rail (Integrations list w/ connection
  status, Alerts & System Status) → bottom row (Room Inventory Overview donut, Recent Property
  Updates, Quick Actions).
- **Action panel:** Edit buttons on Property Information / System Configuration cards open
  `HotelSettingsView`'s existing forms; Integrations "View all"/"Manage Integrations" is the QR
  Codes / AI Agent landing spot per the §3 fold recommendation (pending owner approval).

### 5.6 Revenue — see Phase 5 for build detail and variant synthesis
- **Zones:** Header+banner (guardrail text, mandatory) → 6 KPI (Attenda Revenue MTD, Attenda
  Revenue YTD, Transactions MTD, Unique Users MTD, Avg Order Value, Attenda Take Rate) → Revenue
  Overview table (MTD/YTD/Last Month/Custom toggle, by-channel breakdown: Shuttle Service, Food &
  Dining, Taxi & Rides, Marketplace Offers, Other Services, with Revenue/%/Transactions/AOV/vs
  Last Month columns) + Revenue Trend line chart (right) → bottom row (Revenue by Channel donut,
  Top Products/Services ranked list, Recent Revenue Activity, Payouts & Balance, Quick Actions).
- **Action panel:** Payouts & Balance card is itself actionable (Current Balance → payout);
  Quick Actions (View Revenue Dashboard, Export Revenue Report, Manage Payout Settings, Revenue
  Goals, Pricing & Commissions).

### 5.7 Schedule & Forecast — see Phase 6 for build detail
- **Zones:** Header+banner → 6 KPI (Today's Occupancy, Forecasted Occupancy, Total Labor Hours,
  Labor Cost % of Revenue, Open Shifts, Schedule Accuracy) → department-tab-filtered Today's
  Schedule grid (Staffed/Needed, Labor Hours, hourly headcount 7AM/11AM/3PM/7PM/11PM columns,
  totals row) + Weekly Forecast table (right, 7-day: Occupancy/Rooms/Labor Hours/Labor %) → bottom
  row (Labor Mix donut, Open Shifts list w/ priority pills, Schedule Accuracy donut w/ trend,
  Quick Actions).
- **Action panel:** row ⋯ menu on schedule grid (adjust shift); Open Shifts list is itself the
  ACTION surface; Quick Actions (Create New Schedule, Adjust for Pickup, Approve Schedule, Manage
  Time Off, Labor Budget vs Actual).

---

## 6. Placeholder specs — F&B and Reports (no mockups) — **NEEDS OWNER APPROVAL**

Both are primary nav per the brief despite having no visual reference. Concepts below follow the
established design system exactly (same KPI strip / table / rail / Quick Actions shape as the six
built modules) so they slot in without inventing new visual language. **Do not build either until
the owner confirms the concept — these are proposals, not specs.**

### 6.1 F&B (concept)
Brief: *"Property's actual model (breakfast/restaurant/reception/pantry): inventory, par levels,
waste, orders, budgets, labor, procedures, brand standards, upcoming needs. Reeco/purchasing:
organize/validate, then hand off — never become the purchasing platform."*

- **Header + banner:** "This is F&B operations tracking. Purchasing happens in [Reeco/vendor
  platform] — Attenda organizes and hands off." (guardrail made visible, mirrors Revenue's banner)
- **KPI strip (6):** Items Below Par, Waste Logged (MTD $), Open Orders (pending handoff), Labor
  Cost % (of F&B revenue if tracked, else of budget), Budget Utilization %, Brand Standard
  Compliance %.
- **WORK — main table:** Inventory/Par Level table per outlet (Breakfast / Restaurant / Reception
  / Pantry tabs, mirroring the department-tab pattern from Schedule & Forecast): item, outlet, par
  level, on-hand, status (below/at/above par pill), last counted, action (reorder → hands off to
  purchasing, does not execute a purchase).
- **Right rail:** Upcoming Needs (par-level-driven reorder suggestions), Waste Log (recent entries
  w/ reason codes), Brand Standards checklist status.
- **Bottom row:** Spend by Outlet donut, Recent Orders/Handoffs activity, Quick Actions (Log
  Waste, Count Inventory, Request Reorder [hands off, doesn't purchase], Update Par Levels).
- **DB gap (future work only):** no `fnb_par_levels`/`fnb_waste_log` tables exist yet — `supabase-
  schema.sql` shows `fnb_inventory` and `meal_covers` only (per CLAUDE.md's table list). Building
  this screen for real needs a schema pass; this plan only proposes the visual shape.

### 6.2 Reports (concept)
Brief: *"Generated from Attenda activity: completion, timeliness, inspection scores, request
response/resolution, PM completion, training, operational compliance, departmental execution,
Attenda-channel transactions, task history. NEVER the official PMS/accounting record."*

- **Header + banner:** "Generated from Attenda activity only. Not the official PMS or accounting
  record." (guardrail, mirrors Revenue's banner exactly in tone/placement)
- **KPI strip (6):** Requests Resolved (30d), Avg Resolution Time, Inspection Pass Rate, PM
  Completion Rate, Training Completion %, Departmental Compliance Score.
- **WORK — main area:** Report builder/list — this module is less "one live table" and more
  "generate and browse reports," so the WORK zone should be a saved-reports table (Report Name,
  Type, Date Range, Generated By, Generated At, ⋯ download/view) with a "Generate Report" primary
  action, rather than forcing a live-queue metaphor onto something that's inherently retrospective.
  `ReportsView.tsx` (524 lines) already exists — confirm on inspection whether it already has this
  shape before designing further.
- **Right rail:** Departmental Execution scorecards (per-department mini bar, mirrors Dashboard's
  Department Status pattern), Recent Reports.
- **Bottom row:** Compliance Trend chart, Task History activity feed, Quick Actions (Export CSV,
  Schedule Recurring Report, Compliance Audit).
- **DB gap:** none expected — this module is a read/aggregation layer over existing tables
  (`requests`, `patrol_logs`, `work_orders` once Maintenance exists, `staff_checklist_instances`)
  rather than needing new tables, unlike F&B.

---

## 7. Guardrails checklist (from the brief — verify at every phase's acceptance check)

- [ ] **Revenue never speaks PMS language.** No ADR, occupancy-as-revenue, or "hotel revenue"
      framing anywhere in Revenue screen or its KPI labels. Banner text is mandatory, not optional.
- [ ] **Reports never poses as the accounting record.** Banner text mandatory; no export labeled
      "official" or implying finance/accounting sign-off.
- [ ] **Metric-to-action principle.** Every KPI card and panel row must be clickable/traceable to
      its source screen, owner, or next action — this is why `V2KpiCard` takes an `onClick`, and
      why every panel's "View all" link routes somewhere real, not a dead end.
- [ ] **No payroll/medical/SSN in Staff Management.** Attendance = Present/Late/Absent counts and
      operational callout events only. No HR document access, no medical reason codes, no pay
      rate fields anywhere in the V2 Staff Management screen.
- [ ] **Never replace a page to add a feature — add tabs/sections only** (CLAUDE.md Critical Rule
      #1, reinforced by brief). Every phase above modifies a `tabPanel()` target or adds a new nav
      row; none of them repurpose an existing page for an unrelated feature.
- [ ] **Compset stays.** Not one of the 16 modules by name, but explicitly a decided keeper —
      don't fold it into Schedule & Forecast or drop it during the sidebar restructure (Phase 1).
- [ ] **F&B never becomes the purchasing platform.** Reorder/order actions organize and hand off;
      they don't execute a purchase or integrate a payment flow inside Attenda.
- [ ] **Mobile comes after desktop.** All phases in this plan are desktop-first per the brief;
      no responsive/mobile pass is in scope here.

---

## 8. Open questions for the owner

1. **Sidebar folds (§3 "What folds where"):** QR Codes and AI Agent → into Property Settings;
   Marketplace configuration → into Revenue; Partners & Menu → reachable from Vendors but not a
   sidebar row; Culture and Leaderboard → dropped from V2 sidebar entirely (components kept, not
   deleted). Confirm these five folds, or redirect any of them.
2. **Compset's section placement:** recommended under "Operate," last item. Confirm, or specify a
   different section/position.
3. **Revenue screen layout (Phase 5):** recommended synthesis is 06/07's donut-based layout +
   07's panel ordering + 08's "Top Performing Channels" ranked-bar card added as a 6th panel
   (not a replacement). Confirm this synthesis, or name a single variant to follow exactly instead.
4. **`KnowledgeBaseView` (page.tsx:3261, ~336 lines) vs `IncidentKBView` (page.tsx:4484, ~430
   lines):** the `knowledge` tab currently renders `IncidentKBView` only. Is `KnowledgeBaseView`
   dead code safe to delete in Phase 7, or does it serve a route/flow this analysis didn't surface?
5. **F&B and Reports concepts (§6):** both are proposals with no visual reference. Approve the
   concepts as-is, request a mockup pass first, or redirect the shape (e.g., F&B as multi-outlet
   tabs vs. a single combined table) before Phase 8+ (out of this plan's scope) begins.
