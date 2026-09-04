import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pitch/[key] — public, unauthenticated.
 * The pitch key IS the credential: each corporate_client gets a random
 * pitch_key (shown in Super Admin). Share /pitch/<key> with a partner —
 * it renders the Attenda presentation personalized with that property's
 * key info, without exposing the admin console or other clients.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  if (!/^[a-f0-9]{8,64}$/i.test(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('corporate_clients')
    .select('slug, name, brand, rooms, address, notes, pitch_key')
    .eq('pitch_key', key)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ client: data });
}