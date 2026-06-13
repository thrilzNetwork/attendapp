-- Add assigned_to column to requests table
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assigned_to text;

-- Add index for assignment lookups
CREATE INDEX IF NOT EXISTS idx_requests_assigned ON public.requests(assigned_to);
