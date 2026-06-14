-- Attenda Multi-Tenant RLS Migration v2
-- Only for confirmed-existing tables
-- Project: bdmmstatrsenidlgjock

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
RETURNS TEXT
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'hotel_id',
    current_setting('request.jwt.claims', true)::jsonb ->> 'hotel_id',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') = 'superadmin',
    false
  );
$$;

-- 1. REQUESTS
ALTER TABLE IF EXISTS requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "requests_select_own_hotel" ON requests;
CREATE POLICY "requests_select_own_hotel" ON requests
  FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
DROP POLICY IF EXISTS "requests_insert_anon" ON requests;
CREATE POLICY "requests_insert_anon" ON requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "requests_update_own_hotel" ON requests;
CREATE POLICY "requests_update_own_hotel" ON requests
  FOR UPDATE USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 2. MESSAGES
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select_own_hotel" ON messages;
CREATE POLICY "messages_select_own_hotel" ON messages
  FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
DROP POLICY IF EXISTS "messages_insert_anon" ON messages;
CREATE POLICY "messages_insert_anon" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. STAFF ACCOUNTS — server-side API only
ALTER TABLE IF EXISTS staff_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_accounts_block_anon" ON staff_accounts;
CREATE POLICY "staff_accounts_block_anon" ON staff_accounts FOR ALL USING (false);

-- 4. PARTNERS (Nearby)
ALTER TABLE IF EXISTS partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partners_read_all" ON partners;
CREATE POLICY "partners_read_all" ON partners FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "partners_write_own_hotel" ON partners;
CREATE POLICY "partners_write_own_hotel" ON partners
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 5. SHUTTLE ROUTES
ALTER TABLE IF EXISTS shuttle_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shuttle_routes_read_all" ON shuttle_routes;
CREATE POLICY "shuttle_routes_read_all" ON shuttle_routes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shuttle_routes_write_own_hotel" ON shuttle_routes;
CREATE POLICY "shuttle_routes_write_own_hotel" ON shuttle_routes
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 6. HOTEL ROOMS
ALTER TABLE IF EXISTS hotel_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotel_rooms_read_all" ON hotel_rooms;
CREATE POLICY "hotel_rooms_read_all" ON hotel_rooms FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "hotel_rooms_write_own_hotel" ON hotel_rooms;
CREATE POLICY "hotel_rooms_write_own_hotel" ON hotel_rooms
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 7. STAFF SCHEDULES
ALTER TABLE IF EXISTS staff_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_schedules_select_own_hotel" ON staff_schedules;
CREATE POLICY "staff_schedules_select_own_hotel" ON staff_schedules
  FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
DROP POLICY IF EXISTS "staff_schedules_write_own_hotel" ON staff_schedules;
CREATE POLICY "staff_schedules_write_own_hotel" ON staff_schedules
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 8. HOTELS — public read, superadmin write
ALTER TABLE IF EXISTS hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotels_read_anon" ON hotels;
CREATE POLICY "hotels_read_anon" ON hotels FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "hotels_write_superadmin" ON hotels;
CREATE POLICY "hotels_write_superadmin" ON hotels FOR ALL USING (public.is_superadmin());

-- 9. STAFF CHECKLISTS
ALTER TABLE IF EXISTS staff_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_checklists_own_hotel" ON staff_checklists;
CREATE POLICY "staff_checklists_own_hotel" ON staff_checklists
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 10. STAFF CHECKLIST INSTANCES
ALTER TABLE IF EXISTS staff_checklist_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_instances_own_hotel" ON staff_checklist_instances;
CREATE POLICY "checklist_instances_own_hotel" ON staff_checklist_instances
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 11. CRUISE SCHEDULES
ALTER TABLE IF EXISTS cruise_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cruise_schedules_own_hotel" ON cruise_schedules;
CREATE POLICY "cruise_schedules_own_hotel" ON cruise_schedules
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 12. WEEKLY FORECASTS
ALTER TABLE IF EXISTS weekly_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weekly_forecasts_own_hotel" ON weekly_forecasts;
CREATE POLICY "weekly_forecasts_own_hotel" ON weekly_forecasts
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 13. SUPERADMIN CONFIG
ALTER TABLE IF EXISTS superadmin_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin_config_self" ON superadmin_config;
CREATE POLICY "superadmin_config_self" ON superadmin_config FOR ALL USING (public.is_superadmin());

-- 14. SHUTTLE BOOKINGS
ALTER TABLE IF EXISTS shuttle_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shuttle_bookings_own_hotel" ON shuttle_bookings;
CREATE POLICY "shuttle_bookings_own_hotel" ON shuttle_bookings
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 15. SHUTTLE REQUESTS
ALTER TABLE IF EXISTS shuttle_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shuttle_requests_own_hotel" ON shuttle_requests;
CREATE POLICY "shuttle_requests_own_hotel" ON shuttle_requests
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 16. QR CODES
ALTER TABLE IF EXISTS qr_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qr_codes_own_hotel" ON qr_codes;
CREATE POLICY "qr_codes_own_hotel" ON qr_codes
  FOR ALL USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- 17. REVIEWS (guest reviews)
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_insert_anon" ON reviews;
CREATE POLICY "reviews_insert_anon" ON reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "reviews_select_own_hotel" ON reviews;
CREATE POLICY "reviews_select_own_hotel" ON reviews
  FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());