import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * ElevenLabs server tool: Get hotel info
 * Called by the agent when a visitor asks about a specific hotel.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hotel_slug, hotel_id } = body;
    const supabase = getSupabaseAdmin();

    let query = supabase.from('hotels').select('id, name, slug, brand_color, address, phone');
    if (hotel_id) {
      query = query.eq('id', hotel_id);
    } else if (hotel_slug) {
      query = query.eq('slug', hotel_slug);
    } else {
      // Return all hotels
      const { data, error } = await query.limit(10);
      if (error) throw error;
      return NextResponse.json({ hotels: data || [] });
    }

    const { data, error } = await query.single();
    if (error) throw error;

    return NextResponse.json({ hotel: data });
  } catch (e) {
    console.error('Tool error:', e);
    return NextResponse.json({ error: 'Failed to fetch hotel info' }, { status: 500 });
  }
}