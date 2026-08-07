-- ═════════════════════════════════════════════════════════════════
-- ATTENDA — MASTER RLS & SCHEMA FIX (DEFENSIVE V2)
-- Project: zhhhyrodqndeyjxveszu
-- Only operates on tables that exist. Safe to run multiple times.
-- ═════════════════════════════════════════════════════════════════

-- ═════════════════════════════════════════════════════════════════
-- PART 1: HELPER FUNCTIONS
-- ═════════════════════════════════════════════════════════════════
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

CREATE OR REPLACE FUNCTION public.hotel_id_check(required_hotel_id text)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT public.get_user_hotel_id() = required_hotel_id;
$$;

-- ═════════════════════════════════════════════════════════════════
-- PART 2: SCHEMA FIXES (only on existing tables)
-- ═════════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS shuttle_requests ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE IF EXISTS public.staff_accounts ADD COLUMN IF NOT EXISTS positions text[] DEFAULT '{}';
ALTER TABLE IF EXISTS hotels ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{"compset":true,"forecast":true,"shuttle":true,"kpi":true,"vendors":true,"todos":true,"schedules":true,"staff":true,"revenue":true}';
ALTER TABLE IF EXISTS compset_hotels ADD COLUMN IF NOT EXISTS room_keys INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS position_todo_templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS hotels ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE IF EXISTS staff_accounts ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'front_desk';
ALTER TABLE IF EXISTS staff_accounts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE IF EXISTS hotels ADD COLUMN IF NOT EXISTS has_free_shuttle BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS hotels ADD COLUMN IF NOT EXISTS shuttle_start_time TIME;
ALTER TABLE IF EXISTS hotels ADD COLUMN IF NOT EXISTS shuttle_end_time TIME;
ALTER TABLE IF EXISTS hotels ADD COLUMN IF NOT EXISTS shuttle_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7];
ALTER TABLE IF EXISTS hotels ADD COLUMN IF NOT EXISTS shuttle_capacity INTEGER DEFAULT 8;
ALTER TABLE IF EXISTS hotels ADD COLUMN IF NOT EXISTS shuttle_pickup_location TEXT;
ALTER TABLE IF EXISTS hotels ADD COLUMN IF NOT EXISTS shuttle_notes TEXT;

-- Add hotel_id to every hotel-scoped table that exists (idempotent)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['hotels','staff_accounts','staff_schedules','staff_checklists','staff_checklist_instances','staff_positions','staff_rdo_requests','staff_birthdays','staff_events','staff_incentives','staff_points','staff_redemptions','hotel_rooms','hotel_ops_tools','hotel_knowledge_base','partners','qr_codes','shuttle_routes','shuttle_slots','cruise_schedules','weekly_forecasts','compset_hotels','compset_call_times','compset_entries','call_around_logs','daily_logs','no_shows','room_moves','bank_counts','attenda_fees','payout_ledger','vendors','vendor_orders','vendor_order_guide','vendor_order_items','vendor_events','vendor_expenses','position_todo_templates','position_todo_instances','position_todo_responses','kpi_pack_installs','todo_pack_installs','bouncie_connections','bouncie_devices','bouncie_locations','bouncie_trips'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS hotel_id TEXT', t);
    END IF;
  END LOOP;
END $$ LANGUAGE plpgsql;

-- ═════════════════════════════════════════════════════════════════
-- PART 3: DROP ALL EXISTING RLS POLICIES (on existing tables)
-- ═════════════════════════════════════════════════════════════════
DO $$
DECLARE
  r RECORD;
  t text;
  tables text[] := ARRAY['hotels','staff_accounts','staff_schedules','staff_checklists','staff_checklist_instances','staff_positions','staff_rdo_requests','staff_birthdays','staff_events','staff_incentives','staff_points','staff_redemptions','hotel_rooms','hotel_ops_tools','hotel_knowledge_base','partners','qr_codes','shuttle_routes','shuttle_slots','cruise_schedules','weekly_forecasts','compset_hotels','compset_call_times','compset_entries','call_around_logs','daily_logs','no_shows','room_moves','bank_counts','attenda_fees','payout_ledger','vendors','vendor_orders','vendor_order_guide','vendor_order_items','vendor_events','vendor_expenses','position_todo_templates','position_todo_instances','position_todo_responses','kpi_pack_installs','todo_pack_installs','bouncie_connections','bouncie_devices','bouncie_locations','bouncie_trips','requests','guests','messages','reviews','guest_sessions','shuttle_requests','shuttle_bookings','partner_applications','ops_tools','kpi_packs','todo_packs','superadmin_config'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$ LANGUAGE plpgsql;

-- ═════════════════════════════════════════════════════════════════
-- PART 4: ENABLE RLS ON ALL EXISTING TABLES
-- ═════════════════════════════════════════════════════════════════
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['hotels','staff_accounts','staff_schedules','staff_checklists','staff_checklist_instances','staff_positions','staff_rdo_requests','staff_birthdays','staff_events','staff_incentives','staff_points','staff_redemptions','hotel_rooms','hotel_ops_tools','hotel_knowledge_base','partners','qr_codes','shuttle_routes','shuttle_slots','cruise_schedules','weekly_forecasts','compset_hotels','compset_call_times','compset_entries','call_around_logs','daily_logs','no_shows','room_moves','bank_counts','attenda_fees','payout_ledger','vendors','vendor_orders','vendor_order_guide','vendor_order_items','vendor_events','vendor_expenses','position_todo_templates','position_todo_instances','position_todo_responses','kpi_pack_installs','todo_pack_installs','bouncie_connections','bouncie_devices','bouncie_locations','bouncie_trips','requests','guests','messages','reviews','guest_sessions','shuttle_requests','shuttle_bookings','partner_applications','ops_tools','kpi_packs','todo_packs','superadmin_config'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$ LANGUAGE plpgsql;

-- ═════════════════════════════════════════════════════════════════
-- PART 5: CREATE RLS POLICIES (only on existing tables)
-- ═════════════════════════════════════════════════════════════════

-- Hotel-scoped full CRUD policies
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['hotels','staff_accounts','staff_schedules','staff_checklists','staff_checklist_instances','staff_positions','staff_rdo_requests','staff_birthdays','staff_events','staff_incentives','staff_points','staff_redemptions','hotel_rooms','hotel_ops_tools','hotel_knowledge_base','partners','qr_codes','shuttle_routes','shuttle_slots','cruise_schedules','weekly_forecasts','compset_hotels','compset_call_times','compset_entries','call_around_logs','daily_logs','no_shows','room_moves','bank_counts','attenda_fees','payout_ledger','vendors','vendor_orders','vendor_order_guide','vendor_order_items','vendor_events','vendor_expenses','position_todo_templates','position_todo_instances','position_todo_responses','kpi_pack_installs','todo_pack_installs','bouncie_connections','bouncie_devices','bouncie_locations','bouncie_trips'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin())', t || '_select', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.role() = ''authenticated'' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()))', t || '_insert', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.role() = ''authenticated'' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()))', t || '_update', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (auth.role() = ''authenticated'' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()))', t || '_delete', t);
    END IF;
  END LOOP;
END $$ LANGUAGE plpgsql;

-- Guest-facing tables: anyone INSERT, authenticated SELECT/UPDATE
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['requests','guests','messages','reviews','guest_sessions','shuttle_requests','shuttle_bookings','partner_applications'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_select', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (true)', t || '_insert', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.role() = ''authenticated'')', t || '_update', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (auth.role() = ''authenticated'')', t || '_delete', t);
    END IF;
  END LOOP;
END $$ LANGUAGE plpgsql;

-- Global reference tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['ops_tools','kpi_packs','todo_packs'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_select', t);
    END IF;
  END LOOP;
  IF to_regclass('public.superadmin_config') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY superadmin_config_select ON public.superadmin_config FOR SELECT USING (public.is_superadmin())';
    EXECUTE 'CREATE POLICY superadmin_config_insert ON public.superadmin_config FOR INSERT WITH CHECK (public.is_superadmin())';
    EXECUTE 'CREATE POLICY superadmin_config_update ON public.superadmin_config FOR UPDATE USING (public.is_superadmin())';
    EXECUTE 'CREATE POLICY superadmin_config_delete ON public.superadmin_config FOR DELETE USING (public.is_superadmin())';
  END IF;
END $$ LANGUAGE plpgsql;

-- ═════════════════════════════════════════════════════════════════
-- PART 6: INDEXES (only on existing tables)
-- ═════════════════════════════════════════════════════════════════
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['hotels','staff_accounts','staff_schedules','staff_checklists','staff_checklist_instances','staff_positions','staff_rdo_requests','staff_birthdays','staff_events','staff_incentives','staff_points','staff_redemptions','hotel_rooms','hotel_ops_tools','hotel_knowledge_base','partners','qr_codes','shuttle_routes','shuttle_slots','cruise_schedules','weekly_forecasts','compset_hotels','compset_call_times','compset_entries','call_around_logs','daily_logs','no_shows','room_moves','bank_counts','attenda_fees','payout_ledger','vendors','vendor_orders','vendor_order_guide','vendor_order_items','vendor_events','vendor_expenses','position_todo_templates','position_todo_instances','position_todo_responses','kpi_pack_installs','todo_pack_installs','bouncie_connections','bouncie_devices','bouncie_locations','bouncie_trips'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_hotel ON public.%I (hotel_id)', t, t);
    END IF;
  END LOOP;
END $$ LANGUAGE plpgsql;

-- ═════════════════════════════════════════════════════════════════
-- PART 7: GRANT BASE PERMISSIONS
-- ═════════════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Restrict partners to safe columns only (financial fields hidden from anon)
DO $$
BEGIN
  IF to_regclass('public.partners') IS NOT NULL THEN
    REVOKE SELECT ON partners FROM anon, authenticated;
    GRANT SELECT (id, hotel_id, name, category, description, image_url, phone, address, hours, distance, rating, has_ordering, is_active, created_at, email, google_place_id, delivery_providers, lat, lng) ON partners TO anon, authenticated;
  END IF;
END $$ LANGUAGE plpgsql;

-- ═════════════════════════════════════════════════════════════════
-- DONE
-- ═════════════════════════════════════════════════════════════════
