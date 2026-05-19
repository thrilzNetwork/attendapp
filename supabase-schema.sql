-- ===== ATTENDA HOTEL SAAS SCHEMA =====

-- Hotels table (one row per property)
create table hotels (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  wifi_name text default '',
  wifi_password text default '',
  welcome_letter text default 'Welcome to our hotel!',
  manager_name text default 'Hotel Manager',
  team_photo_url text default '',
  created_at timestamptz default now()
);

-- Guest requests
create table requests (
  id uuid default gen_random_uuid() primary key,
  guest_name text not null,
  room text not null,
  type text not null,  -- 'housekeeping', 'towels', 'maintenance', etc.
  details text default '',
  status text default 'pending',  -- 'pending', 'in_progress', 'done'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Staff accounts (created by admin)
create table staff_accounts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text default 'staff',  -- 'staff', 'manager', 'admin'
  pin_code text not null,  -- 4-6 digit PIN for login
  active boolean default true,
  created_at timestamptz default now()
);

-- Restaurant menu items (for in-room ordering)
create table restaurant_menu_items (
  id uuid default gen_random_uuid() primary key,
  restaurant_id text not null,  -- matches the ID in the app
  name text not null,
  description text default '',
  price decimal(10,2) not null,
  active boolean default true
);

-- Hotel rooms table (one row per room, per hotel)
create table hotel_rooms (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  room_number text not null,
  room_type text default '',  -- 'Standard', 'Suite', 'Deluxe', etc.
  floor integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(hotel_id, room_number)
);

alter table hotel_rooms enable row level security;
create policy "Anyone can read hotel rooms" on hotel_rooms for select using (true);
create policy "Anyone can insert hotel rooms" on hotel_rooms for insert with check (true);
create policy "Anyone can delete hotel rooms" on hotel_rooms for delete using (true);

-- RLS policies
alter table hotels enable row level security;
alter table requests enable row level security;
alter table staff_accounts enable row level security;
alter table restaurant_menu_items enable row level security;

-- Allow anonymous read from hotels (guests need to see config)
create policy "Anyone can read hotels" on hotels for select using (true);

-- Allow anonymous insert into requests (guests make requests)
create policy "Anyone can insert requests" on requests for insert with check (true);
create policy "Anyone can read requests" on requests for select using (true);
create policy "Anyone can update requests" on requests for update using (true);

-- Staff accounts: need to verify PIN
-- We'll read staff accounts from the admin/owner

create policy "Anyone can read staff" on staff_accounts for select using (true);

-- Insert default hotel
delete from hotels where slug = 'miami-airport';
insert into hotels (slug, name, wifi_name, wifi_password, welcome_letter, manager_name)
values ('miami-airport', 'Best Western Premier Miami Airport', 'BESTWESTERN', 'Welcome2025', 'Welcome to our hotel! We hope you enjoy your stay.', 'Hotel Manager');

-- Insert sample staff
delete from staff_accounts;
insert into staff_accounts (name, role, pin_code, active)
values ('Alice Johnson', 'manager', '123456', true),
       ('Bob Smith', 'staff', '111111', true);

-- Insert sample restaurants menu items
delete from restaurant_menu_items;
insert into restaurant_menu_items (restaurant_id, name, description, price)
values
  ('1', 'Tacos al Pastor', 'Corn tortillas with marinated pork, pineapple, cilantro, and onion', 14.99),
  ('1', 'Enchiladas Suizas', 'Corn tortillas filled with chicken, topped with green sauce and cheese', 16.99),
  ('1', 'Agua Fresca', 'Fresh fruit water (seasonal)', 4.99),
  ('2', 'Salmon Avocado Roll', 'Fresh salmon, avocado, cucumber', 12.99),
  ('2', 'Spicy Tuna Maki', 'Spicy tuna with cucumber', 11.99),
  ('2', 'Edamame', 'Steamed soybeans with sea salt', 5.99);
