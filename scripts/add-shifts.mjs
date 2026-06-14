import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';
const envRaw = readFileSync('/Users/thrilzco/projects/attenda/.env.local', 'utf8');
const env = {};
envRaw.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const HOTEL_ID = 'f1f8de36-3126-4ba8-9cc6-b11cefb276ca';

async function main() {
  // Get all active staff
  const { data: allStaff, error: staffErr } = await supabase
    .from('staff_accounts')
    .select('id, name')
    .eq('hotel_id', HOTEL_ID)
    .eq('active', true);

  if (staffErr) { console.error('Staff fetch error:', staffErr); return; }

  console.log(`Found ${allStaff.length} active staff\n`);

  // Build multi-key map: try raw name, name without parens, first word only
  const staffMap = {};
  allStaff.forEach(s => {
    const raw = s.name.trim().toLowerCase();
    const noParens = raw.replace(/\s*\(.*?\)\s*/g, '').trim(); // "estefani (hk)" -> "estefani"
    const firstWord = raw.split(/[\s(]/)[0]; // "estefani (hk)" -> "estefani"
    
    staffMap[raw] = { id: s.id, name: s.name };
    staffMap[noParens] = { id: s.id, name: s.name };
    if (firstWord !== noParens) staffMap[firstWord] = { id: s.id, name: s.name };
    
    console.log(`  ${s.name.padEnd(25)} -> keys: "${raw}", "${noParens}"`);
  });

  // Delete existing shifts
  const weekStart = '2026-06-14';
  const weekEnd = '2026-06-20';
  const { error: delErr } = await supabase
    .from('staff_schedules')
    .delete()
    .eq('hotel_id', HOTEL_ID)
    .gte('shift_date', weekStart)
    .lte('shift_date', weekEnd);

  if (delErr) { console.error('Delete error:', delErr); return; }
  console.log('\nCleared existing shifts\n');

  // shifts: [date, nameKey, start, end, role, notes]
  const shifts = [
    ['2026-06-14', 'alejandro soria',  '07:00', '15:00', 'general_manager', 'Manager'],
    ['2026-06-14', 'front desk agent',  '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-14', 'edwin',             '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-14', 'daii\'quon',        '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-14', 'david',             '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-14', 'manager on duty',   '15:00', '23:00', 'manager', 'MOD'],
    ['2026-06-14', 'marc',              '23:00', '07:00', 'front_desk', 'Night Audit'],
    ['2026-06-14', 'housekeeping',      '07:00', '15:00', 'housekeeping', 'HK Lead'],
    ['2026-06-14', 'estefani',          '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-14', 'fabiola',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-14', 'yamilet',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-15', 'alejandro soria',  '07:00', '15:00', 'general_manager', 'Manager'],
    ['2026-06-15', 'front desk agent',  '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-15', 'karyl',             '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-15', 'edwin',             '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-15', 'daii\'quon',        '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-15', 'manager on duty',   '15:00', '23:00', 'manager', 'MOD'],
    ['2026-06-15', 'marc',              '23:00', '07:00', 'front_desk', 'Night Audit'],
    ['2026-06-15', 'housekeeping',      '07:00', '15:00', 'housekeeping', 'HK Lead'],
    ['2026-06-15', 'delia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-15', 'estefani',          '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-15', 'lidia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-15', 'rosa',              '09:00', '17:00', 'housekeeping', 'HK Sup'],
    ['2026-06-15', 'fabiola',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-15', 'marivel',           '08:00', '16:00', 'laundry', 'Laundry'],
    ['2026-06-16', 'alejandro soria',  '07:00', '15:00', 'general_manager', 'Manager'],
    ['2026-06-16', 'front desk agent',  '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-16', 'karyl',             '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-16', 'testkaryl',         '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-16', 'edwin',             '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-16', 'daii\'quon',        '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-16', 'darwin',            '23:00', '07:00', 'front_desk', 'Night Audit'],
    ['2026-06-16', 'manager on duty',   '15:00', '23:00', 'manager', 'MOD'],
    ['2026-06-16', 'delia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-16', 'estefani',          '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-16', 'kathy',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-16', 'lidia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-16', 'fabiola',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-16', 'marivel',           '08:00', '16:00', 'laundry', 'Laundry'],
    ['2026-06-17', 'alejandro soria',  '07:00', '15:00', 'general_manager', 'Manager'],
    ['2026-06-17', 'daii\'quon',        '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-17', 'david',             '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-17', 'edwin',             '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-17', 'testkaryl',         '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-17', 'darwin',            '23:00', '07:00', 'front_desk', 'Night Audit'],
    ['2026-06-17', 'manager on duty',   '15:00', '23:00', 'manager', 'MOD'],
    ['2026-06-17', 'delia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-17', 'lidia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-17', 'kathy',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-17', 'rosa',              '09:00', '17:00', 'housekeeping', 'HK Sup'],
    ['2026-06-17', 'fabiola',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-17', 'yamilet',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-17', 'marivel',           '08:00', '16:00', 'laundry', 'Laundry'],
    ['2026-06-18', 'alejandro soria',  '07:00', '15:00', 'general_manager', 'Manager'],
    ['2026-06-18', 'daii\'quon',        '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-18', 'david',             '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-18', 'edwin',             '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-18', 'testkaryl',         '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-18', 'darwin',            '23:00', '07:00', 'front_desk', 'Night Audit'],
    ['2026-06-18', 'housekeeping',      '07:00', '15:00', 'housekeeping', 'HK Lead'],
    ['2026-06-18', 'delia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-18', 'kathy',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-18', 'rosa',              '09:00', '17:00', 'housekeeping', 'HK Sup'],
    ['2026-06-18', 'fabiola',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-18', 'yamilet',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-18', 'marivel',           '08:00', '16:00', 'laundry', 'Laundry'],
    ['2026-06-19', 'front desk agent',  '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-19', 'edwin',             '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-19', 'david',             '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-19', 'daii\'quon',        '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-19', 'darwin',            '23:00', '07:00', 'front_desk', 'Night Audit'],
    ['2026-06-19', 'marc',              '23:00', '07:00', 'front_desk', 'Night Audit'],
    ['2026-06-19', 'hermes agent',      '07:00', '15:00', 'manager', 'Manager'],
    ['2026-06-19', 'housekeeping',      '07:00', '15:00', 'housekeeping', 'HK Lead'],
    ['2026-06-19', 'delia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-19', 'estefani',          '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-19', 'lidia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-19', 'fabiola',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-19', 'yamilet',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-19', 'marivel',           '08:00', '16:00', 'laundry', 'Laundry'],
    ['2026-06-20', 'front desk agent',  '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-20', 'karyl',             '07:00', '15:00', 'front_desk', 'Front Desk'],
    ['2026-06-20', 'edwin',             '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-20', 'david',             '15:00', '23:00', 'front_desk', 'Front Desk'],
    ['2026-06-20', 'darwin',            '23:00', '07:00', 'front_desk', 'Night Audit'],
    ['2026-06-20', 'marc',              '23:00', '07:00', 'front_desk', 'Night Audit'],
    ['2026-06-20', 'hermes agent',      '07:00', '15:00', 'manager', 'Manager'],
    ['2026-06-20', 'manager on duty',   '15:00', '23:00', 'manager', 'MOD'],
    ['2026-06-20', 'housekeeping',      '07:00', '15:00', 'housekeeping', 'HK Lead'],
    ['2026-06-20', 'estefani',          '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-20', 'lidia',             '09:00', '17:00', 'housekeeping', 'HK'],
    ['2026-06-20', 'fabiola',           '05:00', '12:00', 'breakfast', 'Breakfast'],
    ['2026-06-20', 'yamilet',           '05:00', '12:00', 'breakfast', 'Breakfast'],
  ];

  let total = 0;
  let missed = 0;
  let badNames = [];

  for (const [date, nameKey, start, end, role, notes] of shifts) {
    const match = staffMap[nameKey];
    if (!match) {
      if (!badNames.includes(nameKey)) badNames.push(nameKey);
      missed++;
      continue;
    }
    
    const { error: insErr } = await supabase
      .from('staff_schedules')
      .insert({
        hotel_id: HOTEL_ID,
        staff_id: match.id,
        staff_name: match.name,
        shift_date: date,
        start_time: start,
        end_time: end,
        role: role,
        notes: notes,
      });

    if (insErr) {
      console.log(`❌ ${date} ${nameKey}: ${insErr.message}`);
      missed++;
    } else {
      total++;
    }
  }

  console.log(`\n✅ Done! Added ${total} shifts. Missed: ${missed}`);
  if (badNames.length > 0) console.log(`Unmatched names: ${badNames.join(', ')}`);
}

main().catch(console.error);