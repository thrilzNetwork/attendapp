-- Add hire_date, pto_used, min_hours, and employment_type columns to staff_accounts
alter table staff_accounts add column if not exists hire_date text default '';
alter table staff_accounts add column if not exists pto_used integer default 0;
alter table staff_accounts add column if not exists min_hours integer default 0;
alter table staff_accounts add column if not exists employment_type text default 'full_time';