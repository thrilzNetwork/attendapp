const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('/Users/thrilzco/Projects/attenda/.env.local', 'utf8');
const svcKey = env.match(/SUPABASE_SERVICE_KEY=([^\n]+)/)[1];
const anonKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\n]+)/)[1];
const supabase = createClient('https://bdmmstatrsenidlgjock.supabase.co', svcKey);

(async () => {
  console.log('=== RLS AUDIT via Anon Key ===\n');
  
  const anonClient = createClient('https://bdmmstatrsenidlgjock.supabase.co', anonKey);
  
  const tables = ['hotels', 'requests', 'messages', 'staff_accounts', 'partners', 'shuttle_routes', 'hotel_rooms', 'staff_schedules', 'shuttle_slots', 'guest_validations', 'checklists', 'checklist_instances', 'superadmin_config'];
  
  for (const t of tables) {
    try {
      const { count, error } = await anonClient.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  ${t.padEnd(22)} 🔒 BLOCKED (${error.message.slice(0, 50)})`);
      } else {
        console.log(`  ${t.padEnd(22)} ⚠️  OPEN — ${count} rows readable`);
      }
    } catch(e) {
      console.log(`  ${t.padEnd(22)} 🔒 ERROR: ${e.message.slice(0, 60)}`);
    }
  }
  
  console.log('\n=== OPERATIONAL VERIFICATION ===\n');
  
  // Verify each system works with service key
  const hotelId = 'f1f8de36-3126-4ba8-9cc6-b11cefb276ca';
  
  // 1. Requests
  const { count: rCount } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  console.log(`📋 Requests: ${rCount}`);
  
  // 2. Messages
  const { count: mCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  console.log(`💬 Messages: ${mCount}`);
  
  // 3. Staff
  const { count: sCount } = await supabase.from('staff_accounts').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  console.log(`👥 Staff accounts: ${sCount}`);
  
  // 4. Rooms
  const { count: rmCount } = await supabase.from('hotel_rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  console.log(`🛏️ Rooms: ${rmCount}`);
  
  // 5. Shuttle
  const { count: rtCount } = await supabase.from('shuttle_routes').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  const { data: routes } = await supabase.from('shuttle_routes').select('id').eq('hotel_id', hotelId);
  const rIds = routes.map(r => r.id);
  const { count: slCount } = await supabase.from('shuttle_slots').select('*', { count: 'exact', head: true }).in('route_id', rIds);
  console.log(`🚐 Shuttle: ${rtCount} routes, ${slCount} slots`);
  
  // 6. Partners (Nearby)
  const { count: pCount } = await supabase.from('partners').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  console.log(`📍 Nearby places: ${pCount}`);
  
  // 7. All tables exist check
  const allTables = ['hotels','requests','messages','staff_accounts','partners','shuttle_routes','shuttle_slots','hotel_rooms','staff_schedules','weekly_forecasts','learning_courses','course_modules','quiz_questions','module_completions','quiz_attempts','hr_documents','knowledge_base','staff_checklists','staff_checklist_instances','staff_schedules','schedule_change_requests','cruise_schedules','guest_validations','partner_applications','superadmin_config'];
  
  console.log('\n=== TABLE EXISTENCE CHECK ===');
  for (const t of allTables) {
    try {
      const { data, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  ${t.padEnd(30)} ❌ ${error.message.slice(0, 40)}`);
      } else {
        console.log(`  ${t.padEnd(30)} ✅`);
      }
    } catch {
      console.log(`  ${t.padEnd(30)} ❌ does not exist`);
    }
  }
})();