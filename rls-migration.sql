-- ============================================================
-- ATTENDA RLS MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Enable RLS on ALL tables
ALTER TABLE IF EXISTS public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.partner_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guest_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shuttle_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shuttle_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shuttle_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shuttle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cruise_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.checklist_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weekly_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hotel_ops_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ops_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kpi_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.generated_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.op_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kb_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.superadmin_config ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start clean
DROP POLICY IF EXISTS hotels_select ON public.hotels;
DROP POLICY IF EXISTS hotels_insert ON public.hotels;
DROP POLICY IF EXISTS hotels_update ON public.hotels;
DROP POLICY IF EXISTS staff_accounts_select ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_insert ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_update ON public.staff_accounts;
DROP POLICY IF EXISTS requests_select ON public.requests;
DROP POLICY IF EXISTS requests_insert ON public.requests;
DROP POLICY IF EXISTS requests_update ON public.requests;
DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;
DROP POLICY IF EXISTS messages_update ON public.messages;
DROP POLICY IF EXISTS partners_select ON public.partners;
DROP POLICY IF EXISTS partners_insert ON public.partners;
DROP POLICY IF EXISTS partners_update ON public.partners;

-- 3. Create policies

-- Hotels: anon can read, only service_role can write
CREATE POLICY hotels_select ON public.hotels
  FOR SELECT USING (true);
CREATE POLICY hotels_insert ON public.hotels
  FOR INSERT WITH CHECK (false);
CREATE POLICY hotels_update ON public.hotels
  FOR UPDATE USING (false);

-- Staff accounts: anon can read (for PIN login), only service_role writes
CREATE POLICY staff_accounts_select ON public.staff_accounts
  FOR SELECT USING (true);
CREATE POLICY staff_accounts_insert ON public.staff_accounts
  FOR INSERT WITH CHECK (false);
CREATE POLICY staff_accounts_update ON public.staff_accounts
  FOR UPDATE USING (false);

-- Requests: anon can read and insert (guest submits), update restricted
CREATE POLICY requests_select ON public.requests
  FOR SELECT USING (true);
CREATE POLICY requests_insert ON public.requests
  FOR INSERT WITH CHECK (true);
CREATE POLICY requests_update ON public.requests
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY requests_delete ON public.requests
  FOR DELETE USING (auth.role() = 'authenticated');

-- Messages: anon can read and insert (guest sends), update restricted
CREATE POLICY messages_select ON public.messages
  FOR SELECT USING (true);
CREATE POLICY messages_insert ON public.messages
  FOR INSERT WITH CHECK (true);
CREATE POLICY messages_update ON public.messages
  FOR UPDATE USING (false);

-- Partners: anon can read, only service_role writes
CREATE POLICY partners_select ON public.partners
  FOR SELECT USING (true);
CREATE POLICY partners_insert ON public.partners
  FOR INSERT WITH CHECK (false);
CREATE POLICY partners_update ON public.partners
  FOR UPDATE USING (false);

-- All other tables: anon can read, only service_role writes
CREATE POLICY default_select ON public.partner_menu_items FOR SELECT USING (true);
CREATE POLICY default_select ON public.qr_codes FOR SELECT USING (true);
CREATE POLICY default_select ON public.guest_validations FOR SELECT USING (true);
CREATE POLICY default_select ON public.hotel_rooms FOR SELECT USING (true);
CREATE POLICY default_select ON public.shuttle_routes FOR SELECT USING (true);
CREATE POLICY default_select ON public.shuttle_slots FOR SELECT USING (true);
CREATE POLICY default_select ON public.shuttle_bookings FOR SELECT USING (true);
CREATE POLICY default_select ON public.shuttle_requests FOR SELECT USING (true);
CREATE POLICY default_select ON public.cruise_schedules FOR SELECT USING (true);
CREATE POLICY default_select ON public.knowledge_base FOR SELECT USING (true);
CREATE POLICY default_select ON public.checklists FOR SELECT USING (true);
CREATE POLICY default_select ON public.checklist_instances FOR SELECT USING (true);
CREATE POLICY default_select ON public.staff_schedules FOR SELECT USING (true);
CREATE POLICY default_select ON public.weekly_forecasts FOR SELECT USING (true);
CREATE POLICY default_select ON public.hotel_ops_tools FOR SELECT USING (true);
CREATE POLICY default_select ON public.ops_tools FOR SELECT USING (true);
CREATE POLICY default_select ON public.learning_content FOR SELECT USING (true);
CREATE POLICY default_select ON public.hr_documents FOR SELECT USING (true);
CREATE POLICY default_select ON public.schedule_change_requests FOR SELECT USING (true);
CREATE POLICY default_select ON public.kpi_definitions FOR SELECT USING (true);
CREATE POLICY default_select ON public.kpi_submissions FOR SELECT USING (true);
CREATE POLICY default_select ON public.checklist_templates FOR SELECT USING (true);
CREATE POLICY default_select ON public.checklist_completions FOR SELECT USING (true);
CREATE POLICY default_select ON public.forecasts FOR SELECT USING (true);
CREATE POLICY default_select ON public.generated_shifts FOR SELECT USING (true);
CREATE POLICY default_select ON public.op_records FOR SELECT USING (true);
CREATE POLICY default_select ON public.kb_suggestions FOR SELECT USING (true);
CREATE POLICY default_select ON public.superadmin_config FOR SELECT USING (true);
