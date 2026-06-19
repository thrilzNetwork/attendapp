-- staff_accounts.role uses 'manager' (not 'admin') for hotel-level admins in
-- practice — the app's frontend normalizes both to "admin", but the JWT
-- user_metadata.role claim keeps the raw staff_accounts value. is_hotel_admin()
-- only matched 'admin'/'superadmin', so real hotel managers were blocked from
-- saving compset competitor hotels / call times by RLS. Add 'manager'.
create or replace function public.is_hotel_admin()
returns boolean
language sql
stable
as $$
  select (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'manager', 'superadmin');
$$;
