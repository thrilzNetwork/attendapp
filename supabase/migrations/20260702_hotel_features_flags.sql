-- Add features JSONB column to hotels table
-- Each key is a feature/tab name, value is true (enabled) or false (disabled)
-- Default: all features enabled for backward compatibility

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "orders": true,
  "messages": true,
  "shuttle": true,
  "schedules": true,
  "todos": true,
  "kpis": true,
  "marketplace": true,
  "compset": true,
  "forecast": true,
  "culture": true,
  "knowledge": true,
  "learning_hr": true,
  "revenue": true,
  "reports": true,
  "callouts": true,
  "vendors": true,
  "qrcodes": true,
  "rooms": true,
  "leaderboard": true
}'::jsonb;
