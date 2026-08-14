-- ══════════════════════════════════════════════════════════════
--  Attenda AI Agent System — Migration V1.0
--  ElevenLabs-powered voice agents per hotel
-- ══════════════════════════════════════════════════════════════

-- ═══ 1. Agent configs (per hotel) ════════════════════════════
CREATE TABLE IF NOT EXISTS public.agent_configs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          uuid NOT NULL UNIQUE REFERENCES public.hotels(id) ON DELETE CASCADE,
  elevenlabs_agent_id text,          -- ElevenLabs agent ID
  is_active         boolean NOT NULL DEFAULT false,
  is_premium        boolean NOT NULL DEFAULT false,  -- premium feature flag
  voice_id          text DEFAULT '21m00Tcm4TlvDq8ikWAM',  -- default voice (Rachel)
  first_message     text DEFAULT 'Hello! This is the front desk. How can I help you today?',
  system_prompt     text DEFAULT 'You are a helpful hotel front desk agent. Answer guest questions about the hotel, log requests, and escalate urgent matters to staff.',
  knowledge_base    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- hotel-specific info
  tools_enabled     jsonb NOT NULL DEFAULT '["create_request","get_hotel_info","check_shuttle","escalate_to_staff"]'::jsonb,
  max_duration_seconds integer DEFAULT 300,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_configs_hotel ON public.agent_configs(hotel_id);

-- ═══ 2. Agent calls log ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.agent_calls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  caller_name     text,
  caller_room     text,
  caller_phone    text,
  conversation_id text,              -- ElevenLabs conversation ID
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','escalated','missed')),
  transcript      text,
  duration_seconds integer DEFAULT 0,
  request_created boolean NOT NULL DEFAULT false,
  request_id      uuid,
  escalated       boolean NOT NULL DEFAULT false,
  escalated_to    text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz
);
CREATE INDEX IF NOT EXISTS idx_agent_calls_hotel ON public.agent_calls(hotel_id);
CREATE INDEX IF NOT EXISTS idx_agent_calls_status ON public.agent_calls(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_calls_started ON public.agent_calls(hotel_id, started_at DESC);

-- ═══ 3. Agent requests (created by agent) ════════════════════
CREATE TABLE IF NOT EXISTS public.agent_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  call_id         uuid REFERENCES public.agent_calls(id),
  request_type    text NOT NULL CHECK (request_type IN ('towels','cleaning','maintenance','shuttle','wake_up','amenity','food','other')),
  room_number     text,
  guest_name      text,
  description     text NOT NULL,
  priority        text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  assigned_to     text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_agent_requests_hotel ON public.agent_requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_agent_requests_status ON public.agent_requests(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_requests_type ON public.agent_requests(hotel_id, request_type);

-- ═══ 4. Realtime ═════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_requests;

-- ═══ 5. RLS ══════════════════════════════════════════════════
DO $fix$
DECLARE
  t text;
  agent_tables text[] := ARRAY['agent_configs','agent_calls','agent_requests'];
BEGIN
  FOREACH t IN ARRAY agent_tables LOOP
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

-- ═══ 6. updated_at trigger ═══════════════════════════════════
DROP TRIGGER IF EXISTS trg_agent_configs_updated ON public.agent_configs;
CREATE TRIGGER trg_agent_configs_updated BEFORE UPDATE ON public.agent_configs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();