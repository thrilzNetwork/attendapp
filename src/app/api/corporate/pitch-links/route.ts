import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';
export const dynamic = 'force-dynamic';

/**
 * GET /api/corporate/pitch-links (super admin only)
 * Returns every corporate client with its pitch_key so the Links tab can
 * surface copy-ready personalized pitch links: attendaapp.com/pitch/<key>
 */
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId || !caller.isSuper) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('corporate_clients')
    .select('id, slug, name, brand, rooms, status, pitch_key')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data || [] });
}