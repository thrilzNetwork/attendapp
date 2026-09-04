-- ============================================================
-- ATTENDA CORPORATE STAFF — internal workspace for Attenda
-- employees running multiple client properties.
-- Data model separates: user / position permissions / client
-- assignment / responsibilities / KPIs / tasks / calendar /
-- comments / pipeline / CMS pages.
-- ============================================================

-- ---------- USERS (separate from hotel staff_accounts) ----------
create table if not exists corporate_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  title text,
  phone text,
  avatar_url text,
  emergency_contact text,
  onboarding_completed boolean default false,
  onboarding_progress jsonb default '[]'::jsonb,   -- completed onboarding step ids
  confirmed_position text,                          -- set only after user confirms (never grants perms)
  active boolean default true,
  created_at timestamptz default now()
);

-- ---------- POSITIONS (definitions, super-admin managed) ----------
create table if not exists corporate_positions (
  key text primary key,
  title text not null,
  description text,
  icon text default 'briefcase',
  color text default '#158A7C',
  sort_order int default 0,
  active boolean default true
);

-- Authorization is granted ONLY by super admin here.
-- User confirmation during onboarding never grants permissions.
create table if not exists corporate_user_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references corporate_users(id) on delete cascade,
  position_key text not null references corporate_positions(key),
  authorized_by uuid references auth.users(id),
  authorized_at timestamptz default now(),
  unique(user_id, position_key)
);

-- ---------- CLIENTS (attachable client records) ----------
create table if not exists corporate_clients (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  brand text,
  hotel_id uuid references hotels(id),   -- attach to an existing property record
  rooms int,
  address text,
  status text default 'active',          -- active | prospect | paused
  notes text,
  created_at timestamptz default now()
);

-- ---------- CLIENT ASSIGNMENT (separate from permissions) ----------
create table if not exists corporate_client_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references corporate_users(id) on delete cascade,
  client_id uuid not null references corporate_clients(id) on delete cascade,
  position_key text references corporate_positions(key),
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz default now(),
  active boolean default true,
  unique(user_id, client_id)
);

-- ---------- RESPONSIBILITIES (per position, CMS-editable) ----------
create table if not exists corporate_responsibilities (
  id uuid primary key default gen_random_uuid(),
  position_key text not null references corporate_positions(key),
  title text not null,
  detail text,
  sort_order int default 0
);

-- ---------- KPIs (per position) ----------
create table if not exists corporate_kpis (
  id uuid primary key default gen_random_uuid(),
  position_key text not null references corporate_positions(key),
  name text not null,
  target text,
  unit text,
  detail text,
  sort_order int default 0
);

-- ---------- CMS PAGES (universal + role-specific onboarding content) ----------
create table if not exists corporate_pages (
  slug text primary key,
  title text not null,
  audience text not null default 'universal',  -- 'universal' or a position key
  body text not null,                          -- markdown
  sort_order int default 0,
  published boolean default true,
  updated_at timestamptz default now()
);

-- ---------- TASKS (corporate or client-tagged) ----------
create table if not exists corporate_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  kind text default 'task',        -- task | checklist | report | flag | follow_up
  status text default 'open',      -- open | done
  priority text default 'normal',  -- low | normal | high
  due_date date,
  client_id uuid references corporate_clients(id),   -- null = corporate
  assignee_id uuid references corporate_users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists idx_corp_tasks_client on corporate_tasks(client_id);
create index if not exists idx_corp_tasks_assignee on corporate_tasks(assignee_id);

-- ---------- CALENDAR (shared corporate + property-tagged) ----------
create table if not exists corporate_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean default false,
  client_id uuid references corporate_clients(id),   -- null = corporate
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
create index if not exists idx_corp_events_start on corporate_events(start_at);

-- ---------- COMMENTS (collaboration, @mentions, property-or-corporate tag) ----------
create table if not exists corporate_comments (
  id uuid primary key default gen_random_uuid(),
  parent_type text not null,       -- task | event
  parent_id uuid not null,
  author_id uuid not null references corporate_users(id),
  body text not null,
  mentions uuid[] default '{}',
  client_id uuid references corporate_clients(id),   -- null = corporate
  created_at timestamptz default now()
);
create index if not exists idx_corp_comments_parent on corporate_comments(parent_type, parent_id);

-- ---------- SALES PIPELINE (Su) ----------
create table if not exists corporate_pipeline (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  property_name text,
  stage text default 'lead',       -- lead | qualified | proposal | negotiation | won | lost
  value numeric,
  next_follow_up date,
  owner_id uuid references corporate_users(id),
  notes text,
  client_id uuid references corporate_clients(id),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================================
-- RLS — service-role routes bypass RLS; policies below give
-- defense-in-depth for any direct client reads.
-- ============================================================
alter table corporate_users enable row level security;
alter table corporate_positions enable row level security;
alter table corporate_user_positions enable row level security;
alter table corporate_clients enable row level security;
alter table corporate_client_assignments enable row level security;
alter table corporate_responsibilities enable row level security;
alter table corporate_kpis enable row level security;
alter table corporate_pages enable row level security;
alter table corporate_tasks enable row level security;
alter table corporate_events enable row level security;
alter table corporate_comments enable row level security;
alter table corporate_pipeline enable row level security;

-- member helper condition
create or replace function corp_is_member() returns boolean language sql stable as $$
  select exists (select 1 from corporate_users cu where cu.id = auth.uid() and cu.active);
$$;

create policy "corp_users_self_read" on corporate_users for select using (auth.uid() = id or corp_is_member());
create policy "corp_users_self_update" on corporate_users for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "corp_positions_read" on corporate_positions for select using (corp_is_member());
create policy "corp_user_pos_read" on corporate_user_positions for select using (auth.uid() = user_id or corp_is_member());
create policy "corp_clients_read" on corporate_clients for select using (corp_is_member());
create policy "corp_assign_read" on corporate_client_assignments for select using (corp_is_member());
create policy "corp_resp_read" on corporate_responsibilities for select using (corp_is_member());
create policy "corp_kpis_read" on corporate_kpis for select using (corp_is_member());
create policy "corp_pages_read" on corporate_pages for select using (corp_is_member() and published);

create policy "corp_tasks_read" on corporate_tasks for select using (corp_is_member());
create policy "corp_tasks_insert" on corporate_tasks for insert with check (corp_is_member());
create policy "corp_tasks_update" on corporate_tasks for update using (corp_is_member());
create policy "corp_events_read" on corporate_events for select using (corp_is_member());
create policy "corp_events_insert" on corporate_events for insert with check (corp_is_member());
create policy "corp_events_update" on corporate_events for update using (corp_is_member());
create policy "corp_comments_read" on corporate_comments for select using (corp_is_member());
create policy "corp_comments_insert" on corporate_comments for insert with check (corp_is_member() and author_id = auth.uid());
create policy "corp_pipeline_read" on corporate_pipeline for select using (corp_is_member());
create policy "corp_pipeline_insert" on corporate_pipeline for insert with check (corp_is_member());
create policy "corp_pipeline_update" on corporate_pipeline for update using (corp_is_member());

-- ============================================================
-- SEED — positions
-- ============================================================
insert into corporate_positions (key, title, description, icon, color, sort_order) values
  ('field_ops',       'Field Operations Manager',            'Boots on the ground: daily audits, property visits, verification and execution follow-up.', 'hard-hat', '#158A7C', 10),
  ('sales',           'Sales & Business Development',        'Revenue engine: pipeline, outreach, proposals and partner relationships.', 'trending-up', '#15b79e', 20),
  ('controller',      'Controller / Financial Oversight',    'Fractional finance: reviews, variances, risks and savings across the portfolio.', 'calculator', '#0E6B60', 30),
  ('trainer',         'Onboarding, Training & Client Relations', 'People and standards: onboarding, training tracks, certification and client relationships.', 'graduation-cap', '#3BBCAC', 40),
  ('property_leader', 'Property Leader (Certification)',     'Attenda Certified Property Leader: runs a client property to Attenda standards.', 'building-2', '#1C9284', 50)
on conflict (key) do nothing;

-- ============================================================
-- SEED — universal onboarding pages (CMS)
-- ============================================================
insert into corporate_pages (slug, title, audience, body, sort_order) values
('welcome', 'Welcome to Attenda', 'universal',
'You are here because you run things. Attenda Corporate is the internal workspace where our team operates every client property from one place — one login, every property, zero chaos.

What this is:

- **The digital corporate office.** Tasks, calendars, checklists, reports and client records live here, not in text threads.
- **One company, many properties.** You will be assigned to the clients you serve. Switch between them without switching logins.
- **Your role, your tools.** What you see is shaped by your position. Nothing generic. Nothing you do not need.

Everything you do here maps to a real property and a real outcome. Welcome aboard.', 10),

('founder-story', 'The Founder Story', 'universal',
'Alejandro Soria spent 15 years running hotel operations — front desks, housekeeping boards, forecast calls, 2am maintenance calls. The same problems showed up at every property: information trapped in threads, duties that depended on memory, and owners who found out about problems after guests did.

Attenda started as the fix: one operating system for hotels. Not another dashboard to check — the place where the work actually runs.

Today Attenda powers guest services, staff operations and owner reporting. You are joining at the ground floor of something that is becoming the digital corporate office for an entire hotel portfolio. What you build here becomes the standard every future client is onboarded into.', 20),

('what-is-attenda', 'What the Heck is Attenda', 'universal',
'Attenda is a hotel operations platform. Think of it as the layer that connects three worlds:

1. **Guests** scan a QR code and get a concierge in their pocket — requests, transport, nearby recommendations, safety info.
2. **Property staff** run their shift from task lists, work orders, schedules and live request feeds.
3. **Corporate (you)** sees across every client property — audits, KPIs, tasks, calendars and reports — from one workspace.

Attenda is *not* a PMS. The PMS owns rooms and rates. Attenda owns the **work**: what needs to happen, who owns it, whether it happened, and what it cost. It wraps around whatever systems a property already has.', 30),

('not-a-pms', 'Not a PMS — Here''s the Difference', 'universal',
'A common question, so here it is straight.

**A PMS** (property management system) is the system of record for reservations, room assignments, folios and rates. Think Opera, Cloudbeds, Mews. Hotels already have one, and rip-and-replace is not our business.

**Attenda** is the operating layer *around* the PMS:

- The PMS says room 214 is occupied. Attenda says the inspection checklist for 214 is done, the work order is closed, and the audit was signed off.
- The PMS holds the rate. Attenda tracks the compset and the forecast.
- The PMS bills the guest. Attenda makes sure the guest *got what they paid for* — and tells you before a review says they didn''t.

We integrate, we don''t replace. That is why a hotel can adopt Attenda in days, not months.', 30),

('case-study', 'Case Study: Best Western Fort Lauderdale', 'universal',
'Our flagship result. The client property was sliding: guest satisfaction collapsing, revenue flat, no operating rhythm.

**In 30 days:**

- Guest satisfaction recovered from **74.4 to 80+** — back to pre-collapse levels.
- **$3,300/month in new revenue** added (parking program + recovered operations).
- Daily audits, checklists and escalation paths installed — the property now runs on rhythm, not reaction.

This is the playbook you are joining. Every new client gets the same treatment: audit first, rhythm second, revenue third. You will see this case study referenced throughout your training because it is the standard we hold.', 40),

('vision', 'The Vision', 'universal',
'Attenda Corporate becomes the **digital corporate office for the hotel portfolio**.

The end state: a small, elite team operating many properties better than most hotels operate one. Adding a new client is not a project — it is creating a client record, assigning staff, and running the same proven rhythm from day one.

No new corporate onboarding for client number two. The system absorbs the growth. That is the whole point.', 50),

('startup-expectations', 'Startup Expectations', 'universal',
'Honesty upfront, because you deserve it:

- **We are early.** Systems are being built while they are being used. You will see rough edges — flag them, don''t hide them.
- **Ownership over job descriptions.** You own outcomes, not tasks. If something is broken and it''s in your lane, it''s yours.
- **Direct communication.** We talk straight, we decide fast, we write things down here instead of losing them in threads.
- **Growth is real.** As clients come in, roles and compensation grow with the portfolio. The work you do here compounds.

In exchange: flexibility, real responsibility, and a seat in something growing. If that sounds right — welcome.', 60)
on conflict (slug) do nothing;

-- ============================================================
-- SEED — role-specific pages + training
-- ============================================================
insert into corporate_pages (slug, title, audience, body, sort_order) values
('field-ops-overview', 'Field Operations: Your Role', 'field_ops',
'You are the boots on the ground and the organizational backbone of every property you cover.

Your rhythm: walk the property, verify the work, close the loop. Hotels run calmly when somebody is standing on the floor seeing what needs seeing before anyone has to ask.

Your duties run through this workspace: daily audit checklists, property visits, task follow-up and escalations. If it happened on property, it gets logged here.', 10),
('field-ops-training', 'Field Operations: Training', 'field_ops',
'Training track:

1. **Daily audit walkthrough** — the morning checklist at Best Western: what to verify, what to photograph, what to escalate.
2. **Work order discipline** — open, verify, close. Nothing stays open without an owner and a date.
3. **Escalation paths** — what goes to the Controller, what goes to the founder, what goes to hotel management.
4. **Reporting rhythm** — the monthly owner presentation format.

Shadow one full audit cycle at the client property before running one solo.', 20),

('sales-overview', 'Sales & BD: Your Role', 'sales',
'You are the revenue engine. Attenda grows one signed property at a time, and you own that motion.

Your tools here: the pipeline board (lead → qualified → proposal → negotiation → won), follow-up reminders, and every client record for context.

No commission is assumed — incentives get defined separately in writing. Your baseline: keep the pipeline honest and moving.', 10),
('sales-training', 'Sales & BD: Training', 'sales',
'Training track:

1. **The pitch** — one operating system for hotels. Start from the case study.
2. **Qualification** — budget, timeline, decision maker, property fit. HOT / WARM / COLD.
3. **The proposal** — scope, price, first-30-days plan. Never oversell; we run on trust.
4. **Onboarding handoff** — a won deal becomes a client record plus assignments. Sales hands to Training; Training hands to Field.', 20),

('controller-overview', 'Controller: Your Role', 'controller',
'You are the financial spine — part-time, limited hours to start, growing with the portfolio.

You own the daily audit review (every property, every morning — reviewed and reconciled), organization of documents and open items, calendar ownership for financial deadlines, and the monthly owner presentation.

You do **not** absorb the hotel''s accounting, payroll, tax, audit or fiduciary responsibility. You review, you flag, you keep the room in order.', 10),
('controller-training', 'Controller: Training', 'controller',
'Training track:

1. **The daily audit report** — what comes in from the field, how to review and reconcile it.
2. **Variance review** — rate vs. compset, expense flags, savings opportunities.
3. **The owner pack** — monthly presentation format: KPIs, variances, risks, asks.
4. **Calendar ownership** — inspection deadlines, report deadlines, renewals. Never missed.', 20),

('trainer-overview', 'Trainer: Your Role', 'trainer',
'You own how people enter Attenda — onboarding, training tracks, certification and client relations.

Every property leader we certify goes through your track. Every new corporate teammate goes through the program you are reading right now (yes, this one — you will own it).

You also keep the Right Answers knowledge base and Learning content alive: SOPs, checklists, and answers that make properties self-serve.', 10),
('trainer-training', 'Trainer: Training', 'trainer',
'Training track:

1. **Onboarding framework** — the corporate onboarding you just experienced, plus the property-leader certification track.
2. **Certification standard** — "Attenda Certified Property Leader": what it requires, how it''s measured, how it''s awarded.
3. **Knowledge base ops** — writing SOPs that a night-shift clerk can follow at 3am.
4. **Client relations** — you are often the first friendly face a client staff member meets. Set the tone.', 20),

('leader-overview', 'Property Leader: Your Role', 'property_leader',
'You run your client property to Attenda standards. Certification means you completed the Attenda training track led by our Trainer and demonstrated the standard on the floor.

This is a certification — training and recognition. It does not change your employment relationship with the property. What it changes is the toolset and the standard you run.

Your daily rhythm: checklists, room status, work orders, guest requests — all through Attenda.', 10),
('leader-training', 'Property Leader: Certification Track', 'leader',
'Certification track (led by the Attenda Trainer):

1. **Platform fundamentals** — requests, tasks, work orders, room status.
2. **The daily audit** — walk it, log it, escalate it.
3. **Guest experience standard** — response times, recovery, review generation.
4. **The standard demonstration** — run one full cycle solo, observed.

Pass all four and you are an **Attenda Certified Property Leader**.', 20)
on conflict (slug) do nothing;

-- ============================================================
-- SEED — responsibilities per position
-- ============================================================
insert into corporate_responsibilities (position_key, title, detail, sort_order) values
('field_ops', 'Daily audit', 'Walk the property every morning. Verify, photograph, log, escalate.', 10),
('field_ops', 'On the ground presence', 'Physically present: rooms, work orders, crews — seen before anyone asks.', 20),
('field_ops', 'Calendar & maintenance execution', 'Inspections, preventive maintenance and follow-ups executed on time.', 30),
('field_ops', 'Coordination between teams', 'Front desk, housekeeping, maintenance and ownership — one loop.', 40),
('field_ops', 'Monthly owner presentation', 'Property results, risks and asks, presented to ownership monthly.', 50),
('sales', 'Pipeline ownership', 'Keep the board honest: every lead staged, dated and moving.', 10),
('sales', 'Outreach & proposals', 'Consistent outreach; proposals that match scope, never oversell.', 20),
('sales', 'Partner relations', 'Vendors, providers and referral relationships that feed the funnel.', 30),
('sales', 'Handoff to onboarding', 'Won deals become client records with clean context for the team.', 40),
('controller', 'Daily audit review', 'Every property, every morning: reviewed and reconciled.', 10),
('controller', 'Organization', 'Documents, files and open items — findable, current, clean.', 20),
('controller', 'Calendar ownership', 'Inspections, report deadlines, renewals — never missed.', 30),
('controller', 'Variance & risk flags', 'Rate vs. compset, expense anomalies, savings opportunities.', 40),
('controller', 'Monthly owner pack', 'KPIs, variances, risks and asks — the monthly owner presentation.', 50),
('trainer', 'Corporate onboarding', 'Own and evolve the onboarding program every teammate completes.', 10),
('trainer', 'Certification tracks', 'Train and certify property leaders to the Attenda standard.', 20),
('trainer', 'Knowledge base', 'Right Answers + Learning content: current, practical, followable.', 30),
('trainer', 'Client relations', 'Training relationships with client property teams.', 40),
('property_leader', 'Property standard', 'Run the client property to Attenda checklists and rhythm.', 10),
('property_leader', 'Guest experience', 'Requests answered fast, recovery handled, reviews earned.', 20),
('property_leader', 'Team execution', 'Property staff working the system every shift.', 30),
('property_leader', 'Certification maintenance', 'Stay certified: refresher training and standard demonstrations.', 40);

-- ============================================================
-- SEED — KPIs per position
-- ============================================================
insert into corporate_kpis (position_key, name, target, unit, detail, sort_order) values
('field_ops', 'Daily audit completion', '100%', '%', 'Audit logged every property, every morning.', 10),
('field_ops', 'Work order response', '< 24h', 'hours', 'Open → verified → closed without stall.', 20),
('field_ops', 'Inspection pass rate', '≥ 90%', '%', 'Checklist items passing on first walk.', 30),
('sales', 'Qualified leads / month', '8', 'count', 'HOT/WARM leads with decision maker identified.', 10),
('sales', 'Proposal conversion', '≥ 25%', '%', 'Proposals → signed.', 20),
('sales', 'Pipeline follow-up', '100%', '%', 'No lead past due without a next step.', 30),
('controller', 'Daily audit reconciliation', '100%', '%', 'Field audits reviewed same day.', 10),
('controller', 'Monthly owner pack', 'Day 5', 'business day', 'Owner presentation delivered monthly.', 20),
('controller', 'Deadline slips', '0', 'count', 'Report / inspection / renewal deadlines missed.', 30),
('trainer', 'Onboarding completion', '100%', '%', 'Teammates complete corporate onboarding before system access.', 10),
('trainer', 'Certification pass rate', '≥ 80%', '%', 'Property leaders certified on track timeline.', 20),
('property_leader', 'Guest satisfaction', '≥ 80', 'score', 'Property-level satisfaction score.', 10),
('property_leader', 'Request response', '< 15 min', 'minutes', 'Guest requests acknowledged.', 20);

-- ============================================================
-- SEED — first client: Best Western Fort Lauderdale
-- (attachable client record linked to the live property row)
-- ============================================================
insert into corporate_clients (slug, name, brand, hotel_id, rooms, address, status, notes)
select 'best-western-ftlauderdale',
       'Best Western Fort Lauderdale Airport/Cruise Port',
       'Best Western',
       h.id,
       54,
       '840 W State Road 84, Fort Lauderdale, FL',
       'active',
       'Flagship client. 54 rooms. Anchor case study: satisfaction 74.4 → 80+, $3,300/mo new revenue in 30 days.'
from hotels h
where h.slug = 'fort-lauderdale-airport-cruise-port'
limit 1
on conflict (slug) do nothing;