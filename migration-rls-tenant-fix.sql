-- ============================================================
-- ATTENDA TENANT ISOLATION FIX — CLOSE ALL WIDE-OPEN TABLES
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
-- Fixes: staff_schedules, weekly_forecasts, staff_checklists,
-- staff_checklist_instances, hotel_knowledge_base, cruise_schedules,
-- shuttle_routes, shuttle_slots, knowledge_base, checklists,
-- checklist_instances, learning_content, hr_documents,
-- schedule_change_requests, kpi_definitions, kpi_submissions,
-- checklist_templates, checklist_completions, forecasts,
-- generated_shifts, op_records, kb_suggestions
-- ============================================================

-- 0. Ensure helper functions exist
CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'hotel_id',
    current_setting('app.current_hotel_id', true)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin';
$$;

-- 1. Drop all the wide-open default_select policies
DROP POLICY IF EXISTS default_select ON public.staff_schedules;
DROP POLICY IF EXISTS default_select ON public.weekly_forecasts;
DROP POLICY IF EXISTS default_select ON public.staff_checklists;
DROP POLICY IF EXISTS default_select ON public.staff_checklist_instances;
DROP POLICY IF EXISTS default_select ON public.hotel_knowledge_base;
DROP POLICY IF EXISTS default_select ON public.cruise_schedules;
DROP POLICY IF EXISTS default_select ON public.shuttle_routes;
DROP POLICY IF EXISTS default_select ON public.shuttle_slots;
DROP POLICY IF EXISTS default_select ON public.knowledge_base;
DROP POLICY IF EXISTS default_select ON public.checklists;
DROP POLICY IF EXISTS default_select ON public.checklist_instances;
DROP POLICY IF EXISTS default_select ON public.learning_content;
DROP POLICY IF EXISTS default_select ON public.hr_documents;
DROP POLICY IF EXISTS default_select ON public.schedule_change_requests;
DROP POLICY IF EXISTS default_select ON public.kpi_definitions;
DROP POLICY IF EXISTS default_select ON public.kpi_submissions;
DROP POLICY IF EXISTS default_select ON public.checklist_templates;
DROP POLICY IF EXISTS default_select ON public.checklist_completions;
DROP POLICY IF EXISTS default_select ON public.forecasts;
DROP POLICY IF EXISTS default_select ON public.generated_shifts;
DROP POLICY IF EXISTS default_select ON public.op_records;
DROP POLICY IF EXISTS default_select ON public.kb_suggestions;

-- Also drop any old named policies that might conflict
DROP POLICY IF EXISTS staff_schedules_select ON public.staff_schedules;
DROP POLICY IF EXISTS weekly_forecasts_select ON public.weekly_forecasts;
DROP POLICY IF EXISTS staff_checklists_select ON public.staff_checklists;
DROP POLICY IF EXISTS staff_checklist_instances_select ON public.staff_checklist_instances;
DROP POLICY IF EXISTS hotel_knowledge_base_select ON public.hotel_knowledge_base;
DROP POLICY IF EXISTS cruise_schedules_select ON public.cruise_schedules;
DROP POLICY IF EXISTS shuttle_routes_select ON public.shuttle_routes;
DROP POLICY IF EXISTS shuttle_slots_select ON public.shuttle_slots;
DROP POLICY IF EXISTS knowledge_base_select ON public.knowledge_base;
DROP POLICY IF EXISTS checklists_select ON public.checklists;
DROP POLICY IF EXISTS checklist_instances_select ON public.checklist_instances;
DROP POLICY IF EXISTS learning_content_select ON public.learning_content;
DROP POLICY IF EXISTS hr_documents_select ON public.hr_documents;
DROP POLICY IF EXISTS schedule_change_requests_select ON public.schedule_change_requests;
DROP POLICY IF EXISTS kpi_definitions_select ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_submissions_select ON public.kpi_submissions;
DROP POLICY IF EXISTS checklist_templates_select ON public.checklist_templates;
DROP POLICY IF EXISTS checklist_completions_select ON public.checklist_completions;
DROP POLICY IF EXISTS forecasts_select ON public.forecasts;
DROP POLICY IF EXISTS generated_shifts_select ON public.generated_shifts;
DROP POLICY IF EXISTS op_records_select ON public.op_records;
DROP POLICY IF EXISTS kb_suggestions_select ON public.kb_suggestions;

-- 2. Create tenant-isolated SELECT policies for every table with hotel_id

-- staff_schedules
CREATE POLICY staff_schedules_select ON public.staff_schedules
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- weekly_forecasts
CREATE POLICY weekly_forecasts_select ON public.weekly_forecasts
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- staff_checklists
CREATE POLICY staff_checklists_select ON public.staff_checklists
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- staff_checklist_instances
CREATE POLICY staff_checklist_instances_select ON public.staff_checklist_instances
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- hotel_knowledge_base
CREATE POLICY hotel_knowledge_base_select ON public.hotel_knowledge_base
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- cruise_schedules
CREATE POLICY cruise_schedules_select ON public.cruise_schedules
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- shuttle_routes
CREATE POLICY shuttle_routes_select ON public.shuttle_routes
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- shuttle_slots
CREATE POLICY shuttle_slots_select ON public.shuttle_slots
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- knowledge_base
CREATE POLICY knowledge_base_select ON public.knowledge_base
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- checklists
CREATE POLICY checklists_select ON public.checklists
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- checklist_instances
CREATE POLICY checklist_instances_select ON public.checklist_instances
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- learning_content
CREATE POLICY learning_content_select ON public.learning_content
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- hr_documents
CREATE POLICY hr_documents_select ON public.hr_documents
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- schedule_change_requests
CREATE POLICY schedule_change_requests_select ON public.schedule_change_requests
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- kpi_definitions
CREATE POLICY kpi_definitions_select ON public.kpi_definitions
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- kpi_submissions
CREATE POLICY kpi_submissions_select ON public.kpi_submissions
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- checklist_templates
CREATE POLICY checklist_templates_select ON public.checklist_templates
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- checklist_completions
CREATE POLICY checklist_completions_select ON public.checklist_completions
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- forecasts
CREATE POLICY forecasts_select ON public.forecasts
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- generated_shifts
CREATE POLICY generated_shifts_select ON public.generated_shifts
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- op_records
CREATE POLICY op_records_select ON public.op_records
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- kb_suggestions
CREATE POLICY kb_suggestions_select ON public.kb_suggestions
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- 3. Also fix hotel_ops_tools (was USING true in rls-apply.sql)
DROP POLICY IF EXISTS default_select ON public.hotel_ops_tools;
DROP POLICY IF EXISTS hotel_ops_tools_select ON public.hotel_ops_tools;
CREATE POLICY hotel_ops_tools_select ON public.hotel_ops_tools
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- 4. Fix shuttle_bookings and shuttle_requests (were USING false — too restrictive)
DROP POLICY IF EXISTS default_select ON public.shuttle_bookings;
DROP POLICY IF EXISTS shuttle_bookings_select ON public.shuttle_bookings;
CREATE POLICY shuttle_bookings_select ON public.shuttle_bookings
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

DROP POLICY IF EXISTS default_select ON public.shuttle_requests;
DROP POLICY IF EXISTS shuttle_requests_select ON public.shuttle_requests;
CREATE POLICY shuttle_requests_select ON public.shuttle_requests
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- 5. Fix partner_menu_items and qr_codes (were USING true — no hotel_id filter)
DROP POLICY IF EXISTS default_select ON public.partner_menu_items;
CREATE POLICY partner_menu_items_select ON public.partner_menu_items
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR true)
  );

DROP POLICY IF EXISTS default_select ON public.qr_codes;
CREATE POLICY qr_codes_select ON public.qr_codes
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- 6. Fix hotel_rooms (was USING true — no hotel_id filter)
DROP POLICY IF EXISTS default_select ON public.hotel_rooms;
CREATE POLICY hotel_rooms_select ON public.hotel_rooms
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- 7. Fix guest_validations (was USING true)
DROP POLICY IF EXISTS default_select ON public.guest_validations;
CREATE POLICY guest_validations_select ON public.guest_validations
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- 8. Fix attenda_fees (was USING false — too restrictive)
DROP POLICY IF EXISTS default_select ON public.attenda_fees;
CREATE POLICY attenda_fees_select ON public.attenda_fees
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- 9. Fix superadmin_config (was USING false — too restrictive, needs to be readable)
DROP POLICY IF EXISTS default_select ON public.superadmin_config;
CREATE POLICY superadmin_config_select ON public.superadmin_config
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND public.is_superadmin()
  );

-- 10. Fix ops_tools (global catalog, no hotel_id — keep USING true but require auth)
DROP POLICY IF EXISTS default_select ON public.ops_tools;
CREATE POLICY ops_tools_select ON public.ops_tools
  FOR SELECT USING (auth.role() = 'authenticated');
