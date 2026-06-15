const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bdmmstatrsenidlgjock.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!serviceKey) {
  console.error('ERROR: SUPABASE_SERVICE_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log('Checking if position_budgets column exists...');
  
  // Try to query it
  const { data, error } = await supabase
    .from('hotels')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Hotels table query failed:', error.message);
    process.exit(1);
  }

  console.log(`Found ${data.length} hotels in DB`);

  // Use the SQL execution method available to service_role
  const migrationSql = `
    ALTER TABLE hotels 
    ADD COLUMN IF NOT EXISTS position_budgets JSONB 
    NOT NULL DEFAULT '[]'::jsonb;
  `;

  // Try via raw SQL endpoint (service_role bypasses RLS)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('exec_sql', {
    sql_text: migrationSql
  });

  // Handle both styles of exec_sql
  if (!rpcError) {
    console.log('Column added via exec_sql:', rpcResult);
  } else {
    console.log('exec_sql not available:', rpcError.message);
    console.log('Trying direct ALTER TABLE via raw query...');
    
    // Fallback: Directly query to check + use the SQL editor approach
    const { data: checkData, error: checkError } = await supabase
      .from('hotels')
      .select('position_budgets')
      .limit(1);
    
    if (checkError && checkError.message.includes('does not exist')) {
      console.log('Confirmed: column does not exist.');
      console.log('ALTER TABLE via service_role client not directly supported from REST.');
      console.log('');
      console.log('Please run this SQL in the Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/bdmmstatrsenidlgjock/sql/new');
      console.log('');
      console.log('SQL to run:');
      console.log(migrationSql);
    } else if (!checkError) {
      console.log('position_budgets column already exists! Data:', checkData);
    } else {
      console.log('Unexpected error:', checkError.message);
    }
  }

  // Verify existing column structure
  const { data: columns, error: colError } = await supabase
    .rpc('exec_sql', { sql_text: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='hotels' ORDER BY ordinal_position" });
  
  if (!colError && columns) {
    console.log('\nHotels table columns:');
    columns.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});