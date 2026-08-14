import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * ElevenLabs server tool: Create a room service order for a guest.
 * Called by the Room Ordering agent.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guest_name, room_number, items, notes, hotel_id } = body;

    if (!guest_name || !room_number || !items) {
      return NextResponse.json({ error: 'guest_name, room_number, and items are required' }, { status: 400 });
    }

    const resolvedHotelId = hotel_id || '7feb88fa-a72c-4c5d-b094-b4948bdab1d7';
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.from('requests').insert({
      hotel_id: resolvedHotelId,
      guest_name,
      room: room_number,
      type: 'Room Service',
      details: `Order: ${items}${notes ? ` | Notes: ${notes}` : ''}`,
      status: 'pending',
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      order_id: data.id,
      message: `Order placed for ${guest_name} (Room ${room_number}): ${items}. Staff has been notified and will prepare your order.`,
    });
  } catch (e) {
    console.error('Create order tool error:', e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}