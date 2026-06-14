-- ============================================================
-- RLS Lockdown v3 — 2026-06-13
-- Fixes 10 tables with loose or missing RLS policies.
-- Uses existing helper functions (get_user_hotel_id returns text,
-- is_superadmin checks JWT claims).
-- ============================================================

-- Helper to check if a text hotel_id matches the user's JWT claim
CREATE OR REPLACE FUNCTION public.hotel_id_check(required_hotel_id text)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT public.get_user_hotel_id() = required_hotel_id;
$$;

-- Helper: is the user an authenticated staff member?
CREATE OR REPLACE FUNCTION public.is_hotel_staff()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_accounts WHERE id = auth.uid() AND active = true);
$$;

-- ═══════════════════════════════════════════════════════════════
-- 1. bank_counts — has hotel_id (uuid)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can delete bank_counts" ON public.bank_counts;
DROP POLICY IF EXISTS "Anyone can insert bank_counts" ON public.bank_counts;
DROP POLICY IF EXISTS "Anyone can read bank_counts" ON public.bank_counts;
DROP POLICY IF EXISTS "Anyone can update bank_counts" ON public.bank_counts;

CREATE POLICY "bank_counts_select_own_hotel"
  ON public.bank_counts FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "bank_counts_insert_own_hotel"
  ON public.bank_counts FOR INSERT
  WITH CHECK (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "bank_counts_update_own_hotel"
  ON public.bank_counts FOR UPDATE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "bank_counts_delete_own_hotel"
  ON public.bank_counts FOR DELETE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- ═══════════════════════════════════════════════════════════════
-- 2. no_shows — has hotel_id (uuid)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can delete no_shows" ON public.no_shows;
DROP POLICY IF EXISTS "Anyone can insert no_shows" ON public.no_shows;
DROP POLICY IF EXISTS "Anyone can read no_shows" ON public.no_shows;
DROP POLICY IF EXISTS "Anyone can update no_shows" ON public.no_shows;

CREATE POLICY "no_shows_select_own_hotel"
  ON public.no_shows FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "no_shows_insert_own_hotel"
  ON public.no_shows FOR INSERT
  WITH CHECK (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "no_shows_update_own_hotel"
  ON public.no_shows FOR UPDATE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "no_shows_delete_own_hotel"
  ON public.no_shows FOR DELETE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- ═══════════════════════════════════════════════════════════════
-- 3. room_moves — has hotel_id (uuid)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can delete room_moves" ON public.room_moves;
DROP POLICY IF EXISTS "Anyone can insert room_moves" ON public.room_moves;
DROP POLICY IF EXISTS "Anyone can read room_moves" ON public.room_moves;
DROP POLICY IF EXISTS "Anyone can update room_moves" ON public.room_moves;

CREATE POLICY "room_moves_select_own_hotel"
  ON public.room_moves FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "room_moves_insert_own_hotel"
  ON public.room_moves FOR INSERT
  WITH CHECK (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "room_moves_update_own_hotel"
  ON public.room_moves FOR UPDATE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "room_moves_delete_own_hotel"
  ON public.room_moves FOR DELETE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- ═══════════════════════════════════════════════════════════════
-- 4. hotel_ops_tools — has hotel_id (uuid)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can delete hotel_ops_tools" ON public.hotel_ops_tools;
DROP POLICY IF EXISTS "Anyone can insert hotel_ops_tools" ON public.hotel_ops_tools;
DROP POLICY IF EXISTS "Anyone can read hotel_ops_tools" ON public.hotel_ops_tools;
DROP POLICY IF EXISTS "Anyone can update hotel_ops_tools" ON public.hotel_ops_tools;
DROP POLICY IF EXISTS "default_select" ON public.hotel_ops_tools;
DROP POLICY IF EXISTS "sel" ON public.hotel_ops_tools;

CREATE POLICY "hotel_ops_tools_select_own_hotel"
  ON public.hotel_ops_tools FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "hotel_ops_tools_insert_own_hotel"
  ON public.hotel_ops_tools FOR INSERT
  WITH CHECK (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "hotel_ops_tools_update_own_hotel"
  ON public.hotel_ops_tools FOR UPDATE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "hotel_ops_tools_delete_own_hotel"
  ON public.hotel_ops_tools FOR DELETE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- ═══════════════════════════════════════════════════════════════
-- 5. ops_tools — global reference, no hotel_id
--    Readable by authenticated, writable only by superadmin
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can delete ops_tools" ON public.ops_tools;
DROP POLICY IF EXISTS "Anyone can insert ops_tools" ON public.ops_tools;
DROP POLICY IF EXISTS "Anyone can read ops_tools" ON public.ops_tools;
DROP POLICY IF EXISTS "Anyone can update ops_tools" ON public.ops_tools;
DROP POLICY IF EXISTS "default_select" ON public.ops_tools;
DROP POLICY IF EXISTS "ops_tools_delete" ON public.ops_tools;
DROP POLICY IF EXISTS "ops_tools_insert" ON public.ops_tools;
DROP POLICY IF EXISTS "ops_tools_select" ON public.ops_tools;
DROP POLICY IF EXISTS "sel" ON public.ops_tools;

CREATE POLICY "ops_tools_select_any"
  ON public.ops_tools FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "ops_tools_insert_superadmin"
  ON public.ops_tools FOR INSERT
  WITH CHECK (public.is_superadmin());

CREATE POLICY "ops_tools_update_superadmin"
  ON public.ops_tools FOR UPDATE
  USING (public.is_superadmin());

CREATE POLICY "ops_tools_delete_superadmin"
  ON public.ops_tools FOR DELETE
  USING (public.is_superadmin());

-- ═══════════════════════════════════════════════════════════════
-- 6. partner_menu_items — no hotel_id, linked to partners table
--    Readable by all, writable by authenticated staff
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can delete partner menu items" ON public.partner_menu_items;
DROP POLICY IF EXISTS "Anyone can insert partner menu items" ON public.partner_menu_items;
DROP POLICY IF EXISTS "Anyone can read partner menu items" ON public.partner_menu_items;
DROP POLICY IF EXISTS "Anyone can update partner menu items" ON public.partner_menu_items;
DROP POLICY IF EXISTS "default_select" ON public.partner_menu_items;
DROP POLICY IF EXISTS "partner_menu_items_select" ON public.partner_menu_items;
DROP POLICY IF EXISTS "sel" ON public.partner_menu_items;

CREATE POLICY "partner_menu_items_select_any"
  ON public.partner_menu_items FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "partner_menu_items_insert_staff"
  ON public.partner_menu_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND public.is_hotel_staff());

CREATE POLICY "partner_menu_items_update_staff"
  ON public.partner_menu_items FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.is_hotel_staff());

CREATE POLICY "partner_menu_items_delete_staff"
  ON public.partner_menu_items FOR DELETE
  USING (auth.role() = 'authenticated' AND public.is_hotel_staff());

-- ═══════════════════════════════════════════════════════════════
-- 7. restaurant_menu_items — legacy table, writable by staff
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can delete menu items" ON public.restaurant_menu_items;
DROP POLICY IF EXISTS "Anyone can insert menu items" ON public.restaurant_menu_items;
DROP POLICY IF EXISTS "Anyone can read menu items" ON public.restaurant_menu_items;
DROP POLICY IF EXISTS "Anyone can update menu items" ON public.restaurant_menu_items;

CREATE POLICY "restaurant_menu_items_select_any"
  ON public.restaurant_menu_items FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "restaurant_menu_items_insert_staff"
  ON public.restaurant_menu_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND public.is_hotel_staff());

CREATE POLICY "restaurant_menu_items_update_staff"
  ON public.restaurant_menu_items FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.is_hotel_staff());

CREATE POLICY "restaurant_menu_items_delete_staff"
  ON public.restaurant_menu_items FOR DELETE
  USING (auth.role() = 'authenticated' AND public.is_hotel_staff());

-- ═══════════════════════════════════════════════════════════════
-- 8. daily_logs — no policies existed (deny-all). Add per-hotel.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "daily_logs_select_own_hotel" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_insert_own_hotel" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_update_own_hotel" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_delete_own_hotel" ON public.daily_logs;

CREATE POLICY "daily_logs_select_own_hotel"
  ON public.daily_logs FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "daily_logs_insert_own_hotel"
  ON public.daily_logs FOR INSERT
  WITH CHECK (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "daily_logs_update_own_hotel"
  ON public.daily_logs FOR UPDATE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "daily_logs_delete_own_hotel"
  ON public.daily_logs FOR DELETE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- ═══════════════════════════════════════════════════════════════
-- 9. call_around_logs — no policies existed (deny-all). Add per-hotel.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "call_around_logs_select_own_hotel" ON public.call_around_logs;
DROP POLICY IF EXISTS "call_around_logs_insert_own_hotel" ON public.call_around_logs;
DROP POLICY IF EXISTS "call_around_logs_update_own_hotel" ON public.call_around_logs;
DROP POLICY IF EXISTS "call_around_logs_delete_own_hotel" ON public.call_around_logs;

CREATE POLICY "call_around_logs_select_own_hotel"
  ON public.call_around_logs FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "call_around_logs_insert_own_hotel"
  ON public.call_around_logs FOR INSERT
  WITH CHECK (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "call_around_logs_update_own_hotel"
  ON public.call_around_logs FOR UPDATE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "call_around_logs_delete_own_hotel"
  ON public.call_around_logs FOR DELETE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- ═══════════════════════════════════════════════════════════════
-- 10. hotel_knowledge_base — no policies existed (deny-all). Add per-hotel.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "hotel_knowledge_base_select_own_hotel" ON public.hotel_knowledge_base;
DROP POLICY IF EXISTS "hotel_knowledge_base_insert_own_hotel" ON public.hotel_knowledge_base;
DROP POLICY IF EXISTS "hotel_knowledge_base_update_own_hotel" ON public.hotel_knowledge_base;
DROP POLICY IF EXISTS "hotel_knowledge_base_delete_own_hotel" ON public.hotel_knowledge_base;

CREATE POLICY "hotel_knowledge_base_select_own_hotel"
  ON public.hotel_knowledge_base FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "hotel_knowledge_base_insert_own_hotel"
  ON public.hotel_knowledge_base FOR INSERT
  WITH CHECK (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "hotel_knowledge_base_update_own_hotel"
  ON public.hotel_knowledge_base FOR UPDATE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY "hotel_knowledge_base_delete_own_hotel"
  ON public.hotel_knowledge_base FOR DELETE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());