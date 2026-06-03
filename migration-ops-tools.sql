-- ===== ATTENDA OPS TOOLS SYSTEM =====
-- Superadmin-managed feature toggles per hotel.
-- Enables future monetization: basic vs premium packages.

-- 1) Master catalog of all available ops tools
create table if not exists ops_tools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  key text unique not null,                -- programmatic identifier, e.g. 'call-around'
  icon text not null default 'Tool',        -- lucide icon name
  description text default '',
  category text not null default 'front_desk', -- 'front_desk', 'guest_ops', 'shuttle', 'admin_ops'
  is_built_in boolean default true,          -- true = ships with Attenda, false = custom
  created_at timestamptz default now()
);

-- 2) Per-hotel feature toggles
create table if not exists hotel_ops_tools (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  tool_key text references ops_tools(key) on delete cascade not null,
  enabled boolean default true,
  config jsonb default '{}',                -- per-tool config (e.g. shift times, notification prefs)
  created_at timestamptz default now(),
  unique(hotel_id, tool_key)
);

-- 3) New data tables for each ops tool

-- Call Around (shift handoff log)
create table if not exists call_around_logs (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  shift_date date not null default current_date,
  shift text not null default 'AM',          -- 'AM', 'PM', 'Overnight'
  handed_off_by text not null,
  received_by text not null,
  occupancy integer default 0,               -- current hotel occupancy
  arrivals integer default 0,                -- expected arrivals
  departures integer default 0,              -- expected departures
  notes text default '',
  created_at timestamptz default now()
);

-- Daily Logs (general purpose shift log for front desk)
create table if not exists daily_logs (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  log_date date not null default current_date,
  author text not null,
  shift text default 'AM',                   -- 'AM', 'PM', 'Overnight'
  category text default 'General',           -- 'General', 'Maintenance', 'Incident', 'Guest Feedback', etc.
  content text not null,
  created_at timestamptz default now()
);

-- No Shows (guests who didn't show up)
create table if not exists no_shows (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  no_show_date date not null default current_date,
  guest_name text not null,
  room text not null,
  reservation_ref text default '',
  reason text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- Room Moves
create table if not exists room_moves (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  move_date date not null default current_date,
  guest_name text not null,
  from_room text not null,
  to_room text not null,
  reason text default '',
  initiated_by text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- Bank Count Sheets (cash handling at shift start/end)
create table if not exists bank_counts (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  count_date date not null default current_date,
  shift text not null default 'AM',           -- 'AM', 'PM'
  counted_by text not null,
  cash_total numeric(10,2) default 0,
  card_total numeric(10,2) default 0,
  room_charges numeric(10,2) default 0,
  discrepancies text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- RLS: open for now (matching existing pattern)
alter table ops_tools enable row level security;
alter table hotel_ops_tools enable row level security;
alter table call_around_logs enable row level security;
alter table daily_logs enable row level security;
alter table no_shows enable row level security;
alter table room_moves enable row level security;
alter table bank_counts enable row level security;

create policy "Anyone can read ops_tools" on ops_tools for select using (true);
create policy "Anyone can insert ops_tools" on ops_tools for insert with check (true);
create policy "Anyone can update ops_tools" on ops_tools for update using (true);
create policy "Anyone can delete ops_tools" on ops_tools for delete using (true);

create policy "Anyone can read hotel_ops_tools" on hotel_ops_tools for select using (true);
create policy "Anyone can insert hotel_ops_tools" on hotel_ops_tools for insert with check (true);
create policy "Anyone can update hotel_ops_tools" on hotel_ops_tools for update using (true);
create policy "Anyone can delete hotel_ops_tools" on hotel_ops_tools for delete using (true);

create policy "Anyone can read call_around_logs" on call_around_logs for select using (true);
create policy "Anyone can insert call_around_logs" on call_around_logs for insert with check (true);
create policy "Anyone can update call_around_logs" on call_around_logs for update using (true);
create policy "Anyone can delete call_around_logs" on call_around_logs for delete using (true);

create policy "Anyone can read daily_logs" on daily_logs for select using (true);
create policy "Anyone can insert daily_logs" on daily_logs for insert with check (true);
create policy "Anyone can update daily_logs" on daily_logs for update using (true);
create policy "Anyone can delete daily_logs" on daily_logs for delete using (true);

create policy "Anyone can read no_shows" on no_shows for select using (true);
create policy "Anyone can insert no_shows" on no_shows for insert with check (true);
create policy "Anyone can update no_shows" on no_shows for update using (true);
create policy "Anyone can delete no_shows" on no_shows for delete using (true);

create policy "Anyone can read room_moves" on room_moves for select using (true);
create policy "Anyone can insert room_moves" on room_moves for insert with check (true);
create policy "Anyone can update room_moves" on room_moves for update using (true);
create policy "Anyone can delete room_moves" on room_moves for delete using (true);

create policy "Anyone can read bank_counts" on bank_counts for select using (true);
create policy "Anyone can insert bank_counts" on bank_counts for insert with check (true);
create policy "Anyone can update bank_counts" on bank_counts for update using (true);
create policy "Anyone can delete bank_counts" on bank_counts for delete using (true);

-- 4) Seed the built-in ops tools
insert into ops_tools (name, key, icon, description, category) values
  ('Live Orders',     'orders',      'Bell',          'Guest in-room ordering requests', 'guest_ops'),
  ('Guest Messages',  'messages',    'MessageSquare', 'Guest chat messages',              'guest_ops'),
  ('Guest Check-ins', 'guests',      'Users',         'Check-in management',              'guest_ops'),
  ('Knowledge Base',  'knowledge',   'BookOpen',      'Hotel policies & info',            'guest_ops'),
  ('Shuttle Schedule','shuttle',     'Bus',           'Transportation scheduling',         'shuttle'),
  ('Shuttle Bookings','shuttle_bookings','Bus',        'Shuttle reservations',             'shuttle'),
  ('Daily Recap',     'recap',       'BarChart3',     'Today''s performance overview',     'front_desk'),
  ('Checklists',      'checklists',  'ClipboardList', 'Shift checklists',                 'front_desk'),
  ('Staff Schedule',  'schedule',    'CalendarDays',  'Shift scheduling',                 'front_desk'),
  ('Staff Assistant', 'assistant',   'Bot',           'Knowledge base chatbot',            'front_desk'),
  ('Call Around',     'call-around', 'PhoneCall',     'Shift handoff log',                'front_desk'),
  ('Daily Logs',      'daily-logs',  'FileText',      'General shift log',                'front_desk'),
  ('No Shows',        'no-shows',    'UserX',         'Guest no-show tracking',           'front_desk'),
  ('Room Moves',      'room-moves',  'Move',          'Room change tracking',             'front_desk'),
  ('Bank Count',      'bank-count',  'DollarSign',    'Cash handling sheets',             'front_desk'),
  ('Room Management', 'rooms',       'DoorOpen',      'Room and inventory',               'admin_ops'),
  ('QR Codes',        'qrcodes',     'QrCode',        'QR code management',              'admin_ops'),
  ('Staff Management','staff_mgmt',  'Users',         'Staff account management',         'admin_ops'),
  ('Partners & Menu', 'partners',    'Store',         'Partner directory & menus',        'admin_ops')
on conflict (key) do nothing;

-- 5) Enable all tools for existing hotels (so nothing breaks immediately)
insert into hotel_ops_tools (hotel_id, tool_key, enabled)
select h.id, ot.key, true
from hotels h cross join ops_tools ot
where ot.is_built_in = true
on conflict (hotel_id, tool_key) do nothing;
