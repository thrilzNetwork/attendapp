-- Fix get_user_hotel_id() to fall back to staff_accounts table
-- when the JWT doesn't have hotel_id in its claims.
-- This fixes RLS for staff accounts that authenticate via email/password
-- (their JWT has sub but not user_metadata.hotel_id).

CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
RETURNS TEXT
LANGUAGE plpgsql STABLE AS $$
DECLARE
  jwt_hotel_id TEXT;
  user_id UUID;
  staff_hotel_id TEXT;
BEGIN
  -- Try JWT claims first (superadmin, vendor tokens have this)
  jwt_hotel_id := COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'hotel_id',
    current_setting('request.jwt.claims', true)::jsonb ->> 'hotel_id'
  );
  
  IF jwt_hotel_id IS NOT NULL AND jwt_hotel_id != '' THEN
    RETURN jwt_hotel_id;
  END IF;
  
  -- Fallback: look up the user's hotel_id from staff_accounts
  -- Staff accounts authenticate via email/password — their JWT has
  -- sub (the user UUID) but not user_metadata.hotel_id.
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
