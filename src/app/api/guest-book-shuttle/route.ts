import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hotel_id, guest_name, room_number, pickup_location, destination, date, time, pax, status } = body;

    if (!hotel_id || !guest_name || !destination) {
      return NextResponse.json({ error: 'hotel_id, guest_name, and destination are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.from('shuttle_requests').insert({
      hotel_id,
      guest_name,
      room_number: room_number || 'N/A',
      pickup_location: pickup_location || 'Hotel Lobby',
      destination,
      date: date || new Date().toISOString().split('T')[0],
      time: time || null,
      pax: pax || 1,
      status: status || 'pending',
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    console.error('[guest-book-shuttle]', e);
    return NextResponse.json({ error: 'Failed to create shuttle request' }, { status: 500 });
  }
}
