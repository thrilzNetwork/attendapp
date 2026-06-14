const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('/Users/thrilzco/Projects/attenda/.env.local', 'utf8');
const svcKey = env.match(/SUPABASE_SERVICE_KEY=([^\n]+)/)[1];
const supabase = createClient('https://bdmmstatrsenidlgjock.supabase.co', svcKey);
const hotelId = 'f1f8de36-3126-4ba8-9cc6-b11cefb276ca';

const now = new Date();

function hoursAgo(h) {
  return new Date(now.getTime() - h * 3600000).toISOString();
}

(async () => {
  // Clear existing requests/messages/schedules from simulation
  await supabase.from('requests').delete().eq('hotel_id', hotelId);
  await supabase.from('messages').delete().eq('hotel_id', hotelId);
  await supabase.from('staff_schedules').delete().eq('hotel_id', hotelId);
  console.log('Cleared old test data');

  // ========== ROOM MAP (54 rooms at BW FTL 10272) ==========
  const rooms = ['101','102','103','104','105','106','107','108','109','110','111','112','113','114','115',
    '201','202','203','204','205','206','207','208','209','210','211','212','213','214',
    '301','302','303','304','305','306','307','308','309','310','311','312','313','314',
    '401','402','403','404','405','406','407','408','409','410','411','412'];

  function randomRoom() { return rooms[Math.floor(Math.random() * rooms.length)]; }
  function randomName() { return guestNames[Math.floor(Math.random() * guestNames.length)]; }

  // ========== GUEST PROFILES ==========
  const guestNames = [
    'James Thompson', 'Maria Rodriguez', 'Robert Kim', 'Jennifer Walsh', 'Michael Chen',
    'Lisa Anderson', 'David Martinez', 'Sarah Johnson', 'Thomas Brown', 'Emily Davis',
    'Carlos Gomez', 'Amanda White', 'Kevin O\'Brien', 'Jessica Taylor', 'William Garcia',
    'Ashley Wilson', 'Brian Lee', 'Stephanie Moore', 'Daniel Jackson', 'Nicole Martin',
    'Chris Evans', 'Rebecca Scott', 'Andrew Turner', 'Megan Adams', 'Ryan Phillips',
    'Lauren Campbell', 'Jason Parker', 'Victoria Hall', 'Brandon Wright', 'Samantha King',
    'Luis Hernandez', 'Katherine Allen', 'Patrick Nelson', 'Rachel Hill', 'Sean Collins',
    'Heather Reed', 'Francisco Torres', 'Danielle Cook', 'Edward Morgan', 'Christina Cooper'
  ];

  // ========== REQUEST TYPES ==========
  const requestTypes = [
    { type: 'Housekeeping', msg: ['Need fresh towels please', 'Room needs cleaning', 'Trash needs to be taken out', 'Sheets need changing', 'Need extra blankets', 'Room not cleaned today'] },
    { type: 'Amenity Request', msg: ['Extra pillows (2x)', 'More coffee pods', 'Need a hair dryer', 'Iron and ironing board please', 'Extra toiletries', 'Need a crib for baby'] },
    { type: 'Food Order', msg: ['Continental breakfast - Room __', '2x burgers and fries', 'Coffee and pastries', 'Margherita pizza and salad', 'Chicken sandwich with fries', 'Fruit platter and yogurt'] },
    { type: 'Maintenance', msg: ['Toilet running constantly', 'TV remote not working', 'Light bulb out in bathroom', 'Sink draining slow', 'Door lock sticking', 'Heating not working'] },
    { type: 'Shuttle Booking', msg: ['FLL drop-off at 8am tomorrow - 2 pax', 'Port Everglades - 9:30am - 4 pax 6 bags', 'MIA airport shuttle tonight 7pm - 1 pax', 'Port of Miami cruise pickup 11am - 2 pax', 'FLL pickup from arrivals - 3:30pm', 'Late airport run 10pm - 1 pax'] },
    { type: 'Front Desk', msg: ['Need extra key card', 'Can you hold packages for me?', 'Need a late checkout', 'Where is the ice machine?', 'Can I get a wake-up call?', 'Need to extend my stay'] },
  ];

  console.log('========== BUSY DAY SIMULATION ==========\n');

  // ========== PHASE 1: MORNING RUSH (6am-9am) - Checkouts, Breakfast, Shuttles ==========
  console.log('--- MORNING RUSH (6am-9am): Checkouts, Breakfast, Shuttles ---');
  
  const morningRequests = [];
  for (let i = 0; i < 8; i++) {
    const r = i % requestTypes.length;
    const rt = requestTypes[r];
    const msg = rt.msg[i % rt.msg.length].replace('__', randomRoom());
    const guestName = guestNames[i];
    morningRequests.push({
      hotel_id: hotelId,
      guest_name: guestName,
      room: randomRoom(),
      type: rt.type,
      details: msg,
      status: i < 3 ? 'completed' : i < 5 ? 'in-progress' : 'pending',
      assigned_to: i < 3 ? 'Front Desk Agent' : i < 5 ? 'Housekeeping' : null,
      created_at: hoursAgo(12 + Math.random() * 3),
    });
  }
  const { error: mErr } = await supabase.from('requests').insert(morningRequests);
  console.log(`  Created ${morningRequests.length} morning requests (checkouts/breakfast/shuttles), statuses: completed=3, in-progress=2, pending=3`);

  // ========== PHASE 2: MIDDAY SURGE (10am-2pm) - Housekeeping, Food Orders, Maintenance ==========
  console.log('\n--- MIDDAY SURGE (10am-2pm): Housekeeping, Food Orders, Maintenance ---');

  const middayRequests = [];
  for (let i = 8; i < 20; i++) {
    const r = i % requestTypes.length;
    const rt = requestTypes[r];
    const msg = rt.msg[i % rt.msg.length].replace('__', randomRoom());
    middayRequests.push({
      hotel_id: hotelId,
      guest_name: guestNames[i],
      room: randomRoom(),
      type: rt.type,
      details: msg,
      status: i < 12 ? 'in-progress' : 'pending',
      assigned_to: i < 12 ? (rt.type === 'Housekeeping' ? 'Housekeeping' : rt.type === 'Maintenance' ? 'Maintenance' : 'Front Desk Agent') : null,
      created_at: hoursAgo(5 + Math.random() * 4),
    });
  }
  const { error: midErr } = await supabase.from('requests').insert(middayRequests);
  console.log(`  Created ${middayRequests.length} midday requests (peak check-in/room issues), statuses: in-progress=4, pending=8`);

  // ========== PHASE 3: AFTERNOON (2pm-6pm) - New Check-ins, Shuttle Bookings, Late Requests ==========
  console.log('\n--- AFTERNOON (2pm-6pm): New Check-ins, Amenity Requests ---');

  const afternoonRequests = [];
  for (let i = 20; i < 28; i++) {
    const r = i % requestTypes.length;
    const rt = requestTypes[r];
    const msg = rt.msg[i % rt.msg.length].replace('__', randomRoom());
    afternoonRequests.push({
      hotel_id: hotelId,
      guest_name: guestNames[i],
      room: randomRoom(),
      type: rt.type,
      details: msg,
      status: 'pending',
      assigned_to: null,
      created_at: hoursAgo(1 + Math.random() * 3),
    });
  }
  const { error: aftErr } = await supabase.from('requests').insert(afternoonRequests);
  console.log(`  Created ${afternoonRequests.length} afternoon requests (all pending)`);

  // ========== GUEST MESSAGES ==========
  console.log('\n--- GUEST MESSAGES ---');

  const guestMessages = [
    { name: 'James Thompson', room: '207', msg: 'The wifi keeps disconnecting every 10 minutes. Can someone check?' },
    { name: 'Maria Rodriguez', room: '105', msg: 'Gracias! El desayuno estuvo excelente. Pregunta - hay plancha en la habitacion?' },
    { name: 'Robert Kim', room: '312', msg: 'Need a recommendation for a good Korean restaurant nearby please!' },
    { name: 'Sarah Johnson', room: '401', msg: 'Left my phone charger in the room after checkout. Can you mail it?' },
    { name: 'Carlos Gomez', room: '208', msg: 'Can you book a taxi for 4 people to the airport at 5am tomorrow?' },
    { name: 'Jennifer Walsh', room: '110', msg: 'The air conditioner is making a loud banging noise. Very hard to sleep.' },
    { name: 'Amanda White', room: '304', msg: 'Do you have any vegan options on the room service menu?' },
    { name: 'Kevin O\'Brien', room: '215', msg: 'Pool was great! What time does it close today?' },
  ];

  let msgCount = 0;
  for (const m of guestMessages) {
    const { error } = await supabase.from('messages').insert({
      hotel_id: hotelId,
      guest_name: m.name,
      room: m.room,
      sender: 'guest',
      body: m.msg,
      created_at: hoursAgo(0.5 + Math.random() * 6),
    });
    if (!error) msgCount++;
  }
  console.log(`  ${msgCount} guest messages created`);

  // ========== STAFF REPLIES ==========
  console.log('\n--- STAFF REPLIES ---');

  const staffReplies = [
    { name: 'James Thompson', room: '207', msg: 'Hi James, we\'ll send maintenance to check the wifi in your room right away. - Front Desk' },
    { name: 'Maria Rodriguez', room: '105', msg: 'Hola Maria! Si, hay plancha en el armario. Que tenga buen dia!' },
    { name: 'Robert Kim', room: '312', msg: "Hi Robert! Try Kim's Garden on Commercial Blvd - about 5 min drive. Menu at front desk!" },
    { name: 'Amanda White', room: '304', msg: 'Absolutely! Our kitchen can prepare a vegan platter - just let us know preferences. - Room Service' },
    { name: 'Kevin O\'Brien', room: '215', msg: 'Glad you enjoyed it! Pool closes at 10pm. - Front Desk' },
  ];

  let replyCount = 0;
  for (const r of staffReplies) {
    const { error } = await supabase.from('messages').insert({
      hotel_id: hotelId,
      guest_name: r.name,
      room: r.room,
      sender: 'staff',
      body: r.msg,
      created_at: hoursAgo(0.2 + Math.random() * 3),
    });
    if (!error) replyCount++;
  }
  console.log(`  ${replyCount} staff replies sent`);

  // ========== STAFF SCHEDULES FOR THE DAY ==========
  console.log('\n--- STAFF SCHEDULES ---');

  const today = new Date().toISOString().split('T')[0];
  const schedules = [
    { hotel_id: hotelId, staff_name: 'Alejandro Soria', shift_date: today, start_time: '06:00', end_time: '14:00', role: 'general_manager' },
    { hotel_id: hotelId, staff_name: 'Front Desk Agent', shift_date: today, start_time: '06:00', end_time: '14:00', role: 'front_desk' },
    { hotel_id: hotelId, staff_name: 'Front Desk Agent', shift_date: today, start_time: '14:00', end_time: '22:00', role: 'front_desk' },
    { hotel_id: hotelId, staff_name: 'Housekeeping', shift_date: today, start_time: '07:00', end_time: '15:00', role: 'housekeeping' },
    { hotel_id: hotelId, staff_name: 'Housekeeping', shift_date: today, start_time: '15:00', end_time: '23:00', role: 'housekeeping' },
  ];

  for (const s of schedules) {
    await supabase.from('staff_schedules').insert(s);
  }
  console.log(`  ${schedules.length} staff schedules created for today`);

  // ========== SUMMARY ==========
  console.log('\n--- FINAL SUMMARY ---');
  const { count: totalReqs } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  const { data: statusCounts } = await supabase.from('requests').select('status').eq('hotel_id', hotelId);
  const pending = statusCounts.filter(r => r.status === 'pending').length;
  const inProg = statusCounts.filter(r => r.status === 'in-progress').length;
  const completed = statusCounts.filter(r => r.status === 'completed').length;

  console.log(`  Total requests today: ${totalReqs}`);
  console.log(`    Pending: ${pending}`);
  console.log(`    In Progress: ${inProg}`);
  console.log(`    Completed: ${completed}`);

  const { count: totalMsgs } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  console.log(`  Total messages: ${totalMsgs}`);

  const { count: totalScheds } = await supabase.from('staff_schedules').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  console.log(`  Staff schedules: ${totalScheds}`);

  const { count: totalRooms } = await supabase.from('hotel_rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  console.log(`  Rooms configured: ${totalRooms}`);

  const { count: totalRoutes } = await supabase.from('shuttle_routes').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  const { count: totalSlots } = await supabase.from('shuttle_slots').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  console.log(`  Shuttle routes: ${totalRoutes} (${totalSlots} slots for next 7 days)`);

  console.log('\n✅ BUSY DAY SIMULATION COMPLETE');
})();