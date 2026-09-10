# ATTENDA PRODUCT REORGANIZATION — DEV DIRECTION

> Preserved verbatim 2026-09-09. Governing direction for the Attenda rebuild. Applies on the B1/V1 engine (main = `a5dff17`, Aug 27 classic app). No new features until the structure below is clean.

⸻

The problem with Attenda right now is not lack of functionality.

The product already has a lot of useful functionality.

The problem is that too many things are competing for attention, some features overlap, and the product does not always make it obvious:

What is happening?
What matters to me?
What do I need to do next?

We should not keep adding features until this is fixed.

The direction is to go back to the strength of the original B1 concept, preserve the functionality that already works, and rebuild the experience around a much clearer operating model.

Attenda should feel like a hotel operating system built by hotel operators.

It should not feel like a generic AI-generated SaaS dashboard.

It should not feel like a PMS.

It should not try to put every feature on the dashboard.

And it should not duplicate information just because the data exists.

⸻

## 1. CORE PRODUCT PRINCIPLE

Every screen in Attenda needs one clear job.

The user should never have to wonder:

“Where does this live?”

or

“Why am I seeing this here and somewhere else?”

We need to establish ownership for every type of information.

For example:

Dashboard = What is happening now?

Requests = What has someone requested?

To-Dos = What am I responsible for doing?

KPIs = What are we measuring?

Schedule = Who is working and when?

Forecast = What is coming?

Comp Set = What are competitors doing?

Transportation = Transportation operations only.

Culture = People, recognition, birthdays, events, celebrations.

Right Answers = SOPs and operational knowledge.

Learning Hub = Training and certification.

That separation should be protected.

Do not recreate the same module inside three different areas.

⸻

## 2. DO NOT REBUILD THE ENGINE

We are not starting Attenda from zero.

Treat B1/current working functionality as the underlying engine.

Before touching features:

1. Inventory what currently exists.
2. Identify what works.
3. Identify duplicated functionality.
4. Identify functionality that belongs in a different area.
5. Remove unnecessary UI noise.
6. Rebuild presentation and navigation around the existing functions.

The objective is:

Keep the functionality. Simplify the experience.

We are not trying to prove that we can build more software.

We are trying to make the software we already built extremely easy to operate.

⸻

## 3. ATTENDA DASHBOARD

The dashboard needs the biggest correction.

Right now it is trying to be too many things.

The dashboard should become the hotel’s live operating snapshot.

A staff member should be able to open Attenda and understand the property in roughly five seconds.

Do not turn it into a giant analytics page.

Do not put full modules on the dashboard.

Use summaries that link into the appropriate module.

⸻

### Dashboard Header

Keep this very simple.

Example:

Good Evening, Alejandro

Wednesday, September 9

Then underneath:

Manager Brief

A short property message or operational note.

Examples:

“Sold-out arrival pattern expected tonight. Focus on room readiness and parking communication.”

or

“QA week — every guest is an inspector.”

This should not dominate the screen.

It is context.

⸻

## 4. HOTEL SNAPSHOT

Immediately after the greeting, show the operational picture of the hotel.

This information is based on the data the hotel enters into Attenda.

No PMS integration is required for this concept.

Example:

27 Rooms Sold

50% Occupancy

27 / 54 Rooms

Then clearly show:

Updated 3:08 PM

This is extremely important.

If the information is staff-entered, the user needs to know how fresh the information is.

Potential snapshot items:

Rooms Sold

Occupancy %

Arrivals

Departures

In-House

Out of Order / Out of Service rooms, if tracked

Forecast occupancy for tomorrow

But keep this visually compact.

We do not need ten giant KPI cards.

Think more like an operational instrument panel.

⸻

## 5. GUEST FEEDBACK / MEDALLIA

Guest feedback belongs on the Dashboard because it gives the entire hotel context.

But again, this is a snapshot.

Example:

Guest Feedback

Month-to-Date Score: 84.2

Goal: 85

Trend: +1.8 vs previous month

3 New Surveys Today

If Attenda is manually receiving the score, show:

Last Updated: September 9 · 8:00 AM

Clicking this should eventually open the deeper KPI/feedback view.

Do not create a full Medallia analytics product on the dashboard.

⸻

## 6. WHAT NEEDS ATTENTION

This should be one of the strongest elements on the Dashboard.

Instead of scattering alerts across different widgets, create one consolidated area:

Needs Attention

Example:

2 overdue requests

1 critical maintenance item

3 incomplete inspections

1 department checklist overdue

Forecast has not been updated today

Guest feedback score below target

The Dashboard should summarize these.

Clicking one takes the user directly to the source.

Do not duplicate the request itself.

Do not duplicate the work order.

Do not duplicate the inspection.

The Dashboard simply tells the operator:

Something needs your attention.

⸻

## 7. MY WORK TODAY

The dashboard should also answer:

What do I personally have to do?

This is different from the hotel-wide operating snapshot.

Example:

My Work Today

Shift: 3:00 PM – 11:00 PM

3 Assigned To-Dos

1 Checklist Due

1 Training Item

2 Requests Assigned to Me

Then:

Open My Day

Do not put the entire My Day screen on the Dashboard.

The Dashboard gives the preview.

My Day contains the actual work.

⸻

## 8. STAFF ON DUTY

Keep this lightweight.

Example:

8 Team Members On Duty

Front Desk 2

Housekeeping 4

Maintenance 1

Management 1

Click:

View Schedule

Again, the full weekly schedule belongs in Schedule.

The dashboard only tells you who is working now.

⸻

## 9. TODAY’S ACTIVITY

This can remain, but it should not become an endless audit log.

Use it for meaningful operational movement.

Examples:

Room inspection completed

Transportation request created

Maintenance issue verified

Checklist completed

Guest request resolved

Training assigned

Keep perhaps the most recent 5–8 meaningful activities.

Then:

View Activity

⸻

## 10. REQUESTS

Requests needs to remain extremely clean.

This is where requests live.

A request is something someone needs from the operation.

Examples:

Guest requests towels

Manager requests room inspection

Front desk asks maintenance to check AC

Department asks for transportation

Request structure:

Open

Assigned

In Progress

Completed

Overdue

Every request should have:

Request

Location / Room when appropriate

Department

Assigned person

Priority

Created time

Due time if applicable

Status

Do not turn Requests into To-Dos.

A request can generate a To-Do if appropriate, but they are different concepts.

⸻

## 11. TO-DOS

To-Dos are responsibilities or assignments.

They may belong to:

A specific employee

A position

A department

A shift

Examples:

Night Audit:

Run nightly reports

Verify high balances

Complete cash verification

Send operating package

AM Front Desk:

Review arrivals

Check VIP arrivals

Review open guest requests

Manager:

Review labor

Walk property

Review guest feedback

Approve callouts

This becomes very powerful because Attenda can create reusable To-Do Packs.

Examples:

Morning Shift Pack

Night Audit Pack

MOD Pack

Breakfast Opening Pack

Housekeeping Supervisor Pack

This is eventually where Marketplace can become useful.

Properties could share or adopt operational packs.

⸻

## 12. KPIs

KPIs should stop competing with Dashboard data.

Dashboard = current snapshot.

KPIs = what the hotel intentionally tracks over time.

Examples:

Guest satisfaction

Inspection score

Checklist completion

Request response time

Maintenance completion

Training completion

Housekeeping productivity

Transportation metrics

Attenda-channel performance

Each KPI needs:

Name

Target

Current result

Trend

Owner

Measurement frequency

Last updated

A KPI without ownership and cadence is just another number.

The KPI page should help management understand performance, not simply display cards.

⸻

## 13. SCHEDULES

Schedules should be the operational schedule for the property.

Do not mix schedules into My Day other than showing the employee’s own shift.

The Schedule module should show:

Today

Week

Department

Employee

Role

Shift

Hours

Open shift

Callout impact

The schedule can eventually use Attenda staffing models.

For example:

54-room property.

Projected occupancy: 80%.

Recommended Front Desk Coverage:

AM: 2

PM: 2

Night Audit: 1

Recommended Housekeeping Hours based on:

Checkouts

Stayovers

Cleaning-minute assumptions

This makes Attenda useful without becoming payroll software.

⸻

## 14. TRANSPORTATION

Transportation should be its own operational vertical.

Do not put generic Requests inside Transportation.

Transportation Requests belong here.

Examples:

Airport shuttle

Cruise port

Local transportation

Taxi request

Partner transportation

Departure time

Guest count

Pickup location

Destination

Status

Driver

Vehicle

Partner

This can eventually connect to external transportation partners or APIs.

But the UI must remain understandable even without an integration.

⸻

## 15. COMP SET

Comp Set should represent intelligence gathered about competing hotels.

If staff are calling competitors, this is where those observations live.

Example:

Hotel A

Rate: $189

Availability: Yes

Parking: $20

Breakfast: Included

Hotel B

Rate: $209

Availability: Limited

Notes

Then show:

Last updated

Who updated it

This is operational market intelligence.

It should not get mixed with hotel Forecast.

⸻

## 16. FORECAST

Forecast needs to become an important daily operating habit.

This screen should answer:

What is the hotel expecting?

Show:

Today

Tomorrow

Next 7 Days

Possibly next several weeks

Core data:

Rooms Sold

Occupancy %

Available Rooms

Expected Arrivals

Expected Departures

Pickup

Previous Forecast

Current Forecast

Change

Example:

Friday

Yesterday: 38 rooms

Today: 44 rooms

Pickup: +6

Occupancy: 81%

That immediately tells management something changed.

Very important:

Show:

Last Updated Today at 3:16 PM

If the forecast has not been updated:

Forecast update required

This can appear in Dashboard → Needs Attention.

Forecast should become one of the hotel’s daily operating disciplines.

⸻

## 17. CULTURE

Culture should feel completely different from operations.

This is the human side of the hotel.

Examples:

Birthdays

Work anniversaries

Recognition

Employee of the Month

Awards

Property events

Team achievements

Guest compliments mentioning staff

New hires

Certifications earned

This should be positive and visual.

Do not mix performance warnings or disciplinary items into Culture.

⸻

## 18. RIGHT ANSWERS

Right Answers is the operational knowledge base.

This is where SOPs live.

But we should avoid making it feel like a document warehouse.

Search should be prominent.

Example:

How do I handle an early arrival?

What do I do if a guest disputes a charge?

How do I reset a room thermostat?

What is the Night Audit process?

The user should get the correct property-approved answer.

Right Answers =

SOP

Policy

Procedure

Operational answer

Reference

This can eventually become one of Attenda’s strongest AI use cases.

But the UI should present it as hotel knowledge, not “Chat with AI.”

⸻

## 19. LEARNING HUB

Right Answers teaches someone what the procedure is.

Learning Hub proves they learned it.

Keep those separate.

Learning Hub should contain:

Courses

Micro-training

Certification

Assigned learning

Required learning

Training history

Skill progression

If recurring operational failures occur, Attenda can recommend training.

Example:

Same breakfast setup inspection failed three times.

Attenda suggests:

Assign Breakfast Setup Certification

That connects operations to learning without cluttering the interface.

⸻

## 20. MARKETPLACE

Marketplace should not be a random app store.

It should eventually be the Attenda operating community.

Hotels can discover:

To-Do Packs

Checklist Packs

SOP Packs

KPI templates

Training packs

Operational models

Community-created resources

Example:

Night Audit Excellence Pack

Includes:

Night Audit checklist

Required reports

High-balance review

Security walk

Morning handoff

Marketplace becomes the distribution layer for Attenda knowledge.

⸻

## 21. PROPERTY INFO

This is the reference page for information about the hotel itself.

Examples:

Hotel address

Phone

Wi-Fi process

Emergency numbers

Airport information

Parking information

Breakfast hours

Pool hours

Pet policy

House rules

Local information

Important property contacts

Do not mix this with Property Settings.

Property Info is what employees need to know.

Property Settings is configuration.

⸻

## 22. ATTENDA REVENUE

Keep this concept clearly separated from hotel financial performance.

Attenda Revenue means revenue generated through the Attenda channel.

Examples:

Transportation

Experiences

Food ordering

Restaurant partnerships

Local offers

Marketplace/partner transactions

Potential view:

Today

MTD

Transactions

Average Order

Partner Revenue

Property Share

Do not display ADR, GOP, NOI, room revenue, or hotel P&L here unless the product strategy later explicitly changes.

⸻

## 23. STAFF CALLOUTS

Remove it as a standalone navigation item.

Callouts belong inside:

Staff Management

and should feed into:

Schedule

Dashboard alerts

Manager workflows

Example:

Employee reports callout.

Attenda records:

Employee

Shift

Department

Reason category

Time

Manager response

Coverage status

Schedule reflects uncovered shift.

The manager Dashboard may show:

1 shift requires coverage

That is enough.

⸻

## 24. STAFF MANAGEMENT

This is where the people structure of Attenda lives.

Users

Roles

Departments

Positions

Permissions

Availability

Certifications

Training status

Callouts

Employment status

Activity/history where appropriate

This needs to support Attenda’s position-based operating model.

A user does not simply have “access.”

They have:

Role

Position

Department

Responsibilities

Training

Permissions

That determines what Attenda shows them.

⸻

## 25. PARTNER MENU

Partners should represent outside organizations that participate in hotel operations.

Examples:

Transportation company

Restaurant

Tour provider

Laundry company

Procurement partner

Vendor integration

Partners and Vendors may eventually need clearer distinction:

Vendor = hotel buys something from them.

Partner = participates in delivering a service or generating value through Attenda.

Do not merge them prematurely if workflows are different.

⸻

## 26. VENDORS

Vendor management should focus on operational vendor information.

Vendor

Contact

Category

Property relationship

Account information where safe

Service schedule

Notes

Documents

Issue history

Orders/invoices later if part of product strategy

Again: do not turn Attenda into accounting software.

⸻

## 27. CODES

Codes should be controlled operational reference information.

Examples:

Door codes

Vendor codes

Equipment codes

Property operational codes

Access should be role-controlled.

Sensitive credentials should not simply be exposed because someone is a hotel employee.

⸻

## 28. ROOM MANAGEMENT

Be careful here.

Attenda must not slowly turn into a PMS.

Room Management should only contain the operational context necessary for execution.

Examples:

Room number

Operational status

Inspection status

Maintenance issues

Cleaning status if manually entered

Active requests

Do not reproduce:

Reservation folio

Payment

Guest profile

Rate history

Full reservation management

Attenda helps the hotel execute.

The PMS remains the reservation system of record.

⸻

## 29. AI AGENTS

AI Agents should not become a gimmick page.

Do not make Attenda look like an “AI application.”

AI is infrastructure underneath the operating system.

Agents should have clear responsibilities.

Examples:

Operations Agent

Training Agent

Maintenance Agent

Forecast Agent

Revenue/Partner Agent

Knowledge Agent

But employees should experience:

“Attenda noticed…”

“Attenda recommends…”

“Needs attention…”

“Training recommended…”

Not:

“Talk to Agent #4.”

The best AI in this product will often be invisible.

⸻

## 30. PRIMARY NAVIGATION

The navigation also needs simplification.

I would structure it approximately like this:

TODAY

Dashboard

My Day

Requests

OPERATIONS

To-Dos

Inspections

Maintenance

Housekeeping

Transportation

Schedule & Forecast

PERFORMANCE

KPIs

Comp Set

Reports

Attenda Revenue

PEOPLE

Culture

Learning Hub

Staff Management

KNOWLEDGE

Right Answers

Marketplace

Property Info

MANAGEMENT

Partners

Vendors

Room Management

Property Settings

AI / Automation settings where necessary

We can refine the exact labels after seeing the current B1 nav, but this is the mental model.

The critical change is grouping.

A navigation with 20 unrelated links immediately feels complex.

A navigation with 5–6 understandable groups feels like a system.

⸻

## 31. MY DAY MUST BECOME THE STAFF HOME BASE

There is another important distinction.

Dashboard = Hotel.

My Day = Me.

This needs to be extremely clear.

A line employee may occasionally use the Dashboard.

But they should live in My Day.

My Day should answer:

When do I work?

What do I need to do?

What checklist is due?

What requests are assigned to me?

What training do I need?

What changed since my last shift?

What do I need to know today?

Example:

MY DAY

Wednesday, September 9

Shift

3:00 PM – 11:00 PM

Next

3:15 PM
Lobby inspection

My To-Dos

3 remaining

My Requests

Room 214 · Extra towels

Lobby · AC complaint

Checklist

PM Front Desk Checklist

6 / 10 Complete

Training

1 module due this week

Manager Note

“High arrival volume from 4–7 PM.”

That is vastly more useful than showing the employee twelve dashboards.

⸻

## 32. ROLE-BASED EXPERIENCE

Not everybody should see Attenda the same way.

This is critical.

STAFF

My Day first.

Tasks.

Requests.

Schedule.

Right Answers.

Training.

Relevant operational tools.

MANAGEMENT

Dashboard first.

Needs Attention.

Hotel activity.

Schedule.

Forecast.

KPIs.

Inspections.

Staff.

Operational performance.

CORPORATE

Portfolio-level intelligence.

Properties.

Cross-property performance.

Training/compliance trends.

Attenda-channel performance.

Patterns requiring intervention.

Corporate should consume hotel data.

It should not duplicate hotel operation screens.

⸻

## 33. DESIGN DIRECTION

The UI itself needs to stop looking generated.

Avoid:

A page full of identical white cards

Random gradients

Huge rounded rectangles everywhere

Meaningless icons

Every metric inside a box

Excessive explanatory copy

Bright AI-looking colors

Fake analytics

Overloaded dashboards

Instead:

Strong hierarchy

Large intentional spacing

Clear typography

Fewer elements

Operational status colors used sparingly

Tables where tables make sense

Cards only where cards improve understanding

Consistent spacing

Consistent button hierarchy

Consistent labels

Consistent status language

Use the established Attenda branding.

Teal should feel intentional, not sprayed across the application.

The experience should feel closer to mature hospitality operations software than an AI startup template.

⸻

## 34. DATA FRESHNESS

Because much of Attenda can operate without PMS integration, data freshness must be visible throughout the product.

This is a feature, not a weakness.

Examples:

Rooms Sold

Updated 3:15 PM by Front Desk

Forecast

Updated 8:02 AM by Manager

Comp Set

Updated 2:30 PM by Maria

Guest Feedback

Updated September 9 at 9:00 AM

Then Attenda can flag stale information.

Example:

Forecast has not been updated in 18 hours.

That creates accountability around manually maintained operating intelligence.

⸻

## 35. NO FAKE DATA

This is important for the dev team.

Do not populate Attenda screens with fake enterprise metrics simply because the screen feels empty.

If Attenda does not track something, don’t invent it.

Empty state should instead explain what needs to happen.

Example:

Instead of:

“RevPAR +12.7%”

when Attenda has no RevPAR data.

Use:

No forecast submitted today.

Update Forecast →

Or:

Guest feedback has not been updated this month.

Add score →

Attenda should build trust.

⸻

## 36. EVERY FEATURE SHOULD CONNECT

The power of Attenda is not having twenty modules.

It is connecting them.

Example:

Inspection fails.

↓

Finding created.

↓

Maintenance task created.

↓

Assigned to Engineer.

↓

Appears in Engineer My Day.

↓

Engineer completes it.

↓

Manager verifies it.

↓

Repeated issue detected.

↓

Training recommended.

↓

Employee completes certification.

↓

Future inspection verifies improvement.

That is an operating system.

Not twenty independent apps.

⸻

## 37. DEV IMPLEMENTATION ORDER

Do not redesign the whole application simultaneously.

### PHASE 1 — FOUNDATION

Freeze functionality.

Audit B1.

Map every feature.

Find duplicates.

Define navigation.

Define design system.

Define user roles.

Define data ownership.

### PHASE 2 — CORE DAILY EXPERIENCE

Build:

Dashboard

My Day

Requests

To-Dos

Schedule

Forecast

These are the heart of daily use.

### PHASE 3 — OPERATING EXECUTION

Inspections

Maintenance

Housekeeping

Transportation

Staff Management

### PHASE 4 — KNOWLEDGE + PERFORMANCE

KPIs

Right Answers

Learning Hub

Culture

Comp Set

Reports

### PHASE 5 — NETWORK / INTELLIGENCE

Marketplace

Partners

Attenda Revenue

AI Agents

Corporate intelligence

Do not polish obscure modules while Dashboard and My Day are still confusing.

⸻

## 38. THE TEST FOR EVERY SCREEN

Before approving a screen, ask:

What is this screen for?

Who primarily uses it?

What decision does it help them make?

What action can they take?

Is this information already somewhere else?

Does the user need this right now?

Could we remove 30% of this screen and make it better?

If those questions cannot be answered clearly, the design is not finished.

⸻

## FINAL PRODUCT DIRECTION

The goal is not to make Attenda smaller.

The goal is to make Attenda feel simpler while becoming more powerful underneath.

The user should feel:

Dashboard tells me what is happening.

My Day tells me what I need to do.

Requests tell me what people need.

To-Dos tell me what I am responsible for.

Schedule tells me who is working.

Forecast tells me what is coming.

KPIs tell me how we are performing.

Right Answers tells me how we do things here.

Learning Hub makes sure I know how to do them.

Attenda connects all of it.

That is the rebuild.

Do not add more surface area until this structure is clean.

B1 functionality underneath. Better architecture around it. A much stronger UI on top.

And the North Star for the team should be:

Attenda should tell a hotel employee what is happening, what matters, and what to do next — without making them hunt for it.