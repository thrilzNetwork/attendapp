-- ============================================================
-- MIGRATION: Corporate Talent Pool (2026-09-03)
-- Candidates submit skills + experience — no position gate.
-- Positions are OFFERED based on talent, not applied for.
-- ============================================================

create table if not exists corporate_talent_pool (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  location text,
  links jsonb not null default '{}'::jsonb,
  years_experience text,
  industries jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  story text,
  superpower text,
  availability text,
  expectations text,
  status text not null default 'new',
  position_suggestion text,
  rating int,
  notes text,
  source text not null default 'careers-page',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table corporate_talent_pool enable row level security;

-- Public: anyone may SUBMIT themselves. No read/update policies —
-- candidates can never browse the pool; service-role API reads it.
drop policy if exists "talent_public_submit" on corporate_talent_pool;
create policy "talent_public_submit" on corporate_talent_pool
  for insert to anon, authenticated
  with check (true);

create index if not exists idx_talent_status_created
  on corporate_talent_pool (status, created_at desc);
create index if not exists idx_talent_email
  on corporate_talent_pool (lower(email));

-- Rate-limit support (API counts submissions per IP in a 10-min window)
alter table corporate_talent_pool add column if not exists source_ip text;
create index if not exists idx_talent_ip_time
  on corporate_talent_pool (source_ip, created_at desc);