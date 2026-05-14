-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bdmmstatrsenidlgjock/sql/new

-- 1. Add pricing to shuttle_routes
ALTER TABLE shuttle_routes ADD COLUMN IF NOT EXISTS price decimal(10,2) DEFAULT 0;
ALTER TABLE shuttle_routes ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- 2. Add event labels + override price to slots
ALTER TABLE shuttle_slots ADD COLUMN IF NOT EXISTS event_label text DEFAULT '';
ALTER TABLE shuttle_slots ADD COLUMN IF NOT EXISTS override_price decimal(10,2) DEFAULT NULL;

-- 3. Add charge tracking to bookings
ALTER TABLE shuttle_bookings ADD COLUMN IF NOT EXISTS price_charged decimal(10,2) DEFAULT 0;
ALTER TABLE shuttle_bookings ADD COLUMN IF NOT EXISTS charge_accepted boolean DEFAULT false;
