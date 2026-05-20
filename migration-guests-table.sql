-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bdmmstatrsenidlgjock/sql/new
--
-- Adds a 'guests' table to track check-ins, and ensures hotel_id exists on requests.

-- 1. Add hotel_id to requests if not already present
ALTER TABLE requests ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;

-- 2. Create the guests table
CREATE TABLE IF NOT EXISTS guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  room text NOT NULL,
  checkout date NOT NULL,
  checked_in_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',  -- 'active', 'checked_out'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on guests
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- 4. Allow anonymous insert (guests check themselves in)
CREATE POLICY "Anyone can insert guests" ON guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read guests" ON guests FOR SELECT USING (true);
CREATE POLICY "Anyone can update guests" ON guests FOR UPDATE USING (true);
