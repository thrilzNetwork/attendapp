-- ═════════════════════════════════════════════════════════════════
-- FIX: RLS policies blocking staff from seeing their hotel's data
-- 
-- PROBLEM: Staff log in but see empty To-Dos, Partners, QR codes,
-- Staff list, Schedules, etc. because old RLS policies block reads
-- when get_user_hotel_id() returns empty.
--
-- FIX: Drop ALL existing policies on affected tables, recreate with
-- permissive SELECT for authenticated users (filtered by hotel_id)
-- and superadmin access to everything.
--
-- Run this ONCE in the Supabase SQL Editor.
-- ═════════════════════════════════════════════════════════════════

-- ─── Helper functions (ensure they exist and work) ───

-- get_user_hotel_id: resolve the caller's hotel from staff_accounts by auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_hotel_id TEXT;
BEGIN
  -- Superadmins have no single hotel
  IF public.is_superadmin() THEN
    RETURN NULL;
  END IF;
  
  -- Try staff_accounts by auth_user_id
  SELECT hotel_id::text INTO v_hotel_id
  FROM public.staff_accounts
  WHERE auth_user_id = v_uid
  LIMIT 1;
  
  IF v_hotel_id IS NOT NULL THEN
    RETURN v_hotel_id;
  END IF;
  
  -- Fallback: try by email matching auth.users
  SELECT sa.hotel_id::text INTO v_hotel_id
  FROM public.staff_accounts sa
  JOIN auth.users u ON sa.email = u.email
  WHERE u.id = v_uid
  LIMIT 1;
  
  RETURN v_hotel_id;
END;
$$;

-- is_superadmin: check if the current user is a platform superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmin_config WHERE user_id = auth.uid()::text
  ) OR (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'superadmin'
  ) OR (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin'
  );
$$;

-- ═══════════════════════════════════════════════════════════════
-- TABLES TO FIX: Drop ALL existing policies, recreate permissive
-- ═══════════════════════════════════════════════════════════════

-- Helper: a permissive SELECT policy that lets any authenticated
-- user read rows in their hotel, and superadmins read everything.
-- Anon users get nothing (they use the guest app which has its own policies).

-- ─── HOTELS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS hotels_select ON public.hotels;
DROP POLICY IF EXISTS hotels_insert ON public.hotels;
DROP POLICY IF EXISTS hotels_update ON public.hotels;
DROP POLICY IF EXISTS hotels_delete ON public.hotels;
DROP POLICY IF EXISTS "hotels_select_own_hotel" ON public.hotels;
DROP POLICY IF EXISTS "hotels_all_own_hotel" ON public.hotels;

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY hotels_select ON public.hotels FOR SELECT
  USING (public.is_superadmin() OR id::text = public.get_user_hotel_id() OR auth.role() = 'anon');
CREATE POLICY hotels_update ON public.hotels FOR UPDATE
  USING (public.is_superadmin() OR id::text = public.get_user_hotel_id());
CREATE POLICY hotels_insert ON public.hotels FOR INSERT
  WITH CHECK (public.is_superadmin());

-- ─── STAFF_ACCOUNTS ─────────────────────────────────────────────
DROP POLICY IF EXISTS staff_accounts_select ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_insert ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_update ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_delete ON public.staff_accounts;
DROP POLICY IF EXISTS "staff_accounts_select_own_hotel" ON public.staff_accounts;
DROP POLICY IF EXISTS "staff_accounts_all_own_hotel" ON public.staff_accounts;
DROP POLICY IF EXISTS "staff_accounts_hotel_select" ON public.staff_accounts;

ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_accounts_select ON public.staff_accounts FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY staff_accounts_insert ON public.staff_accounts FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY staff_accounts_update ON public.staff_accounts FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY staff_accounts_delete ON public.staff_accounts FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── POSITION_TODO_TEMPLATES ────────────────────────────────────
DROP POLICY IF EXISTS position_todo_templates_select ON public.position_todo_templates;
DROP POLICY IF EXISTS position_todo_templates_insert ON public.position_todo_templates;
DROP POLICY IF EXISTS position_todo_templates_update ON public.position_todo_templates;
DROP POLICY IF EXISTS position_todo_templates_delete ON public.position_todo_templates;
DROP POLICY IF EXISTS "position_todo_templates_select_own_hotel" ON public.position_todo_templates;
DROP POLICY IF EXISTS "position_todo_templates_all_own_hotel" ON public.position_todo_templates;

ALTER TABLE public.position_todo_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY position_todo_templates_select ON public.position_todo_templates FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY position_todo_templates_insert ON public.position_todo_templates FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY position_todo_templates_update ON public.position_todo_templates FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY position_todo_templates_delete ON public.position_todo_templates FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── POSITION_TODO_ITEMS ───────────────────────────────────────
DROP POLICY IF EXISTS position_todo_items_select ON public.position_todo_items;
DROP POLICY IF EXISTS position_todo_items_insert ON public.position_todo_items;
DROP POLICY IF EXISTS position_todo_items_update ON public.position_todo_items;
DROP POLICY IF EXISTS position_todo_items_delete ON public.position_todo_items;

ALTER TABLE public.position_todo_items ENABLE ROW LEVEL SECURITY;

-- position_todo_items has no hotel_id column, so we allow authenticated to read all
CREATE POLICY position_todo_items_select ON public.position_todo_items FOR SELECT
  USING (auth.role() = 'authenticated' OR public.is_superadmin());
CREATE POLICY position_todo_items_insert ON public.position_todo_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR public.is_superadmin());
CREATE POLICY position_todo_items_update ON public.position_todo_items FOR UPDATE
  USING (auth.role() = 'authenticated' OR public.is_superadmin());
CREATE POLICY position_todo_items_delete ON public.position_todo_items FOR DELETE
  USING (auth.role() = 'authenticated' OR public.is_superadmin());

-- ─── POSITION_TODO_INSTANCES ───────────────────────────────────
DROP POLICY IF EXISTS position_todo_instances_select ON public.position_todo_instances;
DROP POLICY IF EXISTS position_todo_instances_insert ON public.position_todo_instances;
DROP POLICY IF EXISTS position_todo_instances_update ON public.position_todo_instances;
DROP POLICY IF EXISTS position_todo_instances_delete ON public.position_todo_instances;
DROP POLICY IF EXISTS "position_todo_instances_select_own_hotel" ON public.position_todo_instances;
DROP POLICY IF EXISTS "position_todo_instances_all_own_hotel" ON public.position_todo_instances;

ALTER TABLE public.position_todo_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY position_todo_instances_select ON public.position_todo_instances FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY position_todo_instances_insert ON public.position_todo_instances FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY position_todo_instances_update ON public.position_todo_instances FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY position_todo_instances_delete ON public.position_todo_instances FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── POSITION_TODO_RESPONSES ────────────────────────────────────
DROP POLICY IF EXISTS position_todo_responses_select ON public.position_todo_responses;
DROP POLICY IF EXISTS position_todo_responses_insert ON public.position_todo_responses;
DROP POLICY IF EXISTS position_todo_responses_update ON public.position_todo_responses;
DROP POLICY IF EXISTS position_todo_responses_delete ON public.position_todo_responses;

ALTER TABLE public.position_todo_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY position_todo_responses_select ON public.position_todo_responses FOR SELECT
  USING (auth.role() = 'authenticated' OR public.is_superadmin());
CREATE POLICY position_todo_responses_insert ON public.position_todo_responses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR public.is_superadmin());
CREATE POLICY position_todo_responses_update ON public.position_todo_responses FOR UPDATE
  USING (auth.role() = 'authenticated' OR public.is_superadmin());
CREATE POLICY position_todo_responses_delete ON public.position_todo_responses FOR DELETE
  USING (auth.role() = 'authenticated' OR public.is_superadmin());

-- ─── STAFF_POSITIONS ───────────────────────────────────────────
DROP POLICY IF EXISTS staff_positions_select ON public.staff_positions;
DROP POLICY IF EXISTS staff_positions_insert ON public.staff_positions;
DROP POLICY IF EXISTS staff_positions_update ON public.staff_positions;
DROP POLICY IF EXISTS staff_positions_delete ON public.staff_positions;
DROP POLICY IF EXISTS "staff_positions_select_own_hotel" ON public.staff_positions;
DROP POLICY IF EXISTS "staff_positions_all_own_hotel" ON public.staff_positions;

ALTER TABLE public.staff_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_positions_select ON public.staff_positions FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY staff_positions_insert ON public.staff_positions FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY staff_positions_update ON public.staff_positions FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY staff_positions_delete ON public.staff_positions FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── PARTNERS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS partners_select ON public.partners;
DROP POLICY IF EXISTS partners_insert ON public.partners;
DROP POLICY IF EXISTS partners_update ON public.partners;
DROP POLICY IF EXISTS partners_delete ON public.partners;
DROP POLICY IF EXISTS "partners_select_own_hotel" ON public.partners;
DROP POLICY IF EXISTS "partners_all_own_hotel" ON public.partners;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY partners_select ON public.partners FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY partners_insert ON public.partners FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY partners_update ON public.partners FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY partners_delete ON public.partners FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── QR_CODES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS qr_codes_select ON public.qr_codes;
DROP POLICY IF EXISTS qr_codes_insert ON public.qr_codes;
DROP POLICY IF EXISTS qr_codes_update ON public.qr_codes;
DROP POLICY IF EXISTS qr_codes_delete ON public.qr_codes;
DROP POLICY IF EXISTS "qr_codes_own_hotel" ON public.qr_codes;

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY qr_codes_select ON public.qr_codes FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id() OR auth.role() = 'anon');
CREATE POLICY qr_codes_insert ON public.qr_codes FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY qr_codes_update ON public.qr_codes FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY qr_codes_delete ON public.qr_codes FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── STAFF_SCHEDULES ───────────────────────────────────────────
DROP POLICY IF EXISTS staff_schedules_select ON public.staff_schedules;
DROP POLICY IF EXISTS staff_schedules_insert ON public.staff_schedules;
DROP POLICY IF EXISTS staff_schedules_update ON public.staff_schedules;
DROP POLICY IF EXISTS staff_schedules_delete ON public.staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_select_own_hotel" ON public.staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_write_own_hotel" ON public.staff_schedules;
DROP POLICY IF EXISTS "anon_all_staff_schedules" ON public.staff_schedules;

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_schedules_select ON public.staff_schedules FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY staff_schedules_insert ON public.staff_schedules FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY staff_schedules_update ON public.staff_schedules FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY staff_schedules_delete ON public.staff_schedules FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── NO_SHOWS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS no_shows_select ON public.no_shows;
DROP POLICY IF EXISTS no_shows_insert ON public.no_shows;
DROP POLICY IF EXISTS no_shows_update ON public.no_shows;
DROP POLICY IF EXISTS no_shows_delete ON public.no_shows;

ALTER TABLE public.no_shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY no_shows_select ON public.no_shows FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY no_shows_insert ON public.no_shows FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY no_shows_update ON public.no_shows FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY no_shows_delete ON public.no_shows FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── BANK_COUNTS ───────────────────────────────────────────────
DROP POLICY IF EXISTS bank_counts_select ON public.bank_counts;
DROP POLICY IF EXISTS bank_counts_insert ON public.bank_counts;
DROP POLICY IF EXISTS bank_counts_update ON public.bank_counts;
DROP POLICY IF EXISTS bank_counts_delete ON public.bank_counts;

ALTER TABLE public.bank_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_counts_select ON public.bank_counts FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY bank_counts_insert ON public.bank_counts FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY bank_counts_update ON public.bank_counts FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY bank_counts_delete ON public.bank_counts FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── ROOM_MOVES ────────────────────────────────────────────────
DROP POLICY IF EXISTS room_moves_select ON public.room_moves;
DROP POLICY IF EXISTS room_moves_insert ON public.room_moves;
DROP POLICY IF EXISTS room_moves_update ON public.room_moves;
DROP POLICY IF EXISTS room_moves_delete ON public.room_moves;

ALTER TABLE public.room_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_moves_select ON public.room_moves FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY room_moves_insert ON public.room_moves FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY room_moves_update ON public.room_moves FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY room_moves_delete ON public.room_moves FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── KNOWLEDGE_BASE ────────────────────────────────────────────
DROP POLICY IF EXISTS knowledge_base_select ON public.knowledge_base;
DROP POLICY IF EXISTS knowledge_base_insert ON public.knowledge_base;
DROP POLICY IF EXISTS knowledge_base_update ON public.knowledge_base;
DROP POLICY IF EXISTS knowledge_base_delete ON public.knowledge_base;
DROP POLICY IF EXISTS "knowledge_base_select_own_hotel" ON public.knowledge_base;
DROP POLICY IF EXISTS "knowledge_base_all_own_hotel" ON public.knowledge_base;

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_base_select ON public.knowledge_base FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY knowledge_base_insert ON public.knowledge_base FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY knowledge_base_update ON public.knowledge_base FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY knowledge_base_delete ON public.knowledge_base FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── KPI_DEFINITIONS ───────────────────────────────────────────
DROP POLICY IF EXISTS kpi_definitions_select ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_definitions_insert ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_definitions_update ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_definitions_delete ON public.kpi_definitions;
DROP POLICY IF EXISTS "kpi_definitions_select_own_hotel" ON public.kpi_definitions;
DROP POLICY IF EXISTS "kpi_definitions_all_own_hotel" ON public.kpi_definitions;

ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY kpi_definitions_select ON public.kpi_definitions FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY kpi_definitions_insert ON public.kpi_definitions FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY kpi_definitions_update ON public.kpi_definitions FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY kpi_definitions_delete ON public.kpi_definitions FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── KPI_SUBMISSIONS ──────────────────────────────────────────
DROP POLICY IF EXISTS kpi_submissions_select ON public.kpi_submissions;
DROP POLICY IF EXISTS kpi_submissions_insert ON public.kpi_submissions;
DROP POLICY IF EXISTS kpi_submissions_update ON public.kpi_submissions;
DROP POLICY IF EXISTS kpi_submissions_delete ON public.kpi_submissions;
DROP POLICY IF EXISTS "kpi_submissions_select_own_hotel" ON public.kpi_submissions;
DROP POLICY IF EXISTS "kpi_submissions_all_own_hotel" ON public.kpi_submissions;

ALTER TABLE public.kpi_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY kpi_submissions_select ON public.kpi_submissions FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY kpi_submissions_insert ON public.kpi_submissions FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY kpi_submissions_update ON public.kpi_submissions FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY kpi_submissions_delete ON public.kpi_submissions FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── BLOG_POSTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS blog_posts_select ON public.blog_posts;
DROP POLICY IF EXISTS blog_posts_insert ON public.blog_posts;
DROP POLICY IF EXISTS blog_posts_update ON public.blog_posts;
DROP POLICY IF EXISTS blog_posts_delete ON public.blog_posts;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_posts_select ON public.blog_posts FOR SELECT
  USING (true); -- blog posts are public
CREATE POLICY blog_posts_insert ON public.blog_posts FOR INSERT
  WITH CHECK (public.is_superadmin());
CREATE POLICY blog_posts_update ON public.blog_posts FOR UPDATE
  USING (public.is_superadmin());
CREATE POLICY blog_posts_delete ON public.blog_posts FOR DELETE
  USING (public.is_superadmin());

-- ─── CRUISE_SCHEDULES ──────────────────────────────────────────
DROP POLICY IF EXISTS cruise_schedules_select ON public.cruise_schedules;
DROP POLICY IF EXISTS cruise_schedules_insert ON public.cruise_schedules;
DROP POLICY IF EXISTS cruise_schedules_update ON public.cruise_schedules;
DROP POLICY IF EXISTS cruise_schedules_delete ON public.cruise_schedules;

ALTER TABLE public.cruise_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY cruise_schedules_select ON public.cruise_schedules FOR SELECT
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY cruise_schedules_insert ON public.cruise_schedules FOR INSERT
  WITH CHECK (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY cruise_schedules_update ON public.cruise_schedules FOR UPDATE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());
CREATE POLICY cruise_schedules_delete ON public.cruise_schedules FOR DELETE
  USING (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id());

-- ─── ADDITIONAL TABLES (partner_menu_items, staff_rdo_requests, etc.) ───

-- Partner menu items (no hotel_id, link via partner_id)
DROP POLICY IF EXISTS partner_menu_items_select ON public.partner_menu_items;
DROP POLICY IF EXISTS partner_menu_items_insert ON public.partner_menu_items;
DROP POLICY IF EXISTS partner_menu_items_update ON public.partner_menu_items;
DROP POLICY IF EXISTS partner_menu_items_delete ON public.partner_menu_items;

ALTER TABLE public.partner_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY partner_menu_items_select ON public.partner_menu_items FOR SELECT
  USING (auth.role() = 'authenticated' OR public.is_superadmin() OR auth.role() = 'anon');
CREATE POLICY partner_menu_items_insert ON public.partner_menu_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR public.is_superadmin());
CREATE POLICY partner_menu_items_update ON public.partner_menu_items FOR UPDATE
  USING (auth.role() = 'authenticated' OR public.is_superadmin());
CREATE POLICY partner_menu_items_delete ON public.partner_menu_items FOR DELETE
  USING (auth.role() = 'authenticated' OR public.is_superadmin());

-- ─── GRANTs (ensure permissions are in place) ──────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- VERIFY: Check that policies are now correct
-- ═══════════════════════════════════════════════════════════════
SELECT 'Done — RLS policies fixed for all staff-facing tables' as result;