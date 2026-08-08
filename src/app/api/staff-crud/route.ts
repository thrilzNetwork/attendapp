import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getCaller, resolveHotelScope, callerOwnsRow } from '@/lib/supabase-admin';
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
    const hasValidKey = validateApiKey(req);
    if (!hasValidKey) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Origin check — soft gate against non-browser clients.
    // Skip if API key is valid (the key is the real auth).
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!hasValidKey && !isAllowedOrigin(origin, referer)) {
      return originBlocked();
    }

    // Identify the caller from their session and lock them to their own hotel.
    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, hotelId, staff, staffId, updates } = body;

    // Resolve slug → UUID if a hotelId was supplied (used by superadmins).
    let requestedHotelId = hotelId;
    if (hotelId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hotelId)) {
      const { data: hotel } = await supabaseAdmin
        .from('hotels')
        .select('id')
        .eq('slug', hotelId)
        .maybeSingle();
      if (hotel) requestedHotelId = hotel.id;
    }

    // The hotel this caller is actually allowed to act on. Staff are pinned to
    // their own hotel; superadmins use the one they requested.
    const scopedHotelId = resolveHotelScope(caller, requestedHotelId);

    // ── List staff for a hotel ──
    if (action === 'list') {
      if (!scopedHotelId) {
        return NextResponse.json({ ok: false, error: 'No hotel in scope.' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('staff_accounts')
        .select('*')
        .eq('hotel_id', scopedHotelId)
        .order('name');
      if (error) throw new Error(error.message || JSON.stringify(error));
      // Strip PIN codes from response — never expose to frontend
      const sanitized = (data || []).map(stripPin);
      return NextResponse.json({ ok: true, data: sanitized });
    }

    // ── Create staff ──
    if (action === 'create') {
      if (!staff) {
        return NextResponse.json({ ok: false, error: 'staff data required.' }, { status: 400 });
      }
      // Staff are pinned to their own hotel; superadmins may target the hotel
      // named on the record (or the one they requested).
      const createHotelId = caller.isSuper
        ? (requestedHotelId || staff.hotel_id || null)
        : caller.hotelId;
      if (!createHotelId) {
        return NextResponse.json({ ok: false, error: 'No hotel in scope.' }, { status: 400 });
      }
      // Force the new record into the resolved hotel — never trust client hotel_id for staff.
      const { data, error } = await supabaseAdmin
        .from('staff_accounts')
        .insert({ ...staff, hotel_id: createHotelId })
        .select()
        .single();
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true, data: stripPin(data) });
    }

    // ── Update staff ──
    if (action === 'update') {
      if (!staffId || !updates) {
        return NextResponse.json({ ok: false, error: 'staffId and updates required.' }, { status: 400 });
      }
      if (!(await callerOwnsRow(caller, 'staff_accounts', staffId))) {
        return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
      }
      // Don't allow the row to be moved to another hotel.
      const safeUpdates = { ...updates };
      delete safeUpdates.hotel_id;
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .update(safeUpdates)
        .eq('id', staffId);
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true });
    }

    // ── Set a staff member's password (admin/superadmin) ──
    if (action === 'set_password') {
      if (!staffId || !updates?.password || typeof updates.password !== 'string') {
        return NextResponse.json({ ok: false, error: 'staffId and password required.' }, { status: 400 });
      }
      if (updates.password.length < 6) {
        return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
      }
      if (!(await callerOwnsRow(caller, 'staff_accounts', staffId))) {
        return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
      }
      // Find the auth user id linked to this staff record
      const { data: staffRow } = await supabaseAdmin
        .from('staff_accounts')
        .select('id, email, auth_user_id')
        .eq('id', staffId)
        .maybeSingle();
      if (!staffRow) {
        return NextResponse.json({ ok: false, error: 'Staff account not found.' }, { status: 404 });
      }
      if (!staffRow.auth_user_id) {
        return NextResponse.json({ ok: false, error: 'This staff member has no linked login yet. Resend their invite so they can set up their account.' }, { status: 400 });
      }
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(staffRow.auth_user_id, {
        password: updates.password,
      });
      if (authErr) throw new Error(authErr.message || 'Failed to update auth password');
      return NextResponse.json({ ok: true });
    }

    // ── Bulk reset ALL staff passwords in the caller's hotel to a generic one ──
    if (action === 'reset_all_passwords') {
      if (!scopedHotelId) {
        return NextResponse.json({ ok: false, error: 'No hotel in scope.' }, { status: 400 });
      }
      const tempPassword = (updates?.temp_password as string) || 'Attenda2026!';
      if (typeof tempPassword !== 'string' || tempPassword.length < 6) {
        return NextResponse.json({ ok: false, error: 'temp_password must be at least 6 characters.' }, { status: 400 });
      }
      // Only hotel admins/managers or superadmins may bulk-reset
      if (!caller.isSuper) {
        const { data: callerRow } = await supabaseAdmin
          .from('staff_accounts')
          .select('role')
          .eq('auth_user_id', caller.userId)
          .maybeSingle();
        const role = callerRow?.role;
        if (role !== 'admin' && role !== 'manager' && role !== 'general_manager') {
          return NextResponse.json({ ok: false, error: 'Only admins may reset staff passwords.' }, { status: 403 });
        }
      }
      // Fetch staff with linked auth users for this hotel
      const { data: rows, error: listErr } = await supabaseAdmin
        .from('staff_accounts')
        .select('id, email, auth_user_id')
        .eq('hotel_id', scopedHotelId)
        .not('auth_user_id', 'is', null);
      if (listErr) throw new Error(listErr.message || 'Failed to list staff');
      let updated = 0;
      const skipped: string[] = [];
      for (const row of rows || []) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(row.auth_user_id, {
          password: tempPassword,
          user_metadata: { ...(row.email ? {} : {}), force_password_change: true },
        });
        if (authErr) skipped.push(row.email || row.id);
        else updated++;
      }
      return NextResponse.json({ ok: true, updated, skipped, temp_password: tempPassword });
    }

    // ── Delete staff ──
    if (action === 'delete') {
      if (!staffId) {
        return NextResponse.json({ ok: false, error: 'staffId required.' }, { status: 400 });
      }
      if (!(await callerOwnsRow(caller, 'staff_accounts', staffId))) {
        return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
      }
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .delete()
        .eq('id', staffId);
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true });
    }

    // ── Get single staff ──
    if (action === 'get') {
      if (!staffId) {
        return NextResponse.json({ ok: false, error: 'staffId required.' }, { status: 400 });
      }
      if (!(await callerOwnsRow(caller, 'staff_accounts', staffId))) {
        return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
      }
      const { data, error } = await supabaseAdmin
        .from('staff_accounts')
        .select('*')
        .eq('id', staffId)
        .single();
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true, data: stripPin(data) });
    }

    // ── Get single staff by email (scoped to the caller's hotel) ──
    if (action === 'get_by_email') {
      const staffEmail = body.email;
      if (!staffEmail) {
        return NextResponse.json({ ok: false, error: 'email required.' }, { status: 400 });
      }
      let query = supabaseAdmin
        .from('staff_accounts')
        .select('*')
        .ilike('email', staffEmail);
      // Scope to hotel when known; during first-login the JWT may not yet carry
      // hotel_id so we fall back to email-only lookup (admin client is used, safe).
      if (!caller.isSuper) {
        if (scopedHotelId) {
          query = query.eq('hotel_id', scopedHotelId);
        }
        // else: no hotel in JWT yet — search by email only, accept any hotel
      } else if (requestedHotelId) {
        query = query.eq('hotel_id', requestedHotelId);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message || JSON.stringify(error));
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
