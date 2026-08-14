import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * ElevenLabs server tool: Create a service request for a guest.
 * Called by the Customer Service agent.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guest_name, room_number, type, details, hotel_id } = body;

    if (!guest_name || !room_number || !type) {
      return NextResponse.json({ error: 'guest_name, room_number, and type are required' }, { status: 400 });
    }

    const resolvedHotelId = hotel_id || '7feb88fa-a72c-4c5d-b094-b4948bdab1d7';
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.from('requests').insert({
      hotel_id: resolvedHotelId,
      guest_name,
      room: room_number,
      type,
      details: details || `Requested via AI assistant at ${new Date().toLocaleTimeString()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      request_id: data.id,
      message: `Request created: ${type} for ${guest_name} (Room ${room_number}). Staff has been notified.`,
    });
  } catch (e) {
    console.error('Create request tool error:', e);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}