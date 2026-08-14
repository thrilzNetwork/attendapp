-- ══════════════════════════════════════════════════════════════
--  Attenda Hub Architecture — Migration V1.0
--  NEW TABLES ONLY — zero changes to existing tables/RLS/policies.
--  Safe to run on live DB — existing app keeps working.
-- ══════════════════════════════════════════════════════════════

-- ═══ 1. Hubs definition (per hotel) ═══════════════════════════
CREATE TABLE IF NOT EXISTS public.hubs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  name            text NOT NULL,
  icon            text NOT NULL DEFAULT '📋',
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  tools           jsonb NOT NULL DEFAULT '[]'::jsonb,
  dashboard_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_hubs_hotel ON public.hubs(hotel_id);

-- ═══ 2. Hub assignments (staff → hub, many-to-many) ═════════
CREATE TABLE IF NOT EXISTS public.hub_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  staff_id     uuid NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  hub_id       uuid NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  assigned_by  uuid REFERENCES public.staff_accounts(id),
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, hub_id)
);
CREATE INDEX IF NOT EXISTS idx_hub_assignments_hotel ON public.hub_assignments(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hub_assignments_staff ON public.hub_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_hub_assignments_hub ON public.hub_assignments(hub_id);

-- ═══ 3. Room status (housekeeping) ═══════════════════════════
CREATE TABLE IF NOT EXISTS public.room_status (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_number   text NOT NULL,
  status        text NOT NULL DEFAULT 'dirty' CHECK (status IN ('clean','dirty','inspected','out_of_order')),
  cleaned_by    text,
  cleaned_at    timestamptz,
  inspected_by  text,
  inspected_at  timestamptz,
  notes         text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, room_number)
);
CREATE INDEX IF NOT EXISTS idx_room_status_hotel ON public.room_status(hotel_id);
CREATE INDEX IF NOT EXISTS idx_room_status_status ON public.room_status(hotel_id, status);

-- ═══ 4. Linen counts (housekeeping) ══════════════════════════
CREATE TABLE IF NOT EXISTS public.linen_counts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  count_date  date NOT NULL DEFAULT CURRENT_DATE,
  shift       text NOT NULL DEFAULT 'AM',
  item_type   text NOT NULL,
  count       integer NOT NULL DEFAULT 0,
  par_level   integer NOT NULL DEFAULT 0,
  counted_by  text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_linen_counts_hotel ON public.linen_counts(hotel_id);
CREATE INDEX IF NOT EXISTS idx_linen_counts_date ON public.linen_counts(hotel_id, count_date);

-- ═══ 5. Meal covers (breakfast/F&B) ══════════════════════════
CREATE TABLE IF NOT EXISTS public.meal_covers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  service_date      date NOT NULL DEFAULT CURRENT_DATE,
  time_slot         text,
  guest_count       integer NOT NULL DEFAULT 0,
  leftover_portions integer NOT NULL DEFAULT 0,
  recorded_by       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meal_covers_hotel ON public.meal_covers(hotel_id);
CREATE INDEX IF NOT EXISTS idx_meal_covers_date ON public.meal_covers(hotel_id, service_date);

-- ═══ 6. Waste logs (breakfast/F&B) ═══════════════════════════
CREATE TABLE IF NOT EXISTS public.waste_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  waste_date     date NOT NULL DEFAULT CURRENT_DATE,
  item           text NOT NULL,
  quantity       integer NOT NULL DEFAULT 0,
  unit           text DEFAULT 'pcs',
  reason         text,
  estimated_cost numeric(10,2) NOT NULL DEFAULT 0,
  recorded_by    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waste_logs_hotel ON public.waste_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_date ON public.waste_logs(hotel_id, waste_date);

-- ═══ 7. Monthly spends (breakfast/F&B) ═══════════════════════
CREATE TABLE IF NOT EXISTS public.monthly_spends (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  spend_date  date NOT NULL DEFAULT CURRENT_DATE,
  category    text NOT NULL,
  amount      numeric(10,2) NOT NULL DEFAULT 0,
  vendor      text,
  notes       text,
  recorded_by text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_monthly_spends_hotel ON public.monthly_spends(hotel_id);
CREATE INDEX IF NOT EXISTS idx_monthly_spends_date ON public.monthly_spends(hotel_id, spend_date);

-- ═══ 8. F&B inventory ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.fnb_inventory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  item_name       text NOT NULL,
  par_level       integer NOT NULL DEFAULT 0,
  current_count   integer NOT NULL DEFAULT 0,
  unit            text DEFAULT 'pcs',
  order_needed    boolean NOT NULL DEFAULT false,
  last_counted_by text,
  last_counted_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, item_name)
);
CREATE INDEX IF NOT EXISTS idx_fnb_inventory_hotel ON public.fnb_inventory(hotel_id);

-- ═══ 9. Work orders (maintenance) ════════════════════════════
CREATE TABLE IF NOT EXISTS public.work_orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  location    text NOT NULL,
  issue       text NOT NULL,
  priority    text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','cancelled')),
  assigned_to text,
  parts_used  text,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_work_orders_hotel ON public.work_orders(hotel_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(hotel_id, status);

-- ═══ 10. Incident logs (security) ════════════════════════════
CREATE TABLE IF NOT EXISTS public.incident_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  type         text NOT NULL,
  location     text,
  description  text NOT NULL,
  action_taken text,
  reported_by  text,
  resolved     boolean NOT NULL DEFAULT false,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incident_logs_hotel ON public.incident_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_incident_logs_date ON public.incident_logs(hotel_id, incident_date);

-- ═══ 11. Patrol logs (security) ══════════════════════════════
CREATE TABLE IF NOT EXISTS public.patrol_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  patrol_date   date NOT NULL DEFAULT CURRENT_DATE,
  checkpoint    text NOT NULL,
  check_time    timestamptz,
  status        text NOT NULL DEFAULT 'checked' CHECK (status IN ('checked','skipped','issue_found')),
  notes         text,
  officer_name  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patrol_logs_hotel ON public.patrol_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_patrol_logs_date ON public.patrol_logs(hotel_id, patrol_date);

-- ═══ 12. Realtime publication ════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.hubs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.linen_counts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_covers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waste_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_spends;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fnb_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patrol_logs;

-- ═══ 13. RLS policies (same pattern as all other tables) ═════
DO $fix$
DECLARE
  t text;
  hub_tables text[] := ARRAY[
    'hubs','hub_assignments','room_status','linen_counts',
    'meal_covers','waste_logs','monthly_spends','fnb_inventory',
    'work_orders','incident_logs','patrol_logs'
  ];
BEGIN
  FOREACH t IN ARRAY hub_tables LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin())', t || '_select', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.role() = ''authenticated'' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()))', t || '_insert', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.role() = ''authenticated'' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()))', t || '_update', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (auth.role() = ''authenticated'' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()))', t || '_delete', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping %: %', t, SQLERRM;
    END;
  END LOOP;
END $fix$;

-- ═══ 14. Seed default hubs + auto-assign staff ═══════════════
DO $seed$
DECLARE
  h record;
  hotel_id_val uuid;
BEGIN
  FOR hotel_id_val IN SELECT id FROM public.hotels LOOP
    -- Front Desk Hub
    INSERT INTO public.hubs (hotel_id, slug, name, icon, sort_order, tools, dashboard_config)
    VALUES (hotel_id_val, 'front_desk', 'Front Desk', '🛎️', 1,
      '["recap","checklists","schedule","assistant","call_around","daily_logs","no_shows","room_moves","bank_count","orders","shuttle","compset"]'::jsonb,
      '{"stats":["requests_today","pending_now","staff_on_duty","occupancy_pct"]}'::jsonb)
    ON CONFLICT (hotel_id, slug) DO NOTHING;

    -- Housekeeping Hub
    INSERT INTO public.hubs (hotel_id, slug, name, icon, sort_order, tools, dashboard_config)
    VALUES (hotel_id_val, 'housekeeping', 'Housekeeping', '🧹', 2,
      '["room_status","linen_counts","checklists","schedule"]'::jsonb,
      '{"stats":["rooms_cleaned","rooms_pending","staff_on_duty"]}'::jsonb)
    ON CONFLICT (hotel_id, slug) DO NOTHING;

    -- Breakfast / F&B Hub
    INSERT INTO public.hubs (hotel_id, slug, name, icon, sort_order, tools, dashboard_config)
    VALUES (hotel_id_val, 'breakfast', 'Breakfast & F&B', '🍳', 3,
      '["meal_covers","waste_log","monthly_spend","fnb_inventory","checklists"]'::jsonb,
      '{"stats":["covers_today","waste_mtd","spend_mtd","low_stock_alerts"]}'::jsonb)
    ON CONFLICT (hotel_id, slug) DO NOTHING;

    -- Maintenance Hub
    INSERT INTO public.hubs (hotel_id, slug, name, icon, sort_order, tools, dashboard_config)
    VALUES (hotel_id_val, 'maintenance', 'Maintenance', '🔧', 4,
      '["work_orders","checklists"]'::jsonb,
      '{"stats":["open_tickets","urgent_tickets","resolved_today"]}'::jsonb)
    ON CONFLICT (hotel_id, slug) DO NOTHING;

    -- Security Hub
    INSERT INTO public.hubs (hotel_id, slug, name, icon, sort_order, tools, dashboard_config)
    VALUES (hotel_id_val, 'security', 'Security', '🛡️', 5,
      '["incident_log","patrol_log","checklists"]'::jsonb,
      '{"stats":["incidents_today","open_incidents","patrols_completed"]}'::jsonb)
    ON CONFLICT (hotel_id, slug) DO NOTHING;

    -- Drivers Hub
    INSERT INTO public.hubs (hotel_id, slug, name, icon, sort_order, tools, dashboard_config)
    VALUES (hotel_id_val, 'drivers', 'Drivers', '🚐', 6,
      '["shuttle","bouncie","schedule"]'::jsonb,
      '{"stats":["routes_today","passengers_today","on_time_pct"]}'::jsonb)
    ON CONFLICT (hotel_id, slug) DO NOTHING;

    -- Management Hub
    INSERT INTO public.hubs (hotel_id, slug, name, icon, sort_order, tools, dashboard_config)
    VALUES (hotel_id_val, 'management', 'Management', '👔', 7,
      '["revenue","reports","kpis","forecast","staff_mgmt","culture","callouts","all_hubs"]'::jsonb,
      '{"stats":["occupancy_pct","adr","revpar","requests_today"]}'::jsonb)
    ON CONFLICT (hotel_id, slug) DO NOTHING;
  END LOOP;

  -- Auto-assign staff to hubs based on department
  FOR h IN SELECT id, hotel_id, department, role FROM public.staff_accounts WHERE active = true LOOP
    BEGIN
      IF h.role IN ('superadmin','owner') THEN
        -- Superadmins/owners get all hubs
        INSERT INTO public.hub_assignments (hotel_id, staff_id, hub_id)
        SELECT h.hotel_id, h.id, hubs.id FROM public.hubs WHERE hubs.hotel_id = h.hotel_id
        ON CONFLICT (staff_id, hub_id) DO NOTHING;
      ELSIF h.role IN ('admin','manager') THEN
        -- Admins/managers get Management hub + their department hub
        INSERT INTO public.hub_assignments (hotel_id, staff_id, hub_id)
        SELECT h.hotel_id, h.id, hubs.id FROM public.hubs
        WHERE hubs.hotel_id = h.hotel_id AND hubs.slug IN ('management', COALESCE(h.department, 'front_desk'))
        ON CONFLICT (staff_id, hub_id) DO NOTHING;
      ELSE
        -- Staff get only their department hub
        INSERT INTO public.hub_assignments (hotel_id, staff_id, hub_id)
        SELECT h.hotel_id, h.id, hubs.id FROM public.hubs
        WHERE hubs.hotel_id = h.hotel_id AND hubs.slug = COALESCE(h.department, 'front_desk')
        ON CONFLICT (staff_id, hub_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip assign %: %', h.id, SQLERRM;
    END;
  END LOOP;
END $seed$;

-- ═══ 15. updated_at triggers for tables that need it ═════════
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_room_status_updated ON public.room_status;
CREATE TRIGGER trg_room_status_updated BEFORE UPDATE ON public.room_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_fnb_inventory_updated ON public.fnb_inventory;
CREATE TRIGGER trg_fnb_inventory_updated BEFORE UPDATE ON public.fnb_inventory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_work_orders_updated ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();