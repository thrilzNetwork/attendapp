-- Add hire_date and pto_used columns to staff_accounts
alter table staff_accounts add column if not exists hire_date text default '';
alter table staff_accounts add column if not exists pto_used integer default 0;