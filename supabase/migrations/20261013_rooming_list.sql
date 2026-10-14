-- Official rooming list: guest name per room, uploaded per property.
-- When a hotel has entries, the guest auth dropdown shows name+room pairs from here
-- instead of the raw room DB. No entries = fall back to Room DB list.
create table if not exists public.rooming_list_entries (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  room_number text not null,
  guest_name text not null,
  check_in date,
  check_out date,
  created_at timestamptz not null default now(),
  unique (hotel_id, room_number, guest_name)
);

alter table public.rooming_list_entries enable row level security;

drop policy if exists "rooming list public read" on public.rooming_list_entries;
create policy "rooming list public read"
  on public.rooming_list_entries for select
  using (true);

drop policy if exists "rooming list admin write" on public.rooming_list_entries;
create policy "rooming list admin write"
  on public.rooming_list_entries for all
  using (true)
  with check (true);

create index if not exists idx_rooming_list_hotel
  on public.rooming_list_entries (hotel_id);