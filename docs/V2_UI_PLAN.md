# Attenda V2 — Canonical Product Brief (Ales-locked)

> **Status:** CANONICAL. This replaces all earlier planning language. Source: Ales's V2 brief
> (Aug 2026), delivered with the 24-page reference PDF. Do not contradict it in any module build.

## The signature

**See → Act → Complete → Verify.** Attenda is the hotel's **execution layer**, not the source of truth.
A number appears because somebody reported something, completed something, or Attenda itself produced
the activity — then Attenda immediately connects that information to an action.

## The Screen Formula (every major operational page)

1. **NOW** — short snapshot of the operational condition.
2. **WORK** — the actual queue, schedule, rooms, inspections, tasks, people, inventory, trips.
3. **ACTION** — contextual panel/drawer: assign, update, complete, escalate, verify, add evidence,
   contact somebody, or take the next operational step.

Attenda does not end at "Housekeeping completion: 72%." It asks: What is incomplete? Who owns it?
What happens next? It does not end at "4 inspections failed." It shows: which inspections failed →
what failed → who owns the correction → deadline → verify correction.

## Developer principle (write into the product brief)

**If a metric cannot lead the user to its source, owner, or next action, it probably does not belong
prominently in Attenda.** This keeps Attenda from becoming another screen full of pretty charts.

## The 16 modules

| Module | Question it answers | Build notes |
|---|---|---|
| **Dashboard** | What's happening now? | Staff-reported operational snapshot by privilege: today's activity, active guest requests, inspections/visits, transportation, department status, human-reported KPIs, alerts, incomplete items, recent activity. NOT a PMS financial dashboard. PDF p10 strongest ref. |
| **My Day** | What do I need to execute? | Personal schedule, assigned tasks, required reporting/KPIs, training, SOP acknowledgements, announcements, deadlines. PDF p11 expresses it well. |
| **Right Answers / SOPs** | How do we do this correctly? | Searchable manager-maintained KB: SOP library, categories, departments, versions, status, last update, simple Q/A. NOT an autonomous agent. PDF p2 visual ref. |
| **Requests** | What needs service? | Strong execution queue (p7): request, type, room/area, urgency, owner, status, timestamps, updates, resolution. NOT primary sidebar — surfaces in Dashboard, My Day, responsible department. |
| **Inspections** | Are we meeting the standard? | Brand/local/safety/internal/departmental; recurring + special; assignment, score, deficiencies, corrective actions, evidence, follow-up, completion. PDF pp8–9. |
| **Maintenance** | Protect the asset. | Work orders, PMs, rooms/areas, asset history, priorities, ownership, parts/inventory, vendor dependency, spending controls, reconciliation, completion verification. PDF p12. |
| **Housekeeping** | Control rooms, minutes, labor, supplies. | Room workload, checkouts/stayovers, housekeeper allocation, cleaning-minute expectations, productivity, supply/inventory, spending, discrepancies, alerts, dept announcements. PDF p13 direction. |
| **F&B** | Control product, labor, standards. | **No mockup yet — needs own visual concept.** Property's actual model (breakfast/restaurant/reception/pantry): inventory, par levels, waste, orders, budgets, labor, procedures, brand standards, upcoming needs. Reeco/purchasing: organize/validate, then hand off — never become the purchasing platform. |
| **Transportation** | Move people, control the operation. | Active requests/trips, schedules, drivers, vehicles, capacity, pickup/drop-off, live status, route/location where appropriate, fuel/mileage, documentation, insurance/registration, vehicle issues, operating cost. PDF pp3, 14. |
| **Schedule & Forecast** | Match labor to expected demand. | Forecast drives workload; workload drives labor hours; schedule vs expected model. People/hours/productivity — not financial forecasting. PDF p15. |
| **Training / Attenda University** | Keep the team capable. | Training library, required training, onboarding, completion, certifications, knowledge checks, upcoming sessions, recent SOP updates. Individuals see training inside **My Day**; managers manage the program from Staff Management/Attenda University. PDF pp4–6. |
| **Revenue** | What Attenda generated. | **Attenda Channel Revenue ONLY**: shuttle, transportation, food, partner offers, restaurants, curated experiences, marketplace, other Attenda-originating transactions. NEVER present as hotel rooms revenue, ADR, occupancy, or PMS revenue. PDF pp16–17. |
| **Property Settings** | Configure Attenda without calling Attenda. | Property profile, operating model, amenities/services, guest-facing content, integrations, system config, branding, roles/permissions, plans, departments, operational parameters. PDF pp18–20. |
| **Staff Management** | Manage Attenda users + operational readiness. | First name, role, department, availability, permissions, start date, training/certs, schedules, operational activity, callouts/attendance-related operational events, Attenda history. **Staff Callouts live here**, not separate sidebar module. NEVER payroll/medical/SSN/HR files. PDF pp22–23. |
| **Vendors** | Know who supports or earns through the operation. | Vendors + partners: category, contact, relationship status, services, spend (manual), Attenda-generated partner revenue where applicable, contracts/documents, upcoming payments/renewals, activity. Suppliers AND revenue partners. PDF p24. |
| **Reports** | What happened inside Attenda? | **No mockup yet.** Generated from Attenda activity: completion, timeliness, inspection scores, request response/resolution, PM completion, training, operational compliance, departmental execution, Attenda-channel transactions, task history. NEVER the official PMS/accounting record. |

## Sidebar cleanup (decided)

- **Requests and Training have mockups but do NOT become primary nav items.**
- **F&B and Reports have no mockups but ARE primary nav** (need own visual concepts).
- Do NOT blindly reproduce the sidebar from any individual mockup image.
- Staff Callouts folds into Staff Management.

## Guardrails

- Revenue never speaks PMS language. Reports never pose as accounting. Staff Management never
  touches payroll/medical/SSN.
- Every metric must lead to source, owner, or next action — otherwise it doesn't belong prominently.
- Mobile comes after desktop; desktop screens are built exactly as the formula describes first.