# Mockup 04 — Staff Management (EXACT DESIGN SPEC)

Ground truth: Apple Vision OCR of docs/v2-mockups/04-staff-management.jpg. Sidebar/topbar follow the already-approved V2 shell — do NOT copy the mockup's sidebar rows; the content area below must match exactly.

## Page header
- Title: "Staff Management" — subtitle: "Manage your team, roles, permissions, and performance." + secondary line "Empower your team with the right access and accountability."
- Right side: "Refresh" button + data-as-of chip (render real timestamp, e.g. "Data 08:30" style).

## KPI row — exactly 6 cards (label / value / sub-caption)
1. Total Staff — 86 in mockup — "active team members"
2. On Shift Now — 32 — "Across all departments"
3. Open Shifts — 8 — "Need coverage"
4. Training Due — 14 — "Due within 7 days"
5. Compliance Rate — 94% — "Team compliance"
6. Performance Avg. — 4.6 / 5 — "Team average"
Values are live-data driven; '—' where no data. Do NOT substitute metrics.

## Main grid — 2 columns (left wide, right narrow)
LEFT: "Staff Directory" panel
- Search input ("Search staff...") + "Filters" button
- Pills/tabs: All / On Shift / Inactive
- Table columns: Name (+email under), Role, Department, Status, Performance (star rating e.g. "4.8★", "Superior" caption style)
- Pagination footer: "Showing X to Y of Z staff", per-page selector, page buttons
RIGHT column, stacked:
- "Roles & Permissions" panel (+ "View all"): rows = role name, user count chip, access level (General Manager — 2 Users — Full/Department access; Department Manager — 8 Users — Department Access; Team Member — 54 Users — Basic Access; Contractor — 7 Users — Restricted Access). Footer link "Manage Roles →"
- "Department Overview" panel (+ "View all"): department rows with counts (Front Office, Housekeeping, Maintenance, F&B, Transportation, Other). Footer link "View All Departments →"

## Bottom row — 4 panels side by side
1. "Upcoming Training" (+View all): item name + assignee + date (e.g. "Safety & Emergency Procedures — Maria Santos — May 22, 2026")
2. "Staff Performance" (+View all): rating + role caption rows
3. "Attendance Overview": present-dots visual, % figure, link "View Attendance Report →"
4. "Quick Actions": buttons — Add Team Member, Schedule Staff, Assign Permissions, Review Timesheets, Send Announcement, Manage Training; footer link "View Performance Reports →"

## Data policy
Keep existing real-data wiring (staff_accounts etc.). Mockup fields without backing data (Compliance Rate, Performance Avg, Training, Attendance) render as designed with '—'/sample-neutral placeholders. Do not drop fields.