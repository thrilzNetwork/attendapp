import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbW1zdGF0cnNlbmlkbGdqb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE5MjAsImV4cCI6MjA5NDE4NzkyMH0.1pnioO5Y_3pW2LTaYc9aliRwTkGhX2cTNLrK9jI1P-4';

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!_admin) {
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!key || key === 'dev-build-noop-key' || key === 'placeholder') {
      // Build/dev fallback — use anon client
      _admin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      _admin = createClient(SUPABASE_URL, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }
  return _admin;
}

// Direct function that returns the client — avoids Proxy this-binding issues
export function getSupabaseAdmin(): SupabaseClient {
  return getAdmin();
}

// Convenience re-exports for common operations
export const supabaseAdmin = {
  from: (table: string) => getAdmin().from(table),
  rpc: (fn: string, params?: Record<string, unknown>) => getAdmin().rpc(fn, params),
  schema: (schema: string) => getAdmin().schema(schema),
  channel: (name: string) => getAdmin().channel(name),
  get storage() { return getAdmin().storage; },
  get auth() { return getAdmin().auth; },
  get functions() { return getAdmin().functions; },
};

// Verify a user's session (works with anon key — no service_role needed for this)
export async function verifySession(token: string) {
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
