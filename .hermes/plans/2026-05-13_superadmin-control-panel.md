# Super Admin Control Panel — Full Power + Health Dashboard

**Date:** May 13, 2026
**Status:** Plan — awaiting approval

---

## Current State

Super Admin page has: create hotel, list hotels with copy URLs. Nothing else. No delete, no edit, no metrics, no revenue, no health overview. The admin has zero visibility into what's happening across properties.

---

## Goal

Super Admin sees every property's health and revenue, can modify any tenant setting, override privileges, activate Clover manually, delete unwanted properties, and offer support when something breaks. One dashboard. Full control.

---

## Step-by-Step

### Step 1: Build Property Health/Performance API

**New file: `src/app/api/hotel-health/route.ts`**

Returns per-hotel metrics from Supabase:

```
GET → { health: [{ slug, name, roomCount, metrics: { 
  requestsToday, requestsWeek, ordersToday, revenue, 
  activeGuests, staffCount, partnerCount, cloverEnabledPartners,
  lastActivity } }] }
```

Queries: count from `requests` table (today/week), sum from `attenda_fees` (revenue), count active partners, check `clover_enabled`.

### Step 2: Add Delete Hotel Capability

**File: `src/lib/supabase.ts`**

```ts
export async function deleteHotel(id: string) {
  // Cascade: delete partners, menu_items, qr_codes, requests, staff_accounts
  await supabase.from('partner_menu_items').delete().eq('partner_id', 
    supabase.from('partners').select('id').eq('hotel_id', id).then(r => r.data?.map(p => p.id))
  );
  await supabase.from('partners').delete().eq('hotel_id', id);
  await supabase.from('qr_codes').delete().eq('hotel_id', id);
  await supabase.from('requests').delete().eq('hotel_id', id);
  await supabase.from('messages').delete().eq('hotel_id', id);
  await supabase.from('staff_accounts').delete().eq('hotel_id', id);
  await supabase.from('attenda_fees').delete().eq('hotel_id', id);
  await supabase.from('hotels').delete().eq('id', id);
}
```

Add `deleteHotel` to superadmin imports.

### Step 3: Add Toggle/Override Functions

**File: `src/lib/supabase.ts`**

```ts
export async function toggleCloverForPartner(partnerId: string, enabled: boolean) {
  await supabase.from('partners').update({ clover_enabled: enabled }).eq('id', partnerId);
}

export async function togglePartnerOrdering(partnerId: string, enabled: boolean) {
  await supabase.from('partners').update({ has_ordering: enabled }).eq('id', partnerId);
}

export async function toggleHotelActive(hotelId: string, active: boolean) {
  await supabase.from('hotels').update({ is_active: active }).eq('id', hotelId);
}
```

### Step 4: Rebuild Hotel List Cards — Full Property View

**File: `src/app/superadmin/page.tsx`** — Replace the simple URL-only cards

Each property card becomes an expandable panel showing:

```
┌──────────────────────────────────────────────────────┐
│ 🏨 Miami Airport Hotel  @miami-airport              │
│ 80 rooms · 3 staff · 12 partners · 2 Clover         │
│ ┌──────┬──────┬──────┬──────┬──────┐                │
│ │Orders│Reqs  │Rev   │Guests│Active│                │
│ │  23  │  47  │ $69  │  12  │  ✅  │                │
│ └──────┴──────┴──────┴──────┴──────┘                │
│                                                      │
│ [View Details] [Edit Settings] [🔗 Links]            │
│ [🗑 Delete] [Toggle Active]                          │
│                                                      │
│ ▼ Details expanded:                                  │
│   Partners list with Clover toggles                  │
│   Staff list                                         │
│   Recent orders/requests                             │
│   Revenue breakdown                                  │
└──────────────────────────────────────────────────────┘
```

### Step 5: Build Platform Health Dashboard (Top)

**File: `src/app/superadmin/page.tsx`** — Replace 3 static stat cards

```
┌──────────────────────────────────────────────────────┐
│ PLATFORM HEALTH                                      │
│ ┌────────┬────────┬────────┬────────┬────────┐      │
│ │Hotels  │Orders  │Revenue │Guests  │Status  │      │
│ │   3    │  156   │ $468   │  42    │  ✅    │      │
│ └────────┴────────┴────────┴────────┴────────┘      │
│                                                      │
│ Total partners: 36 · Clover enabled: 4               │
│ Active today: 12 guests across 3 properties          │
└──────────────────────────────────────────────────────┘
```

Aggregated from `/api/hotel-health` across all properties.

### Step 6: Add Quick Actions to Each Property

Per property card, add action buttons:

| Action | What It Does |
|--------|-------------|
| **View Details** | Expands full property profile with all data |
| **Edit Settings** | Opens staff dashboard for that hotel (deep link: `/staff?hotel=slug`) |
| **Copy Links** | Shows guest + admin URLs |
| **Toggle Active** | Activate/deactivate entire property (stops guest access) |
| **Delete** | Confirmation modal → cascade delete all data |
| **Override Clover** | Quick toggle Clover on any partner from superadmin |

### Step 7: Add Revenue Tracker

**New Supabase view or query in health API:**

Sum `attenda_fees` grouped by hotel → show per-property and platform total.

Show: monthly revenue, lifetime revenue, pending fees vs settled.

### Step 8: Build & Deploy

```bash
npm run build && vercel --prod --yes
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/superadmin/page.tsx` | Full rebuild — health stats, expandable cards, actions, delete |
| `src/lib/supabase.ts` | Add `deleteHotel`, `toggleCloverForPartner`, `togglePartnerOrdering`, `toggleHotelActive` |
| `src/app/api/hotel-health/route.ts` | **New** — aggregated metrics API |

---

## Cost: $0

All data from existing Supabase tables. No new services. Purely querying what we already have.
