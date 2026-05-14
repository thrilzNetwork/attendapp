# Super Admin Onboarding — Auto-Populate + QR Batch Generation

**Date:** May 13, 2026
**Status:** Plan — awaiting approval

---

## What's Happening Now

| Step | Current | Problem |
|------|---------|---------|
| Superadmin creates hotel | Only asks: Name, Slug, Admin Email | Too bare — no website, phone, room count |
| Hotel info | Address, WiFi, phone entered later in Staff Settings | Two-step setup, fragmented |
| QR codes | One-at-a-time manual entry per room | 80 rooms = 80 manual entries |
| Review links | Hardcoded "best western reviews" on Google, generic TripAdvisor | Wrong hotel, looks amateur |
| Website scraping | Doesn't exist | Can't auto-fill anything |

---

## Goal

Super Admin onboarding captures everything upfront. Website URL → auto-scrapes address + phone + review links. Room count → batch-generates all QR codes. One save. Hotel is fully onboarded.

---

## Step-by-Step Plan

### Step 1: Extend HotelConfig + hotels table

**Supabase SQL:**
```sql
ALTER TABLE hotels ADD COLUMN website_url TEXT;
ALTER TABLE hotels ADD COLUMN admin_phone TEXT;
ALTER TABLE hotels ADD COLUMN room_count INTEGER DEFAULT 0;
ALTER TABLE hotels ADD COLUMN google_review_url TEXT;
ALTER TABLE hotels ADD COLUMN tripadvisor_url TEXT;
ALTER TABLE hotels ADD COLUMN yelp_url TEXT;
ALTER TABLE hotels ADD COLUMN brand_color TEXT DEFAULT '#6B1D3C';
```

**File: `src/lib/supabase.ts`** — Add to HotelConfig:
```ts
websiteUrl: string;
adminPhone: string;
roomCount: number;
googleReviewUrl: string;
tripadvisorUrl: string;
yelpUrl: string;
brandColor: string;
```

Update `getHotelConfig` and `updateHotelConfig` mappings.

Update `createHotel` to accept all fields:
```ts
export async function createHotel(data: {
  slug: string; name: string; websiteUrl?: string; adminPhone?: string;
  roomCount?: number; adminEmail?: string;
}) { ... }
```

---

### Step 2: Enrich Super Admin Create Form

**File: `src/app/superadmin/page.tsx`** — Replace the create form

Current form has 3 fields. Expand to:

```
┌─────────────────────────────────────────┐
│ + Onboard New Property                  │
├─────────────────────────────────────────┤
│ Hotel Name *         │ URL Slug *       │
│ [               ]    │ [            ]   │
├─────────────────────────────────────────┤
│ Hotel Website URL                        │
│ [https://www.hotel.com             ]    │
│ ↳ Auto-fills address, phone, reviews    │
├─────────────────────────────────────────┤
│ Contact Phone                            │
│ [305-555-0100                      ]    │
├─────────────────────────────────────────┤
│ Number of Rooms                         │
│ [80]  ↳ Auto-generates QR codes         │
├─────────────────────────────────────────┤
│ Admin Email (onboarding email)          │
│ [manager@hotel.com                 ]    │
├─────────────────────────────────────────┤
│ Guest: https://attenda.app/?hotel=slug  │
│ Admin: https://attenda.app/staff?hotel= │
├─────────────────────────────────────────┤
│ [CREATE PROPERTY]                       │
└─────────────────────────────────────────┘
```

**Also update the PropertiesView** (in staff page) with the same expanded form.

---

### Step 3: Build Website Scraper API

**New file: `src/app/api/scrape-hotel/route.ts`**

Takes a website URL, extracts structured data:

```ts
// Two approaches (try both):
// 1. Parse meta tags + structured data from the page
// 2. Fall back to OpenStreetMap/Google for address by name

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  
  // Fetch the website HTML
  const res = await fetch(url);
  const html = await res.text();
  
  // Extract from common patterns:
  // - <meta property="og:..." /> for name, description
  // - <script type="application/ld+json"> for structured data
  // - Address pattern matching (regex for street/city/state/zip)
  // - Phone pattern: (xxx) xxx-xxxx or xxx-xxx-xxxx
  // - Review links: tripadvisor.com/..., yelp.com/biz/...
  
  return {
    name: extracted.name,
    address: extracted.address,
    phone: extracted.phone,
    googleReviewUrl: extracted.googleReview, // via place_id or maps link
    tripadvisorUrl: extracted.tripadvisor,
    yelpUrl: extracted.yelp,
  };
}
```

Install `cheerio` for HTML parsing: `npm install cheerio`

---

### Step 4: Wire Auto-Fill to Super Admin Form

In the super admin create form, when website URL is entered:

```tsx
<Field
  label="Hotel Website URL"
  value={form.websiteUrl}
  onChange={async (v) => {
    setForm({ ...form, websiteUrl: v });
    if (v.startsWith('http')) {
      setScraping(true);
      try {
        const res = await fetch('/api/scrape-hotel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: v }),
        });
        const data = await res.json();
        if (res.ok) {
          setForm(prev => ({
            ...prev,
            address: data.address || prev.address,
            adminPhone: data.phone || prev.adminPhone,
            googleReviewUrl: data.googleReviewUrl || '',
            tripadvisorUrl: data.tripadvisorUrl || '',
            yelpUrl: data.yelpUrl || '',
          }));
          setScrapeResult(`Found: ${data.address || 'address'}, ${data.phone || 'phone'}`);
        }
      } catch { /* silently fail */ }
      finally { setScraping(false); }
    }
  }}
  placeholder="https://www.hotel.com"
/>
```

Show a small toast/indicator when scraping succeeds or fails.

---

### Step 5: QR Code Batch Generation

**File: `src/app/staff/page.tsx`** → `QrCodesView`

Add a "Generate All Rooms" button:

```tsx
{config?.roomCount > 0 && (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
    <h3 className="font-bold text-[14px] mb-2">Batch Generate</h3>
    <p className="text-[12px] text-gray-400 mb-3">
      {config.roomCount} rooms configured. Generate all room QR codes at once.
    </p>
    <div className="flex gap-3">
      <div className="flex-1">
        <Field 
          label="Starting room number" 
          value={startRoom.toString()} 
          onChange={v => setStartRoom(parseInt(v) || 101)} 
        />
      </div>
      <div className="flex items-end">
        <button
          onClick={async () => {
            let count = 0;
            for (let i = 0; i < config.roomCount; i++) {
              const room = (startRoom + i).toString();
              // Skip if already exists
              const exists = codes.some(c => c.label === room);
              if (!exists) {
                await createQrCode(hotelId, room, 'room', getUrl(room));
                count++;
              }
            }
            alert(`✅ Generated ${count} new QR codes (${codes.length} existing skipped)`);
            loadCodes();
          }}
          className="px-5 py-3 rounded-xl text-white font-semibold text-[13px]"
          style={{ backgroundColor: TEAL }}
        >
          Generate {config.roomCount} Room QR Codes
        </button>
      </div>
    </div>
  </div>
)}
```

Add `startRoom` state to `QrCodesView`.

---

### Step 6: Fix Review Links

**File: `src/app/review/page.tsx`** — Replace hardcoded links

```tsx
const openReview = async (url: string) => {
  const hotel = await getHotelConfig();
  if (url === 'google' && hotel?.googleReviewUrl) {
    window.open(hotel.googleReviewUrl, '_blank');
    return;
  }
  if (url === 'tripadvisor' && hotel?.tripadvisorUrl) {
    window.open(hotel.tripadvisorUrl, '_blank');
    return;
  }
  if (url === 'yelp' && hotel?.yelpUrl) {
    window.open(hotel.yelpUrl, '_blank');
    return;
  }
  // Generic fallback
  if (url === 'google') window.open('https://www.google.com/search?q=' + encodeURIComponent(hotel?.name || 'hotel') + '+reviews', '_blank');
  if (url === 'tripadvisor') window.open('https://www.tripadvisor.com/Search?q=' + encodeURIComponent(hotel?.name || ''), '_blank');
  if (url === 'yelp') window.open('https://www.yelp.com/search?find_desc=' + encodeURIComponent(hotel?.name || 'hotel'), '_blank');
};
```

---

### Step 7: Use brand_color across the app

The `brandColor` field lets each hotel customize the accent color (currently hardcoded `#6B1D3C` everywhere).

**Phase 1 (this build):** Store it, pass it through. Use in review page + guest-facing pages.

**Phase 2 (future):** Full dynamic theming per hotel.

For now: replace the hardcoded `#6B1D3C` in `/review`, `/transport`, and `/nearby` with `hotel?.brandColor || '#6B1D3C'`.

---

### Step 8: Build & deploy

```bash
npm install cheerio
npm run build && vercel --prod --yes
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/supabase.ts` | HotelConfig + createHotel extended with 7 new fields |
| `src/app/superadmin/page.tsx` | Expanded create form with website URL, phone, room count |
| `src/app/staff/page.tsx` | QR batch generation + expanded PropertiesView form |
| `src/app/review/page.tsx` | Dynamic review links from HotelConfig |
| `src/app/transport/page.tsx` | Dynamic brand color |
| `src/app/nearby/page.tsx` | Dynamic brand color |
| `src/app/api/scrape-hotel/route.ts` | **New** — website scraper endpoint |
| `package.json` | Add `cheerio` |

---

## Admin UX After This

```
1. Superadmin → Onboard New Property
2. Pastes hotel website: https://www.miamiairporthotel.com
3. Attenda auto-fills: address, phone, Google/TripAdvisor/Yelp review URLs
4. Enters: 80 rooms
5. Clicks CREATE → hotel is live
6. Opens Staff Dashboard → QR Codes → clicks "Generate 80 Room QR Codes"
7. Done. Print QR codes. Hotel is fully operational.
```

---

## Cost: $0

Cheerio (HTML parsing) runs server-side. No API keys. Website scraping is basic meta/structured-data extraction — no headless browser needed.
