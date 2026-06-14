import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';

const envRaw = readFileSync('/Users/thrilzco/projects/attenda/.env.local', 'utf8');
const env = {};
envRaw.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const HOTEL_ID = 'f1f8de36-3126-4ba8-9cc6-b11cefb276ca';

async function main() {
  // Check staff_accounts - no filter
  const { data: allStaff, error: staffErr } = await supabase
    .from('staff_accounts')
    .select('id, name, active')
    .eq('hotel_id', HOTEL_ID)
    .limit(50);

  if (staffErr) { console.error('Staff fetch error:', staffErr); return; }

  console.log(`Found ${allStaff.length} staff rows\n`);
  allStaff.forEach(s => console.log(`  ${s.active ? 'ACTIVE' : 'INACTIVE'} ${s.name} (${s.id.substring(0,8)})`));

  // Check schedules table schema
  const { data: sched } = await supabase
    .from('schedules')
    .select('*')
    .eq('hotel_id', HOTEL_ID)
    .limit(5);

  if (sched && sched.length > 0) {
    console.log('\nSample schedule row:', JSON.stringify(sched[0], null, 2));
  } else {
    console.log('\nNo schedules found. Checking schema...');
    // Try just getting column info
    const { data: anySched } = await supabase.from('schedules').select('*').limit(1);
    console.log('schedules query result:', anySched);
  }
}

main().catch(console.error);