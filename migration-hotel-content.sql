-- Add hotel content JSONB columns for admin-editable guest pages
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS facilities_content JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS safety_content JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS transport_content JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS food_content JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS nearby_intro JSONB DEFAULT '{}'::jsonb;