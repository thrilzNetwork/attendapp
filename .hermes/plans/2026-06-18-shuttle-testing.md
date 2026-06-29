# Attenda Shuttle Testing & Hardening Plan

> **For Hermes:** Use subagent-driven-development skill to implement fixes. Testing is manual via browser.

**Goal:** Test the shuttle booking flow end-to-end — guest books a slot, staff sees the booking, full slots are blocked. Identify and fix any gaps in capacity enforcement, real-time updates, or race conditions.

**Architecture:** Guest books via `transport/page.tsx` → `bookShuttleSlot()` in `supabase.ts` → row in `shuttle_bookings` table. Staff views via `ShuttleView.tsx` → `getShuttleBookings(slotId)` → expandable list per slot. Capacity tracked via `bookings_count` computed in `getAllShuttleSlotsForHotel`.

**Tech Stack:** Next.js 14, Supabase, TypeScript, Tailwind

---

## Current State (from code inspection)

### What already works
- **Staff ShuttleView** has 3 tabs: Today's Runs (expandable bookings per slot), Requests (custom rides), Setup (schedule wizard)
- **SlotRow** component: expands to show all bookings, staff can add guests or cancel bookings, capacity bar with color coding (green → yellow → red)
- **Guest transport page**: Airport/Cruise tabs show slots grouped by day, "Full" badge replaces Book button when `bookings_count >= capacity`
- **`getAllShuttleSlotsForHotel`**: computes `bookings_count` via a subquery count of active (non-cancelled) bookings
- **`bookShuttleSlot`**: inserts into `shuttle_bookings`, sets `charge_accepted` and `price_charged`
- **`cancelShuttleBooking`**: sets `status = 'cancelled'` (soft delete)

### Potential gaps to test
1. **Race condition**: Guest opens booking form when 7/8 spots filled, another guest books #8, first guest still sees form and clicks Confirm — does server-side enforce capacity?
2. **Real-time updates**: After guest books, does staff see it without manual refresh? (No subscription on staff side — only polls on expand)
3. **Capacity enforcement on staff add**: Staff "Add Guest" button is gated by `!isFull` client-side, but no server-side check in `bookShuttleSlot`
4. **Guest booking form**: "Confirm" button disabled when `pricePer > 0 && !charge_accepted` — but no capacity re-check before submitting
5. **Cruise Port tab**: Uses same `bookShuttleSlot` but filters slots to `route_type === 'airport'` — cruise-specific slots may not appear

---

## Task 1: Set up test shuttle schedule at BW Fort Lauderdale

**Objective:** Create a real shuttle route with time slots so we can test booking.

**Method:** Use the staff UI at `attendaapp.com/staff` → Shuttle → Setup tab.

**Steps:**
1. Log into staff dashboard as superadmin (`thrilznetwork@gmail.com`)
2. Navigate to Shuttle → Setup tab
3. Create schedule:
   - Name: "Airport Shuttle Test"
   - Type: Airport
   - Start: 08:00, End: 20:00, Every 60 min
   - Days: All 7
   - Capacity: **4** (small so we can test fullness quickly)
   - Price: $0 (complimentary, simpler test)
4. Verify slots appear in "Today's Runs" tab

**Verification:** 13 time slots visible (08:00–20:00), each showing "0/4 pax"

---

## Task 2: Test guest booking flow — happy path

**Objective:** Verify a guest can book an open slot and see confirmation.

**Steps:**
1. Open `attendaapp.com/transport?hotel=fort-lauderdale-airport-cruise-port` in a new browser session (incognito/clean)
2. Airport Shuttle tab should show today's slots grouped by day
3. Click "Book" on an open slot (e.g. 10:00 AM, 0/4)
4. Fill form: Name "Test Guest", Room "101", Pax 1
5. Click "Confirm"
6. Verify: Button changes to "✓ Booked" (green badge)
7. Refresh page: slot now shows "1/4 spots"

**Verification:** Booking succeeds, UI updates, slot count increments

---

## Task 3: Test staff sees the booking

**Objective:** Verify staff can see who booked in the ShuttleView.

**Steps:**
1. In the staff dashboard (already logged in), go to Shuttle → Today's Runs
2. Find the 10:00 AM slot
3. Click to expand — should show "Test Guest · Room 101 · 1 pax"
4. Verify capacity bar updated (25% green)

**Verification:** Staff sees guest name, room, pax. Capacity bar reflects booking.

---

## Task 4: Test full slot blocking — guest side

**Objective:** Verify guests cannot book a full slot.

**Steps:**
1. As staff, add 3 more guests to the 10:00 AM slot (fill to 4/4)
2. As guest (incognito), refresh transport page
3. Verify: 10:00 AM slot shows "Full" badge instead of "Book" button
4. Clicking is impossible (no button)

**Verification:** Full slots are non-interactive for guests

---

## Task 5: Test full slot blocking — staff side

**Objective:** Verify staff cannot overbook a full slot.

**Steps:**
1. As staff, expand the now-full 10:00 AM slot
2. Verify: "Add Guest" button is NOT visible (gated by `!isFull`)
3. Try to add via browser console hack (just to confirm server-side doesn't catch it — this identifies the gap)

**Verification:** Staff UI prevents adding to full slots. If server-side doesn't reject, we note this as a gap to fix.

---

## Task 6: Test race condition (if gap found)

**Objective:** If `bookShuttleSlot` lacks server-side capacity check, add one.

**Files likely to change:**
- `src/lib/supabase.ts` — `bookShuttleSlot` function (~line 895)

**Fix (if needed):**
Add a capacity check before insert:

```tsx
// In bookShuttleSlot, before inserting:
const { data: slot } = await supabase.from('shuttle_slots').select('capacity').eq('id', slot_id).single();
const { count } = await supabase.from('shuttle_bookings')
  .select('*', { count: 'exact', head: true })
  .eq('slot_id', slot_id)
  .neq('status', 'cancelled');

if (slot?.capacity > 0 && (count || 0) >= slot.capacity) {
  return { error: 'Slot is full' };
}
```

**Verification:** Attempting to book a full slot via API returns error. Guest sees "Slot is full" message.

---

## Task 7: Test staff cancel + re-book

**Objective:** Verify cancel flow works and frees up capacity.

**Steps:**
1. As staff, cancel one booking from the full 10:00 AM slot
2. Verify: capacity drops to 3/4, "Add Guest" button reappears
3. As guest, refresh — "Book" button reappears (no longer "Full")
4. Guest books successfully

**Verification:** Cancel → capacity freed → re-booking works

---

## Task 8: Test real-time updates (identify gap)

**Objective:** Determine if staff sees new bookings without manual refresh.

**Current behavior:** `SlotRow` calls `loadBookings()` only when `open` state changes (expand). No real-time subscription.

**Gap:** Staff must collapse/re-expand a slot to see new bookings. If a booking comes in while the slot is expanded, they won't see it.

**Fix (if confirmed):**
Add a Supabase real-time subscription in `SlotRow`:

```tsx
useEffect(() => {
  if (!open) return;
  const channel = supabase
    .channel(`bookings-${slot.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shuttle_bookings', filter: `slot_id=eq.${slot.id}` }, 
      () => loadBookings())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [open, slot.id, loadBookings]);
```

**Verification:** Staff expands a slot, guest books in another window, booking appears in staff view within 1-2 seconds without manual refresh.

---

## Task 9: Test Cruise Port booking

**Objective:** Verify cruise port shuttle booking works same as airport.

**Steps:**
1. As staff, create a cruise-type route with slots (or verify existing)
2. As guest, go to Transport → Cruise Port tab
3. Verify cruise schedules appear (if any in DB)
4. Verify shuttle slots to port appear below
5. Book a slot — same flow as airport

**Verification:** Cruise booking works end-to-end

---

## Task 10: Final verification & deploy

**Steps:**
1. Run `npm run build` — must pass with 0 errors
2. If code changes were made, deploy: `vercel --prod`
3. Run through Tasks 2-7 again on production to confirm

---

## Risks & Notes

- **No server-side capacity check exists currently** — `bookShuttleSlot` does a blind insert. This is the primary gap. Task 6 fixes it.
- **No real-time subscription on staff side** — bookings only refresh on expand/collapse. Task 8 adds it.
- **Cruise tab filters to `route_type === 'airport'`** — this looks like a bug. The cruise tab should filter to `route_type === 'cruise'`. Check during Task 9.
- **Guest booking form has no capacity re-check** — if guest opens form, slot fills, they can still submit. Server-side check (Task 6) is the fix.
- **Bouncie GPS integration** — already works, not in scope for this test pass.
