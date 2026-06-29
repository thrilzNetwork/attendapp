<div style="font-family: 'Georgia', serif; color: #1a1a2e; max-width: 900px; margin: 0 auto; padding: 40px;">

<div style="text-align: center; padding: 60px 40px; background: linear-gradient(135deg, #7B1C3E 0%, #3d0e1f 100%); color: white; border-radius: 8px; margin-bottom: 50px;">

# ATTENDA — FRONT DESK SOP

<p style="font-size: 1.1rem; letter-spacing: 0.2em; color: #f0c0d0; margin: 10px 0;">STANDARD OPERATING PROCEDURES · VERSION 2.0</p>
<p style="color: #e0a0b5;">Role: Front Desk Agent / Staff</p>
<p style="font-size: 0.85rem; color: #c49aaa;">Quantum Hospitality Solutions · Confidential · June 2026</p>

</div>

## QUICK REFERENCE

| Task | Where | Time |
|------|-------|------|
| Dispatch a shuttle | Shuttle tab → + New Pickup | 30 seconds |
| Handle a guest request | Requests tab | 20 seconds |
| Log a call-around | Daily Ops → Call Around | 15 seconds |
| Complete bank count | Daily Ops → Bank Count | 3 minutes |
| Log an incident | Daily Ops → Daily Logs | 1 minute |
| Log a no-show | Daily Ops → No Shows | 30 seconds |
| Log a room move | Daily Ops → Room Moves | 30 seconds |
| Submit KPIs | KPIs tab | 2 minutes |
| Report a callout | Callouts tab | 1 minute |

---

# <span style="color: #7B1C3E;">SOP-FD-01 — LOGGING IN</span>

---

**Steps:**

1. Open a browser and go to `attendaapp.com/staff`.
2. Enter your **email address** and **password**.
3. Click **Sign In**.
4. The Dashboard loads — you are now logged in.

> **Can't log in?** Contact your manager to reset your password or verify your account is active.

---

# <span style="color: #7B1C3E;">SOP-FD-02 — SHUTTLE DISPATCH</span>

---

**Purpose:** Log and assign shuttle pickups and dropoffs in real time.

**Access:** Operations → Shuttle → Today tab

### Dispatching a New Pickup (Phone Call from Guest)

When a guest calls requesting a shuttle:

1. Click **Shuttle** in the Operations section.
2. Click **+ New Pickup** (always visible at the top of the page).
3. The dispatch form opens as a bottom sheet. Fill in:

| Field | What to Enter |
|-------|--------------|
| **Type** | Toggle **Arrival** (guest coming to hotel) or **Departure** (guest going to airport) |
| **Guest Name** | Guest's full name |
| **Room #** | Guest's room number |
| **Party Size** | Use **−** and **+** to set the number of people |
| **Pickup Location** | For Arrival: select terminal (Terminal 1–4, Cruise, Curbside). For Departure: "Hotel Lobby" auto-fills |
| **Drop-Off** | For Arrival: "Hotel" auto-fills. For Departure: select MIA / FLL / Port Everglades / Other |
| **Requested Time** | Set to the time the guest needs pickup (defaults to next hour slot) |
| **Notes** | Flight number, cruise ship, special instructions |
| **Assign To** | Select **In-House Driver** from the dropdown, or choose **Send Uber** |

4. Click **Submit** — the pickup appears instantly in the hourly timeline.

### Reading the Hourly Timeline

The **Today** tab shows all of today's shuttles in hour rows:

```
8:00 AM  │  [Maria R. · Rm 204 · 2 pax · Terminal 3 → Hotel]  🚌 John D.
9:00 AM  │  —
10:00 AM │  [Carlos M. · Rm 118 · 1 pax · Hotel → FLL]  🚗 Uber
```

**Color meanings:**
- **Amber** = Pending (not yet assigned)
- **Blue** = Assigned to driver
- **Teal** = En route / in progress
- **Green** = Completed
- **Gray strikethrough** = Cancelled

### Updating Shuttle Status

For in-house runs, update status as the driver reports in:

1. Find the shuttle card in the timeline.
2. Click **Mark En Route** when the driver departs → card turns teal.
3. Click **Complete** when the run finishes → card turns green.

> **Uber rides:** Status updates automatically via the Uber Direct integration. No manual update needed.

### Sending Uber Instead of In-House Driver

1. In the dispatch form, select **Send Uber** under "Assign To."
2. The driver dropdown disappears.
3. Click **Submit** — Uber is dispatched immediately.
4. An Uber tracking link appears on the card — you can share this with the guest.

---

# <span style="color: #7B1C3E;">SOP-FD-03 — HANDLING GUEST REQUESTS</span>

---

**Purpose:** Acknowledge, assign, and resolve guest service requests.

**Access:** Today → Requests tab

### Viewing Incoming Requests

1. Click **Requests** in the Today section.
2. New requests appear at the top with an **amber** color.
3. Each card shows: guest name, room, request type, and time since submission.

### Acknowledging a Request

1. Click on the request card.
2. Click **Acknowledge** — the card turns blue and stops showing the amber alert.
3. This confirms to the system (and the guest's tracking page) that the request has been seen.

### Assigning a Request

1. On the request card, click **Assign**.
2. Select the staff member responsible from the dropdown.
3. Click **Assign** — the staff member's name appears on the card.

### Completing a Request

1. On the request card, click **Complete**.
2. The card turns green and is timestamped.
3. The request is archived but remains searchable.

### Messaging a Guest

1. On the request card, click **Message**.
2. A message thread opens.
3. Type your response and click **Send**.
4. The guest can see and reply to messages in the hotel guest app.

**Request types you'll see:**

| Icon | Type | Action |
|------|------|--------|
| 🍽 | Food Order | Confirm with vendor if needed |
| 🔧 | Maintenance | Assign to maintenance staff |
| 🛏 | Housekeeping | Assign to housekeeping |
| 🚗 | Transport | Handle via Shuttle tab |
| 💬 | Guest Message | Reply via message thread |
| ✨ | Amenity Request | Fulfil or assign |

---

# <span style="color: #7B1C3E;">SOP-FD-04 — BANK COUNT</span>

---

**Purpose:** Count the cash drawer at the start and end of every shift.

**Access:** Daily Ops → Bank Count

### Performing a Bank Count

1. Click **Daily Ops** in the left navigation.
2. Click the **Bank Count** sub-tab.
3. Count each denomination in the drawer and enter the quantity:

| Denomination | Enter Quantity |
|-------------|---------------|
| $100 Bills | [qty] |
| $50 Bills | [qty] |
| $20 Bills | [qty] |
| $10 Bills | [qty] |
| $5 Bills | [qty] |
| $1 Bills | [qty] |
| Half-Dollars ($.50) | [qty] |
| Quarters ($.25) | [qty] |
| Dimes ($.10) | [qty] |
| Nickels ($.05) | [qty] |
| Pennies ($.01) | [qty] |

4. Enter **Paid Outs** (any cash paid out of the drawer during the shift).
5. Enter **Petty Cash** (float amount set aside).
6. Review the auto-calculated totals:
   - **Drawer Total** = Sum of all denominations
   - **Net Drawer** = Drawer Total − Paid Outs − Petty Cash
7. Click **Submit Count** — logged with your name and timestamp.

> **Do this:** Shift Start count + Shift End count = two submissions per shift. Any discrepancy is flagged for manager review.

---

# <span style="color: #7B1C3E;">SOP-FD-05 — CALL AROUND LOG</span>

---

**Purpose:** Record outbound calls made to guests (wake-up calls, confirmations, follow-ups).

**Access:** Daily Ops → Call Around

### Logging a Call

1. Click **Daily Ops** → **Call Around**.
2. Click **+ Log Call**.
3. Fill in:

| Field | Options |
|-------|---------|
| Guest Name | Free text |
| Room Number | Free text |
| Call Type | Wake-Up / Confirmation / Follow-Up / Other |
| Time of Call | Auto-fills to now; adjust if logging retroactively |
| Outcome | Answered / No Answer / Left Message |
| Notes | Any relevant info from the call |

4. Click **Save** — the call is logged immediately.

---

# <span style="color: #7B1C3E;">SOP-FD-06 — DAILY INCIDENT LOG</span>

---

**Purpose:** Record notable events, incidents, and operational notes during your shift.

**Access:** Daily Ops → Daily Logs

### Logging an Incident

1. Click **Daily Ops** → **Daily Logs**.
2. Click **+ New Entry**.
3. Select a **Category**:
   - Guest Incident
   - Maintenance
   - Safety
   - Lost & Found
   - VIP
   - Other
4. Write a clear **Description** of what happened.
5. Note the **Action Taken** — what was done to resolve it.
6. Click **Save** — timestamped with your name.

> **Best practice:** Log everything, even minor incidents. The GM reviews daily logs each morning.

---

# <span style="color: #7B1C3E;">SOP-FD-07 — NO SHOW LOG</span>

---

**Purpose:** Record guests who did not arrive and could not be reached.

**Access:** Daily Ops → No Shows

### Logging a No Show

1. Click **Daily Ops** → **No Shows**.
2. Click **+ Log No Show**.
3. Fill in:
   - Guest Name
   - Room / Reservation reference
   - Reservation date
   - Number of contact attempts made
   - Notes
4. Click **Save**.

---

# <span style="color: #7B1C3E;">SOP-FD-08 — ROOM MOVE LOG</span>

---

**Purpose:** Record when a guest is moved from one room to another.

**Access:** Daily Ops → Room Moves

### Logging a Room Move

1. Click **Daily Ops** → **Room Moves**.
2. Click **+ Log Room Move**.
3. Fill in:
   - Guest Name
   - Original Room number
   - New Room number
   - Reason: Maintenance / Upgrade / Guest Request / Other
   - Notes
4. Click **Save** — logged with your name and timestamp.

---

# <span style="color: #7B1C3E;">SOP-FD-09 — SUBMITTING KPIs</span>

---

**Purpose:** Enter daily performance metrics for the Front Desk department.

**Access:** Operations → KPIs → Front Desk

### Submitting Daily KPIs

1. Click **KPIs** in the Operations section.
2. Select the **Front Desk** category tab.
3. Enter values for each metric (e.g., Check-In Wait Time, Upsell Conversions).
4. Click **Submit** — a checkmark confirms the submission.

> **When:** Submit KPIs at the end of your shift or when prompted by your manager.

---

# <span style="color: #7B1C3E;">SOP-FD-10 — REPORTING A CALLOUT</span>

---

**Purpose:** Formally notify management that you cannot make your scheduled shift.

**Access:** Callouts tab (visible to all staff)

### Submitting a Callout

1. Click **Callouts** in the left navigation.
2. Click **Report Callout**.
3. Fill in:

| Field | Options |
|-------|---------|
| Shift Date | The date you are calling out from |
| Reason | Sick / Personal / Family Emergency / Other |
| Notes | Optional additional context |

4. Click **Submit** — your manager is notified immediately.

> ⚠️ **This does not replace calling your manager.** Always also call or text your direct supervisor per hotel policy. The Attenda callout creates the official record.

---

*ATTENDA · Confidential · Do Not Distribute · Front Desk SOP v2.0 · June 2026*

</div>
