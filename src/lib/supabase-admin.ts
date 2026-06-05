import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbW1zdGF0cnNlbmlkbGdqb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE5MjAsImV4cCI6MjA5NDE4NzkyMH0.1pnioO5Y_3pW2LTaYc9aliRwTkGhX2cTNLrK9jI1P-4';

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!_admin) {
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!key || key === 'dev-build-noop-key' || key === 'placeholder') {
      // Create a thin wrapper that redirects to anon client when service key isn't set
      // This lets local dev / build work without the key
      const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      _admin = new Proxy(anonClient, {
        get(target, prop) {
          return (target as unknown as Record<string | symbol, unknown>)[prop];
        },
      }) as unknown as SupabaseClient;
    } else {
      _admin = createClient(SUPABASE_URL, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }
  return _admin;
}

// Named export
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getAdmin();
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Verify a user's session (works with anon key — no service_role needed for this)
export async function verifySession(token: string) {
  // Use anon client for token verification (doesn't need service_role)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Check if a user is the registered superadmin
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data } = await getAdmin()
    .from('superadmin_config')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}