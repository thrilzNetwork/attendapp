-- Breakfast vouchers: guest claim + staff redemption (shipped to prod via Management API, mirrors live state)
create table if not exists breakfast_vouchers (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id),
  guest_name text not null,
  room text not null,
  status text not null default 'active' check (status in ('active','redeemed')),
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by text
);
alter table breakfast_vouchers enable row level security;
-- guests never touch the table directly; all access via whitelisted RPCs + authenticated staff
create policy vouchers_staff_select on breakfast_vouchers for select using (auth.role() = 'authenticated');
create policy vouchers_staff_insert on breakfast_vouchers for insert with check (auth.role() = 'authenticated');
create policy vouchers_staff_update on breakfast_vouchers for update using (auth.role() = 'authenticated');
create unique index if not exists one_active_voucher_per_room
  on breakfast_vouchers (hotel_id, room) where status = 'active';

-- claim-or-return-existing: retries never duplicate; latest row wins (any status)
create or replace function guest_claim_voucher(p_hotel_id uuid, p_room text, p_guest_name text)
returns json language plpgsql security definer set search_path = public as $$
declare v breakfast_vouchers;
begin
  select * into v from breakfast_vouchers
    where hotel_id = p_hotel_id and room = p_room
    order by claimed_at desc limit 1;
  if not found then
    insert into breakfast_vouchers (hotel_id, guest_name, room)
      values (p_hotel_id, p_guest_name, p_room)
      returning * into v;
  end if;
  return to_json(v);
end $$;

create or replace function guest_voucher_status(p_hotel_id uuid, p_room text)
returns json language sql security definer set search_path = public as $$
  select coalesce(to_json(v), 'null'::json) from (
    select * from breakfast_vouchers
    where hotel_id = p_hotel_id and room = p_room
    order by claimed_at desc limit 1
  ) v
$$;

create or replace function staff_redeem_voucher(p_voucher_id uuid, p_staff text)
returns json language plpgsql security definer set search_path = public as $$
declare v breakfast_vouchers;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not allowed';
  end if;
  update breakfast_vouchers
    set status = 'redeemed', redeemed_at = now(), redeemed_by = p_staff
    where id = p_voucher_id and status = 'active'
    returning * into v;
  if not found then
    select to_json(b) into v from breakfast_vouchers b where b.id = p_voucher_id;
  end if;
  return to_json(v);
end $$;

grant execute on function guest_claim_voucher(uuid, text, text) to anon, authenticated;
grant execute on function guest_voucher_status(uuid, text) to anon, authenticated;
grant execute on function staff_redeem_voucher(uuid, text) to authenticated;

alter publication supabase_realtime add table public.breakfast_vouchers;