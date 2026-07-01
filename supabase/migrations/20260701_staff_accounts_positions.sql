-- Add positions array column to staff_accounts for multi-position support
alter table public.staff_accounts
  add column if not exists positions text[] default '{}';

-- Update RLS to allow the column
drop policy if exists "staff_accounts_own_hotel" on public.staff_accounts;
create policy "staff_accounts_own_hotel" on public.staff_accounts
  for all
  using (
    hotel_id = (select (auth.jwt() ->> 'hotel_id')::uuid)
    or (select (auth.jwt() ->> 'role') = 'superadmin')
  )
  with check (
    hotel_id = (select (auth.jwt() ->> 'hotel_id')::uuid)
    or (select (auth.jwt() ->> 'role') = 'superadmin')
  );
