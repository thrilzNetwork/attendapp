# Mockup 06 — Revenue (EXACT DESIGN SPEC)

Ground truth: Apple Vision OCR of docs/v2-mockups/06-revenue.jpg. Sidebar/topbar follow the approved V2 shell — content area must match exactly. NOTE: this spec supersedes the earlier "06/07/08 synthesis" decision — build EXACTLY what 06 shows.

## Page header
- Title: "Revenue (Attenda)" — subtitle: "Track Attenda Revenue, channels, and growth."
- Buttons: "Customize Dashboard" + "Refresh" · data-as-of chip ("Data as of 8:30 AM" style — render real timestamp)
- Banner: "This is Attenda revenue only. Not PMS, rooms, or hotel revenue."

## KPI row — exactly 6 cards (label / value / delta sub-line)
1. Attenda Revenue (MTD) — delta "+18.6% vs Last Month"
2. Attenda Revenue (YTD) — delta "+22.4% vs Last Year"
3. Transactions (MTD) — delta "+15.3% vs Last Month"
4. Unique Users (MTD) — delta "+12.7% vs Last Month"
5. Avg. Order Value — delta "+2.9% vs Last Month"
6. Attenda Take Rate — delta "+1.1 pts vs Last Month"
Values live where possible; deltas '—' when no prior-period data. Do NOT substitute metrics.

## Main grid — 2 columns (left wide, right narrow)
LEFT: "Revenue Overview" panel
- Controls: "View by: Channel" + "Filters"
- "Revenue Trend (MTD)" line chart: Daily selector, This Month vs Last Month series, x-axis month days, y-axis dollars. Link "View Trend Report →"
- Channel table — columns EXACTLY: Channel | Revenue | % of Total | Transactions | Avg. Order Value | vs Last Month
  Rows: Shuttle Service · Food & Dining · Taxi & Rides · Marketplace Offers · Other Services · **Total Attenda Revenue** (bold total row)
  Values from real revenue data where available; '—' otherwise.
- Button "View Full Revenue Report →"
RIGHT column: "Top Products / Services (MTD)" panel (+ "View all") — ranked list 1–5, name + revenue + % share (e.g. "Round Trip Shuttle $2,845.60 22.1%")

## Bottom row — 3 panels + Quick Actions
1. "Revenue by Channel (MTD)" (+View all) — ranked horizontal bars with $ + % labels; link "View Channel Report →"
2. "Recent Revenue Activity" (+View all) — feed rows: item · action · amount · time (e.g. "Airport Transfer · new booking · +$45.00 · 8:15 AM"); link "View All Activity →"
3. "Payouts & Balance" (+View all) — Current Balance (Available to payout) · Total Revenue · Next Payout date + estimated amount; link "View Payouts →"
4. "Quick Actions" — buttons with sub-captions: View Revenue Dashboard ("Explore detailed revenue insights") · Export Revenue Report ("Download MTD revenue data") · Manage Payout Settings ("Update payout method & schedule") · Revenue Goals ("Set and track revenue targets") · Pricing & Commissions ("Manage rates and take rates")

## Data policy
Real revenue data (vendor_expenses, forecast_data, etc.) where it exists; mockup sample values are placeholders — '—' when no data. Do NOT drop fields or substitute metrics.