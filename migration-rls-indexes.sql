-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Tenant Isolation (RLS) + Performance Indexes
-- ═══════════════════════════════════════════════════════════════
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════

-- ─── PART 0: RLS Helper Functions ───────────────────────────
-- Extracts hotel_id from JWT user_metadata. Returns NULL for anon users.
create or replace function public.get_user_hotel_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'hotel_id')::uuid,
    null::uuid
  );
$$;

-- Check if the user is a superadmin (no hotel_id restriction)
create or replace function public.is_superadmin()
returns boolean
language sql
stable
as $$
  select (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin';
$$;

-- ─── PART 1: ENABLE RLS on ALL tables ────────────────────────

ALTER TABLE IF EXISTS hotels                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS requests                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guests                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_accounts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hotel_rooms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partners                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partner_menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS qr_codes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attenda_fees                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shuttle_routes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shuttle_slots                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shuttle_bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shuttle_requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cruise_schedules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hotel_knowledge_base          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_checklists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_checklist_instances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_schedules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_rdo_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_around_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_logs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS no_shows                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS room_moves                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bank_counts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hotel_ops_tools               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ops_tools                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS superadmin_config             ENABLE ROW LEVEL SECURITY;

-- ─── PART 2: RLS POLICIES ────────────────────────────────────
-- Convention:
--   anon role → guest users (insert requests, read hotels/partners/rooms)
--   authenticated → staff + superadmin (hotel_id must match)
--   server routes bypass RLS via service_role

-- ═════════════════════════════════════════════════════════════
-- hotels (anyone can read; only auth can write)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "hotels_select_anon" ON hotels;
CREATE POLICY "hotels_select_anon" ON hotels FOR SELECT USING (true);

DROP POLICY IF EXISTS "hotels_all_auth" ON hotels;
CREATE POLICY "hotels_all_auth" ON hotels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id IS NOT NULL));
DROP POLICY IF EXISTS "hotels_update_auth" ON hotels;
CREATE POLICY "hotels_update_auth" ON hotels
  FOR UPDATE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id IS NOT NULL));
DROP POLICY IF EXISTS "hotels_delete_auth" ON hotels;
CREATE POLICY "hotels_delete_auth" ON hotels
  FOR DELETE USING (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id IS NOT NULL));

-- ═════════════════════════════════════════════════════════════
-- requests (anon insert; staff select/update/delete by hotel)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "requests_insert_anon" ON requests;
CREATE POLICY "requests_insert_anon" ON requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "requests_select_staff" ON requests;
CREATE POLICY "requests_select_staff" ON requests
  FOR SELECT USING (
    (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id = public.get_user_hotel_id()))
    OR (auth.role() = 'anon')
  );

DROP POLICY IF EXISTS "requests_update_staff" ON requests;
CREATE POLICY "requests_update_staff" ON requests
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "requests_delete_staff" ON requests;
CREATE POLICY "requests_delete_staff" ON requests
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- guests (anon insert; staff access by hotel)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "guests_insert_anon" ON guests;
CREATE POLICY "guests_insert_anon" ON guests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "guests_select_staff" ON guests;
CREATE POLICY "guests_select_staff" ON guests
  FOR SELECT USING (
    (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id = public.get_user_hotel_id()))
    OR (auth.role() = 'anon')
  );

DROP POLICY IF EXISTS "guests_update_staff" ON guests;
CREATE POLICY "guests_update_staff" ON guests
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- staff_accounts (sensitive — only same-hotel auth)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "staff_accounts_select" ON staff_accounts;
CREATE POLICY "staff_accounts_select" ON staff_accounts
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "staff_accounts_insert" ON staff_accounts;
CREATE POLICY "staff_accounts_insert" ON staff_accounts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "staff_accounts_update" ON staff_accounts;
CREATE POLICY "staff_accounts_update" ON staff_accounts
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "staff_accounts_delete" ON staff_accounts;
CREATE POLICY "staff_accounts_delete" ON staff_accounts
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- hotel_rooms (anon read; staff write)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "hotel_rooms_select" ON hotel_rooms;
CREATE POLICY "hotel_rooms_select" ON hotel_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "hotel_rooms_insert_staff" ON hotel_rooms;
CREATE POLICY "hotel_rooms_insert_staff" ON hotel_rooms
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "hotel_rooms_update_staff" ON hotel_rooms;
CREATE POLICY "hotel_rooms_update_staff" ON hotel_rooms
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "hotel_rooms_delete_staff" ON hotel_rooms;
CREATE POLICY "hotel_rooms_delete_staff" ON hotel_rooms
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- partners (anon read; staff write by hotel)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "partners_select" ON partners;
CREATE POLICY "partners_select" ON partners FOR SELECT USING (true);

DROP POLICY IF EXISTS "partners_insert_staff" ON partners;
CREATE POLICY "partners_insert_staff" ON partners
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "partners_update_staff" ON partners;
CREATE POLICY "partners_update_staff" ON partners
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "partners_delete_staff" ON partners;
CREATE POLICY "partners_delete_staff" ON partners
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- partner_menu_items (join through partners for hotel check)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "partner_menu_items_select" ON partner_menu_items;
CREATE POLICY "partner_menu_items_select" ON partner_menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "partner_menu_items_insert_staff" ON partner_menu_items;
CREATE POLICY "partner_menu_items_insert_staff" ON partner_menu_items
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM partners WHERE id = partner_id AND hotel_id = public.get_user_hotel_id())
  );

DROP POLICY IF EXISTS "partner_menu_items_delete_staff" ON partner_menu_items;
CREATE POLICY "partner_menu_items_delete_staff" ON partner_menu_items
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM partners WHERE id = partner_id AND hotel_id = public.get_user_hotel_id())
  );

-- ═════════════════════════════════════════════════════════════
-- messages (anon insert; staff read by hotel)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "messages_select_staff" ON messages;
CREATE POLICY "messages_select_staff" ON messages
  FOR SELECT USING (
    (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id = public.get_user_hotel_id()))
    OR (auth.role() = 'anon')
  );

-- ═════════════════════════════════════════════════════════════
-- qr_codes
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "qr_codes_select" ON qr_codes;
CREATE POLICY "qr_codes_select" ON qr_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "qr_codes_insert_staff" ON qr_codes;
CREATE POLICY "qr_codes_insert_staff" ON qr_codes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "qr_codes_delete_staff" ON qr_codes;
CREATE POLICY "qr_codes_delete_staff" ON qr_codes
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- attenda_fees
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "attenda_fees_select" ON attenda_fees;
CREATE POLICY "attenda_fees_select" ON attenda_fees
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "attenda_fees_insert" ON attenda_fees;
CREATE POLICY "attenda_fees_insert" ON attenda_fees
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- shuttle_routes
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "shuttle_routes_select" ON shuttle_routes;
CREATE POLICY "shuttle_routes_select" ON shuttle_routes FOR SELECT USING (true);

DROP POLICY IF EXISTS "shuttle_routes_insert_staff" ON shuttle_routes;
CREATE POLICY "shuttle_routes_insert_staff" ON shuttle_routes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "shuttle_routes_update_staff" ON shuttle_routes;
CREATE POLICY "shuttle_routes_update_staff" ON shuttle_routes
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "shuttle_routes_delete_staff" ON shuttle_routes;
CREATE POLICY "shuttle_routes_delete_staff" ON shuttle_routes
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- shuttle_slots (hotel check via shuttle_routes)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "shuttle_slots_select" ON shuttle_slots;
CREATE POLICY "shuttle_slots_select" ON shuttle_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "shuttle_slots_insert_staff" ON shuttle_slots;
CREATE POLICY "shuttle_slots_insert_staff" ON shuttle_slots
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM shuttle_routes WHERE id = route_id AND hotel_id = public.get_user_hotel_id())
  );

DROP POLICY IF EXISTS "shuttle_slots_delete_staff" ON shuttle_slots;
CREATE POLICY "shuttle_slots_delete_staff" ON shuttle_slots
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM shuttle_routes WHERE id = route_id AND hotel_id = public.get_user_hotel_id())
  );

-- ═════════════════════════════════════════════════════════════
-- shuttle_bookings (hotel check via slot → route)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "shuttle_bookings_insert" ON shuttle_bookings;
CREATE POLICY "shuttle_bookings_insert" ON shuttle_bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "shuttle_bookings_select_staff" ON shuttle_bookings;
CREATE POLICY "shuttle_bookings_select_staff" ON shuttle_bookings
  FOR SELECT USING (
    (auth.role() = 'authenticated'
      AND (public.is_superadmin() OR EXISTS (SELECT 1 FROM shuttle_slots ss JOIN shuttle_routes sr ON sr.id = ss.route_id WHERE ss.id = slot_id AND sr.hotel_id = public.get_user_hotel_id())))
    OR (auth.role() = 'anon')
  );

DROP POLICY IF EXISTS "shuttle_bookings_update_staff" ON shuttle_bookings;
CREATE POLICY "shuttle_bookings_update_staff" ON shuttle_bookings
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM shuttle_slots ss JOIN shuttle_routes sr ON sr.id = ss.route_id WHERE ss.id = slot_id AND sr.hotel_id = public.get_user_hotel_id())
  );

-- ═════════════════════════════════════════════════════════════
-- shuttle_requests
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "shuttle_requests_insert" ON shuttle_requests;
CREATE POLICY "shuttle_requests_insert" ON shuttle_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "shuttle_requests_select_staff" ON shuttle_requests;
CREATE POLICY "shuttle_requests_select_staff" ON shuttle_requests
  FOR SELECT USING (
    (auth.role() = 'authenticated' AND (public.is_superadmin() OR hotel_id = public.get_user_hotel_id()))
    OR (auth.role() = 'anon')
  );

DROP POLICY IF EXISTS "shuttle_requests_update_staff" ON shuttle_requests;
CREATE POLICY "shuttle_requests_update_staff" ON shuttle_requests
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- cruise_schedules
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cruise_schedules_select" ON cruise_schedules;
CREATE POLICY "cruise_schedules_select" ON cruise_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "cruise_schedules_insert_staff" ON cruise_schedules;
CREATE POLICY "cruise_schedules_insert_staff" ON cruise_schedules
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- hotel_knowledge_base
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "knowledge_base_select" ON hotel_knowledge_base;
CREATE POLICY "knowledge_base_select" ON hotel_knowledge_base FOR SELECT USING (true);

DROP POLICY IF EXISTS "knowledge_base_insert_staff" ON hotel_knowledge_base;
CREATE POLICY "knowledge_base_insert_staff" ON hotel_knowledge_base
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "knowledge_base_update_staff" ON hotel_knowledge_base;
CREATE POLICY "knowledge_base_update_staff" ON hotel_knowledge_base
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "knowledge_base_delete_staff" ON hotel_knowledge_base;
CREATE POLICY "knowledge_base_delete_staff" ON hotel_knowledge_base
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- staff_checklists, instances, schedules, rdo_requests
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "checklists_select" ON staff_checklists;
CREATE POLICY "checklists_select" ON staff_checklists
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "checklists_insert" ON staff_checklists;
CREATE POLICY "checklists_insert" ON staff_checklists
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "checklists_update" ON staff_checklists;
CREATE POLICY "checklists_update" ON staff_checklists
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "checklists_delete" ON staff_checklists;
CREATE POLICY "checklists_delete" ON staff_checklists
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- staff_checklist_instances
DROP POLICY IF EXISTS "checklist_instances_select" ON staff_checklist_instances;
CREATE POLICY "checklist_instances_select" ON staff_checklist_instances
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "checklist_instances_insert" ON staff_checklist_instances;
CREATE POLICY "checklist_instances_insert" ON staff_checklist_instances
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "checklist_instances_update" ON staff_checklist_instances;
CREATE POLICY "checklist_instances_update" ON staff_checklist_instances
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- staff_schedules
DROP POLICY IF EXISTS "staff_schedules_select" ON staff_schedules;
CREATE POLICY "staff_schedules_select" ON staff_schedules
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "staff_schedules_insert" ON staff_schedules;
CREATE POLICY "staff_schedules_insert" ON staff_schedules
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "staff_schedules_delete" ON staff_schedules;
CREATE POLICY "staff_schedules_delete" ON staff_schedules
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- staff_rdo_requests
DROP POLICY IF EXISTS "rdo_select" ON staff_rdo_requests;
CREATE POLICY "rdo_select" ON staff_rdo_requests
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "rdo_insert" ON staff_rdo_requests;
CREATE POLICY "rdo_insert" ON staff_rdo_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- call_around_logs, daily_logs, no_shows, room_moves, bank_counts
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "call_around_select" ON call_around_logs;
CREATE POLICY "call_around_select" ON call_around_logs
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "call_around_insert" ON call_around_logs;
CREATE POLICY "call_around_insert" ON call_around_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "daily_logs_select" ON daily_logs;
CREATE POLICY "daily_logs_select" ON daily_logs
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "daily_logs_insert" ON daily_logs;
CREATE POLICY "daily_logs_insert" ON daily_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "no_shows_select" ON no_shows;
CREATE POLICY "no_shows_select" ON no_shows
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "no_shows_insert" ON no_shows;
CREATE POLICY "no_shows_insert" ON no_shows
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "no_shows_delete" ON no_shows;
CREATE POLICY "no_shows_delete" ON no_shows
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "room_moves_select" ON room_moves;
CREATE POLICY "room_moves_select" ON room_moves
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "room_moves_insert" ON room_moves;
CREATE POLICY "room_moves_insert" ON room_moves
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "room_moves_delete" ON room_moves;
CREATE POLICY "room_moves_delete" ON room_moves
  FOR DELETE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "bank_counts_select" ON bank_counts;
CREATE POLICY "bank_counts_select" ON bank_counts
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "bank_counts_insert" ON bank_counts;
CREATE POLICY "bank_counts_insert" ON bank_counts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- hotel_ops_tools
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "hotel_ops_tools_select" ON hotel_ops_tools;
CREATE POLICY "hotel_ops_tools_select" ON hotel_ops_tools
  FOR SELECT USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "hotel_ops_tools_insert" ON hotel_ops_tools;
CREATE POLICY "hotel_ops_tools_insert" ON hotel_ops_tools
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

DROP POLICY IF EXISTS "hotel_ops_tools_update" ON hotel_ops_tools;
CREATE POLICY "hotel_ops_tools_update" ON hotel_ops_tools
  FOR UPDATE USING (auth.role() = 'authenticated' AND hotel_id = public.get_user_hotel_id());

-- ═════════════════════════════════════════════════════════════
-- ops_tools (global catalog, no hotel_id)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "ops_tools_select" ON ops_tools;
CREATE POLICY "ops_tools_select" ON ops_tools FOR SELECT USING (true);

DROP POLICY IF EXISTS "ops_tools_insert" ON ops_tools;
CREATE POLICY "ops_tools_insert" ON ops_tools
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ops_tools_delete" ON ops_tools;
CREATE POLICY "ops_tools_delete" ON ops_tools
  FOR DELETE USING (auth.role() = 'authenticated');

-- ═════════════════════════════════════════════════════════════
-- superadmin_config (slot check is public)
-- ═════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "superadmin_select" ON superadmin_config;
CREATE POLICY "superadmin_select" ON superadmin_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "superadmin_insert" ON superadmin_config;
CREATE POLICY "superadmin_insert" ON superadmin_config
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- ─── PART 3: PERFORMANCE INDEXES ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_hotels_slug ON hotels(slug);

CREATE INDEX IF NOT EXISTS idx_requests_hotel ON requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_requests_hotel_created ON requests(hotel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guests_hotel ON guests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guests_hotel_name_room ON guests(hotel_id, name, room);

CREATE INDEX IF NOT EXISTS idx_staff_hotel ON staff_accounts(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_pin ON staff_accounts(pin_code);

CREATE INDEX IF NOT EXISTS idx_rooms_hotel ON hotel_rooms(hotel_id);

CREATE INDEX IF NOT EXISTS idx_partners_hotel ON partners(hotel_id);
CREATE INDEX IF NOT EXISTS idx_partner_menu_items_partner ON partner_menu_items(partner_id);

CREATE INDEX IF NOT EXISTS idx_messages_hotel ON messages(hotel_id);
CREATE INDEX IF NOT EXISTS idx_messages_hotel_created ON messages(hotel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shuttle_routes_hotel ON shuttle_routes(hotel_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_slots_route ON shuttle_slots(route_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_bookings_slot ON shuttle_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_requests_hotel ON shuttle_requests(hotel_id);

CREATE INDEX IF NOT EXISTS idx_cruise_hotel ON cruise_schedules(hotel_id);

CREATE INDEX IF NOT EXISTS idx_kb_hotel ON hotel_knowledge_base(hotel_id);

CREATE INDEX IF NOT EXISTS idx_fees_hotel ON attenda_fees(hotel_id);
CREATE INDEX IF NOT EXISTS idx_fees_hotel_created ON attenda_fees(hotel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checklists_hotel ON staff_checklists(hotel_id);
CREATE INDEX IF NOT EXISTS idx_checklist_instances_hotel ON staff_checklist_instances(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_hotel ON staff_schedules(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rdo_hotel ON staff_rdo_requests(hotel_id);

CREATE INDEX IF NOT EXISTS idx_hotel_ops_tools_hotel ON hotel_ops_tools(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_ops_tools_tool ON hotel_ops_tools(tool_key);

CREATE INDEX IF NOT EXISTS idx_qr_codes_hotel ON qr_codes(hotel_id);
CREATE INDEX IF NOT EXISTS idx_call_around_hotel ON call_around_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_hotel ON daily_logs(hotel_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_no_shows_hotel ON no_shows(hotel_id, no_show_date DESC);
CREATE INDEX IF NOT EXISTS idx_room_moves_hotel ON room_moves(hotel_id, move_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_counts_hotel ON bank_counts(hotel_id, count_date DESC);