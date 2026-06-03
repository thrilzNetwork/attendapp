-- Attenda: Free Shuttle configuration per hotel
-- Run this in Supabase SQL Editor (project: bdmmstatrsenidlgjock)

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS has_free_shuttle BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuttle_start_time TIME,
  ADD COLUMN IF NOT EXISTS shuttle_end_time TIME,
  ADD COLUMN IF NOT EXISTS shuttle_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  ADD COLUMN IF NOT EXISTS shuttle_capacity INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS shuttle_pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS shuttle_notes TEXT;

-- Ensure the existing hotels RLS policy covers the new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hotels' AND policyname = 'anon_all_hotels'
  ) THEN
    EXECUTE 'CREATE POLICY anon_all_hotels ON hotels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;
