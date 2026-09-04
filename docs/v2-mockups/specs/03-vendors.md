# Mockup 03 — Vendors (EXACT DESIGN SPEC)

Ground truth: native view of docs/v2-mockups/03-vendors.jpg. Sidebar/topbar follow the approved V2 shell — do NOT copy the mockup's sidebar rows; the content area must match exactly.

## Page header
- Title "Vendors" + subtitle; right side "Refresh" button + data-as-of chip; primary action button (e.g. "Add Vendor") top right.

## KPI row — 6 cards (label / large value / sub-caption), one row
Including (exact set per mockup): Active Vendors, Pending Approvals / requests, Monthly Spend, Open Work Orders, Contract Expiring (30 days), Avg Rating.
Values from live data (vendor_expenses, partner_links, work_orders as already wired); '—' where none. Do NOT substitute or drop cards.

## Main grid — 2 columns (left wide, right narrow)
LEFT: "Vendor Directory" panel
- Search input + "Filters" button
- Status pills/tabs (All / Active / etc. per mockup)
- Table columns EXACTLY: Name (+contact under), Category/Service, Rating (stars), Contract End (date), Monthly Spend, Status pill
- Rows from real vendor data; pagination footer like mockup ("Showing X to Y of Z")
RIGHT column, stacked:
- "Contract Expirations" panel — vendor + days-until-expiry rows, expiring-soon tone
- "Spend by Category" panel — donut chart with legend + total
- "Top Issues" panel — issue rows with counts

## Bottom / rail
- "Quick Actions" panel — button grid (Add Vendor, Log Expense, Create Work Order, Export Report etc. — map to real actions/tabs where they exist)

## Data policy
Rating / Contract End columns stay EXACTLY as designed even where data is missing — render '—'. Do not substitute metrics. Keep existing real-data wiring.