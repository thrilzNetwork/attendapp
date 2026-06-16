-- Add room_keys (total room count) to compset competitor hotels, set once by admin
-- so staff don't need to re-enter the competitor's total room count on every call.
alter table compset_hotels add column if not exists room_keys integer default 0;
