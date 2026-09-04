# Mockup 01 — Dashboard (EXACT DESIGN SPEC)

Ground truth: native view of docs/v2-mockups/01-dashboard.jpg. Sidebar/topbar follow the approved V2 shell — do NOT copy the mockup's sidebar rows; the content area must match exactly.

## Page header
- Title "Dashboard" + subtitle line; right side "Refresh" button + data-as-of chip.
- Greeting bar: "Good morning, Alex" style (real session name), search field, user chip (name + role).

## KPI row — exactly 6 cards in one row (label / large value / small sub-caption)
1. Open Requests
2. Inspections Today
3. Work Orders
4. Arrivals Today
5. Occupancy (percent)
6. My Open Tasks
Values from live data; '—' where none. Do NOT substitute or drop cards.

## Main content — 2-column grid (left ~2/3, right ~1/3)
LEFT column:
- "Today's Activity" panel — rows: time · activity · status pill (live requests/activity)
- "Critical Alerts" panel — alert rows with severity tone (red/amber) + action button
RIGHT column:
- "Department Status" panel — per-department rows with status dot + counts
- "Occupancy Overview" panel — occupancy visual (percent + bars/segment breakdown)

## Bottom row
- "Recent Activity" panel — timestamped list of latest completed items
- "Quick Actions" panel — button grid (New Request, Log Inspection, Create Work Order, and other real destinations via onOpenTab)

## Notes
- Mockup values are sample data — wire real data from existing props/functions (requests, schedules, forecasts, checklist instances as currently available in V2Dashboard).
- Keep the existing props interface so page.tsx needs no changes.