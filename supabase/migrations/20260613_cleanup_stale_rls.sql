-- Drop stale permissive policies that bypass RLS
-- These are old "Anyone can..." policies still allowing anon key access
-- The new per-hotel policies from 20260613_multitenant_rls_v2.sql remain

-- call_around_logs
DROP POLICY IF EXISTS "Anyone can delete call_around_logs" ON call_around_logs;
DROP POLICY IF EXISTS "Anyone can insert call_around_logs" ON call_around_logs;
DROP POLICY IF EXISTS "Anyone can read call_around_logs" ON call_around_logs;
DROP POLICY IF EXISTS "Anyone can update call_around_logs" ON call_around_logs;

-- daily_logs
DROP POLICY IF EXISTS "Anyone can delete daily_logs" ON daily_logs;
DROP POLICY IF EXISTS "Anyone can insert daily_logs" ON daily_logs;
DROP POLICY IF EXISTS "Anyone can read daily_logs" ON daily_logs;
DROP POLICY IF EXISTS "Anyone can update daily_logs" ON daily_logs;

-- hotel_knowledge_base
DROP POLICY IF EXISTS default_select ON hotel_knowledge_base;
DROP POLICY IF EXISTS knowledge_base_select ON hotel_knowledge_base;
DROP POLICY IF EXISTS sel ON hotel_knowledge_base;

-- shuttle_bookings (keep: shuttle_bookings_own_hotel)
DROP POLICY IF EXISTS "Anyone can insert bookings" ON shuttle_bookings;
DROP POLICY IF EXISTS "Anyone can manage bookings" ON shuttle_bookings;
DROP POLICY IF EXISTS "Anyone can read bookings" ON shuttle_bookings;
DROP POLICY IF EXISTS default_select ON shuttle_bookings;
DROP POLICY IF EXISTS sel ON shuttle_bookings;
DROP POLICY IF EXISTS shuttle_bookings_insert ON shuttle_bookings;

-- shuttle_slots
DROP POLICY IF EXISTS "Anyone can manage slots" ON shuttle_slots;
DROP POLICY IF EXISTS "Anyone can read slots" ON shuttle_slots;
DROP POLICY IF EXISTS default_select ON shuttle_slots;
DROP POLICY IF EXISTS sel ON shuttle_slots;
DROP POLICY IF EXISTS shuttle_slots_select ON shuttle_slots;

-- cruise_schedules (keep: cruise_schedules_own_hotel)
DROP POLICY IF EXISTS "Authenticated insert cruise_schedules" ON cruise_schedules;
DROP POLICY IF EXISTS "Authenticated update cruise_schedules" ON cruise_schedules;
DROP POLICY IF EXISTS "Public read cruise_schedules" ON cruise_schedules;
DROP POLICY IF EXISTS cruise_schedules_select ON cruise_schedules;
DROP POLICY IF EXISTS default_select ON cruise_schedules;
DROP POLICY IF EXISTS sel ON cruise_schedules;

-- hotel_rooms (keep: hotel_rooms_read_all, hotel_rooms_write_own_hotel)
DROP POLICY IF EXISTS "Anyone can delete hotel rooms" ON hotel_rooms;
DROP POLICY IF EXISTS "Anyone can insert hotel rooms" ON hotel_rooms;
DROP POLICY IF EXISTS "Anyone can read hotel rooms" ON hotel_rooms;
DROP POLICY IF EXISTS hotel_rooms_select ON hotel_rooms;
DROP POLICY IF EXISTS sel ON hotel_rooms;

-- hotels (keep: hotels_read_anon, hotels_write_superadmin)
DROP POLICY IF EXISTS "Anyone can delete hotels" ON hotels;
DROP POLICY IF EXISTS "Anyone can insert hotels" ON hotels;
DROP POLICY IF EXISTS "Anyone can read hotels" ON hotels;
DROP POLICY IF EXISTS "Anyone can update hotels" ON hotels;
DROP POLICY IF EXISTS anon_all_hotels ON hotels;
DROP POLICY IF EXISTS hotels_insert ON hotels;
DROP POLICY IF EXISTS hotels_select ON hotels;
DROP POLICY IF EXISTS hotels_select_anon ON hotels;
DROP POLICY IF EXISTS hotels_update ON hotels;

-- messages (keep: messages_insert_anon, messages_select_own_hotel)
DROP POLICY IF EXISTS "Anyone can insert messages" ON messages;
DROP POLICY IF EXISTS "Anyone can read messages" ON messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON messages;
DROP POLICY IF EXISTS "Public insert messages" ON messages;
DROP POLICY IF EXISTS "Public read messages" ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS messages_update ON messages;

-- partners (keep: partners_read_all, partners_write_own_hotel)
DROP POLICY IF EXISTS "Anyone can delete partners" ON partners;
DROP POLICY IF EXISTS "Anyone can insert partners" ON partners;
DROP POLICY IF EXISTS "Anyone can read partners" ON partners;
DROP POLICY IF EXISTS "Anyone can update partners" ON partners;
DROP POLICY IF EXISTS partners_insert ON partners;
DROP POLICY IF EXISTS partners_select ON partners;
DROP POLICY IF EXISTS partners_update ON partners;

-- qr_codes (keep: qr_codes_own_hotel)
DROP POLICY IF EXISTS "Anyone can delete qr_codes" ON qr_codes;
DROP POLICY IF EXISTS "Anyone can insert qr_codes" ON qr_codes;
DROP POLICY IF EXISTS "Anyone can read qr_codes" ON qr_codes;
DROP POLICY IF EXISTS qr_codes_select ON qr_codes;
DROP POLICY IF EXISTS sel ON qr_codes;

-- requests (keep: requests_insert_anon, requests_select_own_hotel, requests_update_own_hotel)
DROP POLICY IF EXISTS "Public insert requests" ON requests;
DROP POLICY IF EXISTS "Public read requests" ON requests;
DROP POLICY IF EXISTS "Public update requests" ON requests;
DROP POLICY IF EXISTS requests_delete ON requests;
DROP POLICY IF EXISTS requests_insert ON requests;
DROP POLICY IF EXISTS requests_update ON requests;

-- reviews (keep: reviews_insert_anon, reviews_select_own_hotel)
DROP POLICY IF EXISTS "Public insert reviews" ON reviews;
DROP POLICY IF EXISTS "Public read reviews" ON reviews;

-- shuttle_requests (keep: shuttle_requests_own_hotel)
DROP POLICY IF EXISTS "Anyone can insert shuttle requests" ON shuttle_requests;
DROP POLICY IF EXISTS "Anyone can manage shuttle requests" ON shuttle_requests;
DROP POLICY IF EXISTS "Anyone can read shuttle requests" ON shuttle_requests;
DROP POLICY IF EXISTS "Anyone can update shuttle requests" ON shuttle_requests;
DROP POLICY IF EXISTS default_select ON shuttle_requests;
DROP POLICY IF EXISTS sel ON shuttle_requests;
DROP POLICY IF EXISTS shuttle_requests_insert ON shuttle_requests;

-- shuttle_routes (keep: shuttle_routes_read_all, shuttle_routes_write_own_hotel)
DROP POLICY IF EXISTS "Anyone can manage routes" ON shuttle_routes;
DROP POLICY IF EXISTS "Anyone can read routes" ON shuttle_routes;
DROP POLICY IF EXISTS default_select ON shuttle_routes;
DROP POLICY IF EXISTS sel ON shuttle_routes;
DROP POLICY IF EXISTS shuttle_routes_select ON shuttle_routes;

-- staff_checklist_instances (keep: checklist_instances_own_hotel)
DROP POLICY IF EXISTS anon_all_staff_checklist_instances ON staff_checklist_instances;
DROP POLICY IF EXISTS default_select ON staff_checklist_instances;
DROP POLICY IF EXISTS sel ON staff_checklist_instances;

-- staff_checklists (keep: staff_checklists_own_hotel)
DROP POLICY IF EXISTS anon_all_staff_checklists ON staff_checklists;
DROP POLICY IF EXISTS default_select ON staff_checklists;
DROP POLICY IF EXISTS sel ON staff_checklists;

-- staff_schedules (keep: staff_schedules_select_own_hotel, staff_schedules_write_own_hotel)
DROP POLICY IF EXISTS anon_all_staff_schedules ON staff_schedules;
DROP POLICY IF EXISTS default_select ON staff_schedules;
DROP POLICY IF EXISTS sel ON staff_schedules;

-- superadmin_config (keep: superadmin_config_insert_once, superadmin_config_owner_write, superadmin_config_self)
DROP POLICY IF EXISTS superadmin_block ON superadmin_config;
DROP POLICY IF EXISTS superadmin_insert ON superadmin_config;
DROP POLICY IF EXISTS superadmin_select ON superadmin_config;

-- staff_accounts (keep: staff_accounts_block_anon)
DROP POLICY IF EXISTS staff_accounts_block ON staff_accounts;

-- weekly_forecasts (keep: weekly_forecasts_own_hotel)
DROP POLICY IF EXISTS "Hotel staff can manage forecasts" ON weekly_forecasts;
DROP POLICY IF EXISTS "Users can read their hotel forecasts" ON weekly_forecasts;
DROP POLICY IF EXISTS default_select ON weekly_forecasts;
DROP POLICY IF EXISTS sel ON weekly_forecasts;