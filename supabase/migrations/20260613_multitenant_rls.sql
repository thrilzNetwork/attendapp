-- Attenda Multi-Tenant RLS Migration
-- Apply after deploying the staff-crud API route
-- Project: bdmmstatrsenidlgjock

-- Helper: get hotel_id from JWT user_metadata
CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'hotel_id',
    current_setting('request.jwt.claims', true)::jsonb ->> 'hotel_id',
    ''
  );
$$;

-- Helper: is superadmin?
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') = 'superadmin',
    false
  );
$$;

-- ==========================================
-- 1. REQUESTS — staff can CRUD their hotel's requests; guests can INSERT (anon)
-- ==========================================
ALTER TABLE IF EXISTS requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select_own_hotel" ON requests;
CREATE POLICY "requests_select_own_hotel" ON requests
  FOR SELECT USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "requests_insert_anon" ON requests;
CREATE POLICY "requests_insert_anon" ON requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "requests_update_own_hotel" ON requests;
CREATE POLICY "requests_update_own_hotel" ON requests
  FOR UPDATE USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- ==========================================
-- 2. MESSAGES — same pattern
-- ==========================================
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_own_hotel" ON messages;
CREATE POLICY "messages_select_own_hotel" ON messages
  FOR SELECT USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "messages_insert_anon" ON messages;
CREATE POLICY "messages_insert_anon" ON messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ==========================================
-- 3. STAFF ACCOUNTS — BLOCKED for anon; server-side API only
-- ==========================================
ALTER TABLE IF EXISTS staff_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_accounts_block_anon" ON staff_accounts;
CREATE POLICY "staff_accounts_block_anon" ON staff_accounts
  FOR ALL USING (false);

-- ==========================================
-- 4. PARTNERS (Nearby) — readable by all, writable by staff + superadmin
-- ==========================================
ALTER TABLE IF EXISTS partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners_read_all" ON partners;
CREATE POLICY "partners_read_all" ON partners
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "partners_write_own_hotel" ON partners;
CREATE POLICY "partners_write_own_hotel" ON partners
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- ==========================================
-- 5. SHUTTLE ROUTES — readable by all, writable by staff
-- ==========================================
ALTER TABLE IF EXISTS shuttle_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shuttle_routes_read_all" ON shuttle_routes;
CREATE POLICY "shuttle_routes_read_all" ON shuttle_routes
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "shuttle_routes_write_own_hotel" ON shuttle_routes;
CREATE POLICY "shuttle_routes_write_own_hotel" ON shuttle_routes
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- ==========================================
-- 6. HOTEL ROOMS — readable by all
-- ==========================================
ALTER TABLE IF EXISTS hotel_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_rooms_read_all" ON hotel_rooms;
CREATE POLICY "hotel_rooms_read_all" ON hotel_rooms
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "hotel_rooms_write_own_hotel" ON hotel_rooms;
CREATE POLICY "hotel_rooms_write_own_hotel" ON hotel_rooms
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- ==========================================
-- 7. STAFF SCHEDULES
-- ==========================================
ALTER TABLE IF EXISTS staff_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_schedules_select_own_hotel" ON staff_schedules;
CREATE POLICY "staff_schedules_select_own_hotel" ON staff_schedules
  FOR SELECT USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "staff_schedules_write_own_hotel" ON staff_schedules;
CREATE POLICY "staff_schedules_write_own_hotel" ON staff_schedules
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- ==========================================
-- 8. HOTELS — public read, superadmin only write
-- ==========================================
ALTER TABLE IF EXISTS hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotels_read_anon" ON hotels;
CREATE POLICY "hotels_read_anon" ON hotels
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "hotels_write_superadmin" ON hotels;
CREATE POLICY "hotels_write_superadmin" ON hotels
  FOR ALL USING (public.is_superadmin());

-- ==========================================
-- 9. GUEST VALIDATIONS — anon insert (guest self-checkin)
-- ==========================================
ALTER TABLE IF EXISTS guest_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guest_validations_select_own_hotel" ON guest_validations;
CREATE POLICY "guest_validations_select_own_hotel" ON guest_validations
  FOR SELECT USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "guest_validations_insert_anon" ON guest_validations;
CREATE POLICY "guest_validations_insert_anon" ON guest_validations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ==========================================
-- 10. remaining staff/ops tables
-- ==========================================
-- For tables without hotel_id: superadmin only
-- staff_checklists has hotel_id
ALTER TABLE IF EXISTS staff_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_checklists_own_hotel" ON staff_checklists;
CREATE POLICY "staff_checklists_own_hotel" ON staff_checklists
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- staff_checklist_instances
ALTER TABLE IF EXISTS staff_checklist_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_instances_own_hotel" ON staff_checklist_instances;
CREATE POLICY "checklist_instances_own_hotel" ON staff_checklist_instances
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- schedule_change_requests has hotel_id
ALTER TABLE IF EXISTS schedule_change_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedule_changes_own_hotel" ON schedule_change_requests;
CREATE POLICY "schedule_changes_own_hotel" ON schedule_change_requests
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- cruise_schedules has hotel_id
ALTER TABLE IF EXISTS cruise_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cruise_schedules_own_hotel" ON cruise_schedules;
CREATE POLICY "cruise_schedules_own_hotel" ON cruise_schedules
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- weekly_forecasts has hotel_id
ALTER TABLE IF EXISTS weekly_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weekly_forecasts_own_hotel" ON weekly_forecasts;
CREATE POLICY "weekly_forecasts_own_hotel" ON weekly_forecasts
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- superadmin_config — superadmin only
ALTER TABLE IF EXISTS superadmin_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin_config_self" ON superadmin_config;
CREATE POLICY "superadmin_config_self" ON superadmin_config
  FOR ALL USING (public.is_superadmin());

-- learning_courses has hotel_id  
ALTER TABLE IF EXISTS learning_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "learning_courses_own_hotel" ON learning_courses;
CREATE POLICY "learning_courses_own_hotel" ON learning_courses
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- course_modules has hotel_id
ALTER TABLE IF EXISTS course_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_modules_own_hotel" ON course_modules;
CREATE POLICY "course_modules_own_hotel" ON course_modules
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- quiz_questions
ALTER TABLE IF EXISTS quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quiz_questions_own_hotel" ON quiz_questions;
CREATE POLICY "quiz_questions_own_hotel" ON quiz_questions
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- module_completions
ALTER TABLE IF EXISTS module_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "module_completions_own_hotel" ON module_completions;
CREATE POLICY "module_completions_own_hotel" ON module_completions
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- quiz_attempts
ALTER TABLE IF EXISTS quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quiz_attempts_own_hotel" ON quiz_attempts;
CREATE POLICY "quiz_attempts_own_hotel" ON quiz_attempts
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- hr_documents
ALTER TABLE IF EXISTS hr_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hr_documents_own_hotel" ON hr_documents;
CREATE POLICY "hr_documents_own_hotel" ON hr_documents
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );

-- knowledge_base  
ALTER TABLE IF EXISTS knowledge_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "knowledge_base_own_hotel" ON knowledge_base;
CREATE POLICY "knowledge_base_own_hotel" ON knowledge_base
  FOR ALL USING (
    hotel_id::text = public.get_user_hotel_id()
    OR public.is_superadmin()
  );