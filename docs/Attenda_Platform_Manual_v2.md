<div style="font-family: 'Georgia', serif; color: #1a1a2e; max-width: 900px; margin: 0 auto; padding: 40px;">

<div style="text-align: center; padding: 80px 40px; background: linear-gradient(135deg, #7B1C3E 0%, #3d0e1f 100%); color: white; border-radius: 8px; margin-bottom: 60px;">

<img src="../public/logo.png" alt="Attenda" style="height: 60px; margin-bottom: 30px;" />

# ATTENDA PLATFORM MANUAL

<p style="font-size: 1.4rem; letter-spacing: 0.3em; margin: 10px 0; color: #f0c0d0;">VERSION 2.0</p>

<p style="font-size: 0.95rem; color: #e8b4c4; margin-top: 20px;">Quantum Hospitality Solutions · Confidential</p>
<p style="font-size: 0.85rem; color: #d4a0b0;">Issued June 2026 · Do Not Distribute</p>

</div>

---

## TABLE OF CONTENTS

| § | Section | Page |
|---|---------|------|
| 1 | Introduction & Platform Overview | 4 |
| 2 | Architecture & Multi-Tenancy | 7 |
| 3 | User Roles & Permissions | 10 |
| 4 | Daily Brief Dashboard | 13 |
| 5 | Revenue Dashboard *(v2 new)* | 17 |
| 6 | Guest Requests & Food Orders | 20 |
| 7 | Front Desk Operations | 25 |
| 8 | Shuttle & Transport | 29 |
| 9 | Staff Schedules | 35 |
| 10 | Staff Callouts & Coverage | 41 |
| 11 | Culture Hub *(v2 new)* | 44 |
| 12 | KPIs & Marketplace | 47 |
| 13 | Partner Network & Vendor Onboarding | 52 |
| 14 | Vendor Portal | 56 |
| 15 | Right Answers Knowledge Base | 60 |
| 16 | Learning & HR | 63 |
| 17 | Compset & Competitive Intelligence | 66 |
| 18 | Forecast & Staffing | 68 |
| 19 | Position To-Dos | 71 |
| 20 | Superadmin & Platform Operations | 74 |

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§1 — INTRODUCTION & PLATFORM OVERVIEW</span>

---

## What Is Attenda?

Attenda is an all-in-one hospitality operations platform built by **Quantum Hospitality Solutions (QHS)** — a company founded on 15+ years of hands-on hotel management. It replaces the fragmented patchwork of spreadsheets, group chats, and single-purpose tools that most independent hotels still rely on, and consolidates them into a single, role-aware system accessible from any device.

Attenda is not a property management system (PMS). It does not handle room inventory or reservations. Instead, it operates in the operational layer that sits *above* the PMS — coordinating staff, serving guests, managing vendor relationships, and giving general managers real-time insight into the health of their property.

## Core Philosophy

> **"Built by hotel people, for hotel people."**

Every workflow in Attenda maps to a real task that hotel staff perform daily. The platform was designed with the following principles:

- **Speed over ceremony** — Front desk operations happen in seconds, not minutes
- **Role clarity** — Every user sees exactly what they need, nothing more
- **Tenant isolation** — Each property's data is completely separated from others
- **Mobile-first** — Designed for phones and tablets at the front desk, not just desktop browsers

## What's New in v2

Version 2.0 of Attenda represents a significant expansion of the platform. The core operational modules have been deepened, and two brand-new modules — **Revenue Dashboard** and **Culture Hub** — have been added. Key enhancements include:

| Area | v1 | v2 |
|------|----|----|
| Shuttle dispatch | Slot-management view | Full dispatch: Quick Dispatch bar + hourly timeline + Bouncie GPS |
| Staff schedules | Basic add/delete | Edit modal, templates, copy-week, auto-role, TBD shifts |
| Knowledge base | Keyword matching | AI-powered suggestions via Claude API |
| Vendor onboarding | Manual (admin only) | Self-service `/apply` public page + inbox |
| Guest food orders | Order + static confirmation | Live order tracking page (`/track`) |
| Revenue tracking | None | Revenue Dashboard with partner breakdown + commission reporting |
| Team culture | None | Culture Hub: leaderboard, rewards, birthdays, events |
| Front desk tools | Call Around, Logs | + Bank Count (cash drawer denominations) |
| Payments | Cash only | Stripe card payment integration |
| Callouts | Basic list | Full workflow: report → approve → find cover |

## Platform URL Structure

```
https://attendaapp.com/              → Guest-facing hotel page
https://attendaapp.com/staff         → Staff dashboard (login required)
https://attendaapp.com/vendor        → Vendor portal (vendor login required)
https://attendaapp.com/apply         → Partner self-onboarding (public)
https://attendaapp.com/track         → Order tracking (public, orderId param)
https://attendaapp.com/nearby        → Guest food & services ordering (public)
https://attendaapp.com/superadmin    → Platform administration
```

## Supported Properties

Attenda is currently deployed across multiple hotel properties. Each property operates on an isolated tenant identified by a unique **slug** (e.g., `fort-lauderdale-airport-cruise-port`). Data between tenants is never shared.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§2 — ARCHITECTURE & MULTI-TENANCY</span>

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14.2 (App Router, React Server Components) |
| Styling | Tailwind CSS 3.4 |
| Database | Supabase (PostgreSQL 15, Row-Level Security) |
| Auth | Supabase Auth + custom session metadata |
| Email | Resend |
| Payments | Stripe |
| GPS Tracking | Bouncie API |
| Ride Dispatch | Uber Direct API |
| AI | Anthropic Claude API (claude-haiku-4-5-20251001) |
| Hosting | Vercel (Edge Functions, ISR) |
| Storage | Supabase Storage (menu images, documents) |

## Multi-Tenant Architecture

Every record in the database carries a `hotel_id` UUID column. Supabase Row-Level Security (RLS) policies enforce that authenticated sessions can only read or write records matching the `hotel_id` embedded in their JWT claims. This means:

- A staff member from Property A **cannot** read data from Property B, even if they know the hotel ID
- A vendor operating for Property A cannot view orders from Property B
- Superadmin accounts bypass RLS via a service-role key and can view all tenants

```sql
-- Example RLS policy (enforced at DB layer)
CREATE POLICY "hotel_isolation" ON requests
  USING (hotel_id = (current_setting('request.jwt.claims')::json->>'hotel_id')::uuid);
```

## Session Architecture

### Staff Sessions
Staff log in via `/staff` with email + password. On successful authentication, Supabase issues a JWT containing:

```json
{
  "hotel_id": "uuid",
  "role": "admin | manager | staff | vendor",
  "vendor_type": "restaurant | transport | service | null",
  "name": "Staff Member Name"
}
```

The frontend reads these claims to control which tabs and actions are visible.

### Guest Sessions
Guests do not create accounts. Instead, when a guest scans the hotel QR code or visits the hotel page, they complete a lightweight check-in:
- Name
- Room number

This creates a `guestSession` object stored in `localStorage`. All guest requests carry this session data inline (name, room, hotel slug). No server-side session is created for guests.

### Vendor Sessions
Vendors (restaurant/transport partners) log in via `/vendor` with email + password. Vendor accounts are scoped to a single property and a single `vendor_type`. The vendor JWT includes `hotel_id` and `vendor_type`.

## Request Flow

```
Browser → Next.js API Route (/api/*) → Supabase (service-role client)
                                     → External API (Stripe, Bouncie, Uber, Claude)
```

All database writes from staff and guest actions go through authenticated API routes — never direct from the client using the anon key. This ensures:
1. Server-side validation of hotel_id before any insert
2. Business logic (commission calculation, email notifications) runs server-side
3. Audit trail is consistent

## Database Schema Overview

```
hotels               — tenant registry (slug, name, settings, brand color)
staff_accounts       — staff users (name, email, role, department, hotel_id)
requests             — unified record type (KPIs, food orders, service requests, etc.)
shuttle_requests     — shuttle dispatch records
shuttle_bookings     — guest shuttle seat reservations
staff_schedules      — shift records (staff, date, start_time, end_time [nullable])
partners             — vendor/partner registry
partner_menu_items   — menu items per partner
partner_applications — pending vendor applications
messages             — guest↔staff messaging
```

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§3 — USER ROLES & PERMISSIONS</span>

---

## Role Hierarchy

Attenda uses a five-tier role system. Roles are assigned per-property; a person may be an admin at one property and staff at another if they hold accounts at multiple hotels.

```
SuperAdmin
    └── Admin
            └── Manager
                    └── Staff
                            └── Vendor
```

## Role Definitions

### SuperAdmin
The platform operator role. SuperAdmins can:
- View and manage **all** hotel tenants
- Create and configure new properties
- Access the SuperAdmin dashboard at `/superadmin`
- Switch context between any hotel
- Manage staff accounts across all properties

SuperAdmin accounts are created directly in the database. There is no self-registration for this role.

### Admin
The General Manager role for a single property. Admins can:
- Access all tabs including **Revenue Dashboard**, **Staff Management**, **Property Settings**, **QR Codes**
- Approve or reject vendor applications
- View and manage all requests, callouts, schedules, and KPIs
- Publish schedules and generate QR codes
- All Manager capabilities

### Manager
The Department Head / Front Office Manager role. Managers can:
- Access most operational tabs
- Manage staff schedules (add, edit, approve changes)
- Approve staff callouts and assign coverage
- View KPI submissions and forecast data
- Does **not** have access to Revenue Dashboard or Staff Management

### Staff
Front-line employees. Staff can:
- View their own schedule
- Submit callout/availability requests
- Log daily operations (call around, incidents, bank count)
- Submit KPI data
- Respond to guest requests

### Vendor
Partner businesses (restaurants, transport, services). Vendors can:
- Access the Vendor Portal only
- View incoming orders for their business
- Update order status (Received → Preparing → Ready → Delivered)
- Manage their menu items and images

## Permission Matrix

| Feature | SuperAdmin | Admin | Manager | Staff | Vendor |
|---------|:----------:|:-----:|:-------:|:-----:|:------:|
| Revenue Dashboard | ✓ | ✓ | — | — | — |
| Staff Management | ✓ | ✓ | — | — | — |
| Property Settings | ✓ | ✓ | — | — | — |
| Schedules (edit) | ✓ | ✓ | ✓ | — | — |
| Schedules (view) | ✓ | ✓ | ✓ | ✓ | — |
| Callouts (approve) | ✓ | ✓ | ✓ | — | — |
| Callouts (submit) | ✓ | ✓ | ✓ | ✓ | — |
| KPI submit | ✓ | ✓ | ✓ | ✓ | — |
| Vendor applications | ✓ | ✓ | — | — | — |
| Order management | ✓ | ✓ | ✓ | ✓ | ✓ |
| Order status update | — | — | — | — | ✓ |
| Culture Hub | ✓ | ✓ | ✓ | ✓ | — |
| Right Answers | ✓ | ✓ | ✓ | ✓ | — |
| Learning & HR | ✓ | ✓ | ✓ | ✓ | — |
| Shuttle dispatch | ✓ | ✓ | ✓ | ✓ | — |

## Creating Staff Accounts

Admins create staff accounts from **Admin → Staff Management**:

1. Navigate to the **Staff** tab in the Admin section
2. Click **Add Staff Member**
3. Enter name, email, temporary password, role, and department
4. The staff member receives a login email and can change their password on first login

Departments available: `front_desk`, `housekeeping`, `maintenance`, `food_beverage`, `drivers`, `management`, `other`

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§4 — DAILY BRIEF DASHBOARD</span>

---

## Overview

The Daily Brief is the first screen staff see after logging in. It is designed as a **morning briefing tool** — giving the manager or GM a snapshot of the day ahead in under 60 seconds. The brief is refreshed in real time and designed to be reviewed during the daily standup or pre-shift meeting.

## Dashboard Sections

The Daily Brief is composed of up to **eight configurable sections**, each of which can be toggled on or off per user via the Widget Customizer (see below).

### 1. GM Notes
A free-text bulletin board for the current GM or duty manager. Supports rich text. Visible to all staff. Previous entries are timestamped and archived but the latest is pinned at the top.

*Use case: "Pool area closed for maintenance until noon. Please advise guests."*

### 2. Quick Stats
Four real-time KPI tiles showing today's at-a-glance metrics:
- **Occupancy** (rooms occupied / total rooms)
- **Arrivals today** (from forecast)
- **Departures today** (from forecast)
- **Pending Requests** (open guest requests count)

### 3. Activity Feed
A chronological stream of recent activity across all modules — new guest requests, order status changes, callout submissions, message threads. Each entry is timestamped and color-coded by type.

### 4. Crew Briefing
A curated list of announcements or operational notes visible to all staff. Admins post items here for shift handoffs or recurring reminders.

### 5. KPIs Summary
A miniaturized view of today's KPI submissions across all active categories. Shows completion status (submitted/pending) for each tracked metric.

### 6. Pending Requests
A condensed list of the most recent unresolved guest requests — room service, maintenance, transport, messages. Each item shows guest name, room, type, and time elapsed.

### 7. Shuttle Times
Today's scheduled shuttle departures, pulled from the active shuttle configuration. Shows time, pickup location, capacity, and bookings so far.

### 8. Forecast Summary
Today's occupancy and arrival/departure forecast in a single-row summary. Pulls from the most recent forecast submission for this property.

## Widget Customizer *(v2)*

Each staff member can personalize their Daily Brief layout. In v2, a **Widget Customizer** panel is accessible via the gear icon in the top-right of the Dashboard tab.

Users can toggle any of the eight sections on or off. Preferences are stored in `localStorage` per user — they persist across sessions on the same device but do not sync across devices.

**To customize:**
1. Click the ⚙ gear icon on the Dashboard tab
2. A side panel slides in showing all 8 section toggles
3. Toggle any section off to hide it from your Daily Brief
4. Changes apply immediately; no save button needed

This is particularly useful for front desk staff who primarily care about pending requests and shuttle times, versus GMs who want the full brief with KPIs and forecast.

## Print Brief

Admins can print the current Daily Brief for physical distribution during morning meetings.

**To print:**
1. Click the **Print Brief** button (printer icon, visible to Admin/Manager only)
2. The browser print dialog opens with a clean, sidebar-free layout
3. All interactive buttons and navigation are hidden in the print view
4. The printed brief includes: GM Notes, Quick Stats, Shuttle Times, Pending Requests, Forecast Summary

Print styles use Tailwind's `print:hidden` / `print:block` utilities — no PDF library is required.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§5 — REVENUE DASHBOARD *(v2)*</span>

---

## Overview

The Revenue Dashboard is a **new module in v2**, providing General Managers with a consolidated view of all revenue flowing through Attenda. This is the primary reporting tool for validating the Attenda commission model and tracking partner performance.

**Access:** Admin role only. Located in the **Admin** section of the staff navigation.

## Business Model Recap

Attenda operates on a **90/10 revenue split** with vendor partners:

- Guest pays full price for food, transport, or service
- **90%** is transferred to the vendor (partner payout)
- **10%** is retained by the hotel as the Attenda commission
- A **3% card processing fee** applies to all Stripe transactions

The Revenue Dashboard surfaces these numbers automatically from the `requests` table data.

## Dashboard Layout

### Filter Bar
At the top of the Revenue Dashboard, three time period presets allow quick filtering:

| Filter | Description |
|--------|-------------|
| This Week | Monday 00:00 → today 23:59 |
| This Month | 1st of month → today |
| All Time | No date filter |

A **Custom Range** option opens a date-range picker for arbitrary reporting periods.

### KPI Cards
Three summary cards are displayed prominently beneath the filter bar:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  TOTAL REVENUE  │  │  HOTEL COMM.    │  │  TRANSACTIONS   │
│                 │  │                 │  │                 │
│   $4,820.00     │  │    $482.00      │  │      47         │
│  (gross orders) │  │  (10% of gross) │  │  (order count)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Partner Breakdown Table
Below the KPI cards, a sortable table shows per-partner revenue:

| Partner | Orders | Gross Revenue | Hotel Commission | Avg. Order | Status |
|---------|:------:|:-------------:|:----------------:|:----------:|:------:|
| The Reef Kitchen | 23 | $1,840.00 | $184.00 | $80.00 | ✓ Active |
| Miami Eats | 14 | $980.00 | $98.00 | $70.00 | ✓ Active |
| Airport Shuttle Co. | 10 | $650.00 | $65.00 | $65.00 | ✓ Active |

Clicking any row drills into that partner's individual order history.

### Shuttle Revenue Row
A dedicated row beneath the partner table shows revenue from the hotel's **in-house shuttle service** (bookings via `shuttle_bookings` table). This is tracked separately since it is hotel-operated, not partner-operated.

### Daily Revenue Chart
A simple SVG bar chart shows daily gross revenue over the selected period. No external charting library is used — the chart is rendered inline using native SVG paths. Each bar is color-coded by revenue source:

- **Dark crimson**: Food order revenue
- **Teal**: Transport/shuttle revenue
- **Amber**: Service request revenue

## Data Sources

| Revenue Type | Source Table | Key Fields |
|-------------|-------------|-----------|
| Food orders | `requests` | `type='food_order'`, `total_amount`, `vendor_payout` |
| Shuttle bookings | `shuttle_bookings` | `price_per_person`, `pax` |
| Transport requests | `requests` | `type='transport_request'` |

Revenue data is fetched server-side via the `/api/revenue` route using the service-role client, ensuring RLS is bypassed only with admin authentication.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§6 — GUEST REQUESTS & FOOD ORDERS</span>

---

## Overview

The Requests module handles all guest-initiated interactions: food orders from restaurant partners, maintenance and housekeeping service requests, and general guest messages. All requests are routed through the same `requests` table with a `type` discriminator, enabling a unified inbox for staff.

## Guest-Facing Ordering Experience

Guests access the food ordering interface via:
- **QR code** in their room → scans to `https://attendaapp.com/nearby?hotel={slug}`
- **Direct link** sent via SMS or email at check-in

No app download is required. The guest experience is a mobile-optimized web app.

### Guest Check-In Flow
Before placing any order or request, guests complete a lightweight check-in:
1. Enter **first name** and **room number**
2. Tap **Check In**
3. Session stored in `localStorage` — persists for the duration of their stay

### Browsing Partners & Menu
The **Nearby** tab shows all active restaurant and service partners for the property. Each partner card displays:
- Partner name and cuisine type
- Hours of operation
- Estimated delivery time
- Featured menu items

Tapping a partner opens their full menu. Items display name, description, price, and photo.

### Cart & Checkout *(v2 enhanced)*

**Cart Icon (v2 new):** A persistent cart icon in the menu header shows the current item count as a badge. Guests can tap it at any time to review their cart without losing their place in the menu.

**Checkout Flow:**
1. Guest reviews cart items, quantities, and subtotal
2. Selects payment method: **Card** (Stripe) or **Room Charge**
3. For card payments, a Stripe payment element collects card details securely
4. On payment confirmation, order is submitted to the `requests` table
5. A confirmation screen displays with order summary and **Track Order** button

### Stripe Card Payments *(v2 new)*
Card payments are processed via Stripe. The 3% processing fee is displayed to the guest prior to confirmation. Stripe Elements handles PCI-compliant card collection — no card data touches Attenda servers.

## Order Tracking *(v2 new)*

After placing a food order, guests can track its real-time status via a dedicated tracking page.

**URL:** `https://attendaapp.com/track?orderId={uuid}`

The tracking page is **public** — no login required. The `orderId` (UUID) in the URL is the only access gate. UUIDs are cryptographically unguessable, providing sufficient security for this use case.

### Tracking Page Features

**Status Timeline:**
```
● Placed  →  ● Received  →  ● Preparing  →  ● Ready  →  ◯ Delivered
```

Each status node shows:
- Status label
- Timestamp when that status was reached
- Current step is highlighted in dark crimson

**Order Summary:**
- Items ordered with quantities
- Partner name
- Estimated delivery time (when set by vendor)

**Real-Time Updates:**
The page subscribes to Supabase Realtime on the specific request row. When the vendor updates the order status in the Vendor Portal, the tracking page updates automatically — no page refresh needed.

## Staff Request Management

Staff manage all incoming requests from the **Requests** tab in the staff dashboard.

### Request List View
The requests list shows:
- Guest name and room number
- Request type (icon + label)
- Time since submission
- Current status
- Assigned staff member (if any)

Color coding:
- **Amber**: New, unread
- **Blue**: Acknowledged / in progress
- **Green**: Completed
- **Gray**: Cancelled

### Request Actions (Staff)
- **Acknowledge** — marks request as received, stops the amber alert
- **Assign** — assigns the request to a specific staff member
- **Complete** — closes the request and timestamps completion
- **Message** — opens a thread to communicate with the guest directly

### Request Types

| Type Code | Display Name | Routed To |
|-----------|-------------|-----------|
| `food_order` | Food Order | Vendor + Staff inbox |
| `transport_request` | Transport | Staff inbox |
| `housekeeping` | Housekeeping | Staff inbox |
| `maintenance` | Maintenance | Staff inbox |
| `message` | Guest Message | Staff inbox |
| `amenity_request` | Amenity Request | Staff inbox |

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§7 — FRONT DESK OPERATIONS</span>

---

## Overview

The Front Desk Operations module consolidates the daily logging and tracking tasks that front desk agents perform. These tools replace ad-hoc spreadsheets and paper logs with a structured, searchable, and auditable digital record.

Front desk tools are accessible via sub-tabs within the **Daily Ops** section of the staff dashboard.

## Sub-Modules

### Call Around
The Call Around tool logs outbound calls made to guests — wake-up calls, reservation confirmations, checkout reminders, or follow-up calls after service requests.

**Log fields:**
- Guest name + room number
- Call type (Wake-Up, Confirmation, Follow-Up, Other)
- Time of call
- Outcome (Answered, No Answer, Left Message)
- Notes

Call-around logs are searchable by date and filterable by outcome. Admins can view the full call history for any date range.

### Daily Logs
Daily Logs capture operational incidents and notable events during a shift — the digital equivalent of the Manager's Log.

**Log entry fields:**
- Category (Guest Incident, Maintenance, Safety, Lost & Found, VIP, Other)
- Description (free text)
- Action taken
- Timestamp (auto)
- Logged by (auto, from session)

Daily logs are surfaced in the GM's morning review and archived for 90 days by default.

### No Shows
The No Shows log tracks reservations where the guest did not arrive and was not reachable.

**Fields:**
- Guest name
- Room or reservation reference
- Reservation date
- Attempts made (number of contact attempts)
- Notes

This data feeds into forecasting for future occupancy estimates.

### Room Moves
Room Moves tracks when guests are moved from one room to another — due to maintenance issues, upgrade requests, guest dissatisfaction, or inventory management.

**Fields:**
- Guest name
- Original room → New room
- Reason (Maintenance, Upgrade, Guest Request, Other)
- Time of move
- Authorized by

Room move records are time-stamped and tied to the shift log for accountability.

### Bank Count *(v2 new)*

The Bank Count tool digitizes cash drawer denomination tracking — replacing the paper bank count sheets that front desk agents fill out at the start and end of each shift.

**Denomination inputs:**

| Denomination | Input | × |
|-------------|-------|---|
| $100 Bills | [ qty ] | = $0.00 |
| $50 Bills | [ qty ] | = $0.00 |
| $20 Bills | [ qty ] | = $0.00 |
| $10 Bills | [ qty ] | = $0.00 |
| $5 Bills | [ qty ] | = $0.00 |
| $1 Bills | [ qty ] | = $0.00 |
| Half-Dollars ($.50) | [ qty ] | = $0.00 |
| Quarters ($.25) | [ qty ] | = $0.00 |
| Dimes ($.10) | [ qty ] | = $0.00 |
| Nickels ($.05) | [ qty ] | = $0.00 |
| Pennies ($.01) | [ qty ] | = $0.00 |

**Calculated totals:**
- **Bills Total**: Auto-calculated from bill denominations
- **Coins Total**: Auto-calculated from coin denominations
- **Drawer Total**: Sum of all denominations
- **Paid Outs**: Amount paid out of drawer (separate input)
- **Petty Cash**: Amount designated as petty cash float (separate input)
- **Net Drawer**: Drawer Total − Paid Outs − Petty Cash

Each bank count entry is timestamped and associated with the submitting staff member. Admins can view all bank count submissions by date.

*Front desk agents perform bank counts at shift start and shift end. Discrepancies between the two are flagged for manager review.*

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§8 — SHUTTLE & TRANSPORT</span>

---

## Overview

The Shuttle module is designed for hotels that operate a recurring shuttle service — typically airport/cruise terminal pickups and dropoffs. For the Fort Lauderdale property, the shuttle runs hourly from **6:00 AM to 11:00 PM** between the hotel and FLL, MIA, Port Everglades, and cruise terminals.

In v2, the Shuttle module has been completely redesigned from a slot-management view into a **real-time dispatch tool** optimized for front desk speed. A new booking can be logged in under 30 seconds.

## Module Layout

The Shuttle module has three tabs:

| Tab | Description | Access |
|-----|-------------|--------|
| **Today** | Hourly timeline of all today's shuttles | All staff |
| **Requests** | Full history of all shuttle requests (searchable) | All staff |
| **Setup** | Admin configuration: routes, capacity, hours, days | Admin only |

## Quick Dispatch Bar *(v2 redesigned)*

The **Quick Dispatch Bar** sits at the top of the Shuttle module, always visible. A single **+ New Pickup** button opens a bottom-sheet form optimized for fast, mobile-friendly data entry.

### Dispatch Form Fields

**1. Trip Type**
A toggle between:
- `Arrival` — Guest calling from airport/cruise terminal, needs pickup to hotel
- `Departure` — Guest departing hotel, needs drop-off to airport/cruise

**2. Guest Information**
- Guest Name (required)
- Room Number (required)

**3. Party Size**
A stepper control: **−** `[count]` **+** — tap to increment or decrement. Default: 1.

**4. Pickup Location**
*For Arrivals:* Select from configured locations:
- Terminal 1 / Terminal 2 / Terminal 3 / Terminal 4
- Cruise Terminal
- Curbside
- (Custom: free-text field)

*For Departures:* Auto-filled to "Hotel Lobby" (editable)

**5. Drop-Off**
*For Arrivals:* Auto-filled to "Hotel" (editable)

*For Departures:* Select from:
- MIA (Miami International)
- FLL (Fort Lauderdale–Hollywood)
- Port Everglades
- Other (free-text)

**6. Requested Time**
A time picker defaulting to the next available hourly slot. Staff can override to any time.

**7. Notes**
Optional free-text field for flight number, cruise ship name, special instructions, or guest notes.

**8. Assignment**
Two options:

| Option | Behavior |
|--------|---------|
| **In-House Driver** | Dropdown of today's scheduled drivers. Populated from `staff_schedules` where `department = 'drivers'` for today's date. Shows driver name + shift hours. |
| **Send Uber** | Hides driver dropdown. On submit, dispatches immediately via `/api/uber-direct`. |

### On Submit
- A `shuttle_requests` record is created with all form fields
- If In-House: status set to `assigned`, `assigned_driver_id` populated
- If Uber: Uber Direct dispatch fires immediately, `uber_tracking_url` stored, status set to `assigned`
- The card appears instantly in the hourly timeline below
- Form resets; bottom sheet closes

## Hourly Timeline *(v2 redesigned)*

The **Today** tab shows a visual timeline grid for the current date, organized by hour.

```
┌─────────────────────────────────────────────────────────────────────┐
│  6:00 AM  │  [Maria R. · Rm 204 · 2 pax · Terminal 3 → Hotel]  🚌  │
│           │  [John D. · driver assigned]                             │
├─────────────────────────────────────────────────────────────────────┤
│  7:00 AM  │  —                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  8:00 AM  │  [Carlos M. · Rm 118 · 1 pax · Hotel → FLL]  🚗 Uber   │
│  ◀ NOW    │  [Uber tracking ▸]                                       │
├─────────────────────────────────────────────────────────────────────┤
│  9:00 AM  │  —                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Timeline Features

**Status Color Coding:**
| Status | Visual Treatment |
|--------|-----------------|
| `pending` | Amber left border + amber background |
| `assigned` | Blue left border |
| `in_progress` | Teal left border + teal background |
| `completed` | Green muted, slightly faded |
| `cancelled` | Gray, strikethrough text |

**Current Hour Highlight:** The row matching the current hour has a teal left accent border and subtle background to help staff quickly find the current context.

**Status Action Buttons (Admin/Manager only):**
Each card has inline action buttons:
- `Mark En Route` → status changes to `in_progress`
- `Complete` → status changes to `completed`

**Expand Toggle:** Each card has a `▸` toggle to reveal:
- Full notes
- Uber tracking link (if applicable)
- Driver contact info (if in-house)

**Empty Hours:** Hours with no shuttles show a faint "—" to keep the layout clean without visual clutter.

**Filters Bar:**
Above the timeline:
- Status: `All` | `Pending` | `In Progress` | `Completed`
- Direction: `All` | `Arrivals` | `Departures`

**Real-Time Updates:** The timeline uses a Supabase Realtime subscription on `shuttle_requests` for the current hotel and date. New dispatches and status changes appear immediately on all staff devices without a page refresh.

## Bouncie GPS Integration *(v2)*

For hotels with Bouncie GPS trackers installed in their shuttle vehicles, Attenda displays a **Live Map** view showing vehicle location in real time.

**Setup:** The hotel's Bouncie vehicle ID and API credentials are configured in Property Settings. Once configured:
- The Today tab shows a small live map above the timeline
- Driver cards show the vehicle's current GPS position
- A "Live" badge indicates the tracker is active and reporting

GPS authentication uses the `/api/bouncie-auth` route which exchanges credentials for a Bouncie access token, stored server-side and refreshed automatically.

## Uber Direct Integration

When "Send Uber" is selected in the dispatch form, Attenda calls the Uber Direct API to request a driver for the specified pickup and dropoff. The response includes:
- Estimated pickup time
- Uber tracking URL (shared with the guest if desired)
- Uber delivery ID (stored for status tracking)

Uber dispatch is configured at the property level with an API key in Property Settings.

## Shuttle Configuration (Setup Tab)

Admins configure the shuttle service parameters:

| Setting | Description |
|---------|-------------|
| Operating Days | Days of the week shuttle runs (checkboxes) |
| Start Time | First shuttle departure (e.g., 6:00 AM) |
| End Time | Last shuttle departure (e.g., 11:00 PM) |
| Interval | Hourly, 30-min, or 2-hour intervals |
| Vehicle Capacity | Max passengers per run |
| Pickup Locations | Comma-separated location list |
| Drop-Off Destinations | Comma-separated destination list |
| Price Per Person | Fare displayed to guests booking online |

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§9 — STAFF SCHEDULES</span>

---

## Overview

The Schedules module is the primary tool for managers to build, edit, and publish weekly staff schedules. In v2, the module has been significantly enhanced with edit-in-place, schedule templates, copy-week functionality, auto-role assignment, and support for open-ended housekeeping shifts.

## Schedule Grid

The main view is a **week-at-a-glance grid** with:
- **Columns**: Days of the week (Mon → Sun)
- **Rows**: Staff members
- **Cells**: Shift cards showing start time, end time (or "TBD"), and role

Clicking on any date header navigates to that week. The current week is displayed by default.

### Shift Cards
Each shift card shows:
- Staff name
- `8:00 AM → 4:00 PM` (or `8:00 AM → TBD` in amber for open-ended shifts)
- Role badge (e.g., "Front Desk", "Housekeeping")

**Color coding:**
- Normal shifts: White card, crimson border
- TBD (open-end) shifts: Amber card, amber border
- Published shifts: Slight shadow/elevation indicating finalized state

## Adding a Shift

Click the **+ Add Shift** button (header, admin/manager only) to open the Add Shift modal.

**Fields:**

| Field | Input Type | Notes |
|-------|-----------|-------|
| Staff Member | Dropdown | Lists all active staff |
| Date | Date picker | Defaults to selected week |
| Start Time | Time picker | Required |
| End Time | Time picker | Optional if open-ended |
| Role | Text (auto-filled) | Auto-populated from staff profile |
| Notes | Textarea | Optional shift notes |
| Open End Time | Checkbox | For housekeeping dept. only |

### Auto-Role Assignment *(v2)*
When a staff member is selected from the dropdown, the **Role** field automatically populates with that staff member's default role from their profile. The manager can override this for any specific shift. This eliminates the need to manually type the role on every shift entry.

### Open-Ended Shifts *(v2 — Housekeeping)*
For housekeeping staff, the end time is often unknown at schedule creation. A supervisor fills in the actual end time once the shift concludes.

**When creating a housekeeping shift:**
1. Select a staff member in the `housekeeping` department
2. A checkbox appears: **"Open end time (supervisor fills daily)"**
3. Checking it hides the end-time picker
4. The shift is created with `end_time = NULL` in the database

**On the schedule grid**, open-ended shifts display `→ TBD` in amber text. For admins and managers, this TBD badge is **tappable**:
1. Tap the `→ TBD` badge
2. A small inline popover appears with a time input and "Set" button
3. Enter the actual end time and tap Set
4. The card updates immediately and the amber indicator clears

## Editing a Shift *(v2)*

In v1, clicking a shift card immediately deleted it — a risky design. In v2, clicking a shift card opens an **Edit Shift modal** instead.

**Edit modal fields:** All the same fields as the Add modal, pre-populated from the existing shift.

**Edit modal actions:**
- **Save Changes** (primary, blue) — updates the shift with new values
- **Delete Shift** (secondary, red, smaller) — permanently removes the shift with confirmation

The deliberate separation of Save and Delete prevents accidental deletions.

## Copy to Next Week *(v2)*

The **Copy to Next Week** button in the schedule header allows managers to replicate the entire current week's schedule forward by 7 days with a single click.

**Behavior:**
1. Reads all shifts in the currently displayed week
2. Creates duplicates with `shift_date + 7 days`, preserving all other fields
3. If next week already has shifts, a confirmation dialog asks: *"Next week already has X shifts. Add these on top?"*
4. A spinner shows during the copy operation; a brief "Copied!" confirmation appears on success

This is especially useful for hotels with consistent weekly shift patterns (e.g., same staff, same hours, week after week).

## Schedule Templates *(v2)*

Templates allow managers to save a week's schedule pattern and reload it in future weeks. Templates are stored locally (per device) for manager convenience.

### Saving a Template
1. Build or navigate to a week's schedule
2. Click **Save as Template** (bookmark icon in header)
3. Enter a template name (e.g., "Standard Summer Week", "Holiday Reduced")
4. Click Save — the template is stored in `localStorage`

### Loading a Template
1. Navigate to the target week
2. Click **Load Template** (folder icon in header)
3. A dialog lists all saved templates with name and shift count
4. Click a template to preview its shifts
5. Click **Apply** — shifts are bulk-inserted mapped to the current week's dates
6. If the week already has shifts, a confirmation dialog appears

### Managing Templates
In the Load Template dialog, each template has a **Delete** button (trash icon) to remove it from the list.

Templates store shifts by **day of week** (Monday = 0, Sunday = 6), not absolute dates. This makes them portable across any future week.

## Publishing Schedules

The **Publish** button makes the current week's schedule visible to staff members in the "My Schedule" view. Unpublished schedules are draft-only and not shown to staff.

**To publish:**
1. Build and review the week's schedule
2. Click **Publish** — the schedule is marked as published for that week
3. Staff can now see their shifts for that week

Admins can unpublish a schedule if changes are needed.

## Viewing Your Schedule (Staff)

Staff members (non-admin) see a simplified view of their own shifts for the current and upcoming weeks. They cannot see other staff members' schedules.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§10 — STAFF CALLOUTS & COVERAGE</span>

---

## Overview

The Callouts module manages the full lifecycle of a staff member calling out from a shift — from the initial callout submission to manager acknowledgement and coverage assignment. In v2, this replaces the informal text-message callout chain with a structured, documented workflow.

## Staff: Reporting a Callout

Any staff member can submit a callout from the **Callouts** tab in their dashboard.

**To report a callout:**
1. Click **Report Callout**
2. A modal opens with the following fields:

| Field | Description |
|-------|-------------|
| Shift Date | The date being called out from (date picker) |
| Reason | Sick / Personal / Family Emergency / Other |
| Notes | Optional additional context |

3. Submit — the callout is logged and immediately visible to managers and admins

Staff can view their own callout history in a list below the Report Callout button.

## Manager: Managing Callouts

Managers and Admins see all pending callouts in the Callouts tab. A **notification badge** on the Callouts tab label shows the count of unresolved callouts.

### Callout List View
Each callout entry shows:
- Staff member name
- Callout date
- Reason
- The affected shift (time range, role) — pulled from `staff_schedules`
- Time since submission
- Status: Pending / Acknowledged / Covered

### Manager Actions

| Action | Description |
|--------|-------------|
| **Approve** | Acknowledges the callout. No coverage action taken. Removes from pending count. |
| **Find Cover** | Opens the Schedules view filtered to the callout date, making it easy to identify available staff or reassign the shift. |

### Schedule Integration
When a callout exists for a date, the Schedules tab displays a **red dot** on that date in the grid header. This alerts managers reviewing the schedule that a coverage gap exists without navigating to the Callouts tab.

## Callout Data

Callouts are stored using the unified `requests` table with `type = 'schedule_change_request'`. This means callouts are searchable and auditable in the same way as other operational records.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§11 — CULTURE HUB *(v2)*</span>

---

## Overview

Culture Hub is a **new module in v2**, adding a team engagement layer to Attenda. It is designed to increase staff retention and morale by recognizing performance, celebrating milestones, and fostering a sense of community within the hotel team.

Culture Hub is visible to all staff roles (Admin through Staff). It is not visible to vendors.

## Leaderboard

The Leaderboard ranks staff members by their accumulated **points** over the current month. Points are awarded for:
- Completing KPI submissions
- Receiving positive guest feedback (logged by managers)
- Completing training modules in Learning & HR
- Attendance and punctuality (admin-logged)

**Leaderboard display:**
- **Gold** 🥇 — Top scorer (large card, gold accent)
- **Silver** 🥈 — Second place
- **Bronze** 🥉 — Third place
- Remaining staff listed in ranked order

Points reset at the start of each calendar month. Historical rankings are archived.

## Rewards Catalog

Admins can configure a **Rewards Catalog** — a list of rewards staff can redeem using accumulated points.

**Example rewards:**
- 50 pts — Preferred parking spot for a week
- 100 pts — Paid lunch at a partner restaurant
- 200 pts — Half-day off
- 500 pts — Gift card

Staff browse the catalog and submit redemption requests. Admins approve or reject redemptions from a pending queue.

**To configure rewards (Admin):**
1. Navigate to Culture Hub → Rewards tab
2. Click **Add Reward**
3. Enter reward name, point cost, description, and quantity available
4. Click Save

## Birthday Tracking

Admins enter staff birthdays in the Staff Management profile. Culture Hub displays upcoming birthdays in the **next 30 days** in a dedicated section — prompting managers to acknowledge team members' special days.

A **birthday notification** appears in the Daily Brief on the staff member's birthday.

## Team Events

Managers and Admins can post team events — meetings, outings, training sessions, celebrations — in the Events section of Culture Hub.

**Event fields:**
- Title
- Date and time
- Location (on-property or off-site)
- Description
- RSVP (optional — staff can indicate attendance)

Events display in chronological order. Past events are archived automatically after 7 days.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§12 — KPIs & MARKETPLACE</span>

---

## Overview

The KPIs module provides a structured framework for tracking performance metrics across all hotel departments. KPI definitions are configured by admins and can be sourced from the community Marketplace — a library of pre-built KPI packs curated by QHS and contributed by other Attenda properties.

## KPI Structure

**KPI Definition:** A metric to be tracked (e.g., "Rooms Cleaned per Hour", "Check-In Wait Time").
**KPI Submission:** A data point entered by staff for a specific date.

KPIs are organized into **Categories:**

| Category | Example Metrics |
|----------|----------------|
| Revenue | ADR, RevPAR, Ancillary Revenue |
| Operations | Maintenance Resolution Time, Room Turnaround |
| Guest Experience | Net Promoter Score, Complaint Rate |
| Quality | Inspection Score, Defect Rate |
| Housekeeping | Rooms Cleaned, CPOR |
| Front Desk | Check-In Wait Time, Upsell Conversion |

## Submitting KPIs (Staff)

Staff submit KPI data from the **KPIs** tab.

**Workflow:**
1. Select the KPI category tab
2. For each metric in the category, enter today's value
3. Click **Submit** — all values in the category are saved together
4. A checkmark confirms successful submission

Submitted KPIs cannot be edited by staff — only admins can correct submissions.

## KPI Dashboard (Admin/Manager)

Admins see a consolidated view of all KPI submissions across all categories:
- **Daily view**: Today's submitted values vs. targets
- **Weekly trend**: Sparkline charts showing metric trends over the past 7 days
- **Submission status**: Which staff members have submitted each category today

Targets are configurable per KPI definition.

## KPI Templates

Admins can save the current KPI configuration as a **template**:
1. Click **Save Template** (bookmark icon)
2. Enter a template name
3. Template saves the current active KPI definitions and targets

To rename or delete a template, use the template action buttons (introduced in v2: **Rename** and **Delete** with explicit save confirmation).

## Marketplace *(v2)*

The Marketplace provides access to **community KPI packs** — pre-built collections of KPI definitions, targets, and submission forms contributed by QHS or other hotel operators.

### Browsing the Marketplace
Navigate to **Marketplace** in the staff navigation. Each pack is displayed as a card showing:
- Pack name (e.g., "Hotel Operations Core Pack")
- Category
- Description
- Install count
- Star rating (community-voted)

### Installing a KPI Pack
1. Click a pack card to preview its contents
2. Click **Install** — the pack's KPI definitions are added to the hotel's active KPIs
3. Installed packs appear in the hotel's KPI configuration with a Marketplace badge

### Community To-Do Packs
The Marketplace also includes **To-Do Packs** — curated position-based checklists for common hotel roles (Front Desk Opening, Housekeeping Room Checklist, Night Audit, etc.). These can be installed directly to the hotel's Position To-Dos module.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§13 — PARTNER NETWORK & VENDOR ONBOARDING</span>

---

## Overview

The Partner Network is the vendor ecosystem that enables Attenda's 10% commission revenue model. Partners are businesses (restaurants, transport providers, experience operators) that fulfill orders placed by hotel guests through the Attenda platform.

## Partner Categories

| Category | Description | Examples |
|----------|-------------|---------|
| Restaurant | Food and beverage delivery | Local restaurants, cafes, room service |
| Transport | Private vehicle services | Car services, tours, charter boats |
| Service | In-room or on-property services | Spa, laundry, pet care |
| Experience | Activities and excursions | Tours, shows, sporting events |

## Vendor Self-Onboarding *(v2 new)*

In v2, prospective partners can apply to join the Attenda network for a specific hotel via a **public-facing application page** — no manual outreach or admin configuration required.

### Application Page
**URL:** `https://attendaapp.com/apply?hotel={slug}`

The page is publicly accessible with no login required. It includes:
- Hero section: "Become an Attenda Partner"
- Benefit callouts:
  - Reach hotel guests directly in their rooms
  - Keep 90% of every transaction (vs. 65% on third-party delivery apps)
  - Hotel staff purchase perks and preferred vendor status
- **Application form:**

| Field | Required |
|-------|---------|
| Business / Restaurant Name | ✓ |
| Contact Name | ✓ |
| Phone Number | ✓ |
| Email Address | ✓ |
| Business Type | ✓ (Restaurant / Transport / Service / Experience) |
| Brief Description / Message | Optional |

The `hotel` slug from the URL parameter is captured automatically — no hotel selection required of the applicant.

**On submit:**
- Application is stored in `partner_applications` table
- Staff receive a notification in the Partners inbox
- Applicant sees a success message: *"Application received! We'll be in touch within 24 hours."*

### Sharing the Apply Link
On the **Partners** tab in the staff dashboard, an admin can click **Share Apply Link** to copy the full apply URL to the clipboard:

```
https://attendaapp.com/apply?hotel=fort-lauderdale-airport-cruise-port
```

This link can be shared with prospective partners via email, WhatsApp, or printed materials.

## Applications Inbox

Pending partner applications appear in the **Applications** tab within the Partners section of the staff dashboard.

Each application card shows:
- Business name and type
- Contact name and email
- Date submitted
- Their description/message

**Actions:**
- **Approve** — Creates a partner account and notifies the applicant via email
- **Reject** — Archives the application with an optional rejection reason

## Managing Active Partners

Approved partners appear in the **Partners** list. Admins can:
- Edit partner details (name, description, hours, category)
- Activate or deactivate a partner (controls visibility to guests)
- Upload partner logo and cover image
- Manage menu items and pricing
- Run a **Test Order** to verify the ordering flow end-to-end

## Menu Management

Partners manage their own menus via the Vendor Portal (§14). Admins can also manage partner menus directly from the Partners tab:

1. Select a partner → **Menu** sub-tab
2. Click **Add Item** to create a new menu item:
   - Item name
   - Description
   - Price
   - Category (Appetizer, Main, Dessert, Drink, etc.)
   - Photo upload
3. Items are immediately live in the guest ordering app

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§14 — VENDOR PORTAL</span>

---

## Overview

The Vendor Portal is the partner-facing interface for receiving and managing orders. It is a separate authenticated environment from the staff dashboard, accessible at `/vendor`. In v2, vendors authenticate with their own email and password — hotel staff cannot log in as a vendor, and vendors cannot access the staff dashboard.

## Vendor Login *(v2 enhanced)*

Vendor accounts are created by hotel admins in the Partners management screen. When a vendor partner is approved:
1. An email is sent to the vendor's contact address with login credentials
2. The vendor navigates to `https://attendaapp.com/vendor`
3. They enter their email and password (tenant-scoped — unique per property)
4. On login, they see only their own orders and menu items

Vendor sessions are scoped strictly to a single `hotel_id` + `vendor_type`. A restaurant vendor from Property A cannot see orders for Property B or orders for the transport vendor at Property A.

## Order Intake

The primary screen of the Vendor Portal is the **Order Board** — a Kanban-style view of all incoming orders.

### Order Status Columns

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     NEW      │  │   RECEIVED   │  │  PREPARING   │  │    READY     │
│              │  │              │  │              │  │              │
│ [Order Card] │  │ [Order Card] │  │ [Order Card] │  │ [Order Card] │
│ [Order Card] │  │              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

A fifth column **Delivered** shows completed orders (collapsed by default).

### Order Card Contents
Each order card displays:
- Order number and timestamp
- Guest name and room number
- Item list with quantities
- Special instructions (if any)
- Order total
- Payment method (Card / Room Charge)

### Updating Order Status
Vendors update order status by clicking the action button on each card:
- **Accept Order** (New → Received)
- **Start Preparing** (Received → Preparing)
- **Mark Ready** (Preparing → Ready)
- **Mark Delivered** (Ready → Delivered)

Each status update triggers:
1. A real-time update on the guest's `/track` order tracking page
2. A notification in the staff dashboard request feed

### Real-Time Updates
New orders appear on the Vendor Portal in real time via Supabase Realtime subscription — no page refresh needed. An audio notification sounds when a new order arrives (browser permission required).

## Order Manifest

The **Manifest** view shows all orders for the current day in a flat list format — useful for reviewing total volume, items needed for preparation, or end-of-day reconciliation.

The manifest can be filtered by:
- Status (All / Active / Completed)
- Time range (Last hour / Today)

## Menu Management (Vendor Portal)

Vendors can manage their own menu items directly from the Vendor Portal without contacting hotel staff.

**To add a menu item:**
1. Navigate to **Menu** tab in Vendor Portal
2. Click **Add Item**
3. Fill in name, description, price, category, and upload a photo
4. Toggle **Active** to make it visible in the guest app
5. Click Save

**To edit an item:** Click the item to open the edit drawer.
**To deactivate:** Toggle the Active switch off — the item disappears from guest view immediately.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§15 — RIGHT ANSWERS KNOWLEDGE BASE</span>

---

## Overview

The Right Answers module is a staff-facing knowledge base designed to give front-line employees instant access to approved responses for common guest situations — complaints, requests, incidents, and FAQs. In v2, it is augmented by an **AI suggestion engine** powered by Claude.

## Structure

The knowledge base is organized into **Categories:**

| Category | Example Topics |
|----------|---------------|
| Guest Complaints | Noise, cleanliness, billing disputes |
| Service Recovery | Compensation, room upgrades |
| Safety Procedures | Evacuation, medical emergencies |
| Local Information | Directions, recommendations |
| Policy Explanations | Check-in/out, pet policy, parking |
| General FAQ | Hours, amenities, Wi-Fi password |

Each category contains a set of **Knowledge Items** — a situation description paired with an approved staff response.

## Searching the Knowledge Base

Staff search by keyword or describe a situation in the search bar. The system returns matching knowledge items ranked by relevance.

**Example search:** *"guest says room was not cleaned"*
**Returns:** The approved service recovery response, escalation steps, and compensation guidelines.

## AI Suggestion Engine *(v2)*

When no knowledge base entry matches — or when a staff member wants to draft a custom response — they can request an **AI Suggestion** powered by Claude.

**How to use:**
1. Type the incident or situation in the search bar
2. If no KB entry matches, click **Get AI Suggestion**
3. A loading indicator appears while Claude generates a response (typically 2–5 seconds)
4. A professional, empathetic suggested response appears below the search bar

**Behind the scenes:**
The request is sent to `/api/ai-suggest` with the incident text and category. The API calls Claude (claude-haiku-4-5-20251001) with a hotel operations expert system prompt and returns the suggestion. If the API call fails, a local keyword-matching fallback provides a generic response.

**AI suggestions are not automatically added to the knowledge base.** Staff or managers review them and can submit for approval if the suggestion is good.

## Knowledge Base Contributions

Staff can submit new knowledge items for review:
1. Click **Suggest Answer** on any search result screen
2. Enter the situation and their suggested response
3. Submit — creates a `kb_suggestion` record in the ops store

### Manager/Admin Approval Workflow
Pending submissions appear in the **Pending** tab of Right Answers (Manager/Admin only):
- Review the suggested situation + response
- Edit if needed
- **Approve** — adds to the live knowledge base
- **Reject** — archives with optional feedback

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§16 — LEARNING & HR</span>

---

## Overview

The Learning & HR module centralizes staff training and HR documentation within Attenda. It provides a structured course system for onboarding and ongoing education, plus a document library for employee handbooks, policies, and compliance materials.

## Learning Platform

### Courses
Admins create training courses in the Learning tab. Each course contains:
- **Modules** — individual lessons (text, video links, or PDFs)
- **Quizzes** — multiple-choice questions to test comprehension
- **Completion tracking** — per-staff progress records

**To create a course (Admin):**
1. Navigate to **Learning & HR → Courses**
2. Click **New Course**
3. Enter course title, description, and estimated completion time
4. Add modules (name + content type + content)
5. Add quiz questions (question + answer options + correct answer)
6. Publish the course

### Staff Training View
Staff see their assigned courses in the Learning tab. Each course shows:
- Course title and description
- Progress bar (modules completed / total)
- Quiz status (Not Started / In Progress / Passed)
- Certificate of completion (awarded on passing the quiz with ≥ 80%)

### Completion Tracking (Admin)
Admins see a training matrix:
- Rows: Active staff members
- Columns: All published courses
- Cells: Completed ✓ / In Progress 🔄 / Not Started ○

This view is useful for compliance tracking and onboarding verification.

## HR Document Library

The HR Document Library stores employee-facing documents that staff can access at any time.

**Document categories:**
- Employee Handbook
- Benefits Information
- Safety & Emergency Procedures
- HR Policies (PTO, Conduct, etc.)
- Position-Specific Guidelines

**To upload a document (Admin):**
1. Navigate to **Learning & HR → Documents**
2. Click **Upload Document**
3. Select the PDF file and assign a category
4. Optionally mark as **Requires Acknowledgement** — staff must confirm they've read it
5. Click Upload — document is immediately available to staff

### Acknowledgement Tracking
For documents marked "Requires Acknowledgement," the system tracks which staff members have confirmed they've read the document. Admins see a completion list; unacknowledged staff are highlighted for follow-up.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§17 — COMPSET & COMPETITIVE INTELLIGENCE</span>

---

## Overview

The Compset module enables systematic tracking of competitor hotel rates and positioning. Front desk managers conduct regular rate calls to competitor properties and log their findings in Attenda, building an auditable record of the local competitive landscape.

## Setting Up Your Compset

Admins configure the competitive set from **Property Settings → Compset**.

**To add a competitor:**
1. Click **Add Competitor**
2. Enter hotel name, phone number, star rating, and room categories to track
3. Optionally add notes about their product (pool, breakfast, location advantages)
4. Save — the competitor appears in the Compset call tracker

A typical compset for an airport hotel includes 5–8 nearby properties of similar class.

## Logging Rate Calls

Front desk staff conduct compset calls on a schedule set by the GM (typically daily or weekly). To log a call:

1. Navigate to **Compset** tab
2. Click on the competitor property
3. Click **Log Call**
4. Enter today's quoted rates for each room category:
   - Standard King
   - Standard Double
   - Suite (if applicable)
5. Note any promotions or restrictions mentioned
6. Add free-text notes (e.g., "Sold out this weekend", "Running a 15% AAA discount")
7. Save

Each call log is timestamped and attributed to the logged-in staff member.

## Compset Data View

The Compset dashboard shows:
- Current rates for all competitors (most recent call data)
- Your property's current rate for the same categories
- Rate differential (you vs. competitors)
- Historical rate trend per competitor (last 30 calls)
- **Rate position**: Are you priced above, at, or below the market average?

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§18 — FORECAST & STAFFING</span>

---

## Overview

The Forecast module allows managers to input anticipated occupancy, arrivals, and departures, and generates recommended staffing levels based on configurable ratio formulas. This bridges the gap between the PMS (where reservation data lives) and Attenda's scheduling tools.

## Creating a Forecast

Navigate to **Forecast** in the staff navigation. Forecasts are submitted per-day.

**Forecast fields:**

| Field | Description |
|-------|-------------|
| Date | The forecast date |
| Expected Occupancy | Number of occupied rooms (integer) |
| Arrivals | Expected check-ins |
| Departures | Expected check-outs |
| Group Blocks | Rooms blocked for groups |
| VIP Arrivals | Count of VIP/loyalty guest arrivals |
| Notes | Event notes, local demand drivers |

Click **Submit Forecast** to save. Submitted forecasts appear in the monthly Forecast Calendar.

## Auto-Shift Generation

Based on the forecast data and configurable staffing ratios, Attenda can **suggest shifts** for the forecasted day:

- Ratio settings: e.g., 1 housekeeper per 12 rooms, 1 front desk agent per 25 arrivals
- On clicking **Generate Shifts**, the system creates draft shift suggestions
- Managers review and edit before publishing to the schedule

Staffing ratios are configured in Property Settings by the admin.

## Monthly Forecast Calendar

The Forecast Calendar shows a full month at a glance with:
- Color-coded occupancy levels (green / amber / red)
- Whether a forecast has been submitted for each date
- Click any date to view or edit the forecast

## Forecast in the Daily Brief

The most recently submitted forecast for today appears in the Daily Brief **Forecast Summary** widget, giving the GM a quick occupancy snapshot each morning.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§19 — POSITION TO-DOS</span>

---

## Overview

Position To-Dos are role-specific daily checklists that ensure every shift position completes their required tasks. They replace paper checklists and shared Google Docs with a tracked, timestamped digital record.

## How It Works

Each active To-Do is tied to a **position** (e.g., "Front Desk AM", "Housekeeping Supervisor", "Night Audit"). Staff see only the To-Dos for their own position. Managers can see all positions.

### Completing To-Dos (Staff)
1. Navigate to **To-Dos** tab
2. The current date's checklist appears automatically
3. Check off items as they're completed
4. Each item is timestamped when checked
5. Submitting the completed checklist creates a permanent record

### Viewing Completion Status (Manager)
Managers see a **Completion Board** showing:
- All active positions
- Completion percentage for today's checklist per position
- Which items are pending vs. complete
- Which staff member completed each item

## Creating To-Dos (Admin)

**To create a new To-Do item:**
1. Navigate to **Position To-Dos → Manage** (Admin only)
2. Click **New Item**
3. Fill in:
   - Task description
   - Position (which role sees this task)
   - Frequency (Daily / Weekly / Per-Shift)
   - Category (Opening / Closing / Ongoing / Safety)
   - Notes or instructions
4. Activate — the task appears on the next applicable date

## To-Do Packs (Marketplace)

The Marketplace includes community-contributed **To-Do Packs** for common hotel positions. Installing a pack adds its tasks to the property's active To-Do list.

**Example packs:**
- *Front Desk Opening Checklist* (22 items)
- *Housekeeping Room Inspection Standard* (30 items)
- *Night Audit Procedure* (18 items)
- *F&B Server Opening Duties* (15 items)

Each pack shows its install count and average rating from other Attenda properties.

---

<div style="page-break-before: always;"></div>

---

# <span style="color: #7B1C3E;">§20 — SUPERADMIN & PLATFORM OPERATIONS</span>

---

## Overview

The SuperAdmin module is the platform operations console for Quantum Hospitality Solutions staff. It provides centralized management of all hotel tenants, platform configuration, and system health monitoring.

**Access:** SuperAdmin accounts only. URL: `https://attendaapp.com/superadmin`

## All Properties View

The landing screen of the SuperAdmin dashboard lists all hotel tenants:

| Column | Description |
|--------|-------------|
| Hotel Name | Property name |
| Slug | URL identifier (`fort-lauderdale-airport-cruise-port`) |
| Hotel ID | UUID used in all DB records |
| Status | Active / Paused |
| Staff Count | Number of active staff accounts |
| Last Activity | Most recent request or submission |
| Actions | Switch / Settings / Health Check |

Clicking **Switch** loads that hotel's context, allowing the SuperAdmin to operate as an admin of that property.

## Creating a New Property

1. Click **New Property** on the SuperAdmin dashboard
2. Fill in:
   - Hotel name
   - Slug (lowercase, hyphen-separated, unique)
   - Address and contact information
   - Brand color (hex, used for accent in the guest app)
   - Room count
   - Admin email (creates the first admin account)
3. Click **Create Property** — the hotel is immediately live with an empty dataset

## Platform Health Monitoring

The SuperAdmin dashboard includes a **Health Check** panel showing:
- Database connection status
- Supabase project uptime
- Recent error logs (from Supabase logs)
- API route response times (spot checks)

## Database Operations

SuperAdmins can execute database queries for maintenance, data migration, or debugging via the **DB Console** panel in SuperAdmin. This uses a service-role client with full database access, bypassing all RLS policies.

⚠️ **Warning:** DB Console operations are irreversible. Always verify queries on the test tenant before executing on production properties.

## Test Tenant

QHS maintains a dedicated **test tenant** (`slug: test`) with no real guest data. All platform development and feature testing should use this tenant. The test tenant can be freely seeded with sample data and reset without risk to production properties.

```
Test Tenant
  Slug:   test
  Hotel ID: 466654c8-66db-4c08-9bf7-4b6326dbf3b8
  Status: Development only — no real guests
```

## Environment Variables

The following environment variables are required for full platform operation:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only) |
| `RESEND_API_KEY` | Email service key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `ANTHROPIC_API_KEY` | Claude API key (for Right Answers AI) |
| `BOUNCIE_CLIENT_ID` | Bouncie GPS OAuth client ID |
| `BOUNCIE_CLIENT_SECRET` | Bouncie GPS OAuth client secret |
| `UBER_CLIENT_ID` | Uber Direct API client ID |
| `UBER_CLIENT_SECRET` | Uber Direct API client secret |

## Deployment

Attenda is deployed on **Vercel**. All pushes to the `main` branch trigger automatic deployment. Preview deployments are created for all pull requests.

**To deploy:**
```bash
git push origin main
```

Vercel runs the Next.js build, validates environment variables, and deploys to the Edge network. Deployment typically completes in 60–90 seconds.

---

<div style="text-align: center; margin-top: 80px; padding: 40px; border-top: 2px solid #7B1C3E; color: #7B1C3E;">

**ATTENDA · QUANTUM HOSPITALITY SOLUTIONS**

*Confidential — Do Not Distribute*

Version 2.0 · June 2026

*Built by hotel people, for hotel people.*

</div>

</div>
