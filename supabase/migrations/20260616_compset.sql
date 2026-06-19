-- ===== ATTENDA COMPSET (COMPETITIVE RATE SHOP) =====
-- Admin sets up nearby competitor hotels + a daily call schedule (e.g. 8am/3pm/9pm/12am).
-- Staff calls each competitor at each scheduled time and logs rate, room counts, occupancy.

-- 1) Competitor hotels (admin-managed list, per property)
create table if not exists compset_hotels (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  name text not null,
  phone text default '',
  room_keys integer default 0, -- total room count at the competitor hotel
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 2) Call times (admin-managed schedule, per property) e.g. 08:00, 15:00, 21:00, 00:00
create table if not exists compset_call_times (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  call_time text not null, -- 'HH:MM' 24hr
  label text default '',
  created_at timestamptz default now()
);

-- 3) Entries: one per competitor hotel per call slot per day
create table if not exists compset_entries (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  compset_hotel_id uuid references compset_hotels(id) on delete cascade not null,
  call_date date not null default current_date,
  call_time text not null,
  rate numeric,
  rooms_total integer,
  rooms_sold integer,
  occupancy_pct numeric,
  entered_by uuid references staff_accounts(id) on delete set null,
  entered_by_name text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(compset_hotel_id, call_date, call_time)
);

-- Indexes
create index if not exists idx_compset_hotels_hotel on compset_hotels(hotel_id);
create index if not exists idx_compset_call_times_hotel on compset_call_times(hotel_id);
create index if not exists idx_compset_entries_hotel_date on compset_entries(hotel_id, call_date);
create index if not exists idx_compset_entries_compset_hotel on compset_entries(compset_hotel_id);

-- RLS — hotel-scoped, matching existing multitenant pattern
alter table compset_hotels enable row level security;
alter table compset_call_times enable row level security;
alter table compset_entries enable row level security;

create policy "compset_hotels_select_own_hotel" on compset_hotels
  for select using (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
create policy "compset_hotels_insert_own_hotel" on compset_hotels
  for insert with check (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
create policy "compset_hotels_update_own_hotel" on compset_hotels
  for update using (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
create policy "compset_hotels_delete_own_hotel" on compset_hotels
  for delete using (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

create policy "compset_call_times_select_own_hotel" on compset_call_times
  for select using (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
create policy "compset_call_times_insert_own_hotel" on compset_call_times
  for insert with check (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
create policy "compset_call_times_update_own_hotel" on compset_call_times
  for update using (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
create policy "compset_call_times_delete_own_hotel" on compset_call_times
  for delete using (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

create policy "compset_entries_select_own_hotel" on compset_entries
  for select using (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
create policy "compset_entries_insert_own_hotel" on compset_entries
  for insert with check (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
create policy "compset_entries_update_own_hotel" on compset_entries
  for update using (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
create policy "compset_entries_delete_own_hotel" on compset_entries
  for delete using (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
