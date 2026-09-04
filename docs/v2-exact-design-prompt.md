# Attenda V2 — EXACT DESIGN REVISION (Owner correction)

## What happened
The first V2 build produced screens that do NOT exactly match the approved mockups in `docs/v2-mockups/`. The owner has corrected this: **the mockup images ARE the exact design.** This revision brings every V2 screen into faithful alignment with its mockup — same layout, same panels, same metric names, same visual hierarchy.

## Source of truth — UPDATED PRECEDENCE
1. `docs/v2-mockups/*.jpg` — EXACT design source. Where `docs/V2_UI_PLAN.md` or `docs/V2_BUILD_PLAN.md` conflict with a mockup, **THE MOCKUP WINS**.
2. Existing code/data only determines where data comes from — never the visual design.

## Exactness requirements (per screen)
Reproduce from the mockup, exactly:
- Overall layout structure (header rows, column arrangement, panel grid)
- Panel titles and their order
- Every metric/label/field shown in the mockup, with the same name
- Table columns and row structure
- Pills/badges/status chips and their placement
- Visual hierarchy: sizes, spacing, borders, colors (existing tokens in `src/components/v2/tokens.css`)
- Buttons and action placement

## Data policy (CRITICAL correction from last build)
- Use real data from existing `lib/supabase.ts` / `opsStore.ts` functions where the system has it.
- Where a mockup shows a field/metric with NO backing data, **KEEP THE FIELD EXACTLY AS DESIGNED** and render a neutral placeholder ("—" or a clearly-sample value). Do NOT substitute a different metric. Do NOT drop the field.
- Remove the previous substitutions — these must appear exactly as drawn: vendor star rating, vendor contract-end dates, staff "Compliance Rate" / "Performance Avg", labor-cost-%-of-revenue.

## Keep unchanged (already approved)
- Sidebar organization and folds: QR Codes + AI Agent → Property Settings; Marketplace → Revenue; Partners & Menu reachable from Vendors; Culture + Leaderboard out of sidebar; Compset last under Operate
- "Coming soon" stubs for modules without screens
- F&B and Reports concept screens exist; restyle F&B to match the mockups' visual language
- Revenue screen remains the approved synthesis of mockups 06/07/08 — but each panel must exactly match its source mockup panel (titles, metric labels, donut, ranked-bar "Top Performing Channels")
- If `02-logo.jpg` defines a logo/brand mark not yet applied, apply it to the V2 shell/sidebar header
- UI-only, desktop-first. NO deploys, NO git push/commit, NO API/DB schema changes. Compset view untouched.

## Scope of revision
Go screen by screen: `V2Dashboard` (01), `V2MyDay`, `V2Vendors` (03), `V2PropertySettings` (04), `V2StaffManagement` (05), `V2Revenue` (06/07/08 synthesis), `V2ScheduleForecast` (10).
For each: re-read the mockup image with Read, audit the current component against it, list every mismatch, then fix ALL of them.

## Self-verification before finishing
- After edits, re-read each mockup and re-audit the implementation. Fix anything still off.
- Run `npm run typecheck` AND `npm run build` — both must pass clean.
- Finish with: per-screen list of mismatches fixed, files modified, and any mockup element that was impossible to reproduce (with the reason).