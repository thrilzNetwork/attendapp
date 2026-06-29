-- Staff positions table — admin-created positions for to-do categorization
create table if not exists public.staff_positions (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  department text not null default 'front_desk',
  shift text not null default 'all',  -- 'AM', 'PM', 'Night', 'all'
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hotel_id, name)
);

-- RLS
alter table public.staff_positions enable row level security;

drop policy if exists "staff_positions_authenticated_read" on public.staff_positions;
create policy "staff_positions_authenticated_read" on public.staff_positions
  for select to authenticated using (true);

drop policy if exists "staff_positions_authenticated_write" on public.staff_positions;
create policy "staff_positions_authenticated_write" on public.staff_positions
  for all to authenticated using (true) with check (true);

-- Seed default positions for existing hotels
insert into public.staff_positions (hotel_id, name, department, shift, sort_order)
select h.id, 'Front Desk AM', 'front_desk', 'AM', 1
from public.hotels h
where not exists (
  select 1 from public.staff_positions sp where sp.hotel_id = h.id and sp.name = 'Front Desk AM'
)
on conflict do nothing;

insert into public.staff_positions (hotel_id, name, department, shift, sort_order)
select h.id, 'Front Desk PM', 'front_desk', 'PM', 2
from public.hotels h
where not exists (
  select 1 from public.staff_positions sp where sp.hotel_id = h.id and sp.name = 'Front Desk PM'
)
on conflict do nothing;

insert into public.staff_positions (hotel_id, name, department, shift, sort_order)
select h.id, 'Night Auditor', 'front_desk', 'Night', 3
from public.hotels h
where not exists (
  select 1 from public.staff_positions sp where sp.hotel_id = h.id and sp.name = 'Night Auditor'
)
on conflict do nothing;

insert into public.staff_positions (hotel_id, name, department, shift, sort_order)
select h.id, 'Housekeeping AM', 'housekeeping', 'AM', 4
from public.hotels h
where not exists (
  select 1 from public.staff_positions sp where sp.hotel_id = h.id and sp.name = 'Housekeeping AM'
)
on conflict do nothing;

insert into public.staff_positions (hotel_id, name, department, shift, sort_order)
select h.id, 'Maintenance', 'maintenance', 'all', 5
from public.hotels h
where not exists (
  select 1 from public.staff_positions sp where sp.hotel_id = h.id and sp.name = 'Maintenance'
)
on conflict do nothing;

insert into public.staff_positions (hotel_id, name, department, shift, sort_order)
select h.id, 'Driver', 'drivers', 'all', 6
from public.hotels h
where not exists (
  select 1 from public.staff_positions sp where sp.hotel_id = h.id and sp.name = 'Driver'
)
on conflict do nothing;