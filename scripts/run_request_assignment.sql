-- Run this in Supabase Dashboard SQL Editor
-- Adds assigned_to column for staff ticket workflow
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assigned_to text;
CREATE INDEX IF NOT EXISTS idx_requests_assigned ON public.requests(assigned_to);
