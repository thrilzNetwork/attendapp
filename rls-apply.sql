-- ============================================================
-- ATTENDA TENANT ISOLATION RLS — CORRECTED
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
-- This is the authoritative RLS file. Every table with a hotel_id
-- column MUST have a SELECT policy that filters by hotel_id.
-- No table should have both a good policy AND a default_select
-- USING(true) — PostgreSQL OR's them, defeating isolation.
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
ALTER TABLE IF EXISTS public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_order_guide ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_birthdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.todo_pack_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kpi_pack_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payout_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.position_todo_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.position_todo_templates ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start clean
DROP POLICY IF EXISTS hotels_select ON public.hotels;
DROP POLICY IF EXISTS hotels_insert ON public.hotels;
DROP POLICY IF EXISTS hotels_update ON public.hotels;
DROP POLICY IF EXISTS staff_accounts_select ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_insert ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_update ON public.staff_accounts;
DROP POLICY IF EXISTS requests_select ON public.requests;
DROP POLICY IF EXISTS requests_insert ON public.requests;
DROP POLICY IF EXISTS requests_update ON public.requests;
DROP POLICY IF EXISTS requests_delete ON public.requests;
DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;
DROP POLICY IF EXISTS messages_update ON public.messages;
DROP POLICY IF EXISTS partners_select ON public.partners;
DROP POLICY IF EXISTS partners_insert ON public.partners;
DROP POLICY IF EXISTS partners_update ON public.partners;
DROP POLICY IF EXISTS partners_read_all ON public.partners;
DROP POLICY IF EXISTS partners_write_own_hotel ON public.partners;
DROP POLICY IF EXISTS staff_checklists_select ON public.staff_checklists;
DROP POLICY IF EXISTS staff_checklist_instances_select ON public.staff_checklist_instances;
DROP POLICY IF EXISTS hotel_knowledge_base_select ON public.hotel_knowledge_base;
DROP POLICY IF EXISTS default_select ON public.partner_menu_items;
DROP POLICY IF EXISTS default_select ON public.qr_codes;
DROP POLICY IF EXISTS default_select ON public.hotel_rooms;
DROP POLICY IF EXISTS default_select ON public.shuttle_routes;
DROP POLICY IF EXISTS default_select ON public.shuttle_slots;
DROP POLICY IF EXISTS default_select ON public.shuttle_bookings;
DROP POLICY IF EXISTS default_select ON public.shuttle_requests;
DROP POLICY IF EXISTS default_select ON public.cruise_schedules;
DROP POLICY IF EXISTS default_select ON public.staff_schedules;
DROP POLICY IF EXISTS default_select ON public.weekly_forecasts;
DROP POLICY IF EXISTS default_select ON public.hotel_ops_tools;
DROP POLICY IF EXISTS default_select ON public.ops_tools;
DROP POLICY IF EXISTS default_select ON public.superadmin_config;
DROP POLICY IF EXISTS default_select ON public.attenda_fees;
DROP POLICY IF EXISTS default_select ON public.staff_checklists;
DROP POLICY IF EXISTS default_select ON public.staff_checklist_instances;
DROP POLICY IF EXISTS default_select ON public.hotel_knowledge_base;
DROP POLICY IF EXISTS default_insert ON public.weekly_forecasts;
DROP POLICY IF EXISTS default_update ON public.weekly_forecasts;
DROP POLICY IF EXISTS hotel_rooms_read_all ON public.hotel_rooms;
DROP POLICY IF EXISTS hotel_rooms_write_own_hotel ON public.hotel_rooms;
DROP POLICY IF EXISTS shuttle_routes_read_all ON public.shuttle_routes;
DROP POLICY IF EXISTS shuttle_routes_write_own_hotel ON public.shuttle_routes;
DROP POLICY IF EXISTS shuttle_slots_select ON public.shuttle_slots;
DROP POLICY IF EXISTS shuttle_slots_write ON public.shuttle_slots;
DROP POLICY IF EXISTS shuttle_slots_update ON public.shuttle_slots;
DROP POLICY IF EXISTS shuttle_slots_delete ON public.shuttle_slots;
DROP POLICY IF EXISTS cruise_schedules_own_hotel ON public.cruise_schedules;
DROP POLICY IF EXISTS staff_schedules_select_own_hotel ON public.staff_schedules;
DROP POLICY IF EXISTS staff_schedules_write_own_hotel ON public.staff_schedules;
DROP POLICY IF EXISTS weekly_forecasts_own_hotel ON public.weekly_forecasts;
DROP POLICY IF EXISTS hotel_ops_tools_select_own_hotel ON public.hotel_ops_tools;
DROP POLICY IF EXISTS staff_checklists_own_hotel ON public.staff_checklists;
DROP POLICY IF EXISTS checklist_instances_own_hotel ON public.staff_checklist_instances;
DROP POLICY IF EXISTS hotel_knowledge_base_select_own_hotel ON public.hotel_knowledge_base;
DROP POLICY IF EXISTS vendors_auth_select ON public.vendors;
DROP POLICY IF EXISTS vendors_auth_insert ON public.vendors;
DROP POLICY IF EXISTS vendors_auth_update ON public.vendors;
DROP POLICY IF EXISTS vendors_auth_delete ON public.vendors;
DROP POLICY IF EXISTS vendors_select ON public.vendors;
DROP POLICY IF EXISTS vendors_insert ON public.vendors;
DROP POLICY IF EXISTS vendors_update ON public.vendors;
DROP POLICY IF EXISTS vendors_delete ON public.vendors;
DROP POLICY IF EXISTS vo_auth_select ON public.vendor_orders;
DROP POLICY IF EXISTS vo_auth_insert ON public.vendor_orders;
DROP POLICY IF EXISTS vo_auth_update ON public.vendor_orders;
DROP POLICY IF EXISTS vo_auth_delete ON public.vendor_orders;
DROP POLICY IF EXISTS vendor_orders_select ON public.vendor_orders;
DROP POLICY IF EXISTS vendor_orders_insert ON public.vendor_orders;
DROP POLICY IF EXISTS vendor_orders_update ON public.vendor_orders;
DROP POLICY IF EXISTS vendor_orders_delete ON public.vendor_orders;
DROP POLICY IF EXISTS vex_auth_select ON public.vendor_expenses;
DROP POLICY IF EXISTS vex_auth_insert ON public.vendor_expenses;
DROP POLICY IF EXISTS vex_auth_update ON public.vendor_expenses;
DROP POLICY IF EXISTS vex_auth_delete ON public.vendor_expenses;
DROP POLICY IF EXISTS vendor_expenses_select ON public.vendor_expenses;
DROP POLICY IF EXISTS vendor_expenses_insert ON public.vendor_expenses;
DROP POLICY IF EXISTS vendor_expenses_update ON public.vendor_expenses;
DROP POLICY IF EXISTS vendor_expenses_delete ON public.vendor_expenses;
DROP POLICY IF EXISTS ve_auth_select ON public.vendor_events;
DROP POLICY IF EXISTS ve_auth_insert ON public.vendor_events;
DROP POLICY IF EXISTS ve_auth_update ON public.vendor_events;
DROP POLICY IF EXISTS ve_auth_delete ON public.vendor_events;
DROP POLICY IF EXISTS vendor_events_select ON public.vendor_events;
DROP POLICY IF EXISTS vendor_events_insert ON public.vendor_events;
DROP POLICY IF EXISTS vendor_events_update ON public.vendor_events;
DROP POLICY IF EXISTS vendor_events_delete ON public.vendor_events;
DROP POLICY IF EXISTS vog_auth_select ON public.vendor_order_guide;
DROP POLICY IF EXISTS vog_auth_insert ON public.vendor_order_guide;
DROP POLICY IF EXISTS vog_auth_update ON public.vendor_order_guide;
DROP POLICY IF EXISTS vog_auth_delete ON public.vendor_order_guide;
DROP POLICY IF EXISTS vendor_order_guide_select ON public.vendor_order_guide;
DROP POLICY IF EXISTS vendor_order_guide_insert ON public.vendor_order_guide;
DROP POLICY IF EXISTS vendor_order_guide_update ON public.vendor_order_guide;
DROP POLICY IF EXISTS vendor_order_guide_delete ON public.vendor_order_guide;
DROP POLICY IF EXISTS voi_auth_select ON public.vendor_order_items;
DROP POLICY IF EXISTS voi_auth_insert ON public.vendor_order_items;
DROP POLICY IF EXISTS voi_auth_update ON public.vendor_order_items;
DROP POLICY IF EXISTS voi_auth_delete ON public.vendor_order_items;
DROP POLICY IF EXISTS vendor_order_items_select ON public.vendor_order_items;
DROP POLICY IF EXISTS vendor_order_items_insert ON public.vendor_order_items;
DROP POLICY IF EXISTS vendor_order_items_update ON public.vendor_order_items;
DROP POLICY IF EXISTS vendor_order_items_delete ON public.vendor_order_items;
DROP POLICY IF EXISTS staff_positions_authenticated_read ON public.staff_positions;
DROP POLICY IF EXISTS staff_positions_authenticated_write ON public.staff_positions;
DROP POLICY IF EXISTS staff_positions_select ON public.staff_positions;
DROP POLICY IF EXISTS staff_positions_insert ON public.staff_positions;
DROP POLICY IF EXISTS staff_positions_update ON public.staff_positions;
DROP POLICY IF EXISTS staff_positions_delete ON public.staff_positions;
DROP POLICY IF EXISTS "Staff birthdays open" ON public.staff_birthdays;
DROP POLICY IF EXISTS staff_birthdays_select ON public.staff_birthdays;
DROP POLICY IF EXISTS "Staff events open" ON public.staff_events;
DROP POLICY IF EXISTS staff_events_select ON public.staff_events;
DROP POLICY IF EXISTS "Todo pack installs open" ON public.todo_pack_installs;
DROP POLICY IF EXISTS "open todo_pack_installs" ON public.todo_pack_installs;
DROP POLICY IF EXISTS todo_pack_installs_select ON public.todo_pack_installs;
DROP POLICY IF EXISTS "kpi_pack_installs_select" ON public.kpi_pack_installs;
DROP POLICY IF EXISTS kpi_pack_installs_select ON public.kpi_pack_installs;
DROP POLICY IF EXISTS payout_ledger_select ON public.payout_ledger;
DROP POLICY IF EXISTS reviews_select ON public.reviews;
DROP POLICY IF EXISTS reviews_select_own_hotel ON public.reviews;
DROP POLICY IF EXISTS "Public insert guest_sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS guest_sessions_select ON public.guest_sessions;
DROP POLICY IF EXISTS guest_sessions_insert ON public.guest_sessions;
DROP POLICY IF EXISTS position_todo_instances_select ON public.position_todo_instances;
DROP POLICY IF EXISTS position_todo_templates_select ON public.position_todo_templates;
DROP POLICY IF EXISTS fees_block ON public.attenda_fees;
DROP POLICY IF EXISTS bank_counts_select_own_hotel ON public.bank_counts;
DROP POLICY IF EXISTS bank_counts_insert_own_hotel ON public.bank_counts;
DROP POLICY IF EXISTS bank_counts_update_own_hotel ON public.bank_counts;
DROP POLICY IF EXISTS bank_counts_delete_own_hotel ON public.bank_counts;
DROP POLICY IF EXISTS call_around_logs_select_own_hotel ON public.call_around_logs;
DROP POLICY IF EXISTS call_around_logs_insert_own_hotel ON public.call_around_logs;
DROP POLICY IF EXISTS call_around_logs_update_own_hotel ON public.call_around_logs;
DROP POLICY IF EXISTS call_around_logs_delete_own_hotel ON public.call_around_logs;
DROP POLICY IF EXISTS daily_logs_select_own_hotel ON public.daily_logs;
DROP POLICY IF EXISTS daily_logs_insert_own_hotel ON public.daily_logs;
DROP POLICY IF EXISTS daily_logs_update_own_hotel ON public.daily_logs;
DROP POLICY IF EXISTS daily_logs_delete_own_hotel ON public.daily_logs;
DROP POLICY IF EXISTS no_shows_select_own_hotel ON public.no_shows;
DROP POLICY IF EXISTS no_shows_insert_own_hotel ON public.no_shows;
DROP POLICY IF EXISTS no_shows_update_own_hotel ON public.no_shows;
DROP POLICY IF EXISTS no_shows_delete_own_hotel ON public.no_shows;
DROP POLICY IF EXISTS room_moves_select_own_hotel ON public.room_moves;
DROP POLICY IF EXISTS room_moves_insert_own_hotel ON public.room_moves;
DROP POLICY IF EXISTS room_moves_update_own_hotel ON public.room_moves;
DROP POLICY IF EXISTS room_moves_delete_own_hotel ON public.room_moves;
DROP POLICY IF EXISTS bouncie_connections_own_hotel ON public.bouncie_connections;
DROP POLICY IF EXISTS bouncie_devices_own_hotel ON public.bouncie_devices;
DROP POLICY IF EXISTS bouncie_geozones_own_hotel ON public.bouncie_geozones;
DROP POLICY IF EXISTS bouncie_locations_own_hotel ON public.bouncie_locations;
DROP POLICY IF EXISTS bouncie_trips_own_hotel ON public.bouncie_trips;
DROP POLICY IF EXISTS compset_call_times_select_own_hotel ON public.compset_call_times;
DROP POLICY IF EXISTS compset_call_times_insert_admin_only ON public.compset_call_times;
DROP POLICY IF EXISTS compset_call_times_update_admin_only ON public.compset_call_times;
DROP POLICY IF EXISTS compset_call_times_delete_admin_only ON public.compset_call_times;
DROP POLICY IF EXISTS compset_entries_select_own_hotel ON public.compset_entries;
DROP POLICY IF EXISTS compset_entries_insert_own_hotel ON public.compset_entries;
DROP POLICY IF EXISTS compset_entries_update_own_hotel ON public.compset_entries;
DROP POLICY IF EXISTS compset_entries_delete_admin_only ON public.compset_entries;
DROP POLICY IF EXISTS compset_hotels_select_own_hotel ON public.compset_hotels;
DROP POLICY IF EXISTS compset_hotels_insert_admin_only ON public.compset_hotels;
DROP POLICY IF EXISTS compset_hotels_update_admin_only ON public.compset_hotels;
DROP POLICY IF EXISTS compset_hotels_delete_admin_only ON public.compset_hotels;
DROP POLICY IF EXISTS staff_incentives_own_hotel ON public.staff_incentives;
DROP POLICY IF EXISTS staff_points_own_hotel ON public.staff_points;
DROP POLICY IF EXISTS staff_redemptions_own_hotel ON public.staff_redemptions;
DROP POLICY IF EXISTS superadmin_config_insert_once ON public.superadmin_config;
DROP POLICY IF EXISTS superadmin_config_owner_write ON public.superadmin_config;
DROP POLICY IF EXISTS superadmin_config_self ON public.superadmin_config;
DROP POLICY IF EXISTS blog_posts_all ON public.blog_posts;
DROP POLICY IF EXISTS blog_posts_select ON public.blog_posts;
DROP POLICY IF EXISTS "Anyone can read hotels" ON public.hotels;
DROP POLICY IF EXISTS "Anyone can insert requests" ON public.requests;
DROP POLICY IF EXISTS "Anyone can read requests" ON public.requests;
DROP POLICY IF EXISTS "Anyone can update requests" ON public.requests;
DROP POLICY IF EXISTS "Anyone can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can read guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can update guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can read staff" ON public.staff_accounts;
DROP POLICY IF EXISTS "Anyone can read hotel rooms" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Anyone can insert hotel rooms" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Anyone can delete hotel rooms" ON public.hotel_rooms;

-- 3. Create tenant-isolation policies

-- Hotels: anyone can read (public config), only service_role writes
CREATE POLICY hotels_select ON public.hotels FOR SELECT USING (true);
CREATE POLICY hotels_insert ON public.hotels FOR INSERT WITH CHECK (false);
CREATE POLICY hotels_update ON public.hotels FOR UPDATE USING (false);

-- Staff accounts: fully blocked from anon/authenticated clients
-- PIN verification is server-side via service_role
CREATE POLICY staff_accounts_select ON public.staff_accounts FOR SELECT USING (false);
CREATE POLICY staff_accounts_insert ON public.staff_accounts FOR INSERT WITH CHECK (false);
CREATE POLICY staff_accounts_update ON public.staff_accounts FOR UPDATE USING (false);

-- Requests: guests can insert (no auth), staff read their hotel's
CREATE POLICY requests_select ON public.requests
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY requests_insert ON public.requests FOR INSERT WITH CHECK (true);
CREATE POLICY requests_update ON public.requests FOR UPDATE USING (false);
CREATE POLICY requests_delete ON public.requests FOR DELETE USING (false);

-- Messages: same as requests
CREATE POLICY messages_select ON public.messages
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY messages_update ON public.messages FOR UPDATE USING (false);

-- Partners: staff read their hotel's only
CREATE POLICY partners_select ON public.partners
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY partners_insert ON public.partners FOR INSERT WITH CHECK (false);
CREATE POLICY partners_update ON public.partners FOR UPDATE USING (false);

-- Tables with hotel_id — tenant-isolated
CREATE POLICY staff_schedules_select ON public.staff_schedules
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY staff_schedules_insert ON public.staff_schedules
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY staff_schedules_update ON public.staff_schedules
  FOR UPDATE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY staff_schedules_delete ON public.staff_schedules
  FOR DELETE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY weekly_forecasts_select ON public.weekly_forecasts
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY weekly_forecasts_insert ON public.weekly_forecasts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY weekly_forecasts_update ON public.weekly_forecasts
  FOR UPDATE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

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

CREATE POLICY vendors_select ON public.vendors
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendors_insert ON public.vendors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendors_update ON public.vendors
  FOR UPDATE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendors_delete ON public.vendors
  FOR DELETE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY vendor_orders_select ON public.vendor_orders
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendor_orders_insert ON public.vendor_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendor_orders_update ON public.vendor_orders
  FOR UPDATE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendor_orders_delete ON public.vendor_orders
  FOR DELETE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY vendor_expenses_select ON public.vendor_expenses
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendor_expenses_insert ON public.vendor_expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendor_expenses_update ON public.vendor_expenses
  FOR UPDATE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendor_expenses_delete ON public.vendor_expenses
  FOR DELETE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY vendor_events_select ON public.vendor_events
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendor_events_insert ON public.vendor_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendor_events_update ON public.vendor_events
  FOR UPDATE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY vendor_events_delete ON public.vendor_events
  FOR DELETE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY staff_positions_select ON public.staff_positions
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY staff_positions_insert ON public.staff_positions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY staff_positions_update ON public.staff_positions
  FOR UPDATE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY staff_positions_delete ON public.staff_positions
  FOR DELETE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY staff_birthdays_select ON public.staff_birthdays
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY staff_events_select ON public.staff_events
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY todo_pack_installs_select ON public.todo_pack_installs
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY kpi_pack_installs_select ON public.kpi_pack_installs
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY payout_ledger_select ON public.payout_ledger
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY reviews_select ON public.reviews
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY guest_sessions_select ON public.guest_sessions
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));
CREATE POLICY guest_sessions_insert ON public.guest_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY position_todo_instances_select ON public.position_todo_instances
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY position_todo_templates_select ON public.position_todo_templates
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

CREATE POLICY attenda_fees_select ON public.attenda_fees
  FOR SELECT USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id::text = public.get_user_hotel_id()));

-- Tables without hotel_id — permissive reads, no public writes
CREATE POLICY partner_menu_items_select ON public.partner_menu_items FOR SELECT USING (true);
CREATE POLICY ops_tools_select ON public.ops_tools FOR SELECT USING (auth.role() = 'authenticated');

-- Superadmin config: only superadmins can read
CREATE POLICY superadmin_config_select ON public.superadmin_config
  FOR SELECT USING (auth.role() = 'authenticated' AND public.is_superadmin());
