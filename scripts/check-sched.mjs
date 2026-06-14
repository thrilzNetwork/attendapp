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
  // Try a SELECT to see the structure
  const { data, error } = await supabase
    .from('staff_schedules')
    .select('*')
    .eq('hotel_id', HOTEL_ID)
    .limit(3);

  if (error) { console.error('Error:', error); return; }
  if (data && data.length > 0) {
    console.log('Sample schedule row:', JSON.stringify(data[0], null, 2));
    console.log('Columns:', Object.keys(data[0]).join(', '));
  } else {
    console.log('Table exists but empty');
    // Try adding just one row to see what happens
    const { data: sa } = await supabase.from('staff_accounts').select('id').eq('hotel_id', HOTEL_ID).limit(1).single();
    console.log('Sample staff id:', sa?.id?.substring(0,8));
  }
}

main().catch(console.error);