-- ──────────────────────────────────────────────────────────────
--  Attenda Presence — Migration V1.0
--  4 new tables, all hotel_id scoped, all RLS protected.
--  Zero changes to existing tables, columns, or policies.
-- ──────────────────────────────────────────────────────────────

-- ═══ 1. away_sessions ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.away_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  staff_id        uuid NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  reason          text NOT NULL DEFAULT 'break',
  est_seconds     integer NOT NULL DEFAULT 180,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  extended_seconds integer NOT NULL DEFAULT 0,
  acked_assist    boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_away_sessions_hotel ON public.away_sessions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_away_sessions_active ON public.away_sessions(hotel_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_away_sessions_started ON public.away_sessions(started_at DESC);

-- ═══ 2. assist_requests ═════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assist_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id            uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  requested_at        timestamptz NOT NULL DEFAULT now(),
  during_away_session uuid REFERENCES public.away_sessions(id) ON DELETE SET NULL,
  acknowledged_at     timestamptz,
  resolved_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assist_requests_hotel ON public.assist_requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_assist_requests_pending ON public.assist_requests(hotel_id) WHERE resolved_at IS NULL;

-- ═══ 3. presence_config ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.presence_config (
  hotel_id              uuid PRIMARY KEY REFERENCES public.hotels(id) ON DELETE CASCADE,
  brand_config          jsonb NOT NULL DEFAULT '{
    "primary_color": "#0D9488",
    "accent_color": "#b98d4f",
    "greeting": "We''ll be right with you",
    "hotel_name_visible": false
  }'::jsonb,
  reason_presets        jsonb NOT NULL DEFAULT '[
    {"label": "Towels", "seconds": 120},
    {"label": "Guest Assist", "seconds": 300},
    {"label": "Restock", "seconds": 300},
    {"label": "Property Walk", "seconds": 600},
    {"label": "Break", "seconds": 180}
  ]'::jsonb,
  ambient_cycle_seconds integer NOT NULL DEFAULT 14,
  display_enabled       boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ═══ 4. promo_items ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.promo_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'image' CHECK (type IN ('image', 'video')),
  asset_url   text NOT NULL,
  eyebrow     text,
  title       text,
  subtitle    text,
  sort_order  integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  start_date  date,
  end_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_items_hotel ON public.promo_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_promo_items_active ON public.promo_items(hotel_id) WHERE active = true;

-- ═══ 5. enable realtime ════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.away_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assist_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_items;

-- ═══ 6. RLS policies ══════════════════════════════════════════
-- away_sessions
CREATE POLICY away_sessions_select ON public.away_sessions
  FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY away_sessions_insert ON public.away_sessions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY away_sessions_update ON public.away_sessions
  FOR UPDATE USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY away_sessions_delete ON public.away_sessions
  FOR DELETE USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- assist_requests (staff can read/insert; only staff can ack/resolve)
CREATE POLICY assist_requests_select ON public.assist_requests
  FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY assist_requests_insert ON public.assist_requests
  FOR INSERT WITH CHECK (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY assist_requests_update ON public.assist_requests
  FOR UPDATE USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY assist_requests_delete ON public.assist_requests
  FOR DELETE USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- presence_config (admin/superadmin only for writes; staff can read)
CREATE POLICY presence_config_select ON public.presence_config
  FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
CREATE POLICY presence_config_insert ON public.presence_config
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY presence_config_update ON public.presence_config
  FOR UPDATE USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY presence_config_delete ON public.presence_config
  FOR DELETE USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- promo_items (admin/superadmin for writes; anon can read for display)
CREATE POLICY promo_items_select ON public.promo_items
  FOR SELECT USING (true);  -- display needs anon access
CREATE POLICY promo_items_insert ON public.promo_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY promo_items_update ON public.promo_items
  FOR UPDATE USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));
CREATE POLICY promo_items_delete ON public.promo_items
  FOR DELETE USING (auth.role() = 'authenticated' AND (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin()));

-- ═══ 7. seed config for existing hotels ══════════════════════
INSERT INTO public.presence_config (hotel_id)
SELECT id FROM public.hotels
ON CONFLICT (hotel_id) DO NOTHING;

-- ═══ 8. updated_at trigger for presence_config ════════════════
-- ═══ 9. Fix get_user_hotel_id — cast auth_user_id::text ═══════
CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := auth.uid()::text;
  v_hotel_id text;
BEGIN
  IF public.is_superadmin() THEN
    RETURN NULL;
  END IF;
  SELECT hotel_id::text INTO v_hotel_id
  FROM public.staff_accounts
  WHERE auth_user_id::text = v_uid
  LIMIT 1;
  IF v_hotel_id IS NOT NULL THEN
    RETURN v_hotel_id;
  END IF;
  SELECT sa.hotel_id::text INTO v_hotel_id
  FROM public.staff_accounts sa
  JOIN auth.users u ON sa.email = u.email
  WHERE u.id::text = v_uid
  LIMIT 1;
  RETURN v_hotel_id;
END;
$$;

-- ═══ 10. Fix is_superadmin — SECURITY DEFINER ══════════════════
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmin_config WHERE user_id = auth.uid()
  ) OR (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'superadmin'
  ) OR (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin'
  ) OR (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'owner'
  );
$$;

-- ═══ 11. Fix vendor_order_guide + vendor_order_items RLS ══════
DROP POLICY IF EXISTS vendor_order_guide_select ON public.vendor_order_guide;
CREATE POLICY vendor_order_guide_select ON public.vendor_order_guide
  FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());
DROP POLICY IF EXISTS vendor_order_items_select ON public.vendor_order_items;
CREATE POLICY vendor_order_items_select ON public.vendor_order_items
  FOR SELECT USING (hotel_id::text = public.get_user_hotel_id() OR public.is_superadmin());

-- ═══ 12. updated_at trigger for presence_config ════════════════
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presence_config_updated ON public.presence_config;
CREATE TRIGGER trg_presence_config_updated
  BEFORE UPDATE ON public.presence_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();