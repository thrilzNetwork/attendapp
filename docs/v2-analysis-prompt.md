Produce the Attenda V2 build plan. Analysis and plan ONLY — do not write or modify any production code. Your only file output is docs/V2_BUILD_PLAN.md.

## Read first (in this order)
1. docs/V2_UI_PLAN.md — CANONICAL product brief from the owner. Follow it exactly. It overrides everything, including the mockups.
2. docs/v2-mockups/*.jpg — 10 approved UI mockups. Read every image:
   - 01-dashboard.jpg (Dashboard)
   - 02-logo.jpg (brand mark)
   - 03-vendors.jpg
   - 04-staff-management.jpg
   - 05-property-settings.jpg
   - 06-revenue.jpg + 07/08/09-revenue-variant-*.jpg (four near-identical Revenue variants — extract the best elements from all four, note the differences)
   - 10-schedule-forecast.jpg
   NOTE: F&B and Reports have NO mockups but ARE primary nav (per brief). Requests and Training have slots in the Dashboard mockup sidebar but must NOT be primary nav items (per brief). Do not blindly reproduce any single mockup's sidebar.
3. src/components/v2/ — V2 foundation already exists: V2Dashboard.tsx, V2MyDay.tsx, tokens.css, ui.tsx. Assess what's there and whether the plan builds on it or replaces it.
4. src/app/staff/page.tsx — current 4,956-line monolith. Study the NAV array (~line 185), NavTab union (~line 122), TAB_PERMS, and tabPanel rendering pattern.
5. CLAUDE.md — project conventions and critical rules.

## Analyze
- Map all 16 V2 modules from the brief to: current tab/view in staff/page.tsx, existing v2/ component (if any), mockup reference (if any), and the gap.
- Extract the design system from the mockups: sidebar style, teal/green accent color, KPI card pattern, section card pattern, table styling, status pill colors, typography scale, spacing rhythm, Quick Actions panel, page header pattern (greeting + title + subtitle + info banner + Customize/Refresh + data timestamp).
- Define the NOW/WORK/ACTION screen shell pattern and how it maps onto what the mockups actually show.
- Sidebar target state per the brief's "Sidebar cleanup (decided)" section.

## Produce docs/V2_BUILD_PLAN.md with these sections
1. Executive summary (what V2 is, current state, what this plan does)
2. Design tokens extracted from the mockups (colors incl. the teal accent, typography, spacing, card/table/pill patterns) — concrete values, ready to become CSS
3. Sidebar spec: final nav order with sections, what folds where (Callouts → Staff Management, Requests/Training handling, where Compset/Marketplace/Culture/QR Codes/AI Agent land — recommend and flag for owner)
4. Phase-by-phase build order. For each phase: goal, files to create/modify, components, what gets extracted OUT of staff/page.tsx, rough scope (S/M/L), and acceptance check
5. Per-module screen specs for the six mocked modules (Dashboard, Vendors, Staff Management, Property Settings, Revenue, Schedule & Forecast): layout zones, KPI strip contents, tables/queues, action panels — grounded in what the mockup actually shows
6. Placeholder specs for F&B and Reports (no mockups yet — propose a visual concept consistent with the design system, marked NEEDS OWNER APPROVAL)
7. Guardrails checklist from the brief (Revenue never speaks PMS language, metric-to-action principle, no payroll/medical/SSN, never replace pages — add tabs/sections only, Compset stays)
8. Open questions for the owner (max 5, decision-ready)

## Hard rules
- UI-only, desktop-first. No deploys, no API/DB changes in the plan's execution (note DB gaps as future work only).
- Plan must SHRINK staff/page.tsx over time, not grow it.
- Nothing here gets built without the owner's go — this doc is the proposal.