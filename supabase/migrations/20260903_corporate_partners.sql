-- ============================================================
-- MIGRATION: Corporate Partners (2026-09-03)
-- B2B partner intake for Attenda-level relationships — procurement
-- platforms (Reeco-style), distributors, tech & service companies.
-- NOT hotel-level vendors (those live in the per-property marketplace).
-- ============================================================

create table if not exists corporate_partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  website text,
  category text,
  offering text,
  coverage text,
  scale_readiness text,
  integrations jsonb not null default '[]'::jsonb,
  track_record text,
  why_us text,
  status text not null default 'new',
  rating int,
  notes text,
  source_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table corporate_partners enable row level security;

-- Public: anyone may APPLY to partner. No read/update policies —
-- applications are visible only via the service-role API.
drop policy if exists "partners_public_submit" on corporate_partners;
create policy "partners_public_submit" on corporate_partners
  for insert to anon, authenticated
  with check (true);

create index if not exists idx_partners_status_created
  on corporate_partners (status, created_at desc);
create index if not exists idx_partners_email
  on corporate_partners (lower(email));
create index if not exists idx_partners_ip_time
  on corporate_partners (source_ip, created_at desc);

-- Pitch keys: per-client public presentation links (/pitch/<key>)
alter table corporate_clients add column if not exists pitch_key text;
update corporate_clients set pitch_key = md5(random()::text || clock_timestamp()::text) where pitch_key is null;
alter table corporate_clients alter column pitch_key set default md5(random()::text || clock_timestamp()::text);
create unique index if not exists idx_clients_pitch_key on corporate_clients (pitch_key);

-- Which property a partner application was pitched through
alter table corporate_partners add column if not exists context_property text;