-- Add timezone column to hotels table for timezone-aware "today" logic
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York';

-- Set known timezones
UPDATE hotels SET timezone = 'America/New_York' WHERE slug = 'ftl-airport';
UPDATE hotels SET timezone = 'America/New_York' WHERE slug = 'miami-airport';