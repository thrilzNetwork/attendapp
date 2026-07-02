-- ============================================================
-- ATTENDA TENANT ISOLATION RLS — CORRECTED
-- Run this in Supabase Dashboard → SQL Editor
-- Only includes tables that actually exist in the DB
-- ============================================================
-- ⚠️ CRITICAL: Every table with a hotel_id column MUST have a
-- SELECT policy that filters by hotel_id. Never create a
-- default_select USING (true) policy on a table with hotel_id —
-- it will OR with any good policy and defeat isolation.
-- ============================================================

-- 0. Helper functions
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

-- 1. Enable RLS on ALL existing tables
ALTER TABLE IF EXISTS public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.partner_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shuttle_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shuttle_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shuttle_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shuttle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cruise_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weekly_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hotel_ops_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ops_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.superadmin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attenda_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_checklist_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hotel_knowledge_base ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS staff_checklists_select ON public.staff_checklists;
DROP POLICY IF EXISTS staff_checklist_instances_select ON public.staff_checklist_instances;
DROP POLICY IF EXISTS hotel_knowledge_base_select ON public.hotel_knowledge_base;

-- 3. Create tenant-isolation policies

-- Hotels: anyone can read (public config), only service_role writes
CREATE POLICY hotels_select ON public.hotels FOR SELECT USING (true);
CREATE POLICY hotels_insert ON public.hotels FOR INSERT WITH CHECK (false);
CREATE POLICY hotels_update ON public.hotels FOR UPDATE USING (false);

-- Staff accounts: FULLY BLOCKED from anon/authenticated clients
-- PIN verification is now server-side via service_role
CREATE POLICY staff_accounts_select ON public.staff_accounts
  FOR SELECT USING (false);
CREATE POLICY staff_accounts_insert ON public.staff_accounts FOR INSERT WITH CHECK (false);
CREATE POLICY staff_accounts_update ON public.staff_accounts FOR UPDATE USING (false);

-- Requests: guests can insert (no auth required), staff can read their hotel's
CREATE POLICY requests_select ON public.requests
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY requests_insert ON public.requests
  FOR INSERT WITH CHECK (true); -- guests submit without being logged in
CREATE POLICY requests_update ON public.requests
  FOR UPDATE USING (false); -- updates go through server API

-- Messages: same as requests
CREATE POLICY messages_select ON public.messages
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY messages_insert ON public.messages
  FOR INSERT WITH CHECK (true);
CREATE POLICY messages_update ON public.messages
  FOR UPDATE USING (false);

-- Partners: staff read their hotel's only
CREATE POLICY partners_select ON public.partners
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id())
  );
CREATE POLICY partners_insert ON public.partners
  FOR INSERT WITH CHECK (false);
CREATE POLICY partners_update ON public.partners
  FOR UPDATE USING (false);

-- Tables with hotel_id — tenant-isolated SELECT policies
-- ⚠️ NEVER add a default_select USING (true) on these tables
CREATE POLICY staff_schedules_select ON public.staff_schedules
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY weekly_forecasts_select ON public.weekly_forecasts
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY staff_checklists_select ON public.staff_checklists
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY staff_checklist_instances_select ON public.staff_checklist_instances
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY hotel_knowledge_base_select ON public.hotel_knowledge_base
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY cruise_schedules_select ON public.cruise_schedules
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY shuttle_routes_select ON public.shuttle_routes
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY shuttle_slots_select ON public.shuttle_slots
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR EXISTS (SELECT 1 FROM shuttle_routes r WHERE r.id = shuttle_slots.route_id AND (r.hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()))));
CREATE POLICY shuttle_bookings_select ON public.shuttle_bookings
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY shuttle_requests_select ON public.shuttle_requests
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY hotel_ops_tools_select ON public.hotel_ops_tools
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY hotel_rooms_select ON public.hotel_rooms
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY qr_codes_select ON public.qr_codes
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY attenda_fees_select ON public.attenda_fees
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

-- Tables without hotel_id — permissive reads, no public writes
CREATE POLICY partner_menu_items_select ON public.partner_menu_items FOR SELECT USING (true);
CREATE POLICY ops_tools_select ON public.ops_tools FOR SELECT USING (auth.role() = 'authenticated');

-- Superadmin config: only superadmins can read
CREATE POLICY superadmin_config_select ON public.superadmin_config
  FOR SELECT USING (auth.role() = 'authenticated' AND public.is_superadmin());
