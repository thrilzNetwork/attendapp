-- ===== ATTENDA POSITION-BASED TO-DO SYSTEM =====
-- Admin creates custom checklists per position with mixed field types.
-- Staff fills them out per shift — data syncs to dashboard/KPIs.

-- 1) Templates: admin-created checklist templates per department/position
create table if not exists position_todo_templates (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  name text not null,
  description text default '',
  department text not null,        -- front_desk, housekeeping, etc.
  assigned_position text default '', -- 'Front Desk Agent', 'Night Auditor', '' = all in dept
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Items: each step/field in a template
create table if not exists position_todo_items (
  id uuid default gen_random_uuid() primary key,
  template_id uuid references position_todo_templates(id) on delete cascade not null,
  label text not null,
  item_type text not null default 'checkbox', -- checkbox, number, text, time, kpi_field, action_link
  required boolean default true,
  sort_order integer default 0,
  config jsonb default '{}',       -- {min, max, unit, kpi_key, placeholder, link_path}
  created_at timestamptz default now()
);

-- 3) Instances: one per staff per shift per template
create table if not exists position_todo_instances (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  template_id uuid references position_todo_templates(id) on delete cascade not null,
  staff_id uuid references staff_accounts(id) on delete set null,
  staff_name text not null,
  shift_date date not null default current_date,
  shift text default 'AM',
  status text default 'pending',   -- pending, in_progress, completed
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 4) Responses: actual answers for each item in an instance
create table if not exists position_todo_responses (
  id uuid default gen_random_uuid() primary key,
  instance_id uuid references position_todo_instances(id) on delete cascade not null,
  item_id uuid references position_todo_items(id) on delete cascade not null,
  checked boolean default false,
  number_value numeric,
  text_value text,
  updated_at timestamptz default now(),
  unique(instance_id, item_id)
);

-- Indexes
create index if not exists idx_ptt_hotel on position_todo_templates(hotel_id);
create index if not exists idx_pti_template on position_todo_items(template_id);
create index if not exists idx_ptins_hotel on position_todo_instances(hotel_id, shift_date);
create index if not exists idx_ptins_staff on position_todo_instances(staff_id, shift_date);
create index if not exists idx_ptr_instance on position_todo_responses(instance_id);

-- RLS (matching existing app pattern — open RLS for now)
alter table position_todo_templates enable row level security;
alter table position_todo_items enable row level security;
alter table position_todo_instances enable row level security;
alter table position_todo_responses enable row level security;

create policy "Anyone can read position_todo_templates" on position_todo_templates for select using (true);
create policy "Anyone can insert position_todo_templates" on position_todo_templates for insert with check (true);
create policy "Anyone can update position_todo_templates" on position_todo_templates for update using (true);
create policy "Anyone can delete position_todo_templates" on position_todo_templates for delete using (true);

create policy "Anyone can read position_todo_items" on position_todo_items for select using (true);
create policy "Anyone can insert position_todo_items" on position_todo_items for insert with check (true);
create policy "Anyone can update position_todo_items" on position_todo_items for update using (true);
create policy "Anyone can delete position_todo_items" on position_todo_items for delete using (true);

create policy "Anyone can read position_todo_instances" on position_todo_instances for select using (true);
create policy "Anyone can insert position_todo_instances" on position_todo_instances for insert with check (true);
create policy "Anyone can update position_todo_instances" on position_todo_instances for update using (true);
create policy "Anyone can delete position_todo_instances" on position_todo_instances for delete using (true);

create policy "Anyone can read position_todo_responses" on position_todo_responses for select using (true);
create policy "Anyone can insert position_todo_responses" on position_todo_responses for insert with check (true);
create policy "Anyone can update position_todo_responses" on position_todo_responses for update using (true);
create policy "Anyone can delete position_todo_responses" on position_todo_responses for delete using (true);