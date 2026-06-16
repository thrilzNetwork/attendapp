import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getCaller, resolveHotelScope, callerOwnsRow } from '@/lib/supabase-admin';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

// Handle CORS preflight (OPTIONS) — required because the client sends x-superadmin-key header
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-superadmin-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!isAllowedOrigin(origin, referer)) {
      return originBlocked();
    }

    // Identify the caller and lock them to their own hotel.
    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, hotelId, weekStart, from, to, forecast } = body;

    // Effective hotel: staff are pinned to their own; superadmins use the requested one.
    const scopedHotelId = resolveHotelScope(caller, hotelId);

    if (action === 'get_forecasts') {
      // Get forecasts for a hotel for a week range
      if (!scopedHotelId || !weekStart) {
        return NextResponse.json({ ok: false, error: 'hotel scope and weekStart required.' }, { status: 400 });
      }
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const endStr = weekEnd.toISOString().split('T')[0];

      const { data, error } = await supabaseAdmin
        .from('weekly_forecasts')
        .select('*')
        .eq('hotel_id', scopedHotelId)
        .gte('date', weekStart)
        .lte('date', endStr)
        .order('date');
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true, data: data || [] });
    }

    if (action === 'upsert_forecast') {
      // Upsert a single forecast day
      if (!forecast || !forecast.date) {
        return NextResponse.json({ ok: false, error: 'forecast with date required.' }, { status: 400 });
      }
      if (!scopedHotelId) {
        return NextResponse.json({ ok: false, error: 'No hotel in scope.' }, { status: 400 });
      }
      // Force the caller's hotel onto the record — never trust client hotel_id.
      const scopedForecast = { ...forecast, hotel_id: scopedHotelId };

      const existing = await supabaseAdmin
        .from('weekly_forecasts')
        .select('id')
        .eq('hotel_id', scopedHotelId)
        .eq('date', scopedForecast.date)
        .maybeSingle();

      if (existing.data?.id) {
        const { data, error } = await supabaseAdmin
          .from('weekly_forecasts')
          .update({
            week_start: scopedForecast.week_start,
            occupancy_pct: scopedForecast.occupancy_pct,
            arrivals: scopedForecast.arrivals,
            rooms_occupied: scopedForecast.rooms_occupied,
            departures: scopedForecast.departures || 0,
            total_rooms: scopedForecast.total_rooms || 0,
            prev_night_occ: scopedForecast.prev_night_occ || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.data.id)
          .select()
          .single();
        if (error) throw new Error(error.message || JSON.stringify(error));
        return NextResponse.json({ ok: true, data });
      } else {
        const { data, error } = await supabaseAdmin
          .from('weekly_forecasts')
          .insert(scopedForecast)
          .select()
          .single();
        if (error) throw new Error(error.message || JSON.stringify(error));
        return NextResponse.json({ ok: true, data });
      }
    }

    if (action === 'get_schedules') {
      // Get schedules for a hotel, optionally filtered by date range
      if (!scopedHotelId) {
        return NextResponse.json({ ok: false, error: 'No hotel in scope.' }, { status: 400 });
      }

      let query = supabaseAdmin
        .from('staff_schedules')
        .select('*')
        .eq('hotel_id', scopedHotelId);

      if (from) {
        query = query.gte('shift_date', from);
      }
      if (to) {
        query = query.lte('shift_date', to);
      }

      const { data, error } = await query.order('shift_date').order('start_time');
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true, data: data || [] });
    }

    if (action === 'create_schedule') {
      if (!body.schedule) {
        return NextResponse.json({ ok: false, error: 'schedule data required.' }, { status: 400 });
      }
      if (!scopedHotelId) {
        return NextResponse.json({ ok: false, error: 'No hotel in scope.' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('staff_schedules')
        .insert({ ...body.schedule, hotel_id: scopedHotelId })
        .select()
        .single();
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true, data });
    }

    if (action === 'delete_schedule') {
      if (!body.scheduleId) {
        return NextResponse.json({ ok: false, error: 'scheduleId required.' }, { status: 400 });
      }
      if (!(await callerOwnsRow(caller, 'staff_schedules', body.scheduleId))) {
        return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
      }
      const { error } = await supabaseAdmin
        .from('staff_schedules')
        .delete()
        .eq('id', body.scheduleId);
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ops data error';
    const detail = typeof err === 'object' && err !== null ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err);
    console.error('[ops-data] ERROR:', message, detail);
    return NextResponse.json({ ok: false, error: message, detail: detail.slice(0, 1000) }, { status: 500 });
  }
}