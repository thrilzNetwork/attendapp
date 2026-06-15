import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

// Strip pin_code from staff records before sending to frontend
function stripPin(record: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!record) return null;
  const cleaned = { ...record };
  delete cleaned.pin_code;
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    // Require shared API key
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Origin check
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!isAllowedOrigin(origin, referer)) {
      return originBlocked();
    }

    const body = await req.json();
    const { action, hotelId, staff, staffId, updates } = body;

    // Resolve slug → UUID if hotelId is not a UUID
    let resolvedHotelId = hotelId;
    if (hotelId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hotelId)) {
      const { data: hotel } = await supabaseAdmin
        .from('hotels')
        .select('id')
        .eq('slug', hotelId)
        .maybeSingle();
      if (hotel) resolvedHotelId = hotel.id;
    }

    // ── List staff for a hotel ──
    if (action === 'list') {
      if (!resolvedHotelId) {
        return NextResponse.json({ ok: false, error: 'hotelId required.' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('staff_accounts')
        .select('*')
        .eq('hotel_id', resolvedHotelId)
        .order('name');
      if (error) throw error;
      // Strip PIN codes from response — never expose to frontend
      const sanitized = (data || []).map(stripPin);
      return NextResponse.json({ ok: true, data: sanitized });
    }

    // ── Create staff ──
    if (action === 'create') {
      if (!staff) {
        return NextResponse.json({ ok: false, error: 'staff data required.' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('staff_accounts')
        .insert(staff)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data: stripPin(data) });
    }

    // ── Update staff ──
    if (action === 'update') {
      if (!staffId || !updates) {
        return NextResponse.json({ ok: false, error: 'staffId and updates required.' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .update(updates)
        .eq('id', staffId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ── Delete staff ──
    if (action === 'delete') {
      if (!staffId) {
        return NextResponse.json({ ok: false, error: 'staffId required.' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .delete()
        .eq('id', staffId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ── Get single staff ──
    if (action === 'get') {
      if (!staffId) {
        return NextResponse.json({ ok: false, error: 'staffId required.' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('staff_accounts')
        .select('*')
        .eq('id', staffId)
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data: stripPin(data) });
    }

    // ── Get single staff by email ──
    if (action === 'get_by_email') {
      const staffEmail = body.email;
      if (!staffEmail) {
        return NextResponse.json({ ok: false, error: 'email required.' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('staff_accounts')
        .select('*')
        .eq('email', staffEmail)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ ok: true, data: stripPin(data) });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Staff CRUD error';
    const detail = typeof err === 'object' && err !== null ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err);
    console.error('[staff-crud] ERROR:', message, detail);
    return NextResponse.json({ ok: false, error: message, detail: detail.slice(0,1000) }, { status: 500 });
  }
}
