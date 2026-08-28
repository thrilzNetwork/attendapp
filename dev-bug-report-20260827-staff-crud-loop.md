# FIX NOW — Attenda /staff is STILL burning Netlify credits. Not done.

## LIVE TEST (Aug 27, 2026 ~10:20pm CT)
- Logged in Super Admin (thrilznetwork@gmail.com) at https://attendaapp.com/staff
- Property: Best Western Fort Lauderdale
- Sat on Dashboard ~79 seconds
- POST /api/staff-crud: 736 hits in 79s (~10 req/sec, median interval ~101ms)
- POST /api/ops-data: 2 hits at page load only — that one is fine
- Netlify last hour jumped 59 → 1,962 requests from THIS tab

## WHAT IS WRONG WITH THE LAST "FIX"
- Commit 1d42e30 (thrilzNetwork/attendapp) killed setInterval(loadGuests, 5000) and added Realtime + BroadcastChannel. That 5s interval is gone from the live staff bundle.
- That is NOT the remaining bug. staff-crud is a TIGHT LOOP (~100ms), not a 5-second poll.
- Netlify production deploys from github.com/thrilzNetwork/attenda-app. Latest published deploy still shows Aug 26 12:09 (UTC-7). SHA 1d42e30 did not appear on the deploys list. Confirm you shipped to the repo Netlify actually builds.

## WHAT TO DO
1. Grep the WHOLE app (not just staff/page.tsx) for fetch/POST to /api/staff-crud. Child views stay mounted (visitedTabs / display:none). Dashboard, Requests, To-Dos, KPIs, Schedules, or a shared hook is the likely source.
2. Kill any useEffect that calls staff-crud without a stable dep array, or that sets state → retriggers itself. 10 req/sec = infinite re-render, not an interval.
3. After login, staff-crud should run ONCE (or on user action / realtime event), not on a timer and not in a render loop.
4. Confirm Netlify is building the same repo/branch you committed.

## DONE LOOKS LIKE
Open https://attendaapp.com/staff logged in, sit on Dashboard 2 minutes, DevTools Network filter staff-crud.
PASS: a handful at load, then ~0.
FAIL: anything like 10/sec.

Do not say "all done" until that 2-minute test passes. Close every leftover /staff tab after testing.
/staff was still open on my computer from the test. I'm closing it so we stop the bleed.
