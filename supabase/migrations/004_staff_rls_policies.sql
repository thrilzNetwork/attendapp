-- Attenda Staff Tables RLS Policies
-- Run this in Supabase SQL Editor (project: bdmmstatrsenidlgjock)
-- Permissive policies matching existing `requests` and `messages` tables
-- (single-tenant-per-hotel SaaS — auth gated by staff dashboard, not Supabase RLS)

-- staff_schedules
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_staff_schedules" ON staff_schedules;
CREATE POLICY "anon_all_staff_schedules" ON staff_schedules
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- staff_checklists
ALTER TABLE staff_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_staff_checklists" ON staff_checklists;
CREATE POLICY "anon_all_staff_checklists" ON staff_checklists
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- staff_checklist_instances
ALTER TABLE staff_checklist_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_staff_checklist_instances" ON staff_checklist_instances;
CREATE POLICY "anon_all_staff_checklist_instances" ON staff_checklist_instances
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- staff_hr (likely also missing)
ALTER TABLE IF EXISTS staff_hr ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_staff_hr" ON staff_hr;
CREATE POLICY "anon_all_staff_hr" ON staff_hr
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
