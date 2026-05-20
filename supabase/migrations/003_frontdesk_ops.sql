-- Attenda Front Desk Operations
-- Run this in Supabase SQL Editor

-- 1. Staff Checklists (templates created by admin)
CREATE TABLE IF NOT EXISTS staff_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  assigned_role TEXT DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Staff Checklist Instances (per-shift execution)
CREATE TABLE IF NOT EXISTS staff_checklist_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES staff_checklists(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  staff_name TEXT,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checked_items JSONB NOT NULL DEFAULT '[]',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 3. Staff Schedules
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff_accounts(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  role TEXT DEFAULT 'staff',
  notes TEXT,
  created_by UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checklists_hotel ON staff_checklists(hotel_id);
CREATE INDEX IF NOT EXISTS idx_checklist_instances_hotel ON staff_checklist_instances(hotel_id);
CREATE INDEX IF NOT EXISTS idx_checklist_instances_date ON staff_checklist_instances(shift_date);
CREATE INDEX IF NOT EXISTS idx_checklist_instances_staff ON staff_checklist_instances(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_hotel ON staff_schedules(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON staff_schedules(shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff ON staff_schedules(staff_id);
