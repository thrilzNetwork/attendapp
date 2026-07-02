-- Drop the unique constraint on (hotel_id, name) so admins can create
-- multiple positions with the same name (e.g., "Front Desk AM" for
-- different departments or purposes).
alter table public.staff_positions
  drop constraint if exists staff_positions_hotel_id_name_key;
