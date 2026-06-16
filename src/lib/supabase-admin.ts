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

export interface Caller {
  userId: string;
  email: string | null;
  hotelId: string | null;
  isSuper: boolean;
}

/**
 * Resolve the authenticated caller from a request's Bearer token.
 *
 * IMPORTANT: the caller's hotel is derived from the staff_accounts table on the
 * server — NOT from JWT user_metadata, because clients can write their own
 * metadata via supabase.auth.updateUser() and could otherwise spoof hotel_id.
 * Returns null when there is no valid session.
 */
export async function getCaller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  if (!token) return null;

  const user = await verifySession(token);
  if (!user) return null;

  const isSuper = await isSuperAdmin(user.id);
  let hotelId: string | null = null;
  if (!isSuper && user.email) {
    // Case-insensitive match — staff_accounts.email may have been entered with
    // different casing than the auth user's email.
    const { data } = await getAdmin()
      .from('staff_accounts')
      .select('hotel_id')
      .ilike('email', user.email)
      .limit(1);
    hotelId = (data && data[0]?.hotel_id) || null;
  }

  return { userId: user.id, email: user.email ?? null, hotelId, isSuper };
}

/**
 * The hotel_id this caller is allowed to act on.
 * Superadmins may act on any hotel they explicitly request; staff are always
 * locked to their own hotel regardless of what the client sends.
 * Returns null when the caller has no hotel and is not a superadmin.
 */
export function resolveHotelScope(caller: Caller, requested?: string | null): string | null {
  if (caller.isSuper) return requested || null;
  return caller.hotelId;
}

/**
 * Verify a single row belongs to the caller's allowed hotel before mutating it.
 * Superadmins pass automatically.
 */
export async function callerOwnsRow(
  caller: Caller,
  table: string,
  id: string,
): Promise<boolean> {
  if (caller.isSuper) return true;
  if (!caller.hotelId) return false;
  const { data } = await getAdmin().from(table).select('hotel_id').eq('id', id).maybeSingle();
  return !!data && data.hotel_id === caller.hotelId;
}
