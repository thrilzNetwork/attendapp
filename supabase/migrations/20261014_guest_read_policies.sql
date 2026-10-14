-- ═══════════════════════════════════════════════════════════════════
-- APPLIED TO PROD: 2026-10-14 (ref: zhhhyrodqndeyjxveszu)
-- Guest-side RLS + realtime fixes. Symptom chain before this:
--   • hotels_select required auth.role()=authenticated + hotel claim →
--     guests (anon) read ZERO hotel rows → welcome letter fell back to
--     default maroon despite brand_color=#1D4ED8, and guest request
--     inserts saved with NULL hotel_id (invisible to property board).
--   • `requests` was NOT in the supabase_realtime publication → no
--     postgres_changes push; staff board lived on the 2.5s poll.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Guests read public hotel config (same openness as requests_select).
--    Column exposure for unauthenticated clients is governed app-side by
--    the /api/public/hotel-config whitelist (guest-safe columns only).
drop policy if exists hotels_select on public.hotels;
create policy hotels_select on public.hotels
  for select using (true);

-- 2) Realtime: INSERT/UPDATE pushes for the staff requests board.
alter publication supabase_realtime add table public.requests;

-- Verified live same-day:
--   anon hotels read by slug → 200, brand_color=#1D4ED8
--   anon insert probe + postgres_changes listener → PUSH in 0.79s
-- Existing requests policies already correct (select: true;
--   insert with check: true; update/delete: authenticated only) — no change.