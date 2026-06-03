-- Attenda: Department + role helpers for staff scheduling & checklists
-- Run this in Supabase SQL Editor (project: bdmmstatrsenidlgjock)

-- Add department column to staff_schedules (null = unsorted, falls back to role)
ALTER TABLE staff_schedules
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'front_desk';

-- Add department column to staff_checklists (drives the grouped UI)
ALTER TABLE staff_checklists
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'front_desk';

-- Add department column to staff_accounts (so we can list by department)
ALTER TABLE staff_accounts
  ADD COLUMN IF NOT EXISTS department TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_schedules_dept ON staff_schedules(hotel_id, department);
CREATE INDEX IF NOT EXISTS idx_staff_checklists_dept ON staff_checklists(hotel_id, department);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_dept ON staff_accounts(hotel_id, department) WHERE hotel_id IS NOT NULL;

-- Departments reference list (purely documentation — no enum enforced at DB layer)
-- front_desk, housekeeping, maintenance, management, security, drivers
