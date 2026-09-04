# Mockup 10 — Schedule & Forecast (EXACT DESIGN SPEC)

Ground truth: Apple Vision OCR of docs/v2-mockups/10-schedule-forecast.jpg. Sidebar/topbar follow the approved V2 shell — content area must match exactly.

## Page header
- Title: "Schedule & Forecast" — subtitle: "Labor schedules, demand forecast & staffing plans"
- Banner: "Build the right schedule for today and plan ahead with confidence"
- Buttons: "Customize Dashboard" + "Refresh" · data-as-of chip (real timestamp)

## KPI row — exactly 6 cards (label / value / sub-caption)
1. Today's Occupancy — sub "325 / 382 Rooms" style (rooms from forecast data)
2. Forecasted Occupancy — sub "This Week Avg"
3. Total Labor Hours — sub "Today"
4. Labor Cost % — sub "of Revenue"
5. Open Shifts — sub "Need Coverage"
6. Schedule Accuracy — sub "vs Forecast"
Live where possible (schedules + forecast_data); '—' where not. Do NOT substitute metrics (Labor Cost % stays as designed).

## Main grid — 2 columns (left wide, right narrow)
LEFT: "Today's Schedule" panel
- Controls: "View by: Department" + "Filters"; department tabs: All Departments, Front Office, Housekeeping, Maintenance, F&B, Transportation, Other
- Table columns EXACTLY: Department | Staffed / Needed | Labor Hours | hourly coverage chart (7AM · 11AM · 3PM · 7PM · 11PM) | Actions
- Rows per department with open-shift notes (e.g. "8/9 · 1 Open Shift") + bold **Total** row (staffed/needed, hours)
- Link "View Full Schedule →"
RIGHT: "Weekly Forecast" panel
- "Next 7 Days" selector; chart with Occupancy % + Labor Hours series, x-axis days of week
- Link "View Full Forecast →"

## Bottom row — 3 panels + Quick Actions
1. "Labor Mix Today" — donut + legend: per-department hours + % (Front Office, Housekeeping, Maintenance, F&B, Transportation, Other) + "Total Hours" figure
2. "Open Shifts" (+View all) — rows: role · date · time range · priority chip (High/Medium/Low); link "Manage Open Shifts →"
3. "Schedule Accuracy" (+View details) — big % vs Forecast, "+X% vs last week" line, status label; link "See Accuracy Details →"
4. "Quick Actions" — buttons with sub-captions: Create New Schedule · Adjust for Pickup ("Update schedule based on forecast") · Publish Schedule ("Review and publish schedule") · Manage Time Off ("Review staff time off requests") · Labor Budget vs Actual ("Compare labor spend to budget")

## Data policy
Keep existing real-data wiring (getStaffSchedulesRange, getWeeklyForecasts). Fields without backing data (Labor Cost %, Schedule Accuracy, Open Shift priorities) render as designed with '—'. Do NOT drop fields or substitute metrics. Donut + coverage chart: inline SVG, no new packages.