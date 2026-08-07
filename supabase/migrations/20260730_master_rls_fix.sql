-- ═════════════════════════════════════════════════════════════════
-- ATTENDA — MASTER RLS & SCHEMA FIX (run once in Supabase SQL Editor)
-- Project: zhhhyrodqndeyjxveszu
-- 
-- This script:
--   1. Fixes get_user_hotel_id() (staff JWT has no hotel_id → RLS blocks everything)
--   2. Fixes is_superadmin() and is_hotel_staff()
--   3. Fixes shuttle_requests column mismatch (room vs room_number)
--   4. Nukes ALL existing RLS policies on every table
--   5. Creates clean, consistent policies on every table
--   6. Adds missing indexes
--
-- Safe to run multiple times (idempotent).
-- ═════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════
-- PART 1: HELPER FUNCTIONS
-- ═════════════════════════════════════════════════════════════════

-- get_user_hotel_id(): resolves hotel_id from JWT, falling back to staff_accounts
-- SECURITY DEFINER = bypasses RLS (avoids infinite recursion on staff_accounts)
CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_hotel_id TEXT;
  user_id UUID;
  staff_hotel_id TEXT;
BEGIN
  jwt_hotel_id := COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'hotel_id',
    current_setting('request.jwt.claims', true)::jsonb ->> 'hotel_id'
  );
  IF jwt_hotel_id IS NOT NULL AND jwt_hotel_id != '' THEN
    RETURN jwt_hotel_id;
  END IF;
  BEGIN
    user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN '';
  END;
  IF user_id IS NULL THEN
    RETURN '';
  END IF;
  SELECT hotel_id::text INTO staff_hotel_id
  FROM public.staff_accounts
  WHERE id = user_id
  LIMIT 1;
  RETURN COALESCE(staff_hotel_id, '');
END;
$$;

-- is_superadmin(): checks JWT role claim
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') = 'superadmin',
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'superadmin',
    false
  );
$$;

-- is_hotel_staff(): checks if authenticated user is an active staff member
CREATE OR REPLACE FUNCTION public.is_hotel_staff()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_accounts
    WHERE id = auth.uid() AND active = true
  );
$$;

-- hotel_id_check(): convenience matcher
CREATE OR REPLACE FUNCTION public.hotel_id_check(required_hotel_id text)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT public.get_user_hotel_id() = required_hotel_id;
$$;


-- ═════════════════════════════════════════════════════════════════
-- PART 2: SCHEMA FIXES
-- ═════════════════════════════════════════════════════════════════

-- Fix shuttle_requests: app sends 'room_number', DB may have 'room'
ALTER TABLE shuttle_requests ADD COLUMN IF NOT EXISTS room_number TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shuttle_requests' AND column_name = 'room'
  ) THEN
    UPDATE shuttle_requests SET room_number = room
    WHERE (room_number IS NULL OR room_number = '') AND room IS NOT NULL;
    ALTER TABLE shuttle_requests ALTER COLUMN room DROP NOT NULL;
  END IF;
END $$;

-- Ensure staff_accounts has positions column
ALTER TABLE public.staff_accounts
  ADD COLUMN IF NOT EXISTS positions text[] DEFAULT '{}';

-- Ensure hotels has features column
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS features JSONB
DEFAULT '{"compset":true,"forecast":true,"shuttle":true,"kpi":true,"vendors":true,"todos":true,"schedules":true,"staff":true,"revenue":true}';

-- Ensure compset_hotels has room_keys
ALTER TABLE compset_hotels ADD COLUMN IF NOT EXISTS room_keys INTEGER DEFAULT 0;

-- Ensure position_todo_templates has is_system
ALTER TABLE position_todo_templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Ensure hotels has timezone
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Ensure staff_accounts has department and role
ALTER TABLE staff_accounts ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'front_desk';
ALTER TABLE staff_accounts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';

-- Ensure hotels has shuttle config columns
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS has_free_shuttle BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuttle_start_time TIME,
  ADD COLUMN IF NOT EXISTS shuttle_end_time TIME,
  ADD COLUMN IF NOT EXISTS shuttle_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  ADD COLUMN IF NOT EXISTS shuttle_capacity INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS shuttle_pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS shuttle_notes TEXT;


-- ═════════════════════════════════════════════════════════════════
-- PART 3: NUKE ALL EXISTING RLS POLICIES
-- ═════════════════════════════════════════════════════════════════

-- Drop every policy on every table the app touches
DO $$
DECLARE
  r RECORD;
  tables text[] := ARRAY[
    'hotels','requests','guests','messages','staff_accounts',
    'staff_schedules','staff_checklists','staff_checklist_instances',
    'staff_positions','staff_rdo_requests','staff_birthdays','staff_events',
    'staff_incentives','staff_points','staff_redemptions',
    'hotel_rooms','hotel_ops_tools','hotel_knowledge_base',
    'partners','partner_menu_items','partner_applications',
    'qr_codes','shuttle_routes','shuttle_slots','shuttle_bookings',
    'shuttle_requests','cruise_schedules','weekly_forecasts',
    'compset_hotels','compset_call_times','compset_entries',
    'call_around_logs','daily_logs','no_shows','room_moves',
    'bank_counts','ops_tools','superadmin_config','attenda_fees',
    'vendors','vendor_orders','vendor_order_guide','vendor_order_items',
    'vendor_events','vendor_expenses','payout_ledger',
    'position_todo_templates','position_todo_items',
    'position_todo_instances','position_todo_responses',
    'blog_posts','reviews','guest_sessions',
    'bouncie_connections','bouncie_devices','bouncie_locations','bouncie_trips',
    'kpi_packs','kpi_pack_installs','todo_packs','todo_pack_installs'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;
  END LOOP;
END $$;


-- ═════════════════════════════════════════════════════════════════
-- PART 4: ENABLE RLS ON ALL TABLES
-- ═════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'hotels','requests','guests','messages','staff_accounts',
    'staff_schedules','staff_checklists','staff_checklist_instances',
    'staff_positions','staff_rdo_requests','staff_birthdays','staff_events',
    'staff_incentives','staff_points','staff_redemptions',
    'hotel_rooms','hotel_ops_tools','hotel_knowledge_base',
    'partners','partner_menu_items','partner_applications',
    'qr_codes','shuttle_routes','shuttle_slots','shuttle_bookings',
    'shuttle_requests','cruise_schedules','weekly_forecasts',
    'compset_hotels','compset_call_times','compset_entries',
    'call_around_logs','daily_logs','no_shows','room_moves',
    'bank_counts','ops_tools','superadmin_config','attenda_fees',
    'vendors','vendor_orders','vendor_order_guide','vendor_order_items',
    'vendor_events','vendor_expenses','payout_ledger',
    'position_todo_templates','position_todo_items',
    'position_todo_instances','position_todo_responses',
    'blog_posts','reviews','guest_sessions',
    'bouncie_connections','bouncie_devices','bouncie_locations','bouncie_trips',
    'kpi_packs','kpi_pack_installs','todo_packs','todo_pack_installs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not enable RLS on %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;


-- ═════════════════════════════════════════════════════════════════
-- PART 5: CREATE CLEAN RLS POLICIES
-- ═════════════════════════════════════════════════════════════════
-- Pattern:
--   - Guest-facing tables (requests, messages, shuttle_requests, reviews, guests):
--     anyone can INSERT, authenticated staff can SELECT/UPDATE
--   - Hotel-scoped tables: hotel_id = get_user_hotel_id() OR is_superadmin()
--   - Global reference tables (ops_tools, kpi_packs, etc.): authenticated can SELECT
--   - staff_accounts: own email read + hotel-scoped
-- ═════════════════════════════════════════════════════════════════

-- ─── HOTELS ─────────────────────────────────────────────────────
CREATE POLICY hotels_select ON public.hotels FOR SELECT USING (true);
CREATE POLICY hotels_insert ON public.hotels FOR INSERT
  WITH CHECK (public.is_superadmin());
CREATE POLICY hotels_update ON public.hotels FOR UPDATE
  USING (public.is_superadmin() OR (auth.role() = 'authenticated' AND public.get_user_hotel_id() = hotel_id::text));
CREATE POLICY hotels_delete ON public.hotels FOR DELETE
  USING (public.is_superadmin());

-- ─── REQUESTS (guest-created, staff-managed) ───────────────────
CREATE POLICY requests_select ON public.requests FOR SELECT USING (true);
CREATE POLICY requests_insert ON public.requests FOR INSERT WITH CHECK (true);
CREATE POLICY requests_update ON public.requests FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY requests_delete ON public.requests FOR DELETE USING (auth.role() = 'authenticated');

-- ─── GUESTS ─────────────────────────────────────────────────────
CREATE POLICY guests_select ON public.guests FOR SELECT USING (true);
CREATE POLICY guests_insert ON public.guests FOR INSERT WITH CHECK (true);
CREATE POLICY guests_update ON public.guests FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY guests_delete ON public.guests FOR DELETE USING (auth.role() = 'authenticated');

-- ─── MESSAGES (guest chat) ─────────────────────────────────────
CREATE POLICY messages_select ON public.messages FOR SELECT USING (true);
CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY messages_update ON public.messages FOR UPDATE USING (auth.role() = 'authenticated');

-- ─── REVIEWS ───────────────────────────────────────────────────
CREATE POLICY reviews_select ON public.reviews FOR SELECT USING (true);
CREATE POLICY reviews_insert ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY reviews_update ON public.reviews FOR UPDATE USING (auth.role() = 'authenticated');

-- ─── GUEST_SESSIONS ────────────────────────────────────────────
CREATE POLICY guest_sessions_select ON public.guest_sessions FOR SELECT USING (true);
CREATE POLICY guest_sessions_insert ON public.guest_sessions FOR INSERT WITH CHECK (true);

-- ─── SHUTTLE_REQUESTS (guest + staff create trips) ─────────────
CREATE POLICY shuttle_requests_select ON public.shuttle_requests FOR SELECT USING (true);
CREATE POLICY shuttle_requests_insert ON public.shuttle_requests FOR INSERT WITH CHECK (true);
CREATE POLICY shuttle_requests_update ON public.shuttle_requests FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY shuttle_requests_delete ON public.shuttle_requests FOR DELETE USING (auth.role() = 'authenticated');

-- ─── SHUTTLE_BOOKINGS ──────────────────────────────────────────
CREATE POLICY shuttle_bookings_select ON public.shuttle_bookings FOR SELECT USING (true);
CREATE POLICY shuttle_bookings_insert ON public.shuttle_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY shuttle_bookings_update ON public.shuttle_bookings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY shuttle_bookings_delete ON public.shuttle_bookings FOR DELETE USING (auth.role() = 'authenticated');

-- ─── SHUTTLE_ROUTES (staff-managed) ────────────────────────────
CREATE POLICY shuttle_routes_select ON public.shuttle_routes FOR SELECT USING (true);
CREATE POLICY shuttle_routes_insert ON public.shuttle_routes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY shuttle_routes_update ON public.shuttle_routes FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY shuttle_routes_delete ON public.shuttle_routes FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── SHUTTLE_SLOTS (staff-managed) ─────────────────────────────
CREATE POLICY shuttle_slots_select ON public.shuttle_slots FOR SELECT USING (true);
CREATE POLICY shuttle_slots_insert ON public.shuttle_slots FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY shuttle_slots_update ON public.shuttle_slots FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY shuttle_slots_delete ON public.shuttle_slots FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── CRUISE_SCHEDULES ─────────────────────────────────────────
CREATE POLICY cruise_schedules_select ON public.cruise_schedules FOR SELECT USING (true);
CREATE POLICY cruise_schedules_insert ON public.cruise_schedules FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY cruise_schedules_update ON public.cruise_schedules FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY cruise_schedules_delete ON public.cruise_schedules FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── QR_CODES ──────────────────────────────────────────────────
CREATE POLICY qr_codes_select ON public.qr_codes FOR SELECT USING (true);
CREATE POLICY qr_codes_insert ON public.qr_codes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY qr_codes_update ON public.qr_codes FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY qr_codes_delete ON public.qr_codes FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── PARTNERS (guest catalog + staff management) ─────────────
CREATE POLICY partners_select ON public.partners FOR SELECT USING (true);
CREATE POLICY partners_insert ON public.partners FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY partners_update ON public.partners FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY partners_delete ON public.partners FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── PARTNER_MENU_ITEMS ───────────────────────────────────────
CREATE POLICY partner_menu_items_select ON public.partner_menu_items FOR SELECT USING (true);
CREATE POLICY partner_menu_items_insert ON public.partner_menu_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY partner_menu_items_update ON public.partner_menu_items FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY partner_menu_items_delete ON public.partner_menu_items FOR DELETE
  USING (auth.role() = 'authenticated');

-- ─── PARTNER_APPLICATIONS ──────────────────────────────────────
CREATE POLICY partner_applications_select ON public.partner_applications FOR SELECT USING (true);
CREATE POLICY partner_applications_insert ON public.partner_applications FOR INSERT WITH CHECK (true);

-- ─── HOTEL_ROOMS ──────────────────────────────────────────────
CREATE POLICY hotel_rooms_select ON public.hotel_rooms FOR SELECT USING (true);
CREATE POLICY hotel_rooms_insert ON public.hotel_rooms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY hotel_rooms_update ON public.hotel_rooms FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY hotel_rooms_delete ON public.hotel_rooms FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_ACCOUNTS ────────────────────────────────────────────
-- Staff can read their own row (by email match) for login bootstrap
-- Hotel-scoped for everything else
CREATE POLICY staff_accounts_read_own_email ON public.staff_accounts
  FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY staff_accounts_select_hotel ON public.staff_accounts
  FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY staff_accounts_insert ON public.staff_accounts FOR INSERT
  WITH CHECK (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY staff_accounts_update ON public.staff_accounts FOR UPDATE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

CREATE POLICY staff_accounts_delete ON public.staff_accounts FOR DELETE
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- ─── STAFF_SCHEDULES ──────────────────────────────────────────
CREATE POLICY staff_schedules_select ON public.staff_schedules FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin() OR auth.role() = 'anon');
CREATE POLICY staff_schedules_insert ON public.staff_schedules FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_schedules_update ON public.staff_schedules FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_schedules_delete ON public.staff_schedules FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_CHECKLISTS ──────────────────────────────────────────
CREATE POLICY staff_checklists_select ON public.staff_checklists FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY staff_checklists_insert ON public.staff_checklists FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_checklists_update ON public.staff_checklists FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_checklists_delete ON public.staff_checklists FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_CHECKLIST_INSTANCES ────────────────────────────────
CREATE POLICY staff_checklist_instances_select ON public.staff_checklist_instances FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY staff_checklist_instances_insert ON public.staff_checklist_instances FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_checklist_instances_update ON public.staff_checklist_instances FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_checklist_instances_delete ON public.staff_checklist_instances FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_POSITIONS ──────────────────────────────────────────
CREATE POLICY staff_positions_select ON public.staff_positions FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin() OR auth.role() = 'anon');
CREATE POLICY staff_positions_insert ON public.staff_positions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_positions_update ON public.staff_positions FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_positions_delete ON public.staff_positions FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_RDO_REQUESTS ───────────────────────────────────────
CREATE POLICY staff_rdo_requests_select ON public.staff_rdo_requests FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY staff_rdo_requests_insert ON public.staff_rdo_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_rdo_requests_update ON public.staff_rdo_requests FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_rdo_requests_delete ON public.staff_rdo_requests FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_BIRTHDAYS ──────────────────────────────────────────
CREATE POLICY staff_birthdays_select ON public.staff_birthdays FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY staff_birthdays_insert ON public.staff_birthdays FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_birthdays_update ON public.staff_birthdays FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_EVENTS ─────────────────────────────────────────────
CREATE POLICY staff_events_select ON public.staff_events FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY staff_events_insert ON public.staff_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_INCENTIVES ─────────────────────────────────────────
CREATE POLICY staff_incentives_select ON public.staff_incentives FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY staff_incentives_insert ON public.staff_incentives FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY staff_incentives_update ON public.staff_incentives FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_POINTS ────────────────────────────────────────────
CREATE POLICY staff_points_select ON public.staff_points FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY staff_points_insert ON public.staff_points FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── STAFF_REDEMPTIONS ────────────────────────────────────────
CREATE POLICY staff_redemptions_select ON public.staff_redemptions FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY staff_redemptions_insert ON public.staff_redemptions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── HOTEL_OPS_TOOLS ──────────────────────────────────────────
CREATE POLICY hotel_ops_tools_select ON public.hotel_ops_tools FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY hotel_ops_tools_insert ON public.hotel_ops_tools FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY hotel_ops_tools_update ON public.hotel_ops_tools FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY hotel_ops_tools_delete ON public.hotel_ops_tools FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── HOTEL_KNOWLEDGE_BASE ─────────────────────────────────────
CREATE POLICY hotel_knowledge_base_select ON public.hotel_knowledge_base FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin() OR auth.role() = 'anon');
CREATE POLICY hotel_knowledge_base_insert ON public.hotel_knowledge_base FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY hotel_knowledge_base_update ON public.hotel_knowledge_base FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY hotel_knowledge_base_delete ON public.hotel_knowledge_base FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── COMPSET_HOTELS ───────────────────────────────────────────
CREATE POLICY compset_hotels_select ON public.compset_hotels FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY compset_hotels_insert ON public.compset_hotels FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY compset_hotels_update ON public.compset_hotels FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY compset_hotels_delete ON public.compset_hotels FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── COMPSET_CALL_TIMES ───────────────────────────────────────
CREATE POLICY compset_call_times_select ON public.compset_call_times FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY compset_call_times_insert ON public.compset_call_times FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY compset_call_times_update ON public.compset_call_times FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY compset_call_times_delete ON public.compset_call_times FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── COMPSET_ENTRIES ─────────────────────────────────────────
CREATE POLICY compset_entries_select ON public.compset_entries FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY compset_entries_insert ON public.compset_entries FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY compset_entries_update ON public.compset_entries FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY compset_entries_delete ON public.compset_entries FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── CALL_AROUND_LOGS ────────────────────────────────────────
CREATE POLICY call_around_logs_select ON public.call_around_logs FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY call_around_logs_insert ON public.call_around_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY call_around_logs_update ON public.call_around_logs FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY call_around_logs_delete ON public.call_around_logs FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── DAILY_LOGS ───────────────────────────────────────────────
CREATE POLICY daily_logs_select ON public.daily_logs FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY daily_logs_insert ON public.daily_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY daily_logs_update ON public.daily_logs FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY daily_logs_delete ON public.daily_logs FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── NO_SHOWS ────────────────────────────────────────────────
CREATE POLICY no_shows_select ON public.no_shows FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY no_shows_insert ON public.no_shows FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY no_shows_update ON public.no_shows FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY no_shows_delete ON public.no_shows FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── ROOM_MOVES ───────────────────────────────────────────────
CREATE POLICY room_moves_select ON public.room_moves FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY room_moves_insert ON public.room_moves FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY room_moves_update ON public.room_moves FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY room_moves_delete ON public.room_moves FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── BANK_COUNTS ─────────────────────────────────────────────
CREATE POLICY bank_counts_select ON public.bank_counts FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY bank_counts_insert ON public.bank_counts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY bank_counts_update ON public.bank_counts FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY bank_counts_delete ON public.bank_counts FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── WEEKLY_FORECASTS ─────────────────────────────────────────
CREATE POLICY weekly_forecasts_select ON public.weekly_forecasts FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY weekly_forecasts_insert ON public.weekly_forecasts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY weekly_forecasts_update ON public.weekly_forecasts FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY weekly_forecasts_delete ON public.weekly_forecasts FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── VENDORS ─────────────────────────────────────────────────
CREATE POLICY vendors_select ON public.vendors FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY vendors_insert ON public.vendors FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendors_update ON public.vendors FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendors_delete ON public.vendors FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── VENDOR_ORDERS ───────────────────────────────────────────
CREATE POLICY vendor_orders_select ON public.vendor_orders FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY vendor_orders_insert ON public.vendor_orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendor_orders_update ON public.vendor_orders FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendor_orders_delete ON public.vendor_orders FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── VENDOR_ORDER_GUIDE ──────────────────────────────────────
CREATE POLICY vendor_order_guide_select ON public.vendor_order_guide FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY vendor_order_guide_insert ON public.vendor_order_guide FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendor_order_guide_update ON public.vendor_order_guide FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendor_order_guide_delete ON public.vendor_order_guide FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── VENDOR_ORDER_ITEMS ──────────────────────────────────────
CREATE POLICY vendor_order_items_select ON public.vendor_order_items FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY vendor_order_items_insert ON public.vendor_order_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendor_order_items_update ON public.vendor_order_items FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── VENDOR_EVENTS ───────────────────────────────────────────
CREATE POLICY vendor_events_select ON public.vendor_events FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY vendor_events_insert ON public.vendor_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendor_events_update ON public.vendor_events FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendor_events_delete ON public.vendor_events FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── VENDOR_EXPENSES ─────────────────────────────────────────
CREATE POLICY vendor_expenses_select ON public.vendor_expenses FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY vendor_expenses_insert ON public.vendor_expenses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendor_expenses_update ON public.vendor_expenses FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY vendor_expenses_delete ON public.vendor_expenses FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── POSITION_TODO_TEMPLATES ─────────────────────────────────
CREATE POLICY position_todo_templates_select ON public.position_todo_templates FOR SELECT USING (true);
CREATE POLICY position_todo_templates_insert ON public.position_todo_templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR hotel_id IS NULL OR public.is_superadmin()));
CREATE POLICY position_todo_templates_update ON public.position_todo_templates FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR hotel_id IS NULL OR public.is_superadmin()));
CREATE POLICY position_todo_templates_delete ON public.position_todo_templates FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR hotel_id IS NULL OR public.is_superadmin()));

-- ─── POSITION_TODO_ITEMS ─────────────────────────────────────
CREATE POLICY position_todo_items_select ON public.position_todo_items FOR SELECT USING (true);
CREATE POLICY position_todo_items_insert ON public.position_todo_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY position_todo_items_update ON public.position_todo_items FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY position_todo_items_delete ON public.position_todo_items FOR DELETE
  USING (auth.role() = 'authenticated');

-- ─── POSITION_TODO_INSTANCES ─────────────────────────────────
CREATE POLICY position_todo_instances_select ON public.position_todo_instances FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY position_todo_instances_insert ON public.position_todo_instances FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY position_todo_instances_update ON public.position_todo_instances FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY position_todo_instances_delete ON public.position_todo_instances FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── POSITION_TODO_RESPONSES ─────────────────────────────────
CREATE POLICY position_todo_responses_select ON public.position_todo_responses FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY position_todo_responses_insert ON public.position_todo_responses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY position_todo_responses_update ON public.position_todo_responses FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── BLOG_POSTS ──────────────────────────────────────────────
CREATE POLICY blog_posts_select ON public.blog_posts FOR SELECT USING (true);
CREATE POLICY blog_posts_insert ON public.blog_posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY blog_posts_update ON public.blog_posts FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY blog_posts_delete ON public.blog_posts FOR DELETE
  USING (auth.role() = 'authenticated');

-- ─── GLOBAL REFERENCE TABLES (no hotel_id) ───────────────────

-- ops_tools: global reference, superadmin manages
CREATE POLICY ops_tools_select ON public.ops_tools FOR SELECT USING (true);
CREATE POLICY ops_tools_insert ON public.ops_tools FOR INSERT WITH CHECK (public.is_superadmin());
CREATE POLICY ops_tools_update ON public.ops_tools FOR UPDATE USING (public.is_superadmin());
CREATE POLICY ops_tools_delete ON public.ops_tools FOR DELETE USING (public.is_superadmin());

-- kpi_packs / todo_packs: global, authenticated read
CREATE POLICY kpi_packs_select ON public.kpi_packs FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY todo_packs_select ON public.todo_packs FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- kpi_pack_installs / todo_pack_installs: hotel-scoped
CREATE POLICY kpi_pack_installs_select ON public.kpi_pack_installs FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY kpi_pack_installs_insert ON public.kpi_pack_installs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY kpi_pack_installs_update ON public.kpi_pack_installs FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

CREATE POLICY todo_pack_installs_select ON public.todo_pack_installs FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY todo_pack_installs_insert ON public.todo_pack_installs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY todo_pack_installs_update ON public.todo_pack_installs FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ─── ATTENDA_FEES (hotel-scoped) ─────────────────────────────
CREATE POLICY attenda_fees_select ON public.attenda_fees FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- ─── PAYOUT_LEDGER (hotel-scoped, superadmin manages) ────────
CREATE POLICY payout_ledger_select ON public.payout_ledger FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY payout_ledger_insert ON public.payout_ledger FOR INSERT
  WITH CHECK (public.is_superadmin());
CREATE POLICY payout_ledger_update ON public.payout_ledger FOR UPDATE
  USING (public.is_superadmin());

-- ─── SUPERADMIN_CONFIG ───────────────────────────────────────
CREATE POLICY superadmin_config_select ON public.superadmin_config FOR SELECT
  USING (public.is_superadmin());
CREATE POLICY superadmin_config_insert ON public.superadmin_config FOR INSERT
  WITH CHECK (public.is_superadmin());
CREATE POLICY superadmin_config_update ON public.superadmin_config FOR UPDATE
  USING (public.is_superadmin());
CREATE POLICY superadmin_config_delete ON public.superadmin_config FOR DELETE
  USING (public.is_superadmin());

-- ─── BOUNCIE TABLES (hotel-scoped) ────────────────────────────
CREATE POLICY bouncie_connections_select ON public.bouncie_connections FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY bouncie_connections_insert ON public.bouncie_connections FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY bouncie_connections_update ON public.bouncie_connections FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY bouncie_connections_delete ON public.bouncie_connections FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

CREATE POLICY bouncie_devices_select ON public.bouncie_devices FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY bouncie_devices_insert ON public.bouncie_devices FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY bouncie_devices_update ON public.bouncie_devices FOR UPDATE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY bouncie_devices_delete ON public.bouncie_devices FOR DELETE
  USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

CREATE POLICY bouncie_locations_select ON public.bouncie_locations FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY bouncie_trips_select ON public.bouncie_trips FOR SELECT
  USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());


-- ═════════════════════════════════════════════════════════════════
-- PART 6: INDEXES
-- ═════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_requests_hotel ON requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_hotel ON messages(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guests_hotel ON guests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_requests_hotel ON shuttle_requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_requests_date ON shuttle_requests(date);
CREATE INDEX IF NOT EXISTS idx_shuttle_requests_status ON shuttle_requests(status);
CREATE INDEX IF NOT EXISTS idx_shuttle_bookings_slot ON shuttle_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_bookings_status ON shuttle_bookings(status);
CREATE INDEX IF NOT EXISTS idx_shuttle_routes_hotel ON shuttle_routes(hotel_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_slots_hotel ON shuttle_slots(hotel_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_slots_route ON shuttle_slots(route_id);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_hotel ON staff_accounts(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_email ON staff_accounts(email);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_hotel ON staff_schedules(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON staff_schedules(date);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_hotel ON hotel_rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_partners_hotel ON partners(hotel_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_hotel ON qr_codes(hotel_id);
CREATE INDEX IF NOT EXISTS idx_cruise_schedules_hotel ON cruise_schedules(hotel_id);
CREATE INDEX IF NOT EXISTS idx_compset_hotels_hotel ON compset_hotels(hotel_id);
CREATE INDEX IF NOT EXISTS idx_compset_call_times_hotel ON compset_call_times(hotel_id);
CREATE INDEX IF NOT EXISTS idx_compset_entries_hotel_date ON compset_entries(hotel_id, call_date);
CREATE INDEX IF NOT EXISTS idx_compset_entries_compset_hotel ON compset_entries(compset_hotel_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_hotel ON daily_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_call_around_logs_hotel ON call_around_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_no_shows_hotel ON no_shows(hotel_id);
CREATE INDEX IF NOT EXISTS idx_room_moves_hotel ON room_moves(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bank_counts_hotel ON bank_counts(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_ops_tools_hotel ON hotel_ops_tools(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_knowledge_base_hotel ON hotel_knowledge_base(hotel_id);
CREATE INDEX IF NOT EXISTS idx_weekly_forecasts_hotel ON weekly_forecasts(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendors_hotel ON vendors(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_hotel ON vendor_orders(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendor_events_hotel ON vendor_events(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendor_expenses_hotel ON vendor_expenses(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendor_order_guide_hotel ON vendor_order_guide(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendor_order_items_hotel ON vendor_order_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_position_todo_instances_hotel ON position_todo_instances(hotel_id);
CREATE INDEX IF NOT EXISTS idx_position_todo_responses_hotel ON position_todo_responses(hotel_id);
CREATE INDEX IF NOT EXISTS idx_attenda_fees_hotel ON attenda_fees(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_hotel ON payout_ledger(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bouncie_devices_hotel ON bouncie_devices(hotel_id);


-- ═════════════════════════════════════════════════════════════════
-- PART 7: GRANT BASE PERMISSIONS
-- ═════════════════════════════════════════════════════════════════

-- Ensure anon and authenticated roles can access all tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Restrict partners to safe columns only (financial fields hidden from anon)
REVOKE SELECT ON partners FROM anon, authenticated;
GRANT SELECT (
  id, hotel_id, name, category, description, image_url, phone, address,
  hours, distance, rating, has_ordering, is_active, created_at,
  email, google_place_id, delivery_providers, lat, lng
) ON partners TO anon, authenticated;


-- ═════════════════════════════════════════════════════════════════
-- PART 8: VERIFY — run this to confirm everything is clean
-- ═════════════════════════════════════════════════════════════════

-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;