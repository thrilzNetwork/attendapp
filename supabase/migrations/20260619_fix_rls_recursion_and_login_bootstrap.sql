-- =====================================================================
-- HOTFIX (2026-06-19): restore login + all data saving for live tenants
-- =====================================================================
-- The tenant-isolation hardening migration enabled RLS on staff_accounts.
-- That surfaced two regressions that took the live property down:
--
-- 1. INFINITE RECURSION in get_user_hotel_id().
--    The function falls back to `SELECT hotel_id FROM staff_accounts WHERE
--    id = <jwt sub>`. With RLS now enabled on staff_accounts, that internal
--    read is itself subject to the staff_accounts policy, which calls
--    get_user_hotel_id() again -> infinite recursion -> "stack depth limit
--    exceeded" on EVERY authenticated/anon query touching staff_accounts
--    (login, schedules, forecast, compset — everything).
--    Fix: mark the function SECURITY DEFINER so its internal read bypasses
--    RLS. It still only ever returns the caller's own hotel_id from their JWT.
--
-- 2. LOGIN CHICKEN-AND-EGG.
--    staff_accounts RLS requires get_user_hotel_id(), but at login the user's
--    JWT has no hotel_id yet (hotel_id is derived FROM staff_accounts), so a
--    user could not read their own row and login failed. Fix: allow an
--    authenticated user to read ONLY their own row, matched by their verified
--    JWT email. Safe (a user can only ever see their own row) and lets login
--    bootstrap the hotel_id, after which the hotel-scoped policy takes over.

CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

DROP POLICY IF EXISTS staff_accounts_read_own_email ON staff_accounts;
CREATE POLICY staff_accounts_read_own_email ON staff_accounts
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
