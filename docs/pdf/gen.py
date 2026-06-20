#!/usr/bin/env python3
"""Generate branded Attenda PDFs using WeasyPrint."""
import subprocess, sys

CSS = open("/home/user/attendapp/docs/pdf/base.css").read()

def wrap(title, subtitle, role, body_html):
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/>
<style>{CSS}</style>
</head>
<body>
<div class="cover">
  <div class="cover-logo">✦ Quantum Hospitality Solutions ✦</div>
  <h1>{title}</h1>
  <div class="subtitle">Version 2.0 &nbsp;·&nbsp; {subtitle}</div>
  <div class="role-badge">{role}</div>
  <div class="divider"></div>
  <div class="meta">
    Attenda Platform &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; Do Not Distribute<br/>
    Issued June 2026 &nbsp;·&nbsp; Quantum Hospitality Solutions
  </div>
</div>
{body_html}
</body></html>"""

# ─────────────────────────────────────────────
DOCS = []

# ── PLATFORM MANUAL ──────────────────────────
MANUAL_BODY = """
<div class="page-break"></div>

<h1 class="section">Table of Contents</h1>
<div style="margin-top:10pt;">
{''.join(f'<div class="toc-row"><span><span class="toc-num">§{n}</span> {t}</span><span class="toc-pg">{p}</span></div>'
  for n,t,p in [
    (1,"Introduction & Platform Overview",4),
    (2,"Architecture & Multi-Tenancy",7),
    (3,"User Roles & Permissions",10),
    (4,"Daily Brief Dashboard",13),
    (5,"Revenue Dashboard",17),
    (6,"Guest Requests & Food Orders",20),
    (7,"Front Desk Operations",25),
    (8,"Shuttle & Transport",29),
    (9,"Staff Schedules",35),
    (10,"Staff Callouts & Coverage",41),
    (11,"Culture Hub",44),
    (12,"KPIs & Marketplace",47),
    (13,"Partner Network & Vendor Onboarding",52),
    (14,"Vendor Portal",56),
    (15,"Right Answers Knowledge Base",60),
    (16,"Learning & HR",63),
    (17,"Compset & Competitive Intelligence",66),
    (18,"Forecast & Staffing",68),
    (19,"Position To-Dos",71),
    (20,"Superadmin & Platform Operations",74),
  ]
)}
</div>

<div class="page-break"></div>
<h1 class="section">§1 — Introduction & Platform Overview</h1>
<h2 class="sub">What Is Attenda?</h2>
<p>Attenda is an all-in-one hospitality operations platform built by <strong>Quantum Hospitality Solutions (QHS)</strong> — a company founded on 15+ years of hands-on hotel management. It replaces the fragmented patchwork of spreadsheets, group chats, and single-purpose tools that most independent hotels still rely on, and consolidates them into a single, role-aware system accessible from any device.</p>
<p>Attenda is not a property management system (PMS). It does not handle room inventory or reservations. Instead, it operates in the operational layer that sits <em>above</em> the PMS — coordinating staff, serving guests, managing vendor relationships, and giving general managers real-time insight into the health of their property.</p>

<h2 class="sub">What's New in v2</h2>
<table>
<thead><tr><th>Area</th><th>v1</th><th>v2</th></tr></thead>
<tbody>
<tr><td>Shuttle dispatch</td><td>Slot-management view</td><td>Quick Dispatch bar + hourly timeline + Bouncie GPS</td></tr>
<tr><td>Staff schedules</td><td>Basic add/delete</td><td>Edit modal, templates, copy-week, auto-role, TBD shifts</td></tr>
<tr><td>Knowledge base</td><td>Keyword matching</td><td>AI-powered suggestions via Claude API</td></tr>
<tr><td>Vendor onboarding</td><td>Manual (admin only)</td><td>Self-service /apply page + inbox</td></tr>
<tr><td>Guest food orders</td><td>Order + static confirmation</td><td>Live order tracking page (/track)</td></tr>
<tr><td>Revenue tracking</td><td>None</td><td>Revenue Dashboard with partner breakdown</td></tr>
<tr><td>Team culture</td><td>None</td><td>Culture Hub: leaderboard, rewards, birthdays, events</td></tr>
<tr><td>Front desk tools</td><td>Call Around, Logs</td><td>+ Bank Count (cash drawer denominations)</td></tr>
<tr><td>Payments</td><td>Cash only</td><td>Stripe card payment integration</td></tr>
<tr><td>Callouts</td><td>Basic list</td><td>Full workflow: report → approve → find cover</td></tr>
</tbody>
</table>

<h2 class="sub">Platform URL Structure</h2>
<pre>https://attendaapp.com/          → Guest-facing hotel page
https://attendaapp.com/staff     → Staff dashboard (login required)
https://attendaapp.com/vendor    → Vendor portal (vendor login required)
https://attendaapp.com/apply     → Partner self-onboarding (public)
https://attendaapp.com/track     → Order tracking (public, orderId param)
https://attendaapp.com/nearby    → Guest food &amp; services ordering (public)
https://attendaapp.com/superadmin → Platform administration</pre>

<div class="page-break"></div>
<h1 class="section">§2 — Architecture & Multi-Tenancy</h1>
<h2 class="sub">Technology Stack</h2>
<table>
<thead><tr><th>Layer</th><th>Technology</th></tr></thead>
<tbody>
<tr><td>Frontend</td><td>Next.js 14.2 (App Router, React Server Components)</td></tr>
<tr><td>Styling</td><td>Tailwind CSS 3.4</td></tr>
<tr><td>Database</td><td>Supabase (PostgreSQL 15, Row-Level Security)</td></tr>
<tr><td>Auth</td><td>Supabase Auth + custom session metadata</td></tr>
<tr><td>Email</td><td>Resend</td></tr>
<tr><td>Payments</td><td>Stripe</td></tr>
<tr><td>GPS Tracking</td><td>Bouncie API</td></tr>
<tr><td>Ride Dispatch</td><td>Uber Direct API</td></tr>
<tr><td>AI</td><td>Anthropic Claude API (claude-haiku-4-5-20251001)</td></tr>
<tr><td>Hosting</td><td>Vercel (Edge Functions, ISR)</td></tr>
</tbody>
</table>

<h2 class="sub">Multi-Tenant Architecture</h2>
<p>Every record in the database carries a <code>hotel_id</code> UUID column. Supabase Row-Level Security (RLS) policies enforce that authenticated sessions can only read or write records matching the <code>hotel_id</code> embedded in their JWT claims.</p>
<pre>-- Example RLS policy (enforced at DB layer)
CREATE POLICY "hotel_isolation" ON requests
  USING (hotel_id = (current_setting('request.jwt.claims')::json->>'hotel_id')::uuid);</pre>

<h2 class="sub">Session Architecture</h2>
<p><strong>Staff Sessions:</strong> Staff log in via <code>/staff</code> with email + password. The JWT contains hotel_id, role, vendor_type, and name. The frontend reads these claims to control which tabs are visible.</p>
<p><strong>Guest Sessions:</strong> Guests do not create accounts. A lightweight check-in (name + room number) creates a <code>guestSession</code> in localStorage. No server-side session is created for guests.</p>
<p><strong>Vendor Sessions:</strong> Vendors log in via <code>/vendor</code>. Vendor accounts are scoped to a single property and vendor_type.</p>

<div class="page-break"></div>
<h1 class="section">§3 — User Roles & Permissions</h1>
<h2 class="sub">Role Hierarchy</h2>
<pre>SuperAdmin
    └── Admin (General Manager)
            └── Manager (Supervisor)
                    └── Staff (Front-line)
                            └── Vendor (Partners)</pre>

<h2 class="sub">Permission Matrix</h2>
<table>
<thead><tr><th>Feature</th><th>SuperAdmin</th><th>Admin</th><th>Manager</th><th>Staff</th><th>Vendor</th></tr></thead>
<tbody>
<tr><td>Revenue Dashboard</td><td>✓</td><td>✓</td><td>—</td><td>—</td><td>—</td></tr>
<tr><td>Staff Management</td><td>✓</td><td>✓</td><td>—</td><td>—</td><td>—</td></tr>
<tr><td>Property Settings</td><td>✓</td><td>✓</td><td>—</td><td>—</td><td>—</td></tr>
<tr><td>Schedules (edit)</td><td>✓</td><td>✓</td><td>✓</td><td>—</td><td>—</td></tr>
<tr><td>Schedules (view)</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>—</td></tr>
<tr><td>Callouts (approve)</td><td>✓</td><td>✓</td><td>✓</td><td>—</td><td>—</td></tr>
<tr><td>Callouts (submit)</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>—</td></tr>
<tr><td>KPI submit</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>—</td></tr>
<tr><td>Vendor applications</td><td>✓</td><td>✓</td><td>—</td><td>—</td><td>—</td></tr>
<tr><td>Order status update</td><td>—</td><td>—</td><td>—</td><td>—</td><td>✓</td></tr>
<tr><td>Culture Hub</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>—</td></tr>
<tr><td>Learning & HR</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>—</td></tr>
</tbody>
</table>

<div class="page-break"></div>
<h1 class="section">§4 — Daily Brief Dashboard</h1>
<p>The Daily Brief is the first screen staff see after logging in — a snapshot of the day ahead in under 60 seconds. It is refreshed in real time and designed for the daily standup or pre-shift meeting.</p>

<h2 class="sub">Dashboard Sections (8 Configurable)</h2>
<table>
<thead><tr><th>#</th><th>Section</th><th>Contents</th></tr></thead>
<tbody>
<tr><td>1</td><td>GM Notes</td><td>Manager bulletin board, free text, timestamped entries</td></tr>
<tr><td>2</td><td>Quick Stats</td><td>Occupancy / Arrivals / Departures / Pending Requests tiles</td></tr>
<tr><td>3</td><td>Activity Feed</td><td>Real-time stream of all module activity</td></tr>
<tr><td>4</td><td>Crew Briefing</td><td>Shift handoff announcements from admin</td></tr>
<tr><td>5</td><td>KPIs Summary</td><td>Today's KPI submission status across all categories</td></tr>
<tr><td>6</td><td>Pending Requests</td><td>Most recent unresolved guest requests</td></tr>
<tr><td>7</td><td>Shuttle Times</td><td>Today's scheduled shuttle departures</td></tr>
<tr><td>8</td><td>Forecast Summary</td><td>Today's occupancy forecast in single-row view</td></tr>
</tbody>
</table>

<h2 class="sub">Widget Customizer (v2)</h2>
<p>Each staff member can personalize their Daily Brief. Click the ⚙ gear icon (top-right of Dashboard) to toggle any of the 8 sections on or off. Preferences persist in localStorage per device.</p>

<h2 class="sub">Print Brief</h2>
<p>Admins can print the current brief via the printer icon button. The browser print dialog opens with a clean, sidebar-free layout hiding all interactive elements.</p>

<div class="page-break"></div>
<h1 class="section">§5 — Revenue Dashboard <span class="label-new">v2 new</span></h1>
<p>The Revenue Dashboard gives General Managers a consolidated view of all revenue flowing through Attenda. Access: Admin section only.</p>

<h2 class="sub">Business Model</h2>
<table>
<thead><tr><th>Party</th><th>Share</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>Vendor / Partner</td><td>90%</td><td>Transferred to partner after transaction</td></tr>
<tr><td>Hotel (Attenda commission)</td><td>10%</td><td>Retained by property</td></tr>
<tr><td>Card processing fee</td><td>3%</td><td>Applies to all Stripe transactions</td></tr>
</tbody>
</table>

<h2 class="sub">KPI Cards</h2>
<table>
<thead><tr><th>Card</th><th>Calculation</th></tr></thead>
<tbody>
<tr><td>Total Revenue</td><td>Sum of all order gross amounts in period</td></tr>
<tr><td>Hotel Commission</td><td>10% of Total Revenue</td></tr>
<tr><td>Transactions</td><td>Count of completed orders</td></tr>
</tbody>
</table>

<h2 class="sub">Partner Breakdown Table</h2>
<p>Shows per-partner: Partner name | Orders | Gross Revenue | Hotel Commission | Avg. Order | Status. Clicking a row drills into that partner's individual order history.</p>

<h2 class="sub">Data Sources</h2>
<table>
<thead><tr><th>Revenue Type</th><th>Source Table</th><th>Key Fields</th></tr></thead>
<tbody>
<tr><td>Food orders</td><td>requests</td><td>type='food_order', total_amount, vendor_payout</td></tr>
<tr><td>Shuttle bookings</td><td>shuttle_bookings</td><td>price_per_person, pax</td></tr>
<tr><td>Transport requests</td><td>requests</td><td>type='transport_request'</td></tr>
</tbody>
</table>

<div class="page-break"></div>
<h1 class="section">§6 — Guest Requests & Food Orders</h1>
<h2 class="sub">Guest Ordering Experience</h2>
<p>Guests access ordering via QR code in their room → <code>attendaapp.com/nearby?hotel={slug}</code>. No app download required. After a lightweight check-in (name + room), guests browse partner menus, add to cart, and checkout.</p>

<h2 class="sub">Cart & Checkout (v2)</h2>
<p><strong>Cart Badge:</strong> A persistent cart icon in the menu header shows current item count. <strong>Stripe Payments:</strong> Card payments processed via Stripe — 3% fee displayed before confirmation. <strong>Room Charge:</strong> Alternative payment option charged to the folio.</p>

<h2 class="sub">Order Tracking (v2)</h2>
<p>After placing an order, guests receive a <strong>Track Order</strong> link: <code>attendaapp.com/track?orderId={uuid}</code>. The page is public (no login), updates in real time via Supabase Realtime, and shows:</p>
<pre>● Placed  →  ● Received  →  ● Preparing  →  ● Ready  →  ◯ Delivered</pre>

<h2 class="sub">Request Types</h2>
<table>
<thead><tr><th>Type</th><th>Display Name</th><th>Routed To</th></tr></thead>
<tbody>
<tr><td>food_order</td><td>Food Order</td><td>Vendor + Staff inbox</td></tr>
<tr><td>transport_request</td><td>Transport</td><td>Staff inbox</td></tr>
<tr><td>housekeeping</td><td>Housekeeping</td><td>Staff inbox</td></tr>
<tr><td>maintenance</td><td>Maintenance</td><td>Staff inbox</td></tr>
<tr><td>message</td><td>Guest Message</td><td>Staff inbox</td></tr>
<tr><td>amenity_request</td><td>Amenity Request</td><td>Staff inbox</td></tr>
</tbody>
</table>

<div class="page-break"></div>
<h1 class="section">§7 — Front Desk Operations</h1>
<p>The Front Desk Operations module consolidates daily logging tasks into a structured, searchable, auditable digital record. Accessible via sub-tabs in Daily Ops.</p>

<h2 class="sub">Sub-Modules</h2>
<table>
<thead><tr><th>Sub-tab</th><th>Purpose</th><th>Key Fields</th></tr></thead>
<tbody>
<tr><td>Call Around</td><td>Log outbound calls to guests</td><td>Guest, room, call type, outcome, notes</td></tr>
<tr><td>Daily Logs</td><td>Incident &amp; event log (Manager's Log)</td><td>Category, description, action taken</td></tr>
<tr><td>No Shows</td><td>Track guests who didn't arrive</td><td>Guest, reservation, attempts, notes</td></tr>
<tr><td>Room Moves</td><td>Log guest room changes</td><td>From room, to room, reason, authorized by</td></tr>
<tr><td>Bank Count</td><td>Cash drawer denomination tracking</td><td>All denominations, paid outs, petty cash</td></tr>
</tbody>
</table>

<h2 class="sub">Bank Count (v2)</h2>
<p>Digitizes the cash drawer count replacing paper bank count sheets. Denominations: $100, $50, $20, $10, $5, $1 bills; half-dollars, quarters, dimes, nickels, pennies. Auto-calculates: Drawer Total, Paid Outs, Petty Cash, Net Drawer. Done at shift start and end.</p>

<div class="page-break"></div>
<h1 class="section">§8 — Shuttle & Transport</h1>
<p>Completely redesigned in v2 as a real-time dispatch tool. A new booking can be logged in under 30 seconds. Three tabs: <strong>Today</strong> (hourly timeline), <strong>Requests</strong> (history), <strong>Setup</strong> (admin config).</p>

<h2 class="sub">Quick Dispatch Bar (v2)</h2>
<p>The <strong>+ New Pickup</strong> button opens a bottom-sheet form with: Trip Type (Arrival/Departure), Guest Name, Room #, Party Size (stepper), Pickup Location, Drop-Off, Requested Time, Notes, and Assignment (In-House Driver or Send Uber).</p>

<h2 class="sub">Hourly Timeline (v2)</h2>
<p>The Today tab shows all shuttles organized by hour. Each card shows: guest name, room, pax, pickup → dropoff, assigned driver or Uber badge.</p>
<table>
<thead><tr><th>Status</th><th>Visual</th></tr></thead>
<tbody>
<tr><td>pending</td><td>Amber border + amber background</td></tr>
<tr><td>assigned</td><td>Blue border</td></tr>
<tr><td>in_progress</td><td>Teal border + teal background</td></tr>
<tr><td>completed</td><td>Green muted, slightly faded</td></tr>
<tr><td>cancelled</td><td>Gray, strikethrough text</td></tr>
</tbody>
</table>

<h2 class="sub">Bouncie GPS Integration (v2)</h2>
<p>For hotels with Bouncie GPS trackers: a live map above the timeline shows vehicle location in real time. Configure via Admin → Property Settings → Bouncie credentials.</p>

<h2 class="sub">Uber Direct Integration</h2>
<p>Selecting "Send Uber" in dispatch calls the Uber Direct API to request a driver. The response includes estimated pickup time and a tracking URL stored on the card.</p>

<div class="page-break"></div>
<h1 class="section">§9 — Staff Schedules</h1>
<h2 class="sub">Schedule Grid</h2>
<p>A week-at-a-glance grid: columns = Mon–Sun, rows = staff members, cells = shift cards. Amber cards with "→ TBD" indicate housekeeping open-ended shifts.</p>

<h2 class="sub">Adding a Shift</h2>
<p>Click <strong>+ Add Shift</strong>. Role auto-fills from the selected staff member's profile (v2). For housekeeping, check "Open end time" — shift stored with NULL end_time and shown as → TBD in amber.</p>

<h2 class="sub">Editing a Shift (v2)</h2>
<p>Clicking a shift card now opens an <strong>Edit modal</strong> (v1 deleted immediately — redesigned in v2). Modal actions: <strong>Save Changes</strong> (blue) or <strong>Delete Shift</strong> (red, deliberate).</p>

<h2 class="sub">Copy to Next Week (v2)</h2>
<p>The <strong>Copy to Next Week</strong> button duplicates all current week's shifts +7 days. Confirmation shown if next week already has shifts.</p>

<h2 class="sub">Schedule Templates (v2)</h2>
<table>
<thead><tr><th>Action</th><th>Button</th><th>What It Does</th></tr></thead>
<tbody>
<tr><td>Save Template</td><td>Bookmark icon</td><td>Saves current week as a named template in localStorage</td></tr>
<tr><td>Load Template</td><td>Folder icon</td><td>Applies a saved template to the current week, maps by day-of-week</td></tr>
</tbody>
</table>

<h2 class="sub">TBD Shift End-Time (v2)</h2>
<p>Supervisors tap the amber "→ TBD" badge to set the actual end time via inline popover. Updates immediately.</p>

<div class="page-break"></div>
<h1 class="section">§10 — Staff Callouts & Coverage</h1>
<h2 class="sub">Staff: Reporting a Callout</h2>
<p>Any staff member clicks <strong>Callouts → Report Callout</strong> and fills in: Shift Date, Reason (Sick/Personal/Family Emergency/Other), Notes. Managers see it immediately with a badge count on the Callouts tab.</p>

<h2 class="sub">Manager: Actions</h2>
<table>
<thead><tr><th>Action</th><th>When</th><th>Result</th></tr></thead>
<tbody>
<tr><td>Approve</td><td>No coverage needed</td><td>Closes callout, removes from pending count</td></tr>
<tr><td>Find Cover</td><td>Shift must be filled</td><td>Opens Schedules filtered to callout date</td></tr>
</tbody>
</table>
<p>A <strong>red dot</strong> on the Schedules tab date header indicates a callout exists for that day.</p>

<div class="page-break"></div>
<h1 class="section">§11 — Culture Hub <span class="label-new">v2 new</span></h1>
<p>A team engagement layer that increases retention and morale through recognition, milestones, and community.</p>

<h2 class="sub">Leaderboard</h2>
<p>Monthly points ranking across all staff. Gold 🥇 / Silver 🥈 / Bronze 🥉 for top 3. Points earned via KPI submissions, training completions, guest commendations, attendance. Resets monthly.</p>

<h2 class="sub">Rewards Catalog</h2>
<p>Admins configure redeemable rewards (preferred parking, gift cards, paid meals). Staff redeem points; admins approve from a pending queue.</p>

<h2 class="sub">Birthday Tracking</h2>
<p>Upcoming birthdays in the next 30 days shown in Culture Hub. Birthday notification appears in Daily Brief on the staff member's day.</p>

<h2 class="sub">Team Events</h2>
<p>Managers post upcoming team events (meetings, outings, celebrations) with date, location, description, and optional RSVP.</p>

<div class="page-break"></div>
<h1 class="section">§12 — KPIs & Marketplace</h1>
<h2 class="sub">KPI Categories</h2>
<table>
<thead><tr><th>Category</th><th>Example Metrics</th></tr></thead>
<tbody>
<tr><td>Revenue</td><td>ADR, RevPAR, Ancillary Revenue</td></tr>
<tr><td>Operations</td><td>Maintenance Resolution Time, Room Turnaround</td></tr>
<tr><td>Guest Experience</td><td>NPS, Complaint Rate</td></tr>
<tr><td>Quality</td><td>Inspection Score, Defect Rate</td></tr>
<tr><td>Housekeeping</td><td>Rooms Cleaned, CPOR</td></tr>
<tr><td>Front Desk</td><td>Check-In Wait Time, Upsell Conversion</td></tr>
</tbody>
</table>

<h2 class="sub">Marketplace (v2)</h2>
<p>Community library of pre-built KPI packs and To-Do packs. Each pack shows name, category, install count, and star rating. Click <strong>Install</strong> — definitions are added to the hotel's active configuration immediately.</p>

<div class="page-break"></div>
<h1 class="section">§13 — Partner Network & Vendor Onboarding</h1>
<h2 class="sub">Partner Categories</h2>
<table>
<thead><tr><th>Category</th><th>Examples</th></tr></thead>
<tbody>
<tr><td>Restaurant</td><td>Local restaurants, cafes, room service</td></tr>
<tr><td>Transport</td><td>Car services, tours, charter boats</td></tr>
<tr><td>Service</td><td>Spa, laundry, pet care</td></tr>
<tr><td>Experience</td><td>Tours, shows, sporting events</td></tr>
</tbody>
</table>

<h2 class="sub">Vendor Self-Onboarding (v2)</h2>
<p>Public apply page at <code>attendaapp.com/apply?hotel={slug}</code>. No login required. Form: Business Name, Contact, Phone, Email, Business Type, Description. On submit → stored in partner_applications → staff notified → approve or reject in Partners inbox.</p>
<p><strong>Share Apply Link:</strong> In the Partners tab, click <strong>Share Apply Link</strong> — copies the full URL to clipboard for distribution.</p>

<div class="page-break"></div>
<h1 class="section">§14 — Vendor Portal</h1>
<h2 class="sub">Login (v2 enhanced)</h2>
<p>Vendors log in at <code>attendaapp.com/vendor</code> with tenant-scoped email + password. Sessions are scoped to a single hotel_id + vendor_type.</p>

<h2 class="sub">Order Board — Status Workflow</h2>
<table>
<thead><tr><th>Button</th><th>Transition</th><th>Guest Sees</th></tr></thead>
<tbody>
<tr><td>Accept Order</td><td>New → Received</td><td>Order Received</td></tr>
<tr><td>Start Preparing</td><td>Received → Preparing</td><td>Preparing Your Order</td></tr>
<tr><td>Mark Ready</td><td>Preparing → Ready</td><td>Order Ready</td></tr>
<tr><td>Mark Delivered</td><td>Ready → Delivered</td><td>Delivered ✓</td></tr>
</tbody>
</table>
<p>Each status change updates the guest's /track page in real time via Supabase Realtime. An audio notification sounds on new order arrival.</p>

<div class="page-break"></div>
<h1 class="section">§15 — Right Answers Knowledge Base</h1>
<h2 class="sub">AI Suggestion Engine (v2)</h2>
<p>When no KB entry matches, staff click <strong>Get AI Suggestion</strong>. The request goes to <code>/api/ai-suggest</code> → Claude API → professional hotel response in 2–5 seconds. AI suggestions are not automatically added to the KB — managers review and approve.</p>

<h2 class="sub">KB Contribution Workflow</h2>
<p>Staff submit suggestions → stored as kb_suggestion records → Manager/Admin reviews in the <strong>Pending</strong> tab → Approve (adds to live KB) or Reject (with feedback).</p>

<div class="page-break"></div>
<h1 class="section">§16 — Learning & HR</h1>
<h2 class="sub">Course Structure</h2>
<p>Courses contain Modules (text/video/PDF) and Quizzes (multiple choice, 80% to pass). Staff see progress bars per course; completion earns a Certificate. Admins see a training matrix showing all staff × all courses.</p>

<h2 class="sub">HR Document Library</h2>
<p>PDFs uploaded by admins in categories: Employee Handbook, Benefits, Safety, Policies, Position Guidelines. Documents marked <strong>Requires Acknowledgement</strong> track per-staff confirmation.</p>

<div class="page-break"></div>
<h1 class="section">§17 — Compset & Competitive Intelligence</h1>
<p>Track competitor hotel rates via structured call-around logs. Each call records: date, staff member, quoted rates per room category, promotions, restrictions, availability notes.</p>
<p>The <strong>Rate Position</strong> dashboard shows your rates vs. market average — green (below market) or red (above market) indicator. Historical rate trend per competitor available for the last 30 calls.</p>

<div class="page-break"></div>
<h1 class="section">§18 — Forecast & Staffing</h1>
<p>Managers submit daily forecasts (Occupancy, Arrivals, Departures, Group Blocks, VIP Arrivals, Notes). The <strong>Generate Shifts</strong> button suggests staffing based on occupancy ratios configured in Property Settings. Monthly Forecast Calendar shows color-coded occupancy levels (green / amber / red) per day.</p>

<div class="page-break"></div>
<h1 class="section">§19 — Position To-Dos</h1>
<p>Role-specific daily checklists tied to positions (e.g., "Front Desk AM", "Night Audit"). Staff check off items with timestamps. Managers see the <strong>Completion Board</strong> — all positions × completion % for today. <strong>Marketplace To-Do Packs</strong> provide curated checklists (Front Desk Opening, Night Audit, Room Inspection, etc.).</p>

<div class="page-break"></div>
<h1 class="section">§20 — Superadmin & Platform Operations</h1>
<h2 class="sub">All Properties View</h2>
<p>Lists all hotel tenants with: name, slug, hotel ID, status, staff count, last activity, and actions (Switch / Settings / Health Check). Clicking Switch loads that hotel's context.</p>

<h2 class="sub">Environment Variables</h2>
<table>
<thead><tr><th>Variable</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td>NEXT_PUBLIC_SUPABASE_URL</td><td>Supabase project URL</td></tr>
<tr><td>SUPABASE_SERVICE_ROLE_KEY</td><td>Service-role key (server only)</td></tr>
<tr><td>RESEND_API_KEY</td><td>Email service</td></tr>
<tr><td>STRIPE_SECRET_KEY</td><td>Stripe payments</td></tr>
<tr><td>ANTHROPIC_API_KEY</td><td>Claude AI (Right Answers)</td></tr>
<tr><td>BOUNCIE_CLIENT_ID / SECRET</td><td>GPS tracking</td></tr>
<tr><td>UBER_CLIENT_ID / SECRET</td><td>Ride dispatch</td></tr>
</tbody>
</table>

<h2 class="sub">Test Tenant</h2>
<pre>Slug:     test
Hotel ID: 466654c8-66db-4c08-9bf7-4b6326dbf3b8
Status:   Development only — no real guests</pre>
"""

DOCS.append(("Attenda_Platform_Manual_v2", "Attenda Platform Manual", "Reference Manual · Version 2.0", "All Staff & Administrators", MANUAL_BODY))

# ── GM SOP ───────────────────────────────────
GM_BODY = """
<div class="page-break"></div>
<div class="quick-ref">
<div class="quick-ref-title">Quick Reference — GM Daily Tasks</div>
<table style="margin:0;">
<thead><tr><th>Task</th><th>Where</th><th>Time</th></tr></thead>
<tbody>
<tr><td>Morning brief review</td><td>Dashboard tab</td><td>2 min</td></tr>
<tr><td>Review revenue</td><td>Admin → Revenue</td><td>2 min</td></tr>
<tr><td>Approve callout</td><td>Admin → Callouts</td><td>30 sec</td></tr>
<tr><td>Add/edit staff shift</td><td>Operations → Schedules</td><td>1 min</td></tr>
<tr><td>Approve vendor application</td><td>Admin → Partners → Applications</td><td>45 sec</td></tr>
<tr><td>Post GM Note</td><td>Dashboard → GM Notes</td><td>30 sec</td></tr>
</tbody>
</table>
</div>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-01</div>
<h1 class="section">Morning Brief Review</h1>
<p><strong>When:</strong> Daily, at the start of the GM's shift or first thing each morning.</p>
<ol>
<li>Log in at <code>attendaapp.com/staff</code> with your Admin credentials.</li>
<li>The <strong>Dashboard</strong> tab loads automatically.</li>
<li>Review <strong>GM Notes</strong> — check if the previous manager left any carryover items.</li>
<li>Read the <strong>Quick Stats</strong> tiles: Occupancy / Arrivals / Departures / Pending Requests.</li>
<li>Scroll to <strong>Pending Requests</strong> — address any items open for more than 30 minutes.</li>
<li>Check <strong>Shuttle Times</strong> — confirm today's runs match expected guest demand.</li>
<li>Review the <strong>Forecast Summary</strong> — compare forecast arrivals to current occupancy.</li>
<li>Post your own <strong>GM Note</strong> if there are important items for the team.</li>
</ol>
<blockquote><strong>Tip:</strong> Use the ⚙ Widget Customizer (gear icon, top right) to show only the sections that matter to your morning routine.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-02</div>
<h1 class="section">Posting a GM Note</h1>
<ol>
<li>Navigate to the <strong>Dashboard</strong> tab.</li>
<li>Click <strong>Edit / + New Note</strong> in the GM Notes section.</li>
<li>Type your message.</li>
<li>Click <strong>Post</strong> — immediately visible to all logged-in staff.</li>
</ol>
<blockquote><strong>Examples:</strong> "Pool maintenance until 2pm." · "VIP group Rooms 201–210 arriving at 3pm." · "Fire alarm test 10am — notify guests."</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-03</div>
<h1 class="section">Revenue Dashboard</h1>
<p><strong>Access:</strong> Admin section → Revenue</p>
<ol>
<li>Click <strong>Revenue</strong> in the Admin section.</li>
<li>Select a time period: <strong>This Week</strong> / <strong>This Month</strong> / <strong>All Time</strong>.</li>
<li>Review the three KPI cards: Total Revenue · Hotel Commission · Transactions.</li>
<li>Review the <strong>Partner Breakdown Table</strong> — per-partner orders, gross, commission.</li>
<li>Check the <strong>Shuttle Revenue</strong> row beneath the table.</li>
<li>Review the <strong>Daily Bar Chart</strong> — identify high-revenue days and patterns.</li>
</ol>
<blockquote><strong>Action trigger:</strong> If a partner's commission shows $0, verify they have active menu items and are receiving orders in their Vendor Portal.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-04</div>
<h1 class="section">Managing Staff Callouts</h1>
<p><strong>Access:</strong> Admin section → Callouts (badge shows pending count)</p>
<h2 class="sub">Reviewing Callouts</h2>
<ol>
<li>Click <strong>Callouts</strong> — badge shows unresolved count.</li>
<li>Each card shows: staff name, callout date, reason, affected shift.</li>
</ol>
<table>
<thead><tr><th>Action</th><th>When to Use</th><th>What It Does</th></tr></thead>
<tbody>
<tr><td><strong>Approve</strong></td><td>Shift can absorb the absence</td><td>Closes callout, removes from pending</td></tr>
<tr><td><strong>Find Cover</strong></td><td>Shift must be filled</td><td>Opens Schedules for that date</td></tr>
</tbody>
</table>
<h2 class="sub">Finding Coverage</h2>
<ol>
<li>Click <strong>Find Cover</strong> → Schedules opens for the callout date.</li>
<li>Identify available staff — not already scheduled that day.</li>
<li>Click <strong>+ Add Shift</strong> and schedule the covering staff member.</li>
<li>Return to Callouts → click <strong>Approve</strong> to close.</li>
</ol>
<blockquote><strong>Note:</strong> A red dot on the Schedules tab date header marks dates with open callouts.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-05</div>
<h1 class="section">Staff Schedule Management</h1>
<p><strong>Access:</strong> Operations → Schedules</p>
<h2 class="sub">Adding a Shift</h2>
<ol>
<li>Click <strong>+ Add Shift</strong> in the header.</li>
<li>Select the <strong>Staff Member</strong> — Role auto-fills from their profile.</li>
<li>Set <strong>Date</strong>, <strong>Start Time</strong>, <strong>End Time</strong>.</li>
<li>For housekeeping: check <strong>"Open end time"</strong> if end time is unknown.</li>
<li>Add optional <strong>Notes</strong>. Click <strong>Save Shift</strong>.</li>
</ol>
<h2 class="sub">Editing a Shift</h2>
<ol>
<li>Click any existing shift card on the grid.</li>
<li>The <strong>Edit Shift modal</strong> opens with all fields pre-filled.</li>
<li>Modify fields → click <strong>Save Changes</strong> or <strong>Delete Shift</strong> (red).</li>
</ol>
<h2 class="sub">Copy to Next Week</h2>
<ol>
<li>Navigate to the week to copy from.</li>
<li>Click <strong>Copy to Next Week</strong>. Confirm if prompted.</li>
<li>All shifts are duplicated 7 days forward. Review before publishing.</li>
</ol>
<h2 class="sub">Schedule Templates</h2>
<ol>
<li><strong>Save:</strong> Click bookmark icon → name the template → Save.</li>
<li><strong>Load:</strong> Navigate to target week → folder icon → select template → Apply.</li>
</ol>
<h2 class="sub">Publishing</h2>
<ol>
<li>Review the week's shifts.</li>
<li>Click <strong>Publish</strong> — staff can now see their schedule.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-06</div>
<h1 class="section">Partner & Vendor Management</h1>
<p><strong>Access:</strong> Admin → Partners</p>
<h2 class="sub">Reviewing Applications</h2>
<ol>
<li>Click <strong>Partners</strong> → <strong>Applications</strong> sub-tab.</li>
<li>Review: business name, type, contact, description.</li>
<li>Click <strong>Approve</strong> (creates vendor account, notifies applicant) or <strong>Reject</strong>.</li>
</ol>
<h2 class="sub">Sharing the Apply Link</h2>
<ol>
<li>In the Partners tab, click <strong>Share Apply Link</strong>.</li>
<li>URL is copied to clipboard: <code>attendaapp.com/apply?hotel={slug}</code></li>
<li>Share via email, WhatsApp, or printed materials.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-07</div>
<h1 class="section">Staff Account Management</h1>
<p><strong>Access:</strong> Admin → Staff</p>
<h2 class="sub">Adding a Staff Member</h2>
<ol>
<li>Click <strong>Staff</strong> → <strong>Add Staff Member</strong>.</li>
<li>Enter Name, Email, Password, Role, and Department.</li>
<li>Click <strong>Create</strong> — account is immediately active.</li>
</ol>
<table>
<thead><tr><th>Role</th><th>Access Level</th></tr></thead>
<tbody>
<tr><td>admin</td><td>Full access including Revenue, Staff Mgmt, Property Settings</td></tr>
<tr><td>manager</td><td>Schedules, Callouts, Forecast, Right Answers approval</td></tr>
<tr><td>staff</td><td>KPIs, To-Dos, Requests, Schedule view, Callout reporting</td></tr>
<tr><td>vendor</td><td>Vendor Portal only</td></tr>
</tbody>
</table>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-08</div>
<h1 class="section">Property Settings</h1>
<p><strong>Access:</strong> Admin → Property Settings</p>
<table>
<thead><tr><th>Setting</th><th>Description</th></tr></thead>
<tbody>
<tr><td>Hotel Name</td><td>Display name shown to guests</td></tr>
<tr><td>Brand Color</td><td>Hex code for accent color in guest app</td></tr>
<tr><td>Shuttle Days / Hours</td><td>When shuttle service operates</td></tr>
<tr><td>Shuttle Capacity</td><td>Max passengers per run</td></tr>
<tr><td>Pickup Locations</td><td>Comma-separated terminal/location list</td></tr>
<tr><td>Staffing Ratios</td><td>Rooms per housekeeper, guests per front desk agent</td></tr>
</tbody>
</table>
<p>Modify any field → click <strong>Save</strong> — changes apply immediately across all modules.</p>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-09</div>
<h1 class="section">KPI Review & Management</h1>
<p><strong>Access:</strong> Operations → KPIs</p>
<ol>
<li>Click <strong>KPIs</strong> → select a category tab.</li>
<li>Green checkmarks = submitted; amber = pending submission.</li>
<li>Click any metric to see submission history and trend.</li>
<li>To manage definitions: click <strong>Manage KPIs</strong> → Add / deactivate metrics.</li>
<li>To install a KPI pack: navigate to <strong>Marketplace</strong> → find a pack → click <strong>Install</strong>.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-10</div>
<h1 class="section">Forecast Submission</h1>
<p><strong>Access:</strong> Operations → Forecast</p>
<ol>
<li>Click <strong>Forecast</strong> → click a date on the monthly calendar.</li>
<li>Enter: Expected Occupancy, Arrivals, Departures, Group Blocks, VIP Arrivals, Notes.</li>
<li>Click <strong>Submit Forecast</strong>.</li>
<li>Optional: click <strong>Generate Shifts</strong> to auto-suggest staffing. Review before accepting.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-11</div>
<h1 class="section">Compset Rate Monitoring</h1>
<p><strong>Access:</strong> Operations → Compset</p>
<ol>
<li>Click <strong>Compset</strong> → select a competitor property.</li>
<li>Click <strong>Log Call</strong>.</li>
<li>Enter today's quoted rates per room category.</li>
<li>Add notes (promotions, restrictions, availability).</li>
<li>Click <strong>Save</strong> — logged with your name and timestamp.</li>
</ol>
<p>The <strong>Rate Position</strong> dashboard shows your rates vs. market: green = below average, red = above average.</p>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-12</div>
<h1 class="section">Culture Hub Management</h1>
<p><strong>Access:</strong> Operations → Culture Hub</p>
<h2 class="sub">Awarding Points</h2>
<ol>
<li>Click <strong>Culture Hub</strong> → <strong>Leaderboard</strong> tab.</li>
<li>Click a staff member's name → <strong>Award Points</strong>.</li>
<li>Enter amount and reason → click <strong>Award</strong>.</li>
</ol>
<h2 class="sub">Managing Rewards</h2>
<ol>
<li>In Culture Hub → <strong>Rewards</strong> tab → click <strong>Add Reward</strong>.</li>
<li>Enter name, point cost, description, and quantity → Save.</li>
<li>In <strong>Pending Redemptions</strong>: Approve or Reject staff requests.</li>
</ol>
<h2 class="sub">Posting Team Events</h2>
<ol>
<li>In Culture Hub → <strong>Events</strong> tab → click <strong>New Event</strong>.</li>
<li>Enter title, date/time, location, description → click <strong>Post</strong>.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-GM-13</div>
<h1 class="section">Right Answers Knowledge Base</h1>
<p><strong>Access:</strong> Operations → Right Answers</p>
<h2 class="sub">Approving Staff Submissions</h2>
<ol>
<li>Click <strong>Right Answers</strong> → <strong>Pending</strong> tab.</li>
<li>Review each submission. Edit if needed.</li>
<li>Click <strong>Approve</strong> (adds to live KB) or <strong>Reject</strong> (with optional feedback).</li>
</ol>
<h2 class="sub">Adding a KB Item Directly</h2>
<ol>
<li>Click <strong>+ Add Item</strong> (Admin only).</li>
<li>Select category, enter situation + approved response → click <strong>Save</strong>.</li>
</ol>
"""

DOCS.append(("GM_SOP", "General Manager SOP", "Standard Operating Procedures · v2.0", "Role: Admin / General Manager", GM_BODY))

# ── FRONT DESK SOP ───────────────────────────
FD_BODY = """
<div class="page-break"></div>
<div class="quick-ref">
<div class="quick-ref-title">Quick Reference — Front Desk Daily Tasks</div>
<table style="margin:0;">
<thead><tr><th>Task</th><th>Where</th><th>Time</th></tr></thead>
<tbody>
<tr><td>Dispatch a shuttle</td><td>Shuttle → + New Pickup</td><td>30 sec</td></tr>
<tr><td>Handle a guest request</td><td>Requests tab</td><td>20 sec</td></tr>
<tr><td>Log a call-around</td><td>Daily Ops → Call Around</td><td>15 sec</td></tr>
<tr><td>Complete bank count</td><td>Daily Ops → Bank Count</td><td>3 min</td></tr>
<tr><td>Log an incident</td><td>Daily Ops → Daily Logs</td><td>1 min</td></tr>
<tr><td>Submit KPIs</td><td>KPIs tab</td><td>2 min</td></tr>
<tr><td>Report a callout</td><td>Callouts tab</td><td>1 min</td></tr>
</tbody>
</table>
</div>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-01</div>
<h1 class="section">Logging In</h1>
<ol>
<li>Open a browser and go to <code>attendaapp.com/staff</code>.</li>
<li>Enter your <strong>email address</strong> and <strong>password</strong>.</li>
<li>Click <strong>Sign In</strong>. The Dashboard loads.</li>
</ol>
<blockquote><strong>Can't log in?</strong> Contact your manager — they will reset your password from the Staff Management panel.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-02</div>
<h1 class="section">Shuttle Dispatch</h1>
<p><strong>Access:</strong> Operations → Shuttle → Today tab</p>
<h2 class="sub">Dispatching a New Pickup</h2>
<ol>
<li>Click <strong>Shuttle</strong> in the Operations section.</li>
<li>Click <strong>+ New Pickup</strong> (always visible at the top).</li>
<li>Fill in the dispatch form:</li>
</ol>
<table>
<thead><tr><th>Field</th><th>What to Enter</th></tr></thead>
<tbody>
<tr><td><strong>Type</strong></td><td>Arrival (guest coming to hotel) or Departure (guest going to airport)</td></tr>
<tr><td><strong>Guest Name</strong></td><td>Guest's full name</td></tr>
<tr><td><strong>Room #</strong></td><td>Guest's room number</td></tr>
<tr><td><strong>Party Size</strong></td><td>Use − and + to set number of people</td></tr>
<tr><td><strong>Pickup Location</strong></td><td>Arrival: select terminal. Departure: "Hotel Lobby" auto-fills</td></tr>
<tr><td><strong>Drop-Off</strong></td><td>Arrival: "Hotel" auto-fills. Departure: MIA / FLL / Port / Other</td></tr>
<tr><td><strong>Requested Time</strong></td><td>Time guest needs pickup (defaults to next hour slot)</td></tr>
<tr><td><strong>Notes</strong></td><td>Flight number, cruise ship, special instructions</td></tr>
<tr><td><strong>Assign To</strong></td><td>In-House Driver (dropdown) or Send Uber</td></tr>
</tbody>
</table>
<ol start="4">
<li>Click <strong>Submit</strong> — pickup appears instantly in the hourly timeline.</li>
</ol>

<h2 class="sub">Timeline Status Colors</h2>
<table>
<thead><tr><th>Color</th><th>Status</th></tr></thead>
<tbody>
<tr><td><span class="pill pill-amber">Amber</span></td><td>Pending — not yet assigned</td></tr>
<tr><td><span class="pill pill-blue">Blue</span></td><td>Assigned to driver</td></tr>
<tr><td><span class="pill pill-teal">Teal</span></td><td>En route / in progress</td></tr>
<tr><td><span class="pill pill-green">Green</span></td><td>Completed</td></tr>
<tr><td><span class="pill pill-gray">Gray strikethrough</span></td><td>Cancelled</td></tr>
</tbody>
</table>

<h2 class="sub">Updating Shuttle Status</h2>
<ol>
<li>Find the shuttle card in the timeline.</li>
<li>Click <strong>Mark En Route</strong> when driver departs → card turns teal.</li>
<li>Click <strong>Complete</strong> when run finishes → card turns green.</li>
</ol>
<blockquote><strong>Uber rides:</strong> Status updates automatically. No manual update needed. Share the Uber tracking link on the card with the guest if requested.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-03</div>
<h1 class="section">Handling Guest Requests</h1>
<p><strong>Access:</strong> Today → Requests tab</p>
<ol>
<li>Click <strong>Requests</strong> — new requests appear in amber at the top.</li>
<li>Click a request card to open it.</li>
<li>Click <strong>Acknowledge</strong> — confirms you've seen it (card turns blue).</li>
<li>Click <strong>Assign</strong> and select the responsible staff member if needed.</li>
<li>After fulfillment, click <strong>Complete</strong> — card turns green, timestamped.</li>
<li>To message the guest: click <strong>Message</strong> → type reply → Send.</li>
</ol>
<table>
<thead><tr><th>Icon</th><th>Request Type</th><th>Action</th></tr></thead>
<tbody>
<tr><td>🍽</td><td>Food Order</td><td>Confirm with vendor if needed</td></tr>
<tr><td>🔧</td><td>Maintenance</td><td>Assign to maintenance staff</td></tr>
<tr><td>🛏</td><td>Housekeeping</td><td>Assign to housekeeping</td></tr>
<tr><td>🚗</td><td>Transport</td><td>Handle via Shuttle tab</td></tr>
<tr><td>💬</td><td>Guest Message</td><td>Reply via message thread</td></tr>
</tbody>
</table>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-04</div>
<h1 class="section">Bank Count</h1>
<p><strong>Access:</strong> Daily Ops → Bank Count &nbsp;|&nbsp; <strong>When:</strong> Shift start AND shift end</p>
<ol>
<li>Click <strong>Daily Ops</strong> → <strong>Bank Count</strong> sub-tab.</li>
<li>Count each denomination and enter the quantity:</li>
</ol>
<table>
<thead><tr><th>Denomination</th><th>Enter Qty</th></tr></thead>
<tbody>
<tr><td>$100 Bills</td><td>[qty]</td></tr>
<tr><td>$50 Bills</td><td>[qty]</td></tr>
<tr><td>$20 Bills</td><td>[qty]</td></tr>
<tr><td>$10 Bills</td><td>[qty]</td></tr>
<tr><td>$5 Bills</td><td>[qty]</td></tr>
<tr><td>$1 Bills</td><td>[qty]</td></tr>
<tr><td>Half-Dollars ($.50)</td><td>[qty]</td></tr>
<tr><td>Quarters ($.25)</td><td>[qty]</td></tr>
<tr><td>Dimes ($.10)</td><td>[qty]</td></tr>
<tr><td>Nickels ($.05)</td><td>[qty]</td></tr>
<tr><td>Pennies ($.01)</td><td>[qty]</td></tr>
</tbody>
</table>
<ol start="3">
<li>Enter <strong>Paid Outs</strong> (cash paid out of drawer during shift).</li>
<li>Enter <strong>Petty Cash</strong> (float amount set aside).</li>
<li>Review auto-calculated: Drawer Total, Net Drawer.</li>
<li>Click <strong>Submit Count</strong> — logged with your name and timestamp.</li>
</ol>
<blockquote><strong>Required:</strong> Two submissions per shift — Shift Start count + Shift End count. Discrepancies are flagged for manager review.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-05</div>
<h1 class="section">Call Around Log</h1>
<p><strong>Access:</strong> Daily Ops → Call Around</p>
<ol>
<li>Click <strong>Daily Ops</strong> → <strong>Call Around</strong> → <strong>+ Log Call</strong>.</li>
<li>Fill in: Guest Name, Room, Call Type, Time, Outcome, Notes.</li>
<li>Click <strong>Save</strong>.</li>
</ol>
<table>
<thead><tr><th>Call Type</th><th>Outcome Options</th></tr></thead>
<tbody>
<tr><td>Wake-Up / Confirmation / Follow-Up / Other</td><td>Answered / No Answer / Left Message</td></tr>
</tbody>
</table>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-06</div>
<h1 class="section">Daily Incident Log</h1>
<p><strong>Access:</strong> Daily Ops → Daily Logs</p>
<ol>
<li>Click <strong>Daily Ops</strong> → <strong>Daily Logs</strong> → <strong>+ New Entry</strong>.</li>
<li>Select Category: Guest Incident / Maintenance / Safety / Lost &amp; Found / VIP / Other.</li>
<li>Write a clear <strong>Description</strong> of what happened.</li>
<li>Note the <strong>Action Taken</strong>.</li>
<li>Click <strong>Save</strong> — timestamped with your name.</li>
</ol>
<blockquote><strong>Best practice:</strong> Log everything, even minor incidents. The GM reviews daily logs each morning.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-07</div>
<h1 class="section">No Show Log</h1>
<p><strong>Access:</strong> Daily Ops → No Shows</p>
<ol>
<li>Click <strong>Daily Ops</strong> → <strong>No Shows</strong> → <strong>+ Log No Show</strong>.</li>
<li>Fill in: Guest Name, Reservation reference, Date, Contact attempts made, Notes.</li>
<li>Click <strong>Save</strong>.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-08</div>
<h1 class="section">Room Move Log</h1>
<p><strong>Access:</strong> Daily Ops → Room Moves</p>
<ol>
<li>Click <strong>Daily Ops</strong> → <strong>Room Moves</strong> → <strong>+ Log Room Move</strong>.</li>
<li>Fill in: Guest Name, Original Room, New Room, Reason (Maintenance / Upgrade / Guest Request / Other), Notes.</li>
<li>Click <strong>Save</strong>.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-09</div>
<h1 class="section">Submitting KPIs</h1>
<p><strong>Access:</strong> Operations → KPIs → Front Desk</p>
<ol>
<li>Click <strong>KPIs</strong> → select the <strong>Front Desk</strong> category tab.</li>
<li>Enter values for each metric (Check-In Wait Time, Upsell Conversions, etc.).</li>
<li>Click <strong>Submit</strong> — green checkmark confirms saved.</li>
</ol>
<blockquote><strong>When:</strong> Submit KPIs at the end of your shift or when directed by your manager.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-FD-10</div>
<h1 class="section">Reporting a Callout</h1>
<p><strong>Access:</strong> Callouts tab</p>
<ol>
<li>Click <strong>Callouts</strong> in the left navigation.</li>
<li>Click <strong>Report Callout</strong>.</li>
<li>Fill in: Shift Date, Reason, Notes.</li>
<li>Click <strong>Submit</strong> — your manager is notified immediately.</li>
</ol>
<blockquote class="warn">⚠ <strong>This does not replace calling your manager.</strong> Always also call or text your direct supervisor per hotel policy. Attenda creates the official record; the phone call is the notification.</blockquote>
"""

DOCS.append(("FrontDesk_SOP", "Front Desk SOP", "Standard Operating Procedures · v2.0", "Role: Front Desk Agent", FD_BODY))

# ── MANAGER SOP ──────────────────────────────
MGR_BODY = """
<div class="page-break"></div>
<div class="quick-ref">
<div class="quick-ref-title">Quick Reference — Manager Daily Tasks</div>
<table style="margin:0;">
<thead><tr><th>Task</th><th>Where</th><th>Time</th></tr></thead>
<tbody>
<tr><td>Morning brief review</td><td>Dashboard</td><td>2 min</td></tr>
<tr><td>Approve / handle callout</td><td>Callouts tab</td><td>1 min</td></tr>
<tr><td>Build or edit schedule</td><td>Schedules tab</td><td>5–15 min</td></tr>
<tr><td>Publish the schedule</td><td>Schedules → Publish</td><td>10 sec</td></tr>
<tr><td>Set TBD shift end time</td><td>Schedules → amber badge</td><td>15 sec</td></tr>
<tr><td>Approve KB suggestion</td><td>Right Answers → Pending</td><td>1 min</td></tr>
<tr><td>Review To-Do completions</td><td>Position To-Dos</td><td>2 min</td></tr>
<tr><td>Submit forecast</td><td>Forecast tab</td><td>3 min</td></tr>
</tbody>
</table>
</div>
<blockquote><strong>Scope:</strong> Managers have all Staff capabilities plus schedule management, callout approval, forecast, and Right Answers approval. Managers do NOT have access to Revenue Dashboard, Staff Management, or Property Settings (Admin only).</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-MG-01</div>
<h1 class="section">Morning Brief Review</h1>
<ol>
<li>Log in at <code>attendaapp.com/staff</code>.</li>
<li>Review the <strong>Dashboard</strong> — check GM Notes from previous shift.</li>
<li>Note <strong>Pending Requests</strong> — follow up on any open over 30 minutes.</li>
<li>Check the <strong>Callouts</strong> tab badge — handle any before the shift begins.</li>
<li>Confirm <strong>Shuttle Times</strong> shows today's runs correctly.</li>
<li>Post a GM Note if you are duty manager with shift-relevant information.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-MG-02</div>
<h1 class="section">Callout Management</h1>
<p><strong>Access:</strong> Callouts tab</p>
<ol>
<li>Click <strong>Callouts</strong> — badge shows pending count.</li>
<li>Review: staff name, date, reason, affected shift.</li>
</ol>
<table>
<thead><tr><th>Action</th><th>When</th><th>Result</th></tr></thead>
<tbody>
<tr><td><strong>Approve</strong></td><td>Shift can absorb the absence</td><td>Closes callout, removes from pending</td></tr>
<tr><td><strong>Find Cover</strong></td><td>Shift needs to be filled</td><td>Opens Schedules for that date</td></tr>
</tbody>
</table>
<h2 class="sub">Finding Coverage</h2>
<ol>
<li>Click <strong>Find Cover</strong> → Schedules opens for the callout date.</li>
<li>Identify available staff not already scheduled that day.</li>
<li>Click <strong>+ Add Shift</strong> → schedule covering staff member.</li>
<li>Return to Callouts → click <strong>Approve</strong>.</li>
</ol>
<blockquote>A red dot on the Schedules tab date header marks dates with open callouts.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-MG-03</div>
<h1 class="section">Schedule Management</h1>
<p><strong>Access:</strong> Operations → Schedules</p>
<h2 class="sub">Building a New Week</h2>
<ol>
<li>Navigate to target week using ← → arrows.</li>
<li>Click <strong>+ Add Shift</strong> for each shift: select staff member (role auto-fills), set date + times, add notes. For housekeeping: check <strong>Open end time</strong>.</li>
</ol>
<h2 class="sub">Editing Existing Shifts</h2>
<ol>
<li>Click any shift card → <strong>Edit Shift</strong> modal opens.</li>
<li>Modify fields → <strong>Save Changes</strong> or <strong>Delete Shift</strong> (red, deliberate).</li>
</ol>
<h2 class="sub">Copying Last Week</h2>
<ol>
<li>Navigate to the week to copy from → click <strong>Copy to Next Week</strong>.</li>
<li>Confirm if prompted. Review and adjust before publishing.</li>
</ol>
<h2 class="sub">Templates</h2>
<ol>
<li><strong>Save:</strong> Bookmark icon → name → Save.</li>
<li><strong>Load:</strong> Navigate to target week → folder icon → select → Apply.</li>
</ol>
<h2 class="sub">Publishing</h2>
<ol>
<li>Review the week's shifts → click <strong>Publish</strong>.</li>
<li>Staff can now view their schedule.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-MG-04</div>
<h1 class="section">Setting TBD Shift End Times</h1>
<p><strong>Purpose:</strong> Set actual end times for housekeeping shifts created with open end times.</p>
<ol>
<li>Navigate to <strong>Schedules</strong> → locate today's date.</li>
<li>Housekeeping shifts with open ends show <strong>→ TBD</strong> in amber.</li>
<li>Click the <strong>→ TBD</strong> badge on the shift card.</li>
<li>A popover appears with a time input — enter the actual end time.</li>
<li>Click <strong>Set</strong> — shift updates immediately, amber clears.</li>
</ol>
<blockquote><strong>Best practice:</strong> Do this for all housekeeping staff at the end of each shift before logging off.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-MG-05</div>
<h1 class="section">Position To-Do Review</h1>
<p><strong>Access:</strong> Operations → Position To-Dos</p>
<ol>
<li>Click <strong>Position To-Dos</strong> → view the <strong>Completion Board</strong>.</li>
<li>Check completion percentages per position.</li>
<li>Click any position to see which items are complete vs. pending.</li>
<li>Follow up with responsible staff on incomplete items before shift end.</li>
</ol>
<h2 class="sub">Managing To-Do Items</h2>
<ol>
<li>Click <strong>Manage</strong> → <strong>+ New Item</strong>.</li>
<li>Fill in task, position, frequency, category → Save.</li>
<li>Install community packs via <strong>Marketplace</strong>.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-MG-06</div>
<h1 class="section">Forecast Submission</h1>
<p><strong>Access:</strong> Operations → Forecast</p>
<ol>
<li>Click <strong>Forecast</strong> → click the target date on the monthly calendar.</li>
<li>Enter: Expected Occupancy, Arrivals, Departures, Group Blocks, VIP Arrivals, Notes.</li>
<li>Click <strong>Submit Forecast</strong>.</li>
<li>Optional: click <strong>Generate Shifts</strong> to auto-suggest staffing. Review before accepting.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-MG-07</div>
<h1 class="section">Right Answers Approval</h1>
<p><strong>Access:</strong> Operations → Right Answers → Pending</p>
<ol>
<li>Click <strong>Right Answers</strong> → <strong>Pending</strong> tab.</li>
<li>Read each submitted situation + suggested response.</li>
<li>Edit the response text if needed.</li>
<li>Click <strong>Approve</strong> (adds to live KB) or <strong>Reject</strong> (with optional feedback).</li>
</ol>

<div class="page-break"></div>
<h1 class="section">Front Desk SOPs Also Apply</h1>
<p>Managers have full access to all Front Desk procedures. Refer to the <strong>Front Desk SOP</strong> for:</p>
<ul>
<li>Shuttle dispatch (SOP-FD-02)</li>
<li>Guest request handling (SOP-FD-03)</li>
<li>Bank count (SOP-FD-04)</li>
<li>Call around log (SOP-FD-05)</li>
<li>Daily incident log (SOP-FD-06)</li>
<li>No show log (SOP-FD-07)</li>
<li>Room move log (SOP-FD-08)</li>
<li>KPI submission (SOP-FD-09)</li>
<li>Callout reporting (SOP-FD-10)</li>
</ul>
"""
DOCS.append(("Manager_SOP", "Manager / Supervisor SOP", "Standard Operating Procedures · v2.0", "Role: Manager / Department Supervisor", MGR_BODY))

# ── HOUSEKEEPING SOP ─────────────────────────
HK_BODY = """
<div class="page-break"></div>
<div class="quick-ref">
<div class="quick-ref-title">Quick Reference — Housekeeping Daily Tasks</div>
<table style="margin:0;">
<thead><tr><th>Task</th><th>Where</th><th>Time</th></tr></thead>
<tbody>
<tr><td>View your shift</td><td>Schedules tab</td><td>10 sec</td></tr>
<tr><td>Complete To-Do checklist</td><td>Position To-Dos</td><td>Per task</td></tr>
<tr><td>Handle a housekeeping request</td><td>Requests tab</td><td>20 sec</td></tr>
<tr><td>Submit KPIs</td><td>KPIs → Housekeeping</td><td>2 min</td></tr>
<tr><td>Report a callout</td><td>Callouts tab</td><td>1 min</td></tr>
<tr><td>Complete training</td><td>Learning &amp; HR</td><td>Per course</td></tr>
</tbody>
</table>
</div>

<div class="page-break"></div>
<div class="sop-num">SOP-HK-01</div>
<h1 class="section">Logging In</h1>
<ol>
<li>Open a browser → go to <code>attendaapp.com/staff</code>.</li>
<li>Enter your <strong>email</strong> and <strong>password</strong>.</li>
<li>Click <strong>Sign In</strong>.</li>
</ol>
<blockquote><strong>Can't log in?</strong> Contact your supervisor — they will reset your password from the Staff Management panel.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-HK-02</div>
<h1 class="section">Viewing Your Schedule</h1>
<p><strong>Access:</strong> Operations → Schedules</p>
<ol>
<li>Click <strong>Schedules</strong> in the Operations section.</li>
<li>The weekly grid shows the current week.</li>
<li>Find your name in the left column — your shifts are in the day columns.</li>
<li>Use ← → to view future weeks.</li>
</ol>
<blockquote><strong>→ TBD shifts:</strong> If your card shows "→ TBD" in amber, your start time is confirmed but the supervisor has not yet set the end time. Check with your supervisor.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-HK-03</div>
<h1 class="section">Position To-Do Checklist</h1>
<p><strong>Access:</strong> Operations → Position To-Dos</p>
<ol>
<li>Click <strong>Position To-Dos</strong> in the Operations section.</li>
<li>Today's checklist for your position loads automatically.</li>
<li>As you complete each physical task, check it off in Attenda.</li>
<li>Each checkbox is <strong>timestamped</strong> when checked.</li>
<li>When all items are done, click <strong>Submit Checklist</strong>.</li>
</ol>
<blockquote><strong>Important:</strong> Complete tasks physically first, then check them off. Do not check off tasks not yet done — supervisors use timestamps to track progress.</blockquote>
<h2 class="sub">Incomplete Tasks</h2>
<p>If a task cannot be completed: leave it unchecked, add a note if possible, and report to your supervisor verbally before shift end.</p>

<div class="page-break"></div>
<div class="sop-num">SOP-HK-04</div>
<h1 class="section">Handling Housekeeping Requests</h1>
<p><strong>Access:</strong> Today → Requests tab</p>
<ol>
<li>Click <strong>Requests</strong> — look for <strong>Housekeeping</strong> type requests (broom icon).</li>
<li>Click the request card → click <strong>Acknowledge</strong> (card turns blue).</li>
<li>Fulfill the request (deliver towels, service the room, etc.).</li>
<li>Click the card again → click <strong>Complete</strong> — card turns green, timestamped.</li>
</ol>
<blockquote><strong>Tip:</strong> Complete requests in Attenda the moment the physical task is done. Guests can see their request status in real time.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-HK-05</div>
<h1 class="section">Submitting Housekeeping KPIs</h1>
<p><strong>Access:</strong> Operations → KPIs → Housekeeping</p>
<ol>
<li>Click <strong>KPIs</strong> → select the <strong>Housekeeping</strong> category tab.</li>
<li>Enter values for each metric (Rooms Cleaned, CPOR, Inspection Score, etc.).</li>
<li>Click <strong>Submit</strong> — green checkmark confirms.</li>
</ol>
<blockquote><strong>When:</strong> Submit at the end of your shift, or as directed by your supervisor.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-HK-06</div>
<h1 class="section">Reporting a Callout</h1>
<p><strong>Access:</strong> Callouts tab</p>
<ol>
<li>Click <strong>Callouts</strong> in the left navigation.</li>
<li>Click <strong>Report Callout</strong>.</li>
<li>Fill in: Shift Date, Reason (Sick / Personal / Family Emergency / Other), Notes.</li>
<li>Click <strong>Submit</strong> — supervisor is notified immediately.</li>
</ol>
<blockquote class="warn">⚠ <strong>Also call your supervisor directly</strong> per hotel policy. Attenda creates the official record; the phone call is still required.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-HK-07</div>
<h1 class="section">Learning & HR</h1>
<p><strong>Access:</strong> Learning &amp; HR tab</p>
<h2 class="sub">Completing a Training Course</h2>
<ol>
<li>Click <strong>Learning &amp; HR</strong> → <strong>Courses</strong> tab.</li>
<li>Open an assigned course → read each module in order.</li>
<li>Complete the <strong>Quiz</strong> (multiple choice, 80% to pass).</li>
<li>A <strong>Certificate of Completion</strong> is awarded on passing.</li>
</ol>
<h2 class="sub">Acknowledging HR Documents</h2>
<ol>
<li>In Learning &amp; HR → <strong>Documents</strong> tab.</li>
<li>Open any document marked <strong>"Requires Acknowledgement"</strong>.</li>
<li>Read it, then click <strong>I Acknowledge</strong> — recorded automatically.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-HK-08</div>
<h1 class="section">Culture Hub</h1>
<p><strong>Access:</strong> Operations → Culture Hub</p>
<h2 class="sub">Viewing the Leaderboard</h2>
<ol>
<li>Click <strong>Culture Hub</strong> → <strong>Leaderboard</strong> tab.</li>
<li>Monthly points ranking shown. Your position and points are highlighted.</li>
</ol>
<h2 class="sub">Redeeming Points</h2>
<ol>
<li>Click the <strong>Rewards</strong> tab → browse the catalog.</li>
<li>Click <strong>Redeem</strong> on a reward you have enough points for.</li>
<li>Your supervisor will approve or deny the redemption.</li>
</ol>
"""
DOCS.append(("Housekeeping_SOP", "Housekeeping SOP", "Standard Operating Procedures · v2.0", "Role: Housekeeping Staff", HK_BODY))

# ── GENERAL STAFF SOP ────────────────────────
STAFF_BODY = """
<div class="page-break"></div>
<div class="quick-ref">
<div class="quick-ref-title">Quick Reference — General Staff Tasks</div>
<table style="margin:0;">
<thead><tr><th>Task</th><th>Where</th><th>Time</th></tr></thead>
<tbody>
<tr><td>View your schedule</td><td>Schedules tab</td><td>10 sec</td></tr>
<tr><td>Report a callout</td><td>Callouts tab</td><td>1 min</td></tr>
<tr><td>Submit KPIs</td><td>KPIs tab</td><td>2 min</td></tr>
<tr><td>Complete Position To-Dos</td><td>Position To-Dos</td><td>Per task</td></tr>
<tr><td>Search Right Answers</td><td>Right Answers tab</td><td>30 sec</td></tr>
<tr><td>Complete training</td><td>Learning &amp; HR</td><td>Per course</td></tr>
<tr><td>Check leaderboard</td><td>Culture Hub</td><td>30 sec</td></tr>
</tbody>
</table>
</div>

<div class="page-break"></div>
<div class="sop-num">SOP-ST-01</div>
<h1 class="section">Logging In</h1>
<ol>
<li>Open a browser on any device → go to <code>attendaapp.com/staff</code>.</li>
<li>Enter your <strong>email</strong> and <strong>password</strong>. Click <strong>Sign In</strong>.</li>
</ol>
<blockquote><strong>First time logging in?</strong> Your manager set a temporary password. Change it: click your name (top-right) → Account Settings → update password → Save.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-ST-02</div>
<h1 class="section">Viewing Your Schedule</h1>
<p><strong>Access:</strong> Operations → Schedules</p>
<ol>
<li>Click <strong>Schedules</strong> in the Operations section.</li>
<li>The weekly grid shows the current week — find your name on the left.</li>
<li>Use ← → to navigate to future or past weeks.</li>
</ol>
<blockquote><strong>Published schedules only:</strong> You can only see your schedule after a manager has published it. If blank, ask your manager if the week has been published.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-ST-03</div>
<h1 class="section">Reporting a Callout</h1>
<p><strong>Access:</strong> Callouts tab</p>
<ol>
<li>Click <strong>Callouts</strong> in the left navigation.</li>
<li>Click <strong>Report Callout</strong>.</li>
<li>Fill in: Shift Date, Reason, Notes.</li>
<li>Click <strong>Submit</strong> — your manager sees it immediately.</li>
</ol>
<blockquote class="warn">⚠ <strong>Attenda does not replace calling your manager.</strong> Per hotel policy, also call or text your direct supervisor. Attenda creates the official record.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-ST-04</div>
<h1 class="section">Submitting KPIs</h1>
<p><strong>Access:</strong> Operations → KPIs</p>
<ol>
<li>Click <strong>KPIs</strong> → click your department's category tab.</li>
<li>Enter values for each metric in the list.</li>
<li>Click <strong>Submit</strong> — green checkmark confirms it was saved.</li>
</ol>
<blockquote><strong>When:</strong> At the end of your shift or at the time your manager specifies. Each category can only be submitted once per day per person.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-ST-05</div>
<h1 class="section">Position To-Do Checklist</h1>
<p><strong>Access:</strong> Operations → Position To-Dos</p>
<ol>
<li>Click <strong>Position To-Dos</strong> in Operations.</li>
<li>Today's checklist for your position loads automatically.</li>
<li>Complete each task physically, then check it off in Attenda.</li>
<li>When all items are done, click <strong>Submit Checklist</strong>.</li>
</ol>
<blockquote><strong>Each checkbox is timestamped</strong> when you check it — be honest. Do not check off tasks you haven't done.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-ST-06</div>
<h1 class="section">Right Answers Knowledge Base</h1>
<p><strong>Access:</strong> Operations → Right Answers</p>
<h2 class="sub">Searching for an Answer</h2>
<ol>
<li>Click <strong>Right Answers</strong> → type keywords in the search bar.</li>
<li>Matching KB articles appear ranked by relevance.</li>
<li>Read the <strong>Approved Response</strong> and use it as your guide.</li>
</ol>
<h2 class="sub">Getting an AI Suggestion</h2>
<ol>
<li>If no KB article matches, click <strong>Get AI Suggestion</strong>.</li>
<li>Wait 2–5 seconds — a suggested professional response appears.</li>
<li>Use as a starting point and adapt to your specific situation.</li>
</ol>
<blockquote><strong>AI suggestions are not official policy.</strong> If unsure, escalate to a manager before responding to the guest.</blockquote>
<h2 class="sub">Submitting a Suggestion</h2>
<ol>
<li>Click <strong>Suggest Answer</strong> on the search results screen.</li>
<li>Describe the situation and your suggested response → Submit.</li>
<li>A manager will review and approve for the knowledge base.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-ST-07</div>
<h1 class="section">Learning & HR</h1>
<p><strong>Access:</strong> Learning &amp; HR tab</p>
<h2 class="sub">Completing a Course</h2>
<ol>
<li>Click <strong>Learning &amp; HR</strong> → <strong>Courses</strong> tab.</li>
<li>Open an assigned course → read each module in order.</li>
<li>Complete the <strong>Quiz</strong> (multiple choice, 80% to pass).</li>
<li>Certificate of Completion is issued automatically.</li>
</ol>
<blockquote><strong>Failed the quiz?</strong> Review the modules and retake it — no limit on attempts.</blockquote>
<h2 class="sub">Acknowledging HR Documents</h2>
<ol>
<li>In Learning &amp; HR → <strong>Documents</strong> tab.</li>
<li>Open documents marked <strong>"Requires Acknowledgement"</strong>.</li>
<li>Read, then click <strong>I Acknowledge</strong>.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-ST-08</div>
<h1 class="section">Culture Hub</h1>
<p><strong>Access:</strong> Operations → Culture Hub</p>
<h2 class="sub">Points &amp; Leaderboard</h2>
<p>Monthly points ranking across all staff. Points earned via: KPI submissions on time, training completions, guest commendations, attendance &amp; punctuality. Resets each month.</p>
<ol>
<li>Click <strong>Culture Hub</strong> → <strong>Leaderboard</strong> tab — see your rank and points.</li>
</ol>
<h2 class="sub">Redeeming Rewards</h2>
<ol>
<li>Click the <strong>Rewards</strong> tab → browse catalog (shows point cost per reward).</li>
<li>Click <strong>Redeem</strong> on a reward you can afford.</li>
<li>Your manager reviews and approves or denies the request.</li>
</ol>
<h2 class="sub">Team Events</h2>
<ol>
<li>Click the <strong>Events</strong> tab — upcoming team meetings and events listed here.</li>
<li>RSVP if the event has an attendance option.</li>
</ol>
"""
DOCS.append(("Staff_SOP", "General Staff SOP", "Standard Operating Procedures · v2.0", "Role: All Staff (Non-Management)", STAFF_BODY))

# ── VENDOR SOP ───────────────────────────────
VD_BODY = """
<div class="page-break"></div>
<div class="quick-ref">
<div class="quick-ref-title">Quick Reference — Vendor Daily Tasks</div>
<table style="margin:0;">
<thead><tr><th>Task</th><th>Where</th><th>Time</th></tr></thead>
<tbody>
<tr><td>Log in to Vendor Portal</td><td>attendaapp.com/vendor</td><td>15 sec</td></tr>
<tr><td>Accept a new order</td><td>Order Board — New column</td><td>10 sec</td></tr>
<tr><td>Update order to Preparing</td><td>Order Board card</td><td>5 sec</td></tr>
<tr><td>Mark order Ready</td><td>Order Board card</td><td>5 sec</td></tr>
<tr><td>Mark order Delivered</td><td>Order Board card</td><td>5 sec</td></tr>
<tr><td>Add a menu item</td><td>Menu tab</td><td>2 min</td></tr>
<tr><td>View daily manifest</td><td>Manifest tab</td><td>30 sec</td></tr>
</tbody>
</table>
</div>

<div class="page-break"></div>
<div class="sop-num">SOP-VD-01</div>
<h1 class="section">Logging In to the Vendor Portal</h1>
<p><strong>URL:</strong> <code>attendaapp.com/vendor</code></p>
<ol>
<li>Open a browser on any device → go to <code>attendaapp.com/vendor</code>.</li>
<li>Enter the <strong>email address</strong> and <strong>password</strong> provided by the hotel.</li>
<li>Click <strong>Sign In</strong> — the Order Board loads.</li>
</ol>
<blockquote><strong>First time logging in?</strong> The hotel admin sent your credentials via email. If you did not receive them, contact the hotel's front desk or admin.<br/><strong>Your login shows only YOUR orders</strong> — scoped to your business only.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-VD-02</div>
<h1 class="section">Managing Incoming Orders</h1>
<p><strong>Access:</strong> Order Board (main screen after login)</p>
<h2 class="sub">Understanding the Order Board</h2>
<p>A Kanban board with four columns: <strong>New → Received → Preparing → Ready</strong>. A fifth column <strong>Delivered</strong> holds completed orders. New orders appear in the New column with an audio notification.</p>

<h2 class="sub">Processing an Order — Step by Step</h2>
<h3 class="sub2">Step 1: Accept the Order</h3>
<ol>
<li>Find the order in the <strong>New</strong> column.</li>
<li>Review: guest name, room, items, special instructions, total.</li>
<li>Click <strong>Accept Order</strong> → card moves to <strong>Received</strong>.</li>
</ol>
<blockquote>Accept as soon as you see the order. Guests track status in real time — a fast acceptance builds confidence.</blockquote>

<h3 class="sub2">Step 2: Begin Preparation</h3>
<ol>
<li>Start preparing the order.</li>
<li>Click <strong>Start Preparing</strong> → card moves to <strong>Preparing</strong>.</li>
</ol>

<h3 class="sub2">Step 3: Mark as Ready</h3>
<ol>
<li>When order is packaged and ready for pickup/delivery:</li>
<li>Click <strong>Mark Ready</strong> → card moves to <strong>Ready</strong>.</li>
<li>Hotel staff and guest are notified automatically.</li>
</ol>

<h3 class="sub2">Step 4: Mark as Delivered</h3>
<ol>
<li>When the order has reached the guest:</li>
<li>Click <strong>Mark Delivered</strong> → card moves to <strong>Delivered</strong>.</li>
</ol>

<h2 class="sub">Status Summary</h2>
<table>
<thead><tr><th>Button</th><th>Transition</th><th>Guest Sees on /track</th></tr></thead>
<tbody>
<tr><td>Accept Order</td><td>New → Received</td><td>Order Received</td></tr>
<tr><td>Start Preparing</td><td>Received → Preparing</td><td>Preparing Your Order</td></tr>
<tr><td>Mark Ready</td><td>Preparing → Ready</td><td>Your Order is Ready</td></tr>
<tr><td>Mark Delivered</td><td>Ready → Delivered</td><td>Delivered ✓</td></tr>
</tbody>
</table>
<blockquote><strong>Real-time:</strong> Every status change updates the guest's /track page instantly via Supabase Realtime. Keep status accurate and current.</blockquote>

<div class="page-break"></div>
<div class="sop-num">SOP-VD-03</div>
<h1 class="section">Order Manifest</h1>
<p><strong>Access:</strong> Manifest tab</p>
<ol>
<li>Click the <strong>Manifest</strong> tab in the Vendor Portal.</li>
<li>Today's orders appear in a flat list sorted by time.</li>
<li>Filter by Status (All / Active / Completed) or Time (Last hour / Today).</li>
<li>Use for end-of-day reconciliation or prep volume planning.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-VD-04</div>
<h1 class="section">Managing Your Menu</h1>
<p><strong>Access:</strong> Menu tab in Vendor Portal</p>
<h2 class="sub">Adding a New Menu Item</h2>
<ol>
<li>Click the <strong>Menu</strong> tab → <strong>+ Add Item</strong>.</li>
<li>Fill in:</li>
</ol>
<table>
<thead><tr><th>Field</th><th>Description</th></tr></thead>
<tbody>
<tr><td>Item Name</td><td>The dish or product name</td></tr>
<tr><td>Description</td><td>Short description (ingredients, style)</td></tr>
<tr><td>Price</td><td>Price in dollars (e.g., 14.99)</td></tr>
<tr><td>Category</td><td>Appetizer / Main / Dessert / Drink / Other</td></tr>
<tr><td>Photo</td><td>High-quality image (JPEG or PNG, min 800px wide)</td></tr>
<tr><td>Active</td><td>Toggle ON to make visible to guests</td></tr>
</tbody>
</table>
<ol start="3">
<li>Click <strong>Save</strong> — item appears in the guest ordering app immediately.</li>
</ol>

<h2 class="sub">Editing a Menu Item</h2>
<ol>
<li>In the Menu tab, click the item to open the edit drawer.</li>
<li>Modify any field → click <strong>Save</strong>. Changes are live immediately.</li>
</ol>

<h2 class="sub">Temporarily Hiding an Item (86'd / Sold Out)</h2>
<ol>
<li>Open the item in the edit drawer.</li>
<li>Toggle <strong>Active</strong> to <strong>OFF</strong> → click <strong>Save</strong>.</li>
<li>Item disappears from the guest app immediately.</li>
<li>Re-enable the same way when available again.</li>
</ol>
<blockquote><strong>Tip:</strong> Use Active toggle instead of deleting items you may bring back. Deletion is permanent.</blockquote>

<h2 class="sub">Deleting a Menu Item</h2>
<ol>
<li>Open the item in the edit drawer.</li>
<li>Click <strong>Delete Item</strong> (red button at the bottom) → confirm deletion.</li>
</ol>

<div class="page-break"></div>
<div class="sop-num">SOP-VD-05</div>
<h1 class="section">Applying as a New Partner</h1>
<p><em>For businesses not yet onboarded. Skip if already active in the Vendor Portal.</em></p>
<p><strong>URL:</strong> <code>attendaapp.com/apply?hotel={hotel-slug}</code> (provided by the hotel)</p>
<ol>
<li>Visit the apply link provided by the hotel.</li>
<li>Fill in the application form:</li>
</ol>
<table>
<thead><tr><th>Field</th><th>Required</th></tr></thead>
<tbody>
<tr><td>Business / Restaurant Name</td><td>✓</td></tr>
<tr><td>Contact Name</td><td>✓</td></tr>
<tr><td>Phone Number</td><td>✓</td></tr>
<tr><td>Email Address</td><td>✓</td></tr>
<tr><td>Business Type</td><td>✓ (Restaurant / Transport / Service / Experience)</td></tr>
<tr><td>Description</td><td>Optional</td></tr>
</tbody>
</table>
<ol start="3">
<li>Click <strong>Submit Application</strong>.</li>
<li>Success message: <em>"Application received! We'll be in touch within 24 hours."</em></li>
</ol>
<blockquote><strong>After submission:</strong> The hotel admin reviews your application. If approved, you receive an email with your Vendor Portal login credentials.</blockquote>
"""
DOCS.append(("Vendor_SOP", "Vendor / Partner SOP", "Standard Operating Procedures · v2.0", "Role: Restaurant / Transport / Service Partner", VD_BODY))

# ── GENERATE PDFs ────────────────────────────
for filename, title, subtitle, role, body in DOCS:
    html = wrap(title, subtitle, role, body)
    html_path = f"/home/user/attendapp/docs/pdf/{filename}.html"
    pdf_path  = f"/home/user/attendapp/docs/pdf/{filename}.pdf"
    with open(html_path, "w") as f:
        f.write(html)
    print(f"Generating {pdf_path} ...")
    result = subprocess.run(
        ["weasyprint", html_path, pdf_path],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  WARN: {result.stderr[:300]}")
    else:
        print(f"  OK")

print("Done.")
