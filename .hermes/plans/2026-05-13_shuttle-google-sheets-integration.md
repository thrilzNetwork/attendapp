# Shuttle Schedule — Google Sheets Integration

**Date:** May 13, 2026
**Status:** Plan — awaiting approval

---

## Current State

| What | Where | How |
|------|-------|-----|
| Guest transport requests | `/transport` page → `requests` table + email | Guest fills form → Supabase insert |
| Staff shuttle view | `/staff?tab=shuttle` | Embeds Google Sheet iframe (`googleSheetUrl` from hotel config) |
| Guest shuttle view | **Doesn't exist** | No way for guests to see the actual shuttle schedule |

### The Problem

Guest submits "Pick me up at MIA tomorrow at 3pm" → goes to Supabase + email. But:
- Staff doesn't have a shared operational view with guest requests integrated
- Guests can't see the hotel's shuttle schedule (times, routes)
- The Google Sheet is only a one-way embed (staff looks at it, nothing feeds back)

---

## Goal

One Google Sheet per hotel that serves as **the single source of truth for shuttle operations**:

1. **Staff manages** the schedule (fixed times, routes, capacity)
2. **Guests view** the schedule (when does the shuttle run to MIA/FLL?)
3. **Guest requests appear** in the sheet automatically
4. **Staff updates** status (confirmed, en route, completed)
5. **Everything is free** — Google Sheets API has generous quotas

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Google Sheet                          │
│  (hotel's operational shuttle hub)                    │
│                                                       │
│  Tab 1: SCHEDULE — fixed shuttle times                │
│  Tab 2: REQUESTS — guest transport requests (auto)    │
│  Tab 3: DRIVERS — driver assignments, contact         │
│                                                       │
│  + Apps Script deployed as Web App (POST endpoint)    │
│    Accepts: { guest, room, date, time, type, ... }    │
│    Writes to REQUESTS tab                              │
└──────────┬───────────────┬───────────────────────────┘
           │               │
           ▼               ▼
    ┌─────────────┐  ┌─────────────────┐
    │ Staff View  │  │  Guest View     │
    │ (iframe     │  │  (new tab in    │
    │  embed)     │  │   /transport    │
    │ Full sheet  │  │   or /welcome)  │
    │             │  │  Read-only      │
    │             │  │  schedule only  │
    └─────────────┘  └─────────────────┘
           │               │
           │               │
    ┌──────┴───────────────┴──────┐
    │  /api/transport-sync.ts     │
    │  (serverless function)      │
    │                             │
    │  On guest request submit:   │
    │  1. Insert to Supabase      │
    │  2. POST to Apps Script     │
    │  3. Send email notification │
    └─────────────────────────────┘
```

---

## Step-by-Step Plan

### Step 1: Create the Template Google Sheet

Create one master template sheet with this structure:

**Tab: SCHEDULE** (hotel configures, guests see)

| Day | Route | Depart Hotel | Arrive Airport | Direction |
|-----|-------|-------------|----------------|-----------|
| Mon-Sun | Hotel → MIA | 6:00 AM | 6:30 AM | Departure |
| Mon-Sun | Hotel → MIA | 8:00 AM | 8:30 AM | Departure |
| Mon-Sun | Hotel → MIA | 10:00 AM | 10:30 AM | Departure |
| ... | ... | ... | ... | ... |
| Mon-Sun | MIA → Hotel | 12:00 PM | 12:30 PM | Arrival |
| Mon-Sun | Hotel → FLL | 7:00 AM | 7:40 AM | Departure |

**Tab: REQUESTS** (auto-populated from guests, staff updates status)

| Timestamp | Guest | Room | Date | Time | Type | From | To | Airline | Flight | Passengers | Notes | Status | Assigned Driver |
|-----------|-------|------|------|------|------|------|----|---------|--------|------------|-------|--------|-----------------|
| auto | auto | auto | auto | auto | auto | auto | auto | auto | auto | auto | auto | Pending → Confirmed → Done | manual |

**Tab: DRIVERS** (hotel configures)

| Name | Phone | Vehicle | Capacity | Active Today |
|------|-------|---------|----------|-------------|
| Carlos | 305-555-0101 | Van A | 12 | Yes |
| Maria | 305-555-0102 | Van B | 14 | Yes |

**File: create `templates/attenda-shuttle-template.xlsx` or just build it directly in Google Sheets**

The actual sheet URL will be shared as a "Make a copy" link. Hotel admins copy it, configure their schedule, and paste the URL into Hotel Settings.

---

### Step 2: Create the Apps Script (Google Sheets → Web App)

Inside the template sheet, add this Apps Script:

```javascript
// Deploy as Web App → Execute as: Me, Access: Anyone

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('REQUESTS');
  const data = JSON.parse(e.postData.contents);
  
  sheet.appendRow([
    new Date(),                              // Timestamp
    data.guestName,                          // Guest
    data.room,                               // Room
    data.date,                               // Date
    data.time,                               // Time
    data.direction === 'arrival' ? 'Arrival' : 'Departure',  // Type
    data.pickup,                             // From
    data.destination,                        // To
    data.airline || '',                      // Airline
    data.flight || '',                       // Flight
    data.passengers || '1',                  // Passengers
    data.notes || '',                        // Notes
    'Pending',                               // Status
    ''                                       // Assigned Driver
  ]);
  
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  // Optional: return schedule as JSON for guest view
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Each hotel deploys this from their copy of the template. The deployment URL goes into their hotel config.

---

### Step 3: Add `apps_script_url` to Hotel Config

**Supabase SQL:**
```sql
ALTER TABLE hotels ADD COLUMN apps_script_url TEXT;
```

**File: `src/lib/supabase.ts`**

Add to `HotelConfig`:
```ts
appsScriptUrl: string;
```

Update `getHotelConfig` mapping:
```ts
appsScriptUrl: data.apps_script_url || '',
```

Update `updateHotelConfig` upsert:
```ts
apps_script_url: config.appsScriptUrl,
```

---

### Step 4: Add Apps Script URL field to Hotel Settings

**File: `src/app/staff/page.tsx`** → `HotelSettingsView`

In the "Operations Sheet" section, add after the Google Sheet URL field:

```tsx
<Field
  label="Apps Script Web App URL"
  value={form.appsScriptUrl}
  onChange={v => setForm({ ...form, appsScriptUrl: v })}
  placeholder="https://script.google.com/macros/s/.../exec"
/>
<p className="text-[10px] text-gray-400 -mt-2">
  Generated from Tools → Apps Script → Deploy → Web App inside your Google Sheet.
</p>
```

---

### Step 5: Create the sync API route

**New file: `src/app/api/transport-sync/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { appsScriptUrl, ...data } = await req.json();
  
  if (!appsScriptUrl) {
    return NextResponse.json({ ok: true, warning: 'No Apps Script URL configured' });
  }

  try {
    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) throw new Error(`Apps Script returned ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Transport sync failed:', e);
    // Don't fail the whole request — Supabase + email already worked
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
```

---

### Step 6: Wire guest transport requests to sync to sheet

**File: `src/app/transport/page.tsx`** → `handleSubmit`

After the existing Supabase insert and email fetch, add:

```tsx
// After the email fetch block (around line 56), add:
if (hotel?.appsScriptUrl) {
  fetch('/api/transport-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appsScriptUrl: hotel.appsScriptUrl,
      guestName: guest.name || 'Guest',
      room: qrRoom || guest.room || '?',
      date: form.date,
      time: form.time,
      direction,
      pickup: direction === 'departure' ? 'Hotel Lobby' : form.destination,
      destination: direction === 'arrival' ? 'Hotel' : form.destination,
      airline: form.airline,
      flight: form.flight,
      passengers: form.passengers,
      notes: form.notes,
    }),
  }).catch(() => {});
}
```

---

### Step 7: Add guest-facing schedule view

**File: `src/app/transport/page.tsx`** — Add a new tab or section

Above the form, add a toggle:

```tsx
const [view, setView] = useState<'request' | 'schedule'>('request');

// ... in JSX, before the direction toggle:
<div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex mb-3">
  <button onClick={() => setView('request')}
    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold ${view === 'request' ? 'text-white' : 'text-gray-500'}`}
    style={view === 'request' ? { backgroundColor: '#6B1D3C' } : undefined}>
    Request Ride
  </button>
  <button onClick={() => setView('schedule')}
    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold ${view === 'schedule' ? 'text-white' : 'text-gray-500'}`}
    style={view === 'schedule' ? { backgroundColor: '#6B1D3C' } : undefined}>
    Shuttle Schedule
  </button>
</div>

{view === 'schedule' ? <ScheduleView sheetUrl={hotel?.googleSheetUrl} /> : (
  // ... existing form
)}
```

**Add `ScheduleView` component:**

```tsx
function ScheduleView({ sheetUrl }: { sheetUrl?: string }) {
  const [hotel, setHotel] = useState<any>(null);
  
  useEffect(() => {
    getHotelConfig().then(setHotel);
  }, []);

  if (!hotel?.googleSheetUrl) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <Bus size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500">Shuttle schedule coming soon.</p>
      </div>
    );
  }

  const embedUrl = hotel.googleSheetUrl
    .replace(/\/edit.*$/, '/pubhtml?gid=0&single=true&widget=true&headers=false');

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ height: 400 }}>
      <iframe src={embedUrl} className="w-full h-full border-0" />
    </div>
  );
}
```

---

### Step 8: Build & deploy

```bash
npm run build && vercel --prod --yes
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/supabase.ts` | Add `appsScriptUrl` to HotelConfig, getHotelConfig, updateHotelConfig |
| `src/app/staff/page.tsx` | Add Apps Script URL field in HotelSettingsView |
| `src/app/transport/page.tsx` | Add ScheduleView toggle + sync-to-sheet call |
| `src/app/api/transport-sync/route.ts` | **New** — serverless proxy to Apps Script |
| `templates/attenda-shuttle-template` | **New** — Google Sheet template (not in repo, just documented) |
| `.env.local` | No changes needed |

---

## Cost: $0

- Apps Script: Free (included with Google Sheets)
- Google Sheets API: Not even used directly — Apps Script is the proxy
- No additional API keys, no billing

---

## Risks & Edge Cases

| Risk | Mitigation |
|------|------------|
| Apps Script fails → guest request still saved | Transport sync is fire-and-forget. Supabase + email are the primary paths. Sheet sync is bonus. |
| Hotel doesn't configure Apps Script | Degrades gracefully — just skips sheet sync. No error for guest. |
| Apps Script quota (20,000 req/day) | Never relevant — hotels max ~20 transport requests/day |
| Sheet shared publicly → privacy concern | REQUESTS tab kept separate from SCHEDULE tab. Guest Schedule view only embeds the SCHEDULE tab (gid=0). |

---

## TL;DR

- Template Google Sheet with 3 tabs (SCHEDULE, REQUESTS, DRIVERS)
- Apps Script web app inside the sheet accepts POST requests
- Guest transport form syncs to both Supabase AND the Google Sheet
- Guests get a read-only schedule view on the transport page
- Staff gets the full iframe embed (as before)
- **Total cost: $0**
