import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  const deviceId = searchParams.get('deviceId');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (!hotelId) {
    return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  let q = db
    .from('bouncie_trips')
    .select('*')
    .eq('hotel_id', hotelId)
    .gte('start_at', `${date}T00:00:00Z`)
    .lte('start_at', `${date}T23:59:59Z`)
    .order('start_at', { ascending: true });

  if (deviceId) q = q.eq('device_id', deviceId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, trips: data || [] });
}
