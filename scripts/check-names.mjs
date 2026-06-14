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
  const { data: allStaff, error: staffErr } = await supabase
    .from('staff_accounts')
    .select('id, name')
    .eq('hotel_id', HOTEL_ID)
    .eq('active', true);

  if (staffErr) { console.error('Staff fetch error:', staffErr); return; }

  console.log(`Found ${allStaff.length} active staff\n`);
  
  // Build name map — normalize: lowercase, strip parenthetical suffixes, strip spaces
  const staffMap = {};
  allStaff.forEach(s => { 
    const raw = s.name.trim().toLowerCase();
    // Get first word(s) before any parenthesis
    const simple = raw.replace(/\(.*\)/g, '').trim();
    staffMap[simple] = s.id;
    staffMap[raw] = s.id;
    console.log(`  "${s.name}" -> match key: "${simple}"`);
  });

  // Check all our shift names resolve
  const shiftNames = ['alejandro soria','front desk agent','housekeeping','hermes agent','testkaryl',
    'manager on duty','karyl','marc',"daii'quon",'darwin','edwin','david','rosa','yamilet','fabiola',
    'lidia','delia','kathy','estefani','marivel'];

  console.log('\nName resolution check:');
  shiftNames.forEach(n => {
    console.log(`  "${n}" -> ${staffMap[n] ? staffMap[n].substring(0,8) : '❌ NOT FOUND'}`);
  });
}

main().catch(console.error);