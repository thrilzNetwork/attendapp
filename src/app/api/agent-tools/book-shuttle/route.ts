import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * ElevenLabs server tool: Book a shuttle ride for a guest.
 * Full intake: name, passengers, airline, terminal, time, callback number.
 * Creates a shuttle_request + staff request → appears on Attenda transportation dashboard.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      guest_name,
      room_number,
      destination,
      pickup_location,
      date,
      time,
      pax,
      notes,
      airline,
      terminal,
      callback_number,
      flight_number,
      hotel_id,
    } = body;

    if (!guest_name) {
      return NextResponse.json({ error: 'guest_name is required' }, { status: 400 });
    }
    if (!destination) {
      return NextResponse.json({ error: 'destination is required' }, { status: 400 });
    }

    const resolvedHotelId = hotel_id || '7feb88fa-a72c-4c5d-b094-b4948bdab1d7';
    const resolvedRoom = room_number || 'N/A';
    const resolvedPax = pax || 1;

    // Build details string with all intake info
    const detailParts: string[] = [`Shuttle to ${destination}`];
    if (time) detailParts.push(`at ${time}`);
    detailParts.push(`${resolvedPax} passenger${resolvedPax > 1 ? 's' : ''}`);
    if (airline) detailParts.push(`Airline: ${airline}`);
    if (terminal) detailParts.push(`Terminal: ${terminal}`);
    if (flight_number) detailParts.push(`Flight: ${flight_number}`);
    if (callback_number) detailParts.push(`Callback: ${callback_number}`);
    if (pickup_location) detailParts.push(`Pickup: ${pickup_location}`);
    const fullDetails = detailParts.join(' | ');

    const supabase = getSupabaseAdmin();

    // Build notes incorporating all intake fields (airline/terminal/flight/callback
    // are kept in notes rather than separate columns to avoid schema dependency)
    const noteParts: string[] = [notes || `Booked via AI Agent at ${new Date().toLocaleTimeString()}`];
    if (airline) noteParts.push(`Airline: ${airline}`);
    if (flight_number) noteParts.push(`Flight: ${flight_number}`);
    if (terminal) noteParts.push(`Terminal: ${terminal}`);
    if (callback_number) noteParts.push(`Callback: ${callback_number}`);
    const combinedNotes = noteParts.join(' | ');

    const { data, error } = await supabase.from('shuttle_requests').insert({
      hotel_id: resolvedHotelId,
      guest_name,
      room_number: resolvedRoom,
      destination,
      pickup_location: pickup_location || 'Hotel Lobby',
      date: date || new Date().toISOString().split('T')[0],
      time: time || null,
      pax: resolvedPax,
      notes: combinedNotes,
      status: 'pending',
    }).select().single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      shuttle_request_id: data.id,
      message: `Got it. I have ${guest_name} booked for ${time || 'now'} to ${destination}, ${resolvedPax} passenger${resolvedPax > 1 ? 's' : ''}${airline ? `, ${airline}` : ''}${terminal ? `, terminal ${terminal}` : ''}. Your request has been sent to our driver. Is there anything else?`,
    });
  } catch (e) {
    console.error('Book shuttle tool error:', e);
    return NextResponse.json({ error: 'Failed to book shuttle' }, { status: 500 });
  }
}