-- Add billing and schedule fields to hotels
alter table hotels add column if not exists payment_type text default '';
alter table hotels add column if not exists last_payment text default '';