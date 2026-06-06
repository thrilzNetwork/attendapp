import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbW1zdGF0cnNlbmlkbGdqb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE5MjAsImV4cCI6MjA5NDE4NzkyMH0.1pnioO5Y_3pW2LTaYc9aliRwTkGhX2cTNLrK9jI1P-4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get all hotel IDs except the one already seeded
const { data: hotels } = await supabase.from('hotels').select('id,slug,name');
const targetId = '7feb88fa-a72c-4c5d-b094-b4948bdab1d7'; // BW FTL (already seeded)
const others = (hotels || []).filter(h => h.id !== targetId);

if (others.length === 0) {
  console.log('No other hotels to seed.');
  process.exit(0);
}

console.log(`Seeding SOPs/System Guide for ${others.length} other hotel(s):`);
others.forEach(h => console.log(`  - ${h.name} (${h.id.slice(0,8)}...)`));

const entries = [
  { category: 'System Guide', question: 'Getting Started with Attenda', answer: `Attenda is your daily operations engine. Here's how to get started:\n\n1. **Login**: Enter your staff PIN on the login screen.\n2. **Dashboard**: The first screen shows today's activity, pending requests, key metrics.\n3. **Navigation**: Sidebar sections — Today, Operations, Admin (managers)\n4. **Sign Out**: Click Sign Out in the sidebar when done.`, keywords: ['getting started', 'login', 'navigation'] },
  { category: 'System Guide', question: 'Processing Guest Requests', answer: `**To process a request:**\n1. Open the **Requests** tab\n2. Filter by type (All/Food/Transport/Amenities/Other) and status (Active/Completed)\n3. Click a request to expand, click **In Progress** then **Mark Complete**\n4. Use **Assign** to delegate to specific staff\n\n**To create a manual request:**\nClick **+ New Request**, fill in guest info, type, and details.`, keywords: ['requests', 'guest', 'orders', 'assign'] },
  { category: 'System Guide', question: 'Schedule & Shift Management', answer: `The **Schedules** tab shows a staff × day matrix.\n\n**Navigation:** ← Prev / Next → to move weeks. **This week** jumps back.\n\n**Add Shift (managers):** Click **Add Shift**, enter staff name, date, times.\n\n**Forecast Row:** Blue row at top showing occupancy %, arrivals, rooms.\n\n**Request Off (staff):** Click **Request Off** to submit day off/swap/cover requests.`, keywords: ['schedule', 'shift', 'forecast', 'hours'] },
  { category: 'System Guide', question: 'Shuttle Operations', answer: `The **Shuttle** tab manages transportation.\n\n**Daily view:** See trips, bookings, driver assignments.\n\n**Shuttle Grid (admin):** Calendar view to create recurring or one-off slots.\n\n**Routes:** Configured in Property Settings (airport, cruise port, local area).`, keywords: ['shuttle', 'transport', 'bus', 'driver', 'airport'] },
  { category: 'System Guide', question: 'Knowledge Base: Managing Content', answer: `**Adding entry:** Click **Add Entry**, choose category, write question/answer, add keywords.\n\n**Import URL:** Paste URL → click **Import URL** for auto-extract.\n\n**Upload PDF:** Upload a PDF document — text is extracted as a draft.\n\n**Edit/Delete:** Use pencil icon to edit, X to delete. Toggle active/inactive.`, keywords: ['knowledge base', 'KB', 'faq', 'import'] },
  { category: 'System Guide', question: 'Staff Callouts & Requests', answer: `**Staff:** Go to Schedules → **Request Off** → fill in details → Send.\n\n**Managers:** See pending banner in Schedules view. Full list in **Staff Callouts** tab.\n\nClick **Resolve** to mark requests complete.`, keywords: ['callouts', 'day off', 'time off', 'PTO'] },
  { category: 'System Guide', question: 'SOPs & System Guide (this page)', answer: `The **SOPs & Guide** tab shows three categories:\n\n- **SOP**: Standard operating procedures (check-in, handoff, complaints, housekeeping)\n- **System Guide**: How to use each Attenda feature\n- **Tenant Onboarding**: Process for setting up new hotels\n\nManagers add content via **Knowledge Base** using SOP / System Guide / Tenant Onboarding categories.`, keywords: ['SOP', 'guide', 'procedures', 'how to'] },
  { category: 'SOP', question: 'Morning Shift Handoff Procedure', answer: `**Steps:**\n1. Arrive 10 min early\n2. Read overnight notes (incidents, late check-ins)\n3. Run daily brief in Attenda Dashboard\n4. Check Knowledge Base for updates\n5. Walk property (lobby, breakfast, parking)\n6. Process overnight request queue`, keywords: ['morning', 'handoff', 'shift'] },
  { category: 'SOP', question: 'Guest Check-In Procedure', answer: `1. Greet guest warmly\n2. Verify government-issued photo ID\n3. Confirm reservation details\n4. Process payment (room + incidentals)\n5. Provide keys and explain policies\n6. Direct to room (floor, elevator)\n7. Mention breakfast hours, wifi, pool\n8. "Enjoy your stay!"`, keywords: ['check-in', 'arrival', 'guest', 'front desk'] },
  { category: 'SOP', question: 'Guest Complaint Resolution (L.A.S.T.)', answer: `**L**isten — Let guest explain without interrupting\n**A**pologize — "I'm sorry this happened"\n**S**olve — Fix issue, offer compensation, upgrade if possible\n**T**hank — "We value your feedback"\n\nDocument in Requests tab. Escalate to manager if unresolved after 5 min.`, keywords: ['complaint', 'LAS', 'resolution'] },
  { category: 'SOP', question: 'Housekeeping Inspection Checklist', answer: `**Daily check:**\n□ Door/lock/peephole functional\n□ Bathroom clean, stocked (towels, soap, TP)\n□ Fresh linens, no stains\n□ Furniture dust-free\n□ Floor vacuumed\n□ TV/remote working\n□ AC/heat at 72°F\n□ Mini-fridge clean\n□ Smoke detector present\n□ Windows locked, curtains straight`, keywords: ['housekeeping', 'inspection', 'clean', 'room'] },
];

let totalOk = 0, totalFail = 0;

for (const hotel of others) {
  console.log(`\n--- ${hotel.name} ---`);
  for (const entry of entries) {
    const { error } = await supabase.from('hotel_knowledge_base').insert({
      hotel_id: hotel.id,
      category: entry.category,
      question: entry.question,
      answer: entry.answer,
      keywords: entry.keywords || [],
      active: true,
    });
    if (error) {
      console.error(`  ❌ ${entry.question.slice(0, 50)}: ${error.message}`);
      totalFail++;
    } else {
      console.log(`  ✅ ${entry.question.slice(0, 50)}`);
      totalOk++;
    }
  }
}

console.log(`\nComplete! ${totalOk} entries seeded, ${totalFail} failed across ${others.length} additional hotels.`);
