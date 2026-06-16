-- Staff should only read the compset call list and input call data — only
-- hotel admins (or superadmins) can manage the competitor list / call schedule,
-- and only admins can delete logged call entries.
create or replace function public.is_hotel_admin()
returns boolean
language sql
stable
as $$
  select (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'superadmin');
$$;

drop policy if exists "compset_hotels_insert_own_hotel" on compset_hotels;
drop policy if exists "compset_hotels_update_own_hotel" on compset_hotels;
drop policy if exists "compset_hotels_delete_own_hotel" on compset_hotels;
create policy "compset_hotels_insert_admin_only" on compset_hotels
  for insert with check ((hotel_id::text = public.get_user_hotel_id() and public.is_hotel_admin()) OR public.is_superadmin());
create policy "compset_hotels_update_admin_only" on compset_hotels
  for update using ((hotel_id::text = public.get_user_hotel_id() and public.is_hotel_admin()) OR public.is_superadmin());
create policy "compset_hotels_delete_admin_only" on compset_hotels
  for delete using ((hotel_id::text = public.get_user_hotel_id() and public.is_hotel_admin()) OR public.is_superadmin());

drop policy if exists "compset_call_times_insert_own_hotel" on compset_call_times;
drop policy if exists "compset_call_times_update_own_hotel" on compset_call_times;
drop policy if exists "compset_call_times_delete_own_hotel" on compset_call_times;
create policy "compset_call_times_insert_admin_only" on compset_call_times
  for insert with check ((hotel_id::text = public.get_user_hotel_id() and public.is_hotel_admin()) OR public.is_superadmin());
create policy "compset_call_times_update_admin_only" on compset_call_times
  for update using ((hotel_id::text = public.get_user_hotel_id() and public.is_hotel_admin()) OR public.is_superadmin());
create policy "compset_call_times_delete_admin_only" on compset_call_times
  for delete using ((hotel_id::text = public.get_user_hotel_id() and public.is_hotel_admin()) OR public.is_superadmin());

-- Entries: any staff in the hotel can insert/update (logging calls), but only
-- admins can delete a logged entry.
drop policy if exists "compset_entries_delete_own_hotel" on compset_entries;
create policy "compset_entries_delete_admin_only" on compset_entries
  for delete using ((hotel_id::text = public.get_user_hotel_id() and public.is_hotel_admin()) OR public.is_superadmin());
