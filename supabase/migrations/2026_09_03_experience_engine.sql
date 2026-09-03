-- Attenda Experience Engine v1
create table if not exists corporate_experiences (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  type text not null check (type in ('onboarding','talent','partner','client')),
  title text not null,
  subtitle text,
  mode text not null default 'hybrid' check (mode in ('interactive','presentation','hybrid')),
  blocks jsonb not null default '[]',
  published boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists corporate_experience_events (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references corporate_experiences(id) on delete cascade,
  kind text not null check (kind in ('view','start','complete','submit')),
  contact jsonb,
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists corporate_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  owner_user_id uuid not null,
  entity_type text,
  entity_id uuid,
  entity_label text,
  due_date date,
  status text default 'open' check (status in ('open','done')),
  created_by uuid,
  created_at timestamptz default now()
);

alter table corporate_talent_pool add column if not exists stage text default 'new';

insert into corporate_experiences (slug, type, title, subtitle, mode, published, blocks)
values (
  'corporate-onboarding',
  'onboarding',
  'Welcome to Attenda',
  'How we operate — and your place in it',
  'hybrid',
  true,
  '[
    {"id":"b1","type":"hero","props":{"eyebrow":"ATTENDA CORPORATE","title":"Welcome to Attenda","subtitle":"How we operate — and your place in it"}},
    {"id":"b2","type":"text","props":{"heading":"What Attenda is","body":"Attenda runs hotel operations for properties that cannot afford dropped balls. Guest requests, shuttle runs, housekeeping, maintenance, vendor invoices, nightly reporting — one platform, one team. We are not software we sell and forget. We operate inside the hotels we serve, and we win when their numbers move."}},
    {"id":"b3","type":"stat","props":{"value":"74.4 → 80+","label":"Guest satisfaction recovered","secondary":"$3,300/mo new revenue in the first 30 days"}},
    {"id":"b4","type":"text","props":{"heading":"How we operate","body":"One team. Every property. Nothing falls through. You own your lane, you answer for your numbers, and you never make a property chase us twice. Speed is the product. When a hotel calls, we are already moving. We built this inside the hotels — not in a conference room — and it shows in everything we ship."}},
    {"id":"b5","type":"mc","props":{"question":"Which best describes your role?","options":["Field Ops","Sales","Finance / Controller","Trainer","Property Leader"]}},
    {"id":"b6","type":"contact","props":{"heading":"Confirm your details","fields":["name","email","position"]}},
    {"id":"b7","type":"confirm","props":{"heading":"You are in.","body":"Next: your My Day dashboard — priorities, duties and your properties."}}
  ]'::jsonb
)
on conflict (slug) do nothing;