-- Fix weekly_forecasts table: add missing columns, clean duplicates, add unique constraint

-- 1. Add missing columns
ALTER TABLE weekly_forecasts ADD COLUMN IF NOT EXISTS departures INTEGER DEFAULT 0;
ALTER TABLE weekly_forecasts ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 0;
ALTER TABLE weekly_forecasts ADD COLUMN IF NOT EXISTS prev_night_occ INTEGER DEFAULT 0;

-- 2. Remove duplicate rows — keep the most recently updated (or created) one per (hotel_id, date)
DELETE FROM weekly_forecasts
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY hotel_id, date
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) AS rn
    FROM weekly_forecasts
  ) AS dups
  WHERE dups.rn > 1
);

-- 3. Add unique constraint to prevent future duplicates
ALTER TABLE weekly_forecasts ADD CONSTRAINT weekly_forecasts_hotel_date_unique UNIQUE (hotel_id, date);