# Shuttle Schedule — Auto-Generate Google Sheets (Revised)

**Date:** May 13, 2026
**Status:** Plan — awaiting approval

---

## Revised Approach: Google Sheets API + Service Account

Forget Apps Script. We use the Google Sheets API directly from Attenda. Admin pastes a sheet URL → Attenda auto-builds all tabs → guest requests sync automatically.

### How It Works

```
Admin creates a blank Google Sheet
    │
    ▼
Admin pastes URL into Attenda Hotel Settings
    │
    ▼
Attenda says: "Share this sheet with attenda@project.iam.gserviceaccount.com (Editor)"
    │
    ▼
Admin clicks Share → pastes the email → Done
    │
    ▼
Attenda auto-generates all 3 tabs:
  • SCHEDULE — default shuttle times (editable by admin)
  • REQUESTS — headers ready, auto-populated from guest submissions
  • DRIVERS — driver assignment table
    │
    ▼
Guest submits transport request via /transport
    │
    ├──→ Supabase requests table (primary)
    ├──→ Email notification
    └──→ Google Sheet REQUESTS tab (auto-append via Sheets API)
```

---

## Step-by-Step

### Step 1: Create Google Service Account (one-time, free)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project: `Attenda`
3. Enable **Google Sheets API**
4. IAM & Admin → Service Accounts → **Create Service Account**
   - Name: `attenda-sheets`
   - Role: Basic → Editor (or just Sheets API access)
5. After creation → Keys → Add Key → JSON
6. Download the JSON key file
7. Extract: `client_email` and `private_key`

### Step 2: Add env vars to Vercel

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=attenda-sheets@attenda.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"attenda", ...}
```

(Private key stored as single-line JSON or base64)

### Step 3: Create Google Sheets helper library

**New file: `src/lib/google-sheets.ts`**

```ts
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  return new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: key.private_key,
    scopes: SCOPES,
  });
}

function extractSheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('Invalid Google Sheet URL');
  return match[1];
}

// Initialize all tabs in the sheet
export async function initializeShuttleSheet(sheetUrl: string) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = extractSheetId(sheetUrl);

  // Get existing sheets
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = (spreadsheet.data.sheets || []).map(s => s.properties?.title);

  // Create tabs if missing
  const needed = [
    { title: 'SCHEDULE', index: 0 },
    { title: 'REQUESTS', index: 1 },
    { title: 'DRIVERS', index: 2 },
  ];

  for (const tab of needed) {
    if (!existingTitles.includes(tab.title)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: tab.title, index: tab.index },
            },
          }],
        },
      });
    }
  }

  // Populate SCHEDULE tab with default template
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'SCHEDULE!A1:F9',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        ['Day', 'Route', 'Depart Hotel', 'Arrive Airport', 'Direction', 'Notes'],
        ['Mon–Sun', 'Hotel → MIA', '6:00 AM', '6:30 AM', 'Departure', ''],
        ['Mon–Sun', 'Hotel → MIA', '8:00 AM', '8:30 AM', 'Departure', ''],
        ['Mon–Sun', 'Hotel → MIA', '10:00 AM', '10:30 AM', 'Departure', ''],
        ['Mon–Sun', 'Hotel → MIA', '12:00 PM', '12:30 PM', 'Departure', ''],
        ['Mon–Sun', 'MIA → Hotel', '2:00 PM', '2:30 PM', 'Arrival', ''],
        ['Mon–Sun', 'MIA → Hotel', '4:00 PM', '4:30 PM', 'Arrival', ''],
        ['Mon–Sun', 'MIA → Hotel', '6:00 PM', '6:30 PM', 'Arrival', ''],
        ['Mon–Sun', 'MIA → Hotel', '8:00 PM', '8:30 PM', 'Arrival', ''],
      ],
    },
  });

  // Populate REQUESTS tab with headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'REQUESTS!A1:N1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        'Timestamp', 'Guest', 'Room', 'Date', 'Time',
        'Type', 'From', 'To', 'Airline', 'Flight',
        'Passengers', 'Notes', 'Status', 'Assigned Driver',
      ]],
    },
  });

  // Populate DRIVERS tab
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'DRIVERS!A1:E1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['Name', 'Phone', 'Vehicle', 'Capacity', 'Active Today']],
    },
  });

  // Clean up default "Sheet1" if it exists
  if (existingTitles.includes('Sheet1') && existingTitles.length > 3) {
    const sheet1 = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Sheet1');
    if (sheet1?.properties?.sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }],
        },
      });
    }
  }

  return { ok: true, spreadsheetId, email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL };
}

// Append a guest transport request to the REQUESTS tab
export async function appendTransportRequest(sheetUrl: string, request: {
  guestName: string; room: string; date: string; time: string;
  direction: string; pickup: string; destination: string;
  airline?: string; flight?: string; passengers?: string; notes?: string;
}) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = extractSheetId(sheetUrl);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'REQUESTS!A:N',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        new Date().toLocaleString(),
        request.guestName,
        request.room,
        request.date,
        request.time,
        request.direction === 'arrival' ? 'Arrival' : 'Departure',
        request.pickup,
        request.destination,
        request.airline || '',
        request.flight || '',
        request.passengers || '1',
        request.notes || '',
        'Pending',
        '',
      ]],
    },
  });

  return { ok: true };
}
```

### Step 4: Install googleapis package

```bash
cd /Users/thrilzco/Projects/attenda
npm install googleapis google-auth-library
```

### Step 5: Add `google_sheet_url` field to HotelConfig

**File: `src/lib/supabase.ts`**

```ts
// Add to HotelConfig interface:
googleSheetUrl: string;
serviceAccountEmail: string;
```

**Supabase SQL:**
```sql
ALTER TABLE hotels ADD COLUMN google_sheet_url TEXT;
ALTER TABLE hotels ADD COLUMN service_account_email TEXT;
```

Update `getHotelConfig` and `updateHotelConfig` mappings.

### Step 6: Replace Hotel Settings Google Sheet field

**File: `src/app/staff/page.tsx`** → HotelSettingsView

Replace the current "Google Sheet URL" field in the Operations Sheet section:

```tsx
<Section title="Shuttle Operations Sheet" Icon={ExternalLink}>
  <p className="text-[11px] text-gray-400 -mt-1">
    Paste a Google Sheet URL. Attenda will auto-build SCHEDULE, REQUESTS, and DRIVERS tabs.
  </p>
  <Field
    label="Google Sheet URL"
    value={form.googleSheetUrl}
    onChange={v => setForm({ ...form, googleSheetUrl: v })}
    placeholder="https://docs.google.com/spreadsheets/d/..."
  />
  {form.googleSheetUrl && (
    <button
      onClick={async () => {
        try {
          const res = await fetch('/api/sheets-init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheetUrl: form.googleSheetUrl }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setForm({
            ...form,
            serviceAccountEmail: data.email,
          });
          alert(
            `✅ Shuttle sheet is ready!\n\n⚠️ IMPORTANT: Share this sheet with:\n${data.email}\n(as Editor)`
          );
        } catch (e) {
          alert('Setup failed: ' + (e as Error).message);
        }
      }}
      className="w-full py-2.5 rounded-xl font-semibold text-[13px] text-white"
      style={{ backgroundColor: TEAL }}
    >
      🚐 Initialize Shuttle Sheet
    </button>
  )}
  {form.serviceAccountEmail && (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
      <p className="text-[11px] text-amber-700">
        ⚠️ Share sheet with: <code className="bg-amber-100 px-1 rounded">{form.serviceAccountEmail}</code> (Editor access)
      </p>
    </div>
  )}
  <p className="text-[10px] text-gray-400 mt-1">
    Staff sees full sheet in Shuttle tab. Guests see SCHEDULE tab only.
  </p>
</Section>
```

### Step 7: Create `/api/sheets-init` route

**New file: `src/app/api/sheets-init/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { initializeShuttleSheet } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const { sheetUrl } = await req.json();
    if (!sheetUrl) return NextResponse.json({ error: 'No sheet URL' }, { status: 400 });
    
    const result = await initializeShuttleSheet(sheetUrl);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

### Step 8: Wire guest transport form to sync

**File: `src/app/transport/page.tsx`** → `handleSubmit`

After the existing email fetch, add:

```tsx
// Sync to Google Sheet
if (hotel?.googleSheetUrl) {
  fetch('/api/transport-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sheetUrl: hotel.googleSheetUrl,
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

### Step 9: Create `/api/transport-sync` route

**New file: `src/app/api/transport-sync/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { appendTransportRequest } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  const { sheetUrl, ...request } = await req.json();
  if (!sheetUrl) return NextResponse.json({ ok: true, warning: 'No sheet URL' });
  
  try {
    await appendTransportRequest(sheetUrl, request);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Transport sync failed:', e);
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
```

### Step 10: Add guest-facing schedule view

Same as original plan — add ScheduleView toggle on `/transport` page.

---

## Admin UX (End-to-End)

```
1. Admin creates blank Google Sheet → drive.google.com → New → Sheets
2. Admin copies URL from address bar
3. Admin goes to Attenda → Hotel Settings → Operations Sheet → pastes URL
4. Admin clicks "Initialize Shuttle Sheet"
5. Attenda auto-creates 3 tabs with proper headers and default schedule
6. Popup says: "Share with attenda@attenda.iam.gserviceaccount.com"
7. Admin clicks "Share" in Google Sheet → pastes email → Editor → Done
8. Everything works. Forever.
```

---

## Cost

| Thing | Cost |
|-------|------|
| Google Sheets API | **$0** (free — no charge for reads/writes) |
| Service account | **$0** |
| Quota | 60 requests/minute per user, 300 req/min per project — we'll use ~2 per transport request |

---

## Files Summary

| File | Change |
|------|--------|
| `src/lib/google-sheets.ts` | **New** — Sheets API client (init sheet, append request) |
| `src/lib/supabase.ts` | Add `googleSheetUrl`, `serviceAccountEmail` to HotelConfig |
| `src/app/staff/page.tsx` | Replace Operations Sheet section with auto-init flow |
| `src/app/transport/page.tsx` | Add sheet sync call + guest ScheduleView toggle |
| `src/app/api/sheets-init/route.ts` | **New** — POST handler for sheet setup |
| `src/app/api/transport-sync/route.ts` | **New** — POST handler for appending requests |
| `package.json` | Add `googleapis`, `google-auth-library` |
| `.env.local` / Vercel | Add `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY` |
