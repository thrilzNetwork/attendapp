-- Bouncie GPS integration tables
-- Created: 2026-06-16

-- OAuth tokens per hotel. One hotel may link one Bouncie user account.
create table if not exists bouncie_connections (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  bouncie_user_id text default '',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(hotel_id)
);

-- Vehicles / devices discovered from Bouncie. A device belongs to one hotel.
create table if not exists bouncie_devices (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  device_id text not null,
  vehicle_name text default '',
  vin text default '',
  imei text default '',
  is_shuttle boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(hotel_id, device_id)
);

-- Latest known GPS location per device (updated in place by webhook or pull).
create table if not exists bouncie_locations (
  id uuid default gen_random_uuid() primary key,
  device_id text not null,
  hotel_id uuid references hotels(id) on delete cascade not null,
  lat numeric not null,
  lng numeric not null,
  speed_mph numeric default 0,
  heading numeric default 0,
  accuracy numeric default 0,
  odometer numeric default 0,
  recorded_at timestamptz not null,
  received_at timestamptz default now(),
  unique(device_id)
);

-- Trips reported by Bouncie webhooks.
create table if not exists bouncie_trips (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  device_id text not null,
  trip_id text not null,
  start_at timestamptz,
  end_at timestamptz,
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  distance_miles numeric default 0,
  duration_seconds integer default 0,
  max_speed_mph numeric default 0,
  average_speed_mph numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(hotel_id, trip_id)
);

-- Application geo-zones defined via Bouncie API for shuttle ETA/arrival alerts.
create table if not exists bouncie_geozones (
  id uuid default gen_random_uuid() primary key,
  hotel_id uuid references hotels(id) on delete cascade not null,
  bouncie_geozone_id text default '',
  name text not null,
  zone_type text not null, -- 'hotel', 'airport', 'cruise_port', 'custom'
  lat numeric not null,
  lng numeric not null,
  radius_meters numeric default 200,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table bouncie_connections enable row level security;
alter table bouncie_devices enable row level security;
alter table bouncie_locations enable row level security;
alter table bouncie_trips enable row level security;
alter table bouncie_geozones enable row level security;

-- Server-only reads/writes. Clients should use Next.js API routes to access this data.
create policy "Service role full access" on bouncie_connections for all using (true) with check (true);
create policy "Service role full access" on bouncie_devices for all using (true) with check (true);
create policy "Service role full access" on bouncie_locations for all using (true) with check (true);
create policy "Service role full access" on bouncie_trips for all using (true) with check (true);
create policy "Service role full access" on bouncie_geozones for all using (true) with check (true);
