# Attenda Staff App — Guide v2

> Last updated: June 2026 · Covers all features and recent enhancements

---

## What Is Attenda?

Attenda is a mobile-first hotel operations platform for staff and managers. Staff log in via a QR code or link, see their tasks, requests, schedules, and shift tools — all in one place. Managers get a real-time view of the entire property without leaving their phone.

---

## Navigation

The app is organized into three sections visible in the sidebar (desktop) or bottom bar (mobile):

| Section | Tabs |
|---|---|
| **Today** | Dashboard · Requests · To-Dos · KPIs · Schedules |
| **Operations** | Shuttle · Compset · Forecast · Culture · Right Answers · Learning & HR · Marketplace · Property Info |
| **Admin** | Revenue · Staff Callouts · Property Settings · Staff Management · Partners & Menu · QR Codes · Room Management |

> Admin and Manager tabs are hidden from regular staff automatically based on role.

---

## Today

### 📊 Dashboard
Your daily command center. Shows:
- **GM Notes** — Today's brief/announcements from management
- **Quick Stats** — Pending requests, completed today, staff on duty
- **KPI Snapshot** — Score-based KPIs (guest satisfaction, review scores, ratings) vs targets
- **Next 14 Days** — Shuttle slots and staffed days at a glance
- **Shuttle Today** — Live slots with capacity and booking count
- **Cruise Schedule** — Upcoming cruise ship arrivals

**Customizing widgets:** Tap the ⚙️ icon on the Dashboard to toggle which sections appear. Your preferences are saved per device. Default widgets: Dashboard, Quick Stats, KPIs, 14-Day Forecast, Shuttle, Cruise.

> Checklist and Activity widgets are available but off by default — turn them on in the customizer if needed.

---

### 🔔 Requests
Live feed of all guest requests (room service, maintenance, front desk, etc.).

- Requests appear in real time — no refresh needed
- Tap any request to see details, assign it, or mark complete
- **Pending count badge** shows on the tab at all times
- Managers see all departments; staff see their department only
- Filter by status: All / Pending / In Progress / Completed

---

### ✅ To-Dos

Shift task lists that reset every day. Each department gets its own templates.

#### Staff view
- See your assigned checklists for today
- Check off items as you go
- Some items have special inputs:
  - **Number** — enter a count with unit (rooms, %, etc.)
  - **Text** — free-form notes
  - **Time** — log a time stamp
  - **Room Move** — log guest room changes with reason and authorizer
  - **No Show** — log reservation no-shows
  - **Cash Drawer Count** — denomination-by-denomination cash count (see below)

#### Cash Drawer Count Sheet
Enter dollar totals per denomination — not bill counts:

| Section | Fields |
|---|---|
| **Bills** | $100 · $50 · $20 · $10 · $5 · $1 |
| **Coins** | $1 · 50¢ · 25¢ · 10¢ · 5¢ · 1¢ |
| **Deductions** | Paid Out · Petty Cash |
| **Output** | Drawer Total (auto-calculated live) |
| **Other** | Discrepancies · Notes |

*Example: if you have $50 worth of $5 bills, type `50` in the $5 bills field.*

The **Drawer Total** = all bill/coin totals − Paid Out − Petty Cash, shown live in teal as you type.

#### Manager / Builder view
Admins toggle between **Staff View** and **⚙️ Builder** via the button in the header.

**In Builder:**
- **My Templates** tab — see all created templates
  - ✏️ **Rename** a template: click the pencil icon → type new name → press Enter or Save
  - 🗑️ **Delete** a template: click the trash icon → confirm
  - Expand a template to add/remove/reorder items
- **Library** tab — install ready-made templates from the community pack:
  - Cash Drawer Count Sheet
  - No Shows Log
  - Room Moves Log
  - Morning Opening Checklist
  - Night Audit Checklist
  - Housekeeping Daily Report
  - PM Closing Checklist

**Creating a new template:**
1. Tap **+ New Template**
2. Set name, department, position (optional)
3. Add items with type: Checkbox / Number / Text / Time / Room Move / No Show / Bank Count
4. Tap **Save Template**

---

### 📈 KPIs

Log and track daily KPI values (guest scores, review ratings, satisfaction, NPS, etc.).

- Each KPI shows its current value, target, and a progress bar
- Enter today's value in the input field
- Tap **Save KPI Values** (full-width teal button at the bottom) to save all changes at once
- Targets are set by the admin in Property Settings

> The Dashboard only shows score-related KPIs (satisfaction, rating, review, NPS, TripAdvisor, Google). Operational metrics like checklist completion are not shown there by default.

---

### 📅 Schedules

Weekly shift calendar for the whole team.

#### Staff view
- See your scheduled shifts for the week
- Navigate weeks with ← → arrows

#### Manager view
- Full team schedule in a 7-column weekly grid
- Color-coded by department
- **TBD shifts** (housekeeping and others with open end times) show an amber **"⏱ Set end time"** button
  - Tap it → time picker appears → select time → tap **Set**
  - Updates instantly without a page reload

**Adding a shift:**
1. Tap **+ Add Shift**
2. Pick staff member, department, date, start time
3. For housekeeping: check **"Open end time (supervisor fills daily)"** to leave end time TBD
4. Add optional role and notes
5. Tap **Save**

**Copy Week:** Copies the entire current week's schedule to next week.

**Templates:** Save recurring schedule patterns as reusable templates.

---

## Operations

### 🚌 Shuttle

Three tabs: **Today**, **Requests**, **Setup**

#### Today tab — Dispatch & Timeline
**+ New Pickup** (teal bar at top) opens the quick dispatch sheet:

| Field | Notes |
|---|---|
| Trip type | Arrival → Hotel / Hotel → Out |
| Guest name | Free text |
| Room # | Short field |
| Party size | Inline − / count / + stepper |
| Pickup / Dropoff | Chip selector — Terminals 1–4, Cruise Terminal, Port Everglades, Curbside, etc. |
| Time | Time picker |
| Flight / Notes | Optional — flight number, special needs |
| Assign To | **In-House Driver** (dropdown from today's scheduled drivers) or **Send Uber** |

After submitting, the pickup appears on the **Hourly Timeline** (6am–11pm):
- Current hour highlighted in teal
- Color-coded status cards: amber = pending, blue = assigned, teal = en route, green = done
- Inline action buttons on each card: **En Route → Complete → Cancel**
- **Filter bar**: All/Pending/En Route/Completed × All/Arrival/Departure

#### Requests tab
All shuttle requests as cards with status badges and action buttons.

#### Setup tab
Manage shuttle routes and recurring slot schedules.

---

### 📊 Compset

Track competitor rates and availability. Log competitor hotel pricing to benchmark your own rates.

---

### 📉 Forecast

14-day occupancy forecast for planning purposes.

- Enter **occupancy %**, **arrivals**, and **rooms occupied** per day
- **Departures** auto-calculate from prior night's count
- Navigate weeks with ← → buttons
- Tap **Save Forecast** to persist — changes are confirmed with a green ✓

---

### ❤️ Culture

Staff recognition and culture tools — shoutouts, wins, team updates.

---

### 📖 Right Answers

Knowledge base for staff — quick reference answers to common guest questions, property info, policies.

---

### 🎓 Learning & HR

Training materials, HR documents, onboarding content.

---

### 🏪 Marketplace

Install pre-built packs: KPI packs, checklist packs, and operational tools from the community library.

---

### 🏨 Property Info

Public-facing hotel information: address, amenities, check-in/out times, parking, etc.

---

## Admin

### 💵 Revenue

Revenue tracking and reporting by date range.

---

### 📋 Staff Callouts

Log and track staff absences, late arrivals, and callouts. Visible to managers only.

---

### ⚙️ Property Settings

Configure hotel-wide settings:
- Hotel name, address, timezone, room count
- KPI definitions and targets
- Department configuration

---

### 👥 Staff Management

- Add / edit / deactivate staff accounts
- Set roles: Staff / Manager / Admin
- Set department
- Staff log in via the QR code or invite link

---

### 🍽️ Partners & Menu

Configure in-room dining menus, partner vendors, and service offerings available to guests.

---

### 📱 QR Codes

Generate and download QR codes for:
- Guest request portal (room-specific or general)
- Staff login

---

### 🚪 Room Management

Configure room numbers, types, and floor assignments.

---

## Roles & Permissions

| Feature | Staff | Manager | Admin |
|---|---|---|---|
| View own requests | ✅ | ✅ | ✅ |
| View all requests | ❌ | ✅ | ✅ |
| To-Dos (own dept) | ✅ | ✅ | ✅ |
| Builder (edit templates) | ❌ | ✅ | ✅ |
| Set end time (Schedules) | ❌ | ✅ | ✅ |
| Add/edit shifts | ❌ | ✅ | ✅ |
| Forecast | ❌ | ✅ | ✅ |
| Revenue tab | ❌ | ✅ | ✅ |
| Staff Callouts | ❌ | ✅ | ✅ |
| Property Settings | ❌ | ❌ | ✅ |
| Staff Management | ❌ | ❌ | ✅ |
| QR Codes | ❌ | ❌ | ✅ |

---

## Tips

- **Mobile first** — the app is designed for phone use. All forms and views are touch-optimized.
- **Real-time** — Requests and Shuttle update live via Supabase subscriptions. No pull-to-refresh needed.
- **Per-device widget prefs** — Dashboard widget toggles save in your browser. They persist across sessions on the same device.
- **Open end times** — For housekeeping shifts, leaving end time as TBD lets a supervisor fill it in later from the weekly schedule view without editing the whole shift.
- **Cash drawer** — Always enter dollar totals, not bill counts. The total is calculated for you.
- **KPI save** — Remember to tap "Save KPI Values" after entering scores. The button appears at the bottom of the KPI table.

---

*Attenda v2 · Built for hoteliers, by people who get it.*
