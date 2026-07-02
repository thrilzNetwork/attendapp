-- ============================================================
-- ATTENDA TENANT ISOLATION FIX — DROP WIDE-OPEN default_select
-- ============================================================
-- The problem: many tables have TWO policies — a good one that
-- filters by hotel_id AND a default_select USING (true) that
-- OR's with it, letting any authenticated user read everything.
--
-- This script drops ONLY the bad default_select policies and
-- leaves the good named policies intact.
-- ============================================================

-- Tables that already have a good named policy (e.g. staff_schedules_select_own_hotel)
-- but are undermined by a default_select USING (true)
DROP POLICY IF EXISTS default_select ON public.staff_schedules;
DROP POLICY IF EXISTS default_select ON public.weekly_forecasts;
DROP POLICY IF EXISTS default_select ON public.staff_checklists;
DROP POLICY IF EXISTS default_select ON public.staff_checklist_instances;
DROP POLICY IF EXISTS default_select ON public.hotel_knowledge_base;
DROP POLICY IF EXISTS default_select ON public.cruise_schedules;
DROP POLICY IF EXISTS default_select ON public.shuttle_routes;
DROP POLICY IF EXISTS default_select ON public.shuttle_slots;
DROP POLICY IF EXISTS default_select ON public.shuttle_bookings;
DROP POLICY IF EXISTS default_select ON public.shuttle_requests;
DROP POLICY IF EXISTS default_select ON public.hotel_ops_tools;
DROP POLICY IF EXISTS default_select ON public.ops_tools;
DROP POLICY IF EXISTS default_select ON public.superadmin_config;
DROP POLICY IF EXISTS default_select ON public.attenda_fees;
DROP POLICY IF EXISTS default_select ON public.partner_menu_items;
DROP POLICY IF EXISTS default_select ON public.qr_codes;
DROP POLICY IF EXISTS default_select ON public.hotel_rooms;
-- guest_validations does not exist in this DB — skip

-- Tables with no hotel_id filter at all — vendors, vendor_orders, etc.
-- These need hotel_id-scoped policies
DROP POLICY IF EXISTS vendors_auth_select ON public.vendors;
DROP POLICY IF EXISTS vendors_auth_insert ON public.vendors;
DROP POLICY IF EXISTS vendors_auth_update ON public.vendors;
DROP POLICY IF EXISTS vendors_auth_delete ON public.vendors;

CREATE POLICY vendors_select ON public.vendors
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendors_insert ON public.vendors
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendors_update ON public.vendors
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendors_delete ON public.vendors
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

DROP POLICY IF EXISTS vo_auth_select ON public.vendor_orders;
DROP POLICY IF EXISTS vo_auth_insert ON public.vendor_orders;
DROP POLICY IF EXISTS vo_auth_update ON public.vendor_orders;
DROP POLICY IF EXISTS vo_auth_delete ON public.vendor_orders;

CREATE POLICY vendor_orders_select ON public.vendor_orders
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_orders_insert ON public.vendor_orders
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_orders_update ON public.vendor_orders
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_orders_delete ON public.vendor_orders
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

DROP POLICY IF EXISTS vex_auth_select ON public.vendor_expenses;
DROP POLICY IF EXISTS vex_auth_insert ON public.vendor_expenses;
DROP POLICY IF EXISTS vex_auth_update ON public.vendor_expenses;
DROP POLICY IF EXISTS vex_auth_delete ON public.vendor_expenses;

CREATE POLICY vendor_expenses_select ON public.vendor_expenses
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_expenses_insert ON public.vendor_expenses
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_expenses_update ON public.vendor_expenses
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_expenses_delete ON public.vendor_expenses
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

DROP POLICY IF EXISTS ve_auth_select ON public.vendor_events;
DROP POLICY IF EXISTS ve_auth_insert ON public.vendor_events;
DROP POLICY IF EXISTS ve_auth_update ON public.vendor_events;
DROP POLICY IF EXISTS ve_auth_delete ON public.vendor_events;

CREATE POLICY vendor_events_select ON public.vendor_events
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_events_insert ON public.vendor_events
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_events_update ON public.vendor_events
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_events_delete ON public.vendor_events
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

DROP POLICY IF EXISTS vog_auth_select ON public.vendor_order_guide;
DROP POLICY IF EXISTS vog_auth_insert ON public.vendor_order_guide;
DROP POLICY IF EXISTS vog_auth_update ON public.vendor_order_guide;
DROP POLICY IF EXISTS vog_auth_delete ON public.vendor_order_guide;

CREATE POLICY vendor_order_guide_select ON public.vendor_order_guide
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_order_guide_insert ON public.vendor_order_guide
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_order_guide_update ON public.vendor_order_guide
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_order_guide_delete ON public.vendor_order_guide
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

DROP POLICY IF EXISTS voi_auth_select ON public.vendor_order_items;
DROP POLICY IF EXISTS voi_auth_insert ON public.vendor_order_items;
DROP POLICY IF EXISTS voi_auth_update ON public.vendor_order_items;
DROP POLICY IF EXISTS voi_auth_delete ON public.vendor_order_items;

CREATE POLICY vendor_order_items_select ON public.vendor_order_items
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_order_items_insert ON public.vendor_order_items
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_order_items_update ON public.vendor_order_items
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY vendor_order_items_delete ON public.vendor_order_items
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- Fix staff_positions (was USING true for authenticated)
DROP POLICY IF EXISTS staff_positions_authenticated_read ON public.staff_positions;
DROP POLICY IF EXISTS staff_positions_authenticated_write ON public.staff_positions;

CREATE POLICY staff_positions_select ON public.staff_positions
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY staff_positions_insert ON public.staff_positions
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY staff_positions_update ON public.staff_positions
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY staff_positions_delete ON public.staff_positions
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- Fix staff_birthdays (was USING true for public)
DROP POLICY IF EXISTS "Staff birthdays open" ON public.staff_birthdays;
CREATE POLICY staff_birthdays_select ON public.staff_birthdays
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- Fix staff_events (was USING true for public)
DROP POLICY IF EXISTS "Staff events open" ON public.staff_events;
CREATE POLICY staff_events_select ON public.staff_events
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- Fix todo_pack_installs (was USING true for public)
DROP POLICY IF EXISTS "Todo pack installs open" ON public.todo_pack_installs;
DROP POLICY IF EXISTS "open todo_pack_installs" ON public.todo_pack_installs;
CREATE POLICY todo_pack_installs_select ON public.todo_pack_installs
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- Fix kpi_pack_installs (has hotel_id, no scoped policy)
DROP POLICY IF EXISTS "kpi_pack_installs_select" ON public.kpi_pack_installs;
CREATE POLICY kpi_pack_installs_select ON public.kpi_pack_installs
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- Fix payout_ledger (has hotel_id, no scoped policy)
DROP POLICY IF EXISTS payout_ledger_select ON public.payout_ledger;
CREATE POLICY payout_ledger_select ON public.payout_ledger
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- Fix partner_applications (no hotel_id, but has partner_id — keep open for anon inserts)
-- These are public submission forms, leave as-is

-- Fix blog_posts (public content, leave as-is)
-- blog_posts_select is USING (true) — this is intentional for public blog

-- Fix restaurant_menu_items (no hotel_id, public menu data — leave as-is)

-- Fix reviews (has hotel_id, needs scoping)
DROP POLICY IF EXISTS reviews_select ON public.reviews;
CREATE POLICY reviews_select ON public.reviews
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );

-- Fix guest_sessions (has hotel_id)
DROP POLICY IF EXISTS "Public insert guest_sessions" ON public.guest_sessions;
CREATE POLICY guest_sessions_select ON public.guest_sessions
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY guest_sessions_insert ON public.guest_sessions
  FOR INSERT WITH CHECK (true); -- guests can create sessions without auth
