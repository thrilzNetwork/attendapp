# ATTENDA HOSPITALITY PLATFORM
## Complete Product Manual — v1.0

> **Confidential · Internal Use Only**
> Platform Documentation · Attenda SaaS · thrilznetwork@gmail.com

---

# TABLE OF CONTENTS

1. [Platform Overview](#1-platform-overview)
2. [Architecture & Technology Stack](#2-architecture--technology-stack)
3. [User Roles & Permission Matrix](#3-user-roles--permission-matrix)
4. [Onboarding a New Property](#4-onboarding-a-new-property)
5. [Super Admin Guide](#5-super-admin-guide)
6. [Hotel Admin Guide](#6-hotel-admin-guide)
7. [Manager Guide](#7-manager-guide)
8. [Staff Guide](#8-staff-guide)
9. [Vendor / Partner Guide](#9-vendor--partner-guide)
10. [Guest Experience Guide](#10-guest-experience-guide)
11. [Module Deep-Dives](#11-module-deep-dives)
12. [Shuttle Operations Manual](#12-shuttle-operations-manual)
13. [Partner & Vendor Network](#13-partner--vendor-network)
14. [Financial Model & Revenue Sharing](#14-financial-model--revenue-sharing)
15. [Integrations Guide](#15-integrations-guide)
16. [Standard Operating Procedures (SOPs)](#16-standard-operating-procedures-sops)
17. [Email Notification Reference](#17-email-notification-reference)
18. [Troubleshooting & FAQs](#18-troubleshooting--faqs)
19. [Database Schema Reference](#19-database-schema-reference)
20. [Glossary](#20-glossary)

---

# 1. PLATFORM OVERVIEW

## What Is Attenda?

Attenda is a **multi-tenant hospitality SaaS platform** that replaces outdated hotel communication tools (binders, whiteboards, radios, printed menus) with a unified digital system accessible from any device.

It serves four distinct audiences simultaneously:
- **Hotel operators** — streamlined operations, real-time staff coordination, data-driven decisions
- **Guests** — a frictionless QR-code experience for requests, ordering, transport, and communication
- **Vendors & partners** — a dedicated iPad dashboard to fulfill orders and manage their presence
- **Platform owner (Attenda)** — a super-admin command center across all properties with live health metrics

## Core Value Propositions

| For Hotels | For Guests | For Vendors | For Attenda |
|---|---|---|---|
| Reduce front desk call volume by up to 60% | No app download required | Free tablet-based order management | 10% commission on all partner transactions |
| Real-time team coordination across shifts | QR code access in seconds | Real-time order notifications | Multi-property SaaS revenue model |
| Data trail on every guest interaction | Order food, book transport, message staff | Menu & business profile management | Bouncie fleet tracking integration |
| Vendor network generates ancillary revenue | 5-star review funnel | Payout visibility per order | Zero hardware dependency |
| Scheduling, KPIs, checklists in one place | Safe, multilingual-ready experience | Transport, food, experiences, services | Instant tenant onboarding |

## Platform URLs

| Audience | URL Pattern | Example |
|---|---|---|
| Guest App | `attendaapp.com/app?hotel=<slug>` | `attendaapp.com/app?hotel=sands84` |
| Staff Dashboard | `attendaapp.com/staff` | Login with email + password or 4-digit PIN |
| Partner Dashboard | `attendaapp.com/partner?restaurant=<id>` | Via QR code on vendor iPad |
| Super Admin | `attendaapp.com/superadmin` | Restricted — Attenda team only |
| Landing / Marketing | `attendaapp.com` | Public |
| Partner Apply | `attendaapp.com/partner?type=restaurant` | Public partner application |

---

# 2. ARCHITECTURE & TECHNOLOGY STACK

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14.2 (App Router) | Server + client rendering |
| **UI** | Tailwind CSS + Lucide Icons | Styling and iconography |
| **Database** | Supabase (PostgreSQL) | Multi-tenant data store with RLS |
| **Auth** | Supabase Auth + custom PIN | Staff email/password + PIN login |
| **Real-time** | Supabase Realtime (WebSockets) | Live request, message, and order updates |
| **Email** | Resend | Transactional notifications |
| **Fleet Tracking** | Bouncie API | Live vehicle GPS tracking |
| **Payments** | Stripe / Clover (roadmap) | Guest payment processing |
| **Deployment** | Vercel | Auto-deploy on push to main |
| **Media** | Supabase Storage | Partner photos, team images |

## Multi-Tenancy Model

Every record in the database is scoped to a `hotel_id` (UUID). Supabase Row Level Security (RLS) policies ensure:
- Staff can only read/write data for their own hotel
- SuperAdmin uses a service-role key to query across all tenants
- Guest sessions are validated by hotel slug + room number
- No cross-tenant data leakage is possible at the database level

## Data Flow Architecture

```
Guest (QR Code / Browser)
        │
        ▼
 Next.js App Router ──► Supabase Client (hotel-scoped RLS)
        │
        ├──► /api/email        → Resend (notifications)
        ├──► /api/bouncie/*    → Bouncie API (fleet)
        ├──► /api/places-sync  → Google Places (partner data)
        ├──► /api/superadmin-db → Service Role (cross-tenant)
        └──► /api/ops-data     → Operational records CRUD

Staff Dashboard (React Client)
        │
        ▼
 Supabase Realtime ──► Live updates (requests, messages, orders)
```

---

# 3. USER ROLES & PERMISSION MATRIX

## Role Hierarchy

```
SuperAdmin (Attenda Team)
    └── Admin (Property Owner / General Manager)
            └── Manager (Department Head / Supervisor)
                    └── Staff (Front Desk / Housekeeping / Maintenance)
                    └── Vendor (Partner / Driver / External)
    
Guest (Separate public-facing system)
```

## Detailed Permission Matrix

| Feature | SuperAdmin | Admin | Manager | Staff | Vendor | Guest |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **REQUESTS** | | | | | | |
| View all requests | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Accept / assign request | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Close / delete request | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Submit a request | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **MESSAGING** | | | | | | |
| View guest messages | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Reply to guest | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Message front desk | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **SCHEDULING** | | | | | | |
| View all shifts | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Create/edit schedules | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Request schedule change | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **STAFF MANAGEMENT** | | | | | | |
| View staff list | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create staff accounts | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit permissions | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete staff | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **SHUTTLE** | | | | | | |
| View today's runs | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add guest to run | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cancel bookings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Book shuttle (guest) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create schedule | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **PARTNERS & VENDORS** | | | | | | |
| Add/edit partners | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage menu items | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View vendor orders | ❌ | ❌ | ❌ | ❌ | ✅ (own) | ❌ |
| Browse partners/order | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **HOTEL SETTINGS** | | | | | | |
| Edit hotel profile | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage QR codes | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage rooms | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure ops tools | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **ANALYTICS & KPIs** | | | | | | |
| View KPI dashboard | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Log KPI values | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View forecasts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit forecasts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **PLATFORM (MULTI-TENANT)** | | | | | | |
| View all properties | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Onboard new property | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Toggle hotel active | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View platform metrics | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Staff Account Fields

When creating a staff member, the following fields are available:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Text | ✅ | Full name displayed in dashboard |
| `email` | Email | Optional | Required for email/password login |
| `role` | Enum | ✅ | `admin`, `manager`, `staff`, `vendor` |
| `pin_code` | 4-digit | ✅ | Auto-generated or custom |
| `department` | Text | Optional | `front_desk`, `housekeeping`, `maintenance`, `security`, `management` |
| `vendor_type` | Text | Optional | `shuttle`, `taxi`, `restaurant` — for vendor accounts |
| `hire_date` | Date | Optional | For HR tracking |
| `employment_type` | Enum | Optional | `full_time`, `part_time`, `contractor` |
| `min_hours` | Number | Optional | Minimum hours per week |
| `permissions` | Array | Optional | Granular tab access overrides |
| `active` | Boolean | ✅ | Deactivated accounts cannot log in |

---

# 4. ONBOARDING A NEW PROPERTY

## Step 1 — Pre-Onboarding Checklist

Before starting the wizard, collect from the hotel:

```
□ Property name (legal name)
□ Slug (URL-friendly: no spaces, lowercase — e.g., "sands-inn-miami")
□ Full address
□ Room count
□ General Manager name
□ Notification email (where alerts go)
□ Admin phone number
□ Website URL
□ Google Reviews URL (from Google Business Profile)
□ TripAdvisor URL (optional)
□ Yelp URL (optional)
□ Brand color (hex code — e.g., #0D4C92)
□ Property type (Boutique / Hotel / Motel / Resort / Inn / B&B)
```

## Step 2 — Launch the Onboarding Wizard

1. Log in to the Super Admin dashboard at `attendaapp.com/staff`
2. Switch to the **All Properties** tab (superadmin only)
3. Click **+ New Property** in the top-right
4. The 3-step wizard opens:

### Wizard Step 1 — Property Details
Fill in:
- Property name (slug auto-generates from name — review and edit if needed)
- Property type dropdown
- Room count
- Brand color (click the swatch to open color picker)
- Address
- Notification email (where guest requests/messages are sent)
- Admin phone
- Website URL
- Google Review URL

### Wizard Step 2 — Admin Account
Fill in:
- Admin name (the GM or owner)
- Admin email (their login email)
- Review the enabled modules list (all enabled by default)

### Wizard Step 3 — Review & Launch
- Confirm all details in the summary table
- Click **🚀 Launch Property**

**What happens automatically:**
1. Hotel record created in database with unique UUID
2. Admin staff account created with auto-generated 4-digit PIN
3. Welcome email sent to admin with:
   - Guest App URL: `attendaapp.com/app?hotel=<slug>`
   - Staff Login URL: `attendaapp.com/staff`
   - Temporary PIN: `2025` (change immediately)
4. Property appears in the SuperAdmin Command Center

## Step 3 — First Admin Login

1. Admin goes to `attendaapp.com/staff`
2. Clicks **Use Email Instead** if they want email/password login
3. First-time: click **Forgot your password?** to set a new password
4. Or: use the PIN provided in the welcome email

## Step 4 — Property Configuration

After first login, admin should complete:

```
□ Upload team photo (Property Settings → Team Photo URL)
□ Write/paste welcome letter (Property Settings → Welcome Letter)
□ Set WiFi name and password (Property Settings → WiFi)
□ Set manager name (Property Settings → Manager Name)
□ Add Google/TripAdvisor/Yelp review links
□ Configure facilities content (pool, gym, breakfast, parking, etc.)
□ Configure safety content (emergency contacts, protocols)
□ Upload or create QR codes for guest rooms
□ Add rooms (Room Management → bulk CSV or manual)
□ Create staff accounts
□ Add vendor/partner listings
□ Set up shuttle schedule (if applicable)
```

## Step 5 — Staff Account Creation

1. Go to **Staff Management** tab
2. Click **+ Add Staff**
3. Fill in: name, role, email (optional), department
4. PIN is auto-generated — share securely
5. Repeat for all staff members

**Recommended department mapping:**
| Department | Role | Tabs They'll See |
|---|---|---|
| General Manager | admin | All tabs |
| Supervisor | manager | Today + Operations + Forecast |
| Front Desk | staff | Dashboard, Requests, Messages, Shuttle, KPIs |
| Housekeeping | staff | Dashboard, To-Dos, Requests |
| Maintenance | staff | Dashboard, Requests, To-Dos |
| Driver/Vendor | vendor | Vendor Dashboard only |

## Step 6 — QR Code Deployment

1. Go to **QR Codes** tab
2. Create one code per room: label = Room 101, URL = `attendaapp.com/app?hotel=<slug>&room=101`
3. Export and print
4. Laminate and place in every guest room (bedside table, back of door recommended)

---

# 5. SUPER ADMIN GUIDE

## Accessing the Command Center

SuperAdmin access is for Attenda team only. Log in at `attendaapp.com/staff` with superadmin credentials and navigate to **All Properties**.

## Command Center Overview

The Super Admin dashboard shows:

**Global Stats Bar (top of screen):**
- Total Properties
- Total Active Staff (across all hotels)
- Total Requests Today (platform-wide)
- Platform Status (all systems operational / degraded)

**Hotel Cards (grid view):**
Each property shows:
- Brand color accent bar
- Property initial avatar
- Name, slug, status dot (green = active, red = paused)
- Brand type badge + "New" badge (< 7 days old)
- Live metrics: Rooms · Staff · Requests Today · Pending
- Last Activity timestamp (e.g., "2 minutes ago")
- Notification email
- Quick-copy buttons: Guest App URL · Staff Login URL
- [Manage →] button — switches dashboard to that hotel's context
- [Pause] / [Resume] toggle — disables guest access without deleting data

## Switching Between Hotels

1. Click **[Manage →]** on any hotel card
2. Dashboard switches context to that hotel
3. All data (requests, staff, schedules) now shows for that property
4. To return: click your name/back button or switch hotel via the hotel dropdown in the header

## Hotel Health Indicators

| Status | Meaning |
|---|---|
| 🟢 Green dot | Hotel is active — guests can access the app |
| 🔴 Red dot | Hotel is paused — guests see a maintenance message |
| 0 staff | No staff accounts created yet |
| 0 requests today | Either new property or very quiet day |
| Last activity > 24h | May need check-in |

## Onboarding New Properties

See Section 4 for the full onboarding wizard. As SuperAdmin, you can also:
- View all properties in one unified list
- Monitor which hotels are using the platform actively
- Pause/resume properties (e.g., for payment issues or off-season)
- Switch into any hotel's staff dashboard to troubleshoot

---

# 6. HOTEL ADMIN GUIDE

## The Admin Dashboard

After logging in, Admins see the full navigation sidebar. Key admin-exclusive sections:

### TODAY Section
- **Dashboard** — Shift overview: open requests, unread messages, shuttle bookings, today's occupancy
- **Requests** — All guest service requests in real time
- **Messages** — Guest chat threads

### OPERATIONS Section
- **To-Dos** — Position-based checklist management
- **Shuttle** — All shuttle operations
- **KPIs** — Metric logging and dashboards
- **Right Answers** — Knowledge base for AI-assisted guest responses
- **Learning & HR** — Training library
- **Property Info** — Hotel settings (admin-controlled)

### ADMIN Section
- **Forecast** — Weekly occupancy planning
- **Staff Callouts** — Operational logs (shift handoff, no-shows, room moves, cash counts)
- **Property Settings** — Brand, WiFi, shuttle config, review links
- **Staff Management** — All staff accounts
- **Partners & Menu** — Vendor directory and menu items
- **QR Codes** — Guest access QR code management
- **Room Management** — Hotel room inventory

## Property Settings Deep Dive

Navigate to **Property Settings** to configure:

### Basic Info
- **Property Name** — Displayed in the guest app header
- **Brand / Property Type** — Boutique / Hotel / Motel / Resort
- **Address** — Shown in confirmation emails and guest app
- **Brand Color** — Hex code — used as accent color throughout guest app
- **Manager Name** — Displayed in welcome message and emails
- **Team Photo URL** — Staff team photo shown in welcome tab
- **Front Desk Phone** — Click-to-call in guest app

### Digital Welcome
- **Welcome Letter** — Richly formatted text shown on guest welcome screen. Tip: include parking, check-out time, breakfast hours, pool hours.

### WiFi
- **Network Name** — Shown prominently in the Facilities tab
- **Password** — Tap-to-copy on guest device

### Review Management
- **Google Review URL** — Used in the review funnel
- **TripAdvisor URL** — Alternative review destination
- **Yelp URL** — Alternative review destination
- **Custom Review Links** — Add unlimited additional review platforms with custom labels

### Shuttle Configuration
- **Has Free Shuttle** — Toggle whether shuttle is complimentary or paid
- Configure days, pickup location, and times from the Shuttle → Setup tab

### Staffing Budgets (Position Budgets)
Define budget models per department used to auto-calculate staffing needs from occupancy:

| Model Type | Formula | Best For |
|---|---|---|
| `hours_per_room` | Occupied rooms × hours-per-room | Housekeeping |
| `shifts_per_day` | Shifts × hours-per-shift | Front Desk |
| `fixed_hours` | Set weekly hours regardless of occupancy | Management |

### Facilities Content
Configure which amenities appear in the guest Facilities tab:
- Pool, Hot Tub, Gym, Business Center, Breakfast, Parking, Laundry, Pet-Friendly, Beach Access, etc.
- Each entry: icon emoji + label + hours/details

### Safety Content
Customize the guest Safety tab:
- Emergency message (shown prominently)
- Emergency contacts list (police, fire, poison control, front desk)
- Fire safety checklist items
- CO detection items
- Security protocols

### Google Integrations
- **Google Sheet URL** — Link to a connected Google Sheet for data export
- **Apps Script URL** — Webhook endpoint for Google Apps Script automation
- **Service Account Email** — For server-side Google API access

## Staff Management

### Creating a Staff Account
1. Go to **Staff Management** tab
2. Click **+ Add Staff**
3. Fill in required fields:
   - Full name
   - Role (admin / manager / staff / vendor)
   - Department
   - Email (optional, needed for email login)
4. PIN auto-generates — note and share securely with staff member
5. Click Save

### Editing Permissions
Each staff member has permission flags that override their role defaults:
```
□ orders      — Can see/manage guest requests
□ messages    — Can see/reply to guest messages
□ shuttle     — Can manage shuttle bookings
□ hotel       — Can see property info (read-only for non-admin)
□ staff_mgmt  — Can manage staff (admin-only override)
□ partners    — Can manage vendor partners
□ qrcodes     — Can manage QR codes
□ schedules   — Can manage shift schedules
□ kpi         — Can log KPI values
□ dailybrief  — Can view dashboard summary
```

### Deactivating a Staff Member
1. Find the staff record in Staff Management
2. Toggle the **Active** switch to OFF
3. Their login is immediately blocked
4. Historical data (their assigned requests, messages, shifts) is preserved

### Resetting a PIN
1. Find the staff record
2. Click **Edit**
3. Enter a new 4-digit PIN
4. Save — change is immediate

## QR Code Management

QR codes are how guests access the hotel's digital experience.

### Types of QR Codes

| Type | Destination URL | Placement |
|---|---|---|
| Room QR | `/app?hotel=<slug>&room=<number>` | In-room (bedside, door) |
| Lobby QR | `/app?hotel=<slug>` | Lobby, reception desk |
| Shuttle QR | `/transport?hotel=<slug>` | Shuttle waiting area |
| Restaurant QR | `/nearby?hotel=<slug>` | Dining area, in-room card |
| Custom | Any URL | Flexible use |

### Creating QR Codes
1. Navigate to **QR Codes** tab
2. Click **+ New QR Code**
3. Enter label (e.g., "Room 205"), location type, and URL
4. System generates the QR code image
5. Print at 300 DPI minimum for best scan reliability

**Best Practice:** Print on weather-resistant material (laminate), size 3×3 inches minimum.

---

# 7. MANAGER GUIDE

Managers have access to all operational tabs plus scheduling and forecasting. They cannot change hotel settings or manage staff accounts.

## Daily Workflow — Opening Shift

1. **Check Dashboard** — Review yesterday's metrics, open requests, messages
2. **Review Schedule** — Confirm all staff are scheduled and present
3. **Check Shuttle** — Verify today's runs are configured with capacity
4. **Review Requests** — Clear any overnight pending requests
5. **Check To-Dos** — Confirm position checklists are assigned for the day

## Daily Workflow — Closing Shift

1. **Staff Callouts → Call-Around Log** — Log shift handoff (occupancy, arrivals, departures)
2. **Staff Callouts → Daily Log** — Write narrative notes for next shift
3. **Verify Requests** — Ensure all requests are closed or properly handed off
4. **KPIs** — Log any tracked metrics for the day
5. **Bank Count** (if applicable) — Log cash/card totals in Staff Callouts → Bank Count

## Scheduling Staff

1. Navigate to **Schedules** tab
2. Select the week using the date navigator
3. Click a cell (staff × day) to add a shift:
   - Start time, End time
   - Department
   - Notes (optional)
4. Shifts appear as color-coded blocks by department
5. The **Forecast** data informs how many staff are needed per day
6. Use **Position Budgets** (in Property Settings) to auto-calculate required hours from occupancy

## Forecasting

1. Navigate to **Forecast** tab
2. Select a week using the navigator
3. Enter for each day:
   - Occupancy % (slider or manual entry)
   - Rooms occupied
   - Arrivals
   - Departures
   - Notes
4. Data feeds into scheduling recommendations
5. Historical forecasts are preserved for trend analysis

---

# 8. STAFF GUIDE

## Logging In

**Option A — PIN Login (most common)**
1. Go to `attendaapp.com/staff`
2. Click **Login with PIN**
3. Enter your 4-digit PIN
4. You're in

**Option B — Email / Password**
1. Go to `attendaapp.com/staff`
2. Enter email and password
3. Click **Sign In**

**Forgot PIN?** Contact your manager or admin to reset it.

## Daily Requests (Orders Tab)

This is the primary operational screen. All guest requests appear here in real time.

### Request Card Information
Each card shows:
- Guest name and room number
- Request type (Housekeeping, Food Order, Transport, Maintenance, etc.)
- Details (what the guest asked for)
- Time submitted
- Current status
- Who it's assigned to (if anyone)

### Status Workflow
```
PENDING  ──►  IN PROGRESS  ──►  COMPLETED  ──►  CLOSED
  (New)        (Accepted)        (Done)          (Archived)
```

### Accepting a Request
1. Click the request card
2. Click **Accept** — status changes to IN PROGRESS
3. Your name is auto-assigned
4. Guest receives a notification (if configured)

### Completing a Request
1. Once fulfilled, click **Complete**
2. Status changes to COMPLETED
3. Request moves to completed section

### Notes
- **Never delete requests** — they are your audit trail
- Closed requests can be re-opened if needed
- Filter by status using the filter bar at top

## Messaging Guests

1. Click **Messages** tab
2. Find the guest thread
3. Type your response in the message box
4. Press Enter or click Send
5. Guest sees the reply in real time in their app

**Pro tip:** Use clear, friendly, professional language. Guests can screenshot these.

## KPI Logging

Many hotels track daily metrics (RevPAR, guest score, response time, maintenance calls, etc.).

1. Go to **KPIs** tab
2. Find your assigned metrics
3. Click a metric to log a value
4. Enter today's number
5. Save — the chart auto-updates

## Position To-Dos (Checklists)

Your manager has set up position-based checklists. These are your daily task lists.

1. Go to **To-Dos** tab
2. Your assigned position template appears
3. Check off items as you complete them
4. Some items require text input or number entry
5. Complete all items before end of shift

---

# 9. VENDOR / PARTNER GUIDE

## Getting Started

Every vendor receives:
- A unique URL: `attendaapp.com/partner?restaurant=<your-id>`
- A 4-digit PIN for secure access
- (Recommended) This URL as a QR code on their iPad for easy access

## Logging In

1. Open your Partner Dashboard URL on your iPad
2. Enter your 4-digit PIN using the on-screen numpad
3. Tap **Sign In**
4. You're in — the dashboard auto-selects your category (restaurant, transport, service, etc.)

## The Kanban Board (Orders Tab)

Your orders appear in a 4-column board:

```
🔴 NEW          🟡 RECEIVED      🔵 PREPARING     🟢 READY
─────────────  ──────────────   ─────────────    ──────────
New requests   You've accepted  Active work      Fulfilled
waiting        the order        in progress      & done

[Accept]       [Start Work]     [Mark Ready]     ──────────
```

### Order Card Details
Each card shows:
- Room number (large, prominently)
- Guest name
- What was ordered / requested
- Time since submitted
- Your payout for this order

### Advancing an Order

**For Restaurants:**
1. New order arrives (card turns red, alert sounds) → tap **Accept Order**
2. Start cooking → tap **Start Cooking**
3. Ready for pickup/delivery → tap **Mark Ready**
4. Driver collects and delivers

**For Transport Companies:**
1. New ride request → tap **Accept Ride**
2. Driver dispatched → tap **Driver En Route**
3. Arrived at pickup → tap **Mark Arrived**

**For Services (Spa, Cleaning, etc.):**
1. New booking → tap **Confirm Booking**
2. Work begins → tap **Start Service**
3. Done → tap **Mark Complete**

**For Tours & Experiences:**
1. New reservation → tap **Confirm**
2. Guest arrives → tap **Guest Arrived**
3. Tour ends → tap **Mark Done**

## Menu & Pricing Tab

View all your menu items and prices as guests see them. These are managed by the hotel admin — contact them to:
- Add new items
- Update prices
- Deactivate seasonal items
- Add descriptions/photos

## Business Info Tab

View your profile as guests see it in the Nearby section:
- Business name
- Category (restaurant / transport / service / experience)
- Phone, email, address, hours
- Description
- Attenda fee percentage (your commission rate)

## Your Payout

Every order card shows:
- **Total amount** — what the guest paid
- **Your payout** — what you receive (total × your commission rate)

**Default split:** 90% to vendor, 10% to Attenda platform fee.

Example — $50 food order:
- Guest pays: $50.00
- Your payout: $45.00
- Attenda fee: $5.00

Payouts are settled at end of each period (weekly or monthly, per your agreement).

## Real-Time Alerts

When a new order arrives:
- The order card appears in the 🔴 New column
- A red **"NEW ORDER"** banner bounces in the header
- An audio alert sounds (ensure iPad volume is on)
- The tab badge shows the count

**Never miss an order:** Keep the iPad plugged in and awake. Use Auto-Lock: Never in iPad settings.

---

# 10. GUEST EXPERIENCE GUIDE

## How Guests Access Attenda

**Method 1 — QR Code (Primary)**
1. Guest scans QR code in their room
2. Browser opens automatically
3. Guest enters their name (no account needed)
4. Full experience unlocks

**Method 2 — Direct URL**
1. Front desk provides: `attendaapp.com/app?hotel=<slug>&room=<room>`
2. Guest opens in any browser
3. Same experience

**No app download required. Works on any smartphone, tablet, or computer.**

## Guest Onboarding Flow

```
1. Scan QR or open URL
2. Enter first name (auto-validates against check-in records)
3. Select room number (or pre-filled from URL)
4. Welcome screen loads instantly
5. Session saved for their entire stay
```

## The Guest App — 5 Core Sections

### Welcome Tab
- Personalized greeting using manager name
- Welcome letter (hotel-configured)
- Team photo
- Key info (checkout time, WiFi, front desk phone)

### Transport Tab
- Today's shuttle runs with times and capacity
- Book a seat in a scheduled run
- Request a custom ride (destination, date, time, passenger count)
- Pricing displayed where applicable (free if hotel offers complimentary shuttle)

### Facilities Tab
- WiFi name and password (tap to copy)
- Full amenities list with hours
- (Pool, Gym, Business Center, Breakfast, Parking, Laundry, etc.)

### Message Tab
- Real-time chat with front desk
- Message history preserved for the stay
- AI-assisted routing for common requests
- Requests can be auto-generated from chat (e.g., typing "I need towels" creates a towel request)

### Nearby Tab
- Directory of partner restaurants, activities, services
- Distance from hotel, ratings, hours, phone
- Delivery partners show **Order Now** button
- Tap partner → view menu → add to cart → place order
- Order appears on vendor's iPad instantly

## The Review Experience

After check-out, guests see the review screen:
1. 5-star rating prompt
2. 4-5 stars → directed to Google/TripAdvisor/Yelp to leave a public review
3. 1-3 stars → internal feedback form (hotel receives alert — no public review encouraged)
4. Hotel admin sees all ratings in real time

**This is the review funnel** — it increases public positive reviews and captures negative feedback privately.

---

# 11. MODULE DEEP-DIVES

## 11.1 Daily Brief (Dashboard)

**Purpose:** Shift summary view — what happened, what's happening, what needs attention.

**Sections:**
- **Open Requests** — count of unresolved guest requests
- **Unread Messages** — pending guest chat messages
- **Shuttle Bookings** — seats booked today
- **Occupancy** — today's percentage from forecast
- **Checklist Completion** — % of position to-dos completed today
- **Cruise Schedules** — if configured, shows ship arrivals/departures

**When to Use:** First thing every shift. All leads/managers should review before touching any other tab.

## 11.2 Requests (OrdersView)

**Purpose:** Live incoming guest service request management.

**Request Types:**
- Housekeeping (towels, cleaning, amenities)
- Maintenance (AC, TV, plumbing)
- Food Order (from restaurant partner)
- Transport / Shuttle
- Front Desk Request (late checkout, key card, package)
- Guest Message (from AI chat routing)
- Custom (any free-text request)

**Key Features:**
- Real-time updates via WebSocket — no refresh needed
- Status filter bar (All / Pending / In Progress / Completed)
- Assignment — tap to assign to any active staff member
- Request age indicator — color changes as time passes (fresh → delayed → overdue)
- One-click status progression

**SOP for Requests:** See Section 16.1

## 11.3 Messages

**Purpose:** Two-way real-time chat between guests and hotel staff.

**Features:**
- Threaded conversations per guest-room combination
- Staff see all threads in a unified inbox
- AI-assisted: if guest types a common request, a request card is auto-created
- Message history preserved for entire stay
- Staff can see room number and checkout date in each thread header

**Best Practice:** Respond within 5 minutes. Set response time as a KPI target.

## 11.4 Schedules

**Purpose:** Weekly staff shift management.

**Grid Layout:**
- Rows: all active staff members
- Columns: days of the week (Mon–Sun or Sun–Sat depending on hotel setting)
- Cells: shift blocks with start/end time, department color

**Creating a Shift:**
1. Click any empty cell
2. Select staff member (or already filtered by row)
3. Set start time, end time
4. Choose department
5. Add optional notes
6. Save

**Editing / Deleting:**
- Click existing shift block to edit or delete
- Drag to different day (if supported by browser)

**Schedule Change Requests:**
Staff can submit a request to swap shifts — appears in manager's inbox.

**Integration with Budgets:**
Position budget models (from Property Settings) calculate required hours per department per day from forecast occupancy. The schedule view shows a "suggested hours" indicator to help managers hit budget.

## 11.5 KPIs

**Purpose:** Track any quantitative metric the hotel cares about.

**Metric Types:**
- Daily (logged once per day)
- Weekly (logged once per week)
- Monthly (logged once per month)

**Common Hotel KPIs:**
- RevPAR (Revenue Per Available Room)
- ADR (Average Daily Rate)
- Occupancy %
- Guest Score (1–10 from internal review)
- Response Time (minutes from request to acceptance)
- Maintenance Calls
- Shuttle Rides Given
- Restaurant Orders

**Creating a KPI:**
1. Go to KPIs tab
2. Click + Add KPI
3. Name, unit (%, $, #, minutes), frequency, target value
4. Save — logging screen appears

**Charts:** Auto-generated bar/line charts for each KPI showing trends over time.

## 11.6 Right Answers (Knowledge Base)

**Purpose:** Build a database of answers to common guest questions. Used by staff and the AI chat assistant to respond accurately.

**Entry Structure:**
- Category (check-in, dining, transportation, amenities, local, policies)
- Question
- Answer
- Keywords (for AI matching)
- Source URL (optional)

**Use Cases:**
- Staff reference for consistent guest communication
- AI in the guest chat app uses this to auto-answer: "What time does the pool close?" → auto-responds from knowledge base
- Reduces phone calls to front desk

**SOP:** Review and update the knowledge base monthly. Add entries for any question front desk receives more than twice.

## 11.7 Learning & HR

**Purpose:** Staff training, onboarding courses, HR document library.

**Courses:**
- Multi-module structure
- Each module has lessons (text, video links)
- Optional quizzes per module
- Completion tracking per staff member
- Manager can see completion percentage across team

**HR Documents:**
- Employee Handbook
- Service Standards
- Emergency Protocols
- Policy documents
- Attach PDFs or link to external docs

**Use Cases:**
- New hire onboarding — assign courses day 1
- Certification tracking (food safety, CPR)
- Policy updates — upload new version, staff must confirm read

## 11.8 Compset (Competitive Rate Shopping)

**Purpose:** Track competitor hotel rates daily for RevPAR strategy.

**Setup:**
1. Add competitor hotels (name, phone, number of rooms)
2. Add call times (e.g., "Breakfast Call 8:00 AM", "Afternoon Call 2:00 PM")
3. Each call time corresponds to a rate check window

**Daily Usage:**
1. Call each competitor at the configured times
2. Log: rate, rooms available, occupancy %
3. Data auto-calculates rooms sold, tracks trends

**Analytics:**
- Day-over-day rate comparison
- Occupancy % benchmarking
- Historical export (via linked Google Sheet if configured)

**Navigation:** Use the date navigator to go back and edit previous days' entries.

## 11.9 Position To-Dos

**Purpose:** Standardized daily checklists per job role — ensures nothing gets missed.

**Template Types:**
- Management
- Front Desk
- Housekeeping
- Maintenance
- Security
- Driver

**Item Types:**

| Type | Description | Example |
|---|---|---|
| `checkbox` | Simple check-off | "Lock the side entrance" |
| `number` | Enter a number | "How many walk-ins today?" |
| `text` | Free text entry | "Describe any incidents" |
| `time` | Time entry | "What time did last guest check out?" |
| `kpi_field` | Logs to KPI system | "Log today's occupancy %" |
| `action_link` | URL to external system | "Open PMS system" |
| `room_move` | Log a room change | "Guest moved from 105 to 202" |
| `no_show` | Log a no-show | "Reservation for Smith was no-show" |
| `bank_count` | Cash drawer count | "End of shift cash: $XXX" |

**Creating Templates (Admin Only):**
1. Go to To-Dos tab
2. Click + New Template
3. Select assigned role/department
4. Add items with types
5. Set active = true

**Daily Flow for Staff:**
1. Start of shift — To-Dos tab shows your checklist
2. Complete items in order
3. Mark complete when done
4. Manager can see your completion status in real time

## 11.10 Staff Callouts (Operational Logs)

**Purpose:** Audit trail of operational events across all shifts.

**Tool Types:**

### Call-Around Log
Shift handoff documentation:
- Date, shift (AM/PM/Night)
- Handed off by / received by (staff names)
- Occupancy %, arrivals, departures
- Notes
- Used for morning briefings and management reports

### Daily Log
Free-form narrative log:
- Date, shift, author
- Category (operations, guest, maintenance, incident, etc.)
- Content (open text)
- Searchable history

### No-Show Tracker
Log guests who had reservations but didn't arrive:
- Date, guest name, room assigned, reservation reference
- Reason (if known)
- Notes
- Used for PMS reconciliation and revenue tracking

### Room Move Log
Audit trail for room changes:
- Guest name, from-room, to-room
- Date and reason
- Initiated by (staff name)
- Notes

### Bank Count (End-of-Shift Cash Reconciliation)
- Date, shift, counted by
- Cash total, card total, room charges
- Any discrepancies
- Notes

---

# 12. SHUTTLE OPERATIONS MANUAL

## Overview

The Attenda Shuttle module manages all ground transportation for guests — scheduled hotel shuttles, on-demand ride requests, and partner transport vendors.

## Setting Up a Schedule

### Quick Setup (Schedule Wizard)
1. Go to **Shuttle** tab → **Setup** (admin only)
2. Fill in the wizard:
   - **Schedule Name** — "Hotel Shuttle", "Airport Run", "Cruise Port Shuttle"
   - **Type** — General / Airport / Cruise Port
   - **Start Time** — e.g., 6:00 AM
   - **End Time** — e.g., 11:00 PM
   - **Every** — 30 min / 1 hour / 90 min / 2 hours
   - **Days of Week** — toggle each day (tap All to select all)
   - **Capacity** — passengers per run (0 = unlimited)
   - **Price** — per person (0 = complimentary)
   - **Vendor** — link a transport partner (optional)
3. Review the **Preview**: "18 slots · 6:00am to 11:00pm · every 1hr · 7 days/week"
4. Click **🚐 Generate Schedule**
5. All slots appear instantly in Today's Runs

### Managing Existing Schedules
- Existing schedules appear below the wizard in **Active Schedules**
- Delete individual time slots using the ×  next to each time chip
- Delete an entire route (all slots) using the trash icon
- Regenerate any time by running the wizard again

## Daily Shuttle Operations

### Today's Runs (Main Tab)
- Shows all scheduled runs for today in chronological order
- Each run card shows: time, route name, current bookings vs capacity, capacity bar

### Adding a Guest to a Run
1. Click any run to expand it
2. See current passenger manifest
3. Click **Add Guest**
4. Enter: name, room number, passenger count, notes (flight #, etc.)
5. Guest is added to the manifest instantly
6. Capacity bar updates

### The Guest Manifest
Expanded view shows all bookings for that run:
- Guest name
- Room number
- Passenger count
- Special notes

### Canceling a Booking
- Click ×  next to any guest in the manifest
- Capacity is restored automatically

## On-Demand Requests (Custom Ride)

For guests who need transport outside the schedule:

1. Go to **Runs** tab → **Custom Ride Request** section (bottom)
2. Fill in:
   - Guest name and room number
   - Destination (e.g., "Miami International Airport — Terminal D")
   - Date and time needed
   - Passenger count
   - Notes (luggage count, flight number, etc.)
3. Submit — request appears in **Requests** tab

### Handling Requests (Requests Tab)
Staff see all on-demand requests with status flow:
- **Pending** → click **Assign Driver** to move to assigned
- **Assigned** → click **Mark En Route** when driver departs
- **En Route** → click **Complete** upon return

## Linking a Transport Vendor

If you have a transport company partner in the system:
1. Go to **Shuttle → Setup**
2. Select vendor from the **Transport Vendor** dropdown
3. Save the schedule

**Effect:** The linked vendor will see all ride requests and scheduled bookings on their Partner Dashboard under their Transport category. They manage their side (Accept → En Route → Arrived).

## Guest-Side Shuttle Booking

Guests access the transport section from the QR code app:
1. Open guest app → **Transport** tab
2. View today's available runs with times and available seats
3. Tap a run to book it:
   - Name pre-filled from their session
   - Select number of passengers
   - Add notes (optional)
   - Confirm
4. Booking appears on staff shuttle screen instantly

Or:
- Tap **Request Custom Ride** for anything outside the schedule

## Bouncie Fleet Tracking (Integration)

If your hotel has connected Bouncie:
- Live vehicle location appears on the shuttle screen
- See driver's real-time GPS position
- Trip history for each vehicle
- Auto-alerts when vehicle enters/exits configured zones

See Section 15.1 for Bouncie setup.

---

# 13. PARTNER & VENDOR NETWORK

## The Attenda Partner Model

Attenda connects hotel guests with local businesses through a curated, hotel-managed directory. There are four partner categories:

| Category | Examples | Commission | Dashboard Type |
|---|---|---|---|
| **Restaurant** | Hotel restaurant, nearby café, delivery partner | 10% | Kitchen Kanban |
| **Transport** | Taxi company, car service, shuttle vendor | 10% | Dispatch Board |
| **Service** | Spa, dry cleaning, laundry, massage | 0% (platform access fee) | Service Board |
| **Experience** | Tours, boat trips, attractions, activities | 10% | Experience Board |

## Setting Up a Partner

**Go to: Staff Dashboard → Partners & Menu**

1. Click **+ Add Partner**
2. Fill in:
   - Business name
   - Category (restaurant / transport / service / experience)
   - Description
   - Phone, email, address, hours
   - Rating (manual entry)
   - Distance from hotel
   - Image URL (partner logo or photo)
   - Attenda fee % (default 10%, negotiable)
   - Hotel revenue share % (optional — hotel's cut from Attenda's portion)
3. Toggle **Has Ordering** → ON if this vendor will receive orders via Attenda
4. **PIN Code** — set a 4-digit PIN the vendor uses to log into their dashboard
5. Save

### Google Places Auto-Sync
If the partner is on Google Maps:
1. Paste their Google Place ID in the field
2. Click **Sync from Google**
3. Distance, rating, and basic info auto-populate

## Managing Menu Items

For vendors with ordering enabled:

1. Click the partner in the list
2. Scroll to **Menu Items** section
3. Click **+ Add Item**
4. Enter: name, description, price
5. Toggle active/inactive per item
6. Guests will see these items when browsing the partner

**Pricing tips:**
- Set prices inclusive of any packaging/delivery fees
- Prices are displayed as-is to guests; Attenda fee is deducted on the backend, not shown to guest

## Partner Tiers

**Tier A — External Delivery (No Attenda Ordering)**
- Partner has their own delivery app (DoorDash, Uber Eats, etc.)
- Add their delivery platform links in the **Delivery Providers** field
- Guest sees: restaurant card + "Order on DoorDash / Uber Eats" buttons
- No commission for Attenda

**Tier B — Attenda-Powered Ordering**
- Toggle `has_ordering: true`
- Guest orders through Attenda app
- Order routes to vendor's partner dashboard instantly
- 10% commission applied automatically
- Attenda provides driver coordination

## Giving a Vendor Their Dashboard Access

1. Set up the partner in Partners & Menu
2. Set their PIN code
3. Provide them with their unique URL:
   `attendaapp.com/partner?restaurant=<partner-id>`
   (Find the partner ID by clicking their record in the list)
4. Optionally: generate a QR code from this URL and print it for their iPad

**Recommended setup for vendor iPad:**
- Add URL to Home Screen (Safari → Share → Add to Home Screen)
- Set Auto-Lock to Never
- Keep plugged in

## Partner Application Flow

Vendors interested in joining Attenda's network can apply at:
`attendaapp.com/partner`

They select their type (restaurant / service / experience / brand), fill in the application form, and the request lands in `partner_applications` table. Attenda team reviews and manually onboards approved partners.

---

# 14. FINANCIAL MODEL & REVENUE SHARING

## Attenda Fee Structure

### Standard Commission Rates

| Partner Type | Attenda Fee | Vendor Receives | Notes |
|---|---|---|---|
| Restaurant | 10% | 90% of order value | Attenda provides driver |
| Experience | 10% | 90% of booking price | |
| Service | 0–5% | 95–100% | Negotiated per partner |
| Transport | 10% | 90% of ride price | |

### Credit Card Processing
- **3%** additional fee for credit card transactions
- 0% for debit/prepaid
- Processing fee is separate from Attenda commission

### Example Transaction — $100 Restaurant Order

```
Guest pays:               $100.00
─────────────────────────────────
Attenda commission (10%): - $10.00
Credit card fee (3%):     - $ 3.00
─────────────────────────────────
Vendor receives:          $ 87.00

Of Attenda's $10:
  Hotel revenue share:    $ 5.00 (if 5% configured)
  Attenda net:            $ 5.00
```

### Configuring Rates Per Partner

In Partners & Menu:
- `attenda_fee_percent` — Attenda's commission (default 10%, adjustable)
- `hotel_revenue_share_percent` — Hotel's cut from Attenda's portion (optional)

These fields are per-partner, allowing flexible commercial arrangements.

## Vendor Payout Tracking

Every order record stores:
- `total_amount` — what the guest was charged
- `vendor_payout` — vendor's share (calculated at time of order)

This creates an immutable record of every transaction for accounting purposes.

## Future: Stripe Integration (Roadmap)

When Stripe is integrated:
- Guests pay at checkout with card on file
- Automatic split payout to vendor Stripe accounts
- Hotel receives their revenue share automatically
- Attenda retains commission
- Full reconciliation report available in Super Admin

## Shuttle Revenue Model

| Config | Guest Experience | Revenue |
|---|---|---|
| `has_free_shuttle: true` | Complimentary, no payment required | Hotel absorbs cost |
| Route price = $0 | Free rides, booked without payment | No revenue |
| Route price = $X | Guest pays per seat | Attenda processes payment (roadmap) |

---

# 15. INTEGRATIONS GUIDE

## 15.1 Bouncie Fleet Tracking

**What it does:** Real-time GPS tracking of your hotel's shuttle vehicle(s) inside the Attenda dashboard.

**Setup Steps:**
1. Create a Bouncie account at bouncie.com
2. Connect your vehicle(s) to Bouncie (OBD-II dongle installed in vehicle)
3. In Attenda Staff Dashboard → Property Settings, find **Bouncie**
4. Click **Connect Bouncie**
5. You're redirected to Bouncie's OAuth page
6. Log in and authorize Attenda
7. Redirected back — vehicle list appears

**Features after connection:**
- Live map of vehicle location in Shuttle tab
- Trip history (when vehicle left, route taken, return time)
- Geofence alerts (vehicle entering/leaving hotel property)
- Speed and odometer data

**Troubleshooting Bouncie:**
- If tracking stops: token may have expired. Re-authorize in Property Settings
- Vehicle offline: check OBD-II dongle is plugged in and car has cellular signal
- Wrong vehicle showing: verify Bouncie account has the correct vehicle registered

## 15.2 Google Places Sync

**What it does:** Auto-populates partner data (name, rating, address, phone, hours) from Google Business.

**Setup per Partner:**
1. Search the business on Google Maps
2. Find the Place ID in the URL or via Google Places API
3. Paste Place ID in the partner's **Google Place ID** field
4. Click **Sync from Google**
5. Fields auto-populate from Google's database

**What syncs:** Name, address, phone, rating, hours, photos

**Frequency:** Manual — re-sync anytime by clicking Sync again

## 15.3 Google Sheets Export (Data Bridge)

**What it does:** Sends operational data from Attenda to a hotel's Google Sheet for custom reporting.

**Setup:**
1. Create a Google Sheet for the hotel
2. Deploy a Google Apps Script (provided by Attenda) as a web app
3. In Property Settings, paste:
   - Google Sheet URL
   - Apps Script URL
   - Service Account Email
4. Data flows on trigger (on schedule creation, KPI log, etc.)

**Use Cases:**
- Custom RevPAR dashboards in Google Sheets
- Payroll export from schedules
- OTA channel rate comparison

## 15.4 Email (Resend)

**What it does:** Sends all transactional emails on Attenda's behalf.

**Sender address:** noreply@attendaapp.com
**From name:** Attenda | [Hotel Name]

**Emails are triggered automatically** — no setup required. Just ensure the hotel's `notification_email` is correct in Property Settings.

See Section 17 for complete email reference.

## 15.5 QR Code System

**What it does:** Generates guest-access QR codes that link directly to a room's digital experience.

**URL Format:**
```
https://attendaapp.com/app?hotel=<hotel-slug>&room=<room-number>
```

**Implementation options:**

| Option | Description | Best For |
|---|---|---|
| In-room card | Printed card with QR + instructions | Standard hotel rooms |
| Door hanger | QR on a door-hanger for discrete placement | Boutique hotels |
| Welcome binder | QR in existing hotel binder/folder | Upscale properties |
| TV screen | QR displayed on in-room TV welcome screen | Modern properties |
| Lobby kiosk | Large format lobby QR | Hotel check-in areas |
| Elevator | QR posters in elevator | High-traffic placement |

**Print specifications:**
- Minimum size: 2.5 × 2.5 inches
- DPI: 300 minimum
- File format: SVG or high-res PNG
- Include: hotel logo, brief instruction ("Scan for hotel services")
- Laminate for longevity

## 15.6 WhatsApp (Roadmap)

**Planned functionality:**
- Automatic WhatsApp message on check-in with guest app link
- Request status updates via WhatsApp
- Two-way messaging (guest WhatsApp ↔ staff dashboard)

**Estimated availability:** Q3 2025

## 15.7 Stripe (Roadmap)

**Planned functionality:**
- Guest card-on-file for seamless payment
- Charge-to-room integration
- Automatic vendor payout splits
- Attenda commission auto-capture
- Full reconciliation dashboard

**Estimated availability:** Q4 2025

## 15.8 Clover POS (Roadmap)

**Planned functionality:**
- Sync Attenda orders to hotel's Clover POS
- Room charge posting via Clover
- Inventory sync for restaurant menu items
- Settlement integration for nightly close

---

# 16. STANDARD OPERATING PROCEDURES (SOPs)

## 16.1 SOP — Guest Request Handling

**Trigger:** Guest submits a request via QR code app or front desk manually creates one

**Response Time Standards:**
| Request Type | Target Response | Target Resolution |
|---|---|---|
| Housekeeping (towels, amenity) | < 5 minutes | < 20 minutes |
| Maintenance (urgent) | < 5 minutes | < 2 hours |
| Maintenance (non-urgent) | < 30 minutes | Same day |
| Food Order | < 2 minutes (vendor accept) | Per vendor ETA |
| Transport / Shuttle | Immediate confirmation | Per schedule |
| Front Desk Request | < 5 minutes | Same shift |

**Procedure:**
1. New request appears in Requests tab (sound + visual alert)
2. Staff clicks the request card within **5 minutes**
3. Click **Accept** — request becomes IN PROGRESS, staff name assigned
4. Complete the task physically
5. Return to app — click **Complete**
6. If unable to complete this shift: add note, update status to reflect true state
7. Never leave requests in PENDING for > 30 minutes without acknowledgement

**Escalation:**
- If a request cannot be fulfilled within standard time: call the guest room directly
- Log reason in request notes
- Notify supervisor

## 16.2 SOP — Guest Messaging Protocol

**Standards:**
- All messages responded to within **5 minutes**
- Professional, warm, solution-oriented language
- Never promise what you cannot deliver
- Grammar and spelling checked before sending

**Message Templates:**

*Acknowledgement:*
> "Hi [Name]! We received your message and are on it right now. We'll have someone with you shortly! 😊"

*Completion:*
> "Done! Your [request] has been taken care of. Is there anything else we can help you with?"

*Delay notice:*
> "Hi [Name], we wanted to let you know there's a brief wait on your [request]. It will be with you within [time]. Thank you for your patience!"

*After hours:*
> "Hi [Name], our team is currently handling overnight operations. We'll have your [request] addressed by [time]. If urgent, please call the front desk at [number]."

## 16.3 SOP — Shuttle Operations

**Pre-Shift (30 minutes before first run):**
1. Confirm vehicle is fueled and operational
2. Check today's runs in Shuttle tab
3. Verify all bookings and passenger manifests
4. Ensure driver has hotel's phone number
5. Check weather — adjust run times if needed

**Per Run:**
1. 10 minutes before departure: contact booked guests if they haven't appeared
2. Depart on time — late departure affects downstream runs
3. Log any no-shows in the manifest
4. Return time: update request to Complete

**Capacity Management:**
- If a run is FULL: direct additional guests to next available run
- Never overload vehicle beyond rated capacity
- Keep at least 1 seat reserved per run if hotel policy requires

**Emergency Protocol:**
1. If vehicle breaks down: call front desk immediately
2. Contact booked guests by phone (front desk has guest contact list)
3. Arrange alternative transport (rideshare, partner transport vendor)
4. Log incident in Staff Callouts → Daily Log

## 16.4 SOP — Vendor / Partner Order Management

**For Hotel Staff:**
1. Monitor the vendor's order status from the Requests tab
2. If vendor is not responding to a new order after **10 minutes**: call them directly
3. If vendor is unable to fulfill: update request status to CLOSED with note, notify guest
4. Coordinate driver pickup when vendor marks order READY

**For Vendors:**
1. iPad must be plugged in and screen on at all times during business hours
2. Accept every order within **3 minutes** of receiving
3. Set realistic preparation time (use notes field on order card if needed)
4. If unable to fulfill: call hotel front desk immediately — do not just ignore the order
5. Mark READY only when order is fully prepared and packaged

## 16.5 SOP — End-of-Day / Shift Handoff

**Outgoing shift responsibilities:**

```
□ All open requests resolved or status updated with notes
□ Guest messages checked and replied to
□ Call-Around Log completed (Staff Callouts)
□ Daily Log written (shift summary)
□ Position To-Dos checklist completed and submitted
□ Bank Count completed (if cash-handling role)
□ Any no-shows or room moves logged
□ Inform incoming shift of any pending issues verbally
□ KPIs logged for the day
```

**The Call-Around Log must be completed** by all shift leads. This is the official record of property status at shift change.

## 16.6 SOP — New Staff Onboarding

**Day 1:**
1. Create staff account in Staff Management (admin)
2. Set role, department, PIN
3. Share login credentials securely
4. Have staff log in and verify access

**First Week:**
1. Assign onboarding course in Learning & HR tab
2. Review which tabs they have access to
3. Shadow existing staff on request handling
4. Review messaging templates and standards
5. Complete all assigned To-Do checklists during shift

**First Month:**
1. Complete all assigned training courses
2. Verify KPI logging is happening correctly
3. Review any guest feedback involving their requests
4. Manager check-in on system usage

## 16.7 SOP — Monthly Admin Review

**First Monday of each month:**

```
□ Review all KPI trends from previous month
□ Review staff schedule adherence
□ Check partner/vendor performance (order counts, response times)
□ Update Knowledge Base with any new FAQs from guest messages
□ Review Compset data for rate strategy
□ Audit staff accounts — deactivate any former employees
□ Verify QR codes in all rooms are functional (random sample test)
□ Check email notification settings (notification_email still current)
□ Review review funnel — track public review volume
□ Plan next month's schedule template
```

## 16.8 SOP — Guest Complaint Escalation

**Priority Classification:**

| Level | Example | Response |
|---|---|---|
| P1 — Critical | Safety issue, medical, security | Immediate — call emergency services + manager |
| P2 — Urgent | Room not cleaned, broken AC, noise | < 30 minutes resolution |
| P3 — Standard | Missing amenity, request delay | Same shift |
| P4 — Low | WiFi issue, question about area | Next available |

**Attenda Tools for Complaint Management:**
- Log all complaints as requests with type "Complaint"
- Use Daily Log to narrative-document any serious incidents
- Review platform: 1-3 star reviews capture dissatisfaction before it goes public
- Flag patterns: if same request type appears repeatedly, it's a systemic issue

---

# 17. EMAIL NOTIFICATION REFERENCE

## All Emails Attenda Sends Automatically

| Trigger | Recipients | Subject | Content |
|---|---|---|---|
| New property onboarded | Hotel admin | "Welcome to Attenda — Your Property is Live!" | Guest URL, Staff URL, default PIN |
| Guest submits request | Hotel notification_email | "New Guest Request — [Hotel Name]" | Guest name, room, request type, details |
| Guest sends message | Hotel notification_email | "New Message from Guest — Room [X]" | Guest name, room, message body |
| Request assigned | Assigned staff member's email | "Request Assigned to You" | Request details, guest info |
| Food order placed | Hotel notification_email + vendor email | "New Food Order — [Hotel Name]" | Guest name, room, items, total amount |

## Email Configuration

**Ensure your notification_email is:**
- A monitored mailbox (not a personal email that goes unread)
- Set in Property Settings → Notification Email
- Tested: submit a test request and verify you receive the email

**Common Issue:** If emails are going to spam, whitelist: `noreply@attendaapp.com`

## Email Provider

Attenda uses **Resend** for transactional emails:
- Delivery reliability: 99.9%
- Bounce handling: automatic
- Suppression list: managed automatically

---

# 18. TROUBLESHOOTING & FAQS

## Staff Login Issues

**Q: I forgot my PIN**
A: Contact your hotel admin. They can view or reset your PIN in Staff Management.

**Q: My email login isn't working**
A: Go to `attendaapp.com/staff/reset-password` and reset via email link. Check spam folder.

**Q: I can see some tabs but not others**
A: Your role and permissions determine tab access. Contact your admin if you need additional access.

**Q: I logged in but the dashboard looks empty**
A: You may be logged into the wrong hotel context. Check the hotel name shown in the header. Your admin can verify your `hotel_id` assignment.

## Request Issues

**Q: Requests are not updating in real time**
A: Check internet connection. Try refreshing the page. Real-time updates require a stable WebSocket connection.

**Q: A request disappeared**
A: It may have been marked CLOSED by another staff member. Use the filter to show "All" statuses.

**Q: I can't delete a request**
A: Only Admin and higher roles can delete requests. Staff can only complete them.

## Shuttle Issues

**Q: No runs appear in Today's Runs**
A: The schedule may not include today's day of the week, or no schedule has been created. Admin: go to Setup tab to create a schedule.

**Q: A guest wants to book a run but it shows FULL**
A: Check if there are later runs with capacity. If not, use the Custom Ride Request form at the bottom of the Runs tab.

**Q: Bouncie tracking isn't showing**
A: Re-authorize Bouncie in Property Settings. The vehicle must be running for GPS to transmit.

## Vendor/Partner Issues

**Q: Vendor is not receiving orders**
A: Check that the vendor's `partner_id` is correctly set. Verify the order was placed from the Nearby → partner's page (not from chat/general request). The vendor must log into their dashboard to see orders.

**Q: Vendor forgot their PIN**
A: Admin resets it in Partners & Menu → edit partner → change PIN Code.

**Q: Menu items not showing in guest app**
A: Verify items are toggled `is_active: true` in the menu items list.

## Guest App Issues

**Q: Guest can't access the app (QR code not working)**
A: Test the URL manually by opening it in a browser. Verify the hotel slug in the URL matches the hotel's slug in Property Settings.

**Q: Guest session expired**
A: Guest sessions are stored in `localStorage`. If they cleared browser data or switched browsers, they need to re-enter their name. The QR code link pre-fills the room number.

**Q: Guest says they submitted a request but staff can't see it**
A: Check that the guest's session `hotel_id` matches the correct hotel. Also check the filter on the Requests tab — it may be filtered to only show certain statuses.

## Email Issues

**Q: Not receiving guest request emails**
A: 1) Check spam folder. 2) Verify notification_email in Property Settings. 3) Test by submitting a request yourself.

**Q: Getting too many emails**
A: Emails are sent per-event. If volume is high, it means request volume is high. Consider setting up email filters/folders for Attenda notifications.

---

# 19. DATABASE SCHEMA REFERENCE

## Core Tables

### hotels
Primary table — one row per property.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key (hotel_id used everywhere) |
| slug | text (unique) | URL-safe identifier (e.g., "sands84") |
| name | text | Display name |
| address | text | Full address |
| brand | text | Property type |
| room_count | integer | Total rooms |
| is_active | boolean | Platform access toggle |
| notification_email | text | Alert recipient |
| brand_color | text | Hex color (e.g., "#0D4C92") |
| wifi_name | text | Guest WiFi SSID |
| wifi_password | text | Guest WiFi password |
| welcome_letter | text | Welcome message content |
| manager_name | text | GM's name |
| team_photo_url | text | Staff photo URL |
| front_desk_phone | text | Click-to-call phone |
| google_review_url | text | Google Reviews link |
| tripadvisor_url | text | TripAdvisor link |
| yelp_url | text | Yelp link |
| week_starts_on | text | "Sunday" or "Monday" |
| position_budgets | jsonb | Array of PositionBudget objects |
| facilities_content | jsonb | Amenity list |
| safety_content | jsonb | Emergency info |
| created_at | timestamptz | Creation timestamp |

### staff_accounts
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| hotel_id | uuid | Foreign key → hotels |
| name | text | Full name |
| role | text | admin / manager / staff / vendor / superadmin |
| email | text | Login email (optional) |
| pin_code | text | 4-digit PIN |
| active | boolean | Login allowed |
| department | text | front_desk / housekeeping / maintenance / etc. |
| vendor_type | text | shuttle / taxi / restaurant (for vendor role) |
| permissions | text[] | Permission flag array |
| hire_date | date | Employment start |
| employment_type | text | full_time / part_time / contractor |
| min_hours | integer | Minimum weekly hours |

### requests
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| hotel_id | uuid | Foreign key → hotels |
| guest_name | text | Who requested |
| room | text | Room number |
| type | text | Request category |
| details | text | Full description |
| status | text | pending / in-progress / completed / closed |
| assigned_to | text | Staff member name |
| partner_id | uuid | Foreign key → partners (for food orders) |
| vendor_status | text | new / received / preparing / ready |
| total_amount | numeric | Charged amount |
| vendor_payout | numeric | Vendor's share (total × 0.9) |
| created_at | timestamptz | When submitted |

### partners
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| hotel_id | uuid | Foreign key → hotels |
| name | text | Business name |
| category | text | restaurant / transport / service / experience |
| description | text | Business description |
| phone | text | Business phone |
| email | text | Notification email |
| address | text | Physical address |
| hours | text | Operating hours |
| distance | text | Distance from hotel |
| rating | numeric | Star rating |
| has_ordering | boolean | Attenda ordering enabled |
| is_active | boolean | Show in guest app |
| pin_code | text | 4-digit dashboard login PIN |
| attenda_fee_percent | numeric | Commission rate (default 10) |
| hotel_revenue_share_percent | numeric | Hotel's cut from Attenda's share |
| delivery_providers | jsonb | External delivery links |
| google_place_id | text | Google Maps Place ID |

### shuttle_routes
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| hotel_id | uuid | Foreign key → hotels |
| name | text | Route display name |
| type | text | airport / cruise / custom |
| price | numeric | Per-person price (0 = free) |
| active | boolean | Show in guest app |

### shuttle_slots
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| route_id | uuid | Foreign key → shuttle_routes |
| hotel_id | uuid | Foreign key → hotels |
| departure_time | time | HH:MM format |
| days_of_week | integer[] | [0=Sun, 1=Mon, … 6=Sat] |
| date | date | For one-off slots (overrides days_of_week) |
| capacity | integer | Max passengers (0 = unlimited) |
| override_price | numeric | Override route price for this slot |

### shuttle_bookings
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| slot_id | uuid | Foreign key → shuttle_slots |
| guest_name | text | Passenger name |
| room_number | text | Room number |
| pax | integer | Number of passengers |
| notes | text | Special instructions |
| status | text | confirmed / cancelled / no_show |
| price_charged | numeric | Amount charged |
| created_at | timestamptz | Booking time |

---

# 20. GLOSSARY

| Term | Definition |
|---|---|
| **ADR** | Average Daily Rate — average revenue per occupied room per night |
| **Attenda Fee** | Platform commission charged on partner transactions (default 10%) |
| **Bouncie** | GPS fleet tracking integration for live shuttle vehicle monitoring |
| **Brand Color** | Hex color code used as the hotel's accent color throughout the guest app |
| **Compset** | Competitive Set — the group of competitor hotels tracked for rate shopping |
| **Hotel Slug** | URL-safe unique identifier for a property (e.g., "sands84", "ocean-view-inn") |
| **hotel_id** | UUID that uniquely identifies each property — used to scope all database records |
| **Kanban** | The 4-column order management board on the vendor dashboard (New / Received / Preparing / Ready) |
| **KPI** | Key Performance Indicator — a quantitative metric tracked over time |
| **Notification Email** | The email address that receives all guest request and message alerts |
| **Pax** | Passengers — number of people in a shuttle booking or transport request |
| **PIN** | 4-digit Personal Identification Number used for quick staff login |
| **Position Budget** | Staffing hours model per department, calculated from occupancy forecast |
| **RDO** | Rest Day Off — scheduled day off for a staff member |
| **Real-time** | Supabase WebSocket connection that delivers updates without page refresh |
| **ResendInternal** | Email delivery service used by Attenda for all transactional emails |
| **RevPAR** | Revenue Per Available Room — total room revenue ÷ total available rooms |
| **RLS** | Row Level Security — Supabase database policy that scopes data to a hotel_id |
| **Route** | A named shuttle path (e.g., "Airport Shuttle", "Cruise Port Run") |
| **Slot** | An individual shuttle departure at a specific time |
| **SOP** | Standard Operating Procedure — documented step-by-step process |
| **SuperAdmin** | Attenda platform-level admin with access to all properties |
| **Tenant** | A hotel property in the Attenda multi-tenant system |
| **Vendor** | Any external business partner (restaurant, transport co., spa, tour operator) |
| **vendor_status** | The vendor's view of an order: new → received → preparing → ready |
| **WebSocket** | Persistent connection enabling real-time data updates without page refresh |

---

*End of Attenda Platform Manual — v1.0*

*For support: thrilznetwork@gmail.com*
*Platform: attendaapp.com*
*Documentation updated: June 2026*

---

> **This document is confidential and intended for Attenda team, hotel admins, and authorized partners only.**
> Unauthorized distribution is prohibited.
