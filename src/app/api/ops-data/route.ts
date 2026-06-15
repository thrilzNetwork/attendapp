import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
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

    const body = await req.json();
    const { action, hotelId, weekStart, from, to, forecast } = body;

    if (action === 'get_forecasts') {
      // Get forecasts for a hotel for a week range
      if (!hotelId || !weekStart) {
        return NextResponse.json({ ok: false, error: 'hotelId and weekStart required.' }, { status: 400 });
      }
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const endStr = weekEnd.toISOString().split('T')[0];

      const { data, error } = await supabaseAdmin
        .from('weekly_forecasts')
        .select('*')
        .eq('hotel_id', hotelId)
        .gte('date', weekStart)
        .lte('date', endStr)
        .order('date');
      if (error) throw error;
      return NextResponse.json({ ok: true, data: data || [] });
    }

    if (action === 'upsert_forecast') {
      // Upsert a single forecast day
      if (!forecast || !forecast.hotel_id || !forecast.date) {
        return NextResponse.json({ ok: false, error: 'forecast with hotel_id and date required.' }, { status: 400 });
      }

      const existing = await supabaseAdmin
        .from('weekly_forecasts')
        .select('id')
        .eq('hotel_id', forecast.hotel_id)
        .eq('date', forecast.date)
        .maybeSingle();

      if (existing.data?.id) {
        const { data, error } = await supabaseAdmin
          .from('weekly_forecasts')
          .update({
            week_start: forecast.week_start,
            occupancy_pct: forecast.occupancy_pct,
            arrivals: forecast.arrivals,
            rooms_occupied: forecast.rooms_occupied,
            departures: forecast.departures || 0,
            total_rooms: forecast.total_rooms || 0,
            prev_night_occ: forecast.prev_night_occ || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.data.id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ ok: true, data });
      } else {
        const { data, error } = await supabaseAdmin
          .from('weekly_forecasts')
          .insert(forecast)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ ok: true, data });
      }
    }

    if (action === 'get_schedules') {
      // Get schedules for a hotel, optionally filtered by date range
      if (!hotelId) {
        return NextResponse.json({ ok: false, error: 'hotelId required.' }, { status: 400 });
      }

      let query = supabaseAdmin
        .from('staff_schedules')
        .select('*')
        .eq('hotel_id', hotelId);

      if (from) {
        query = query.gte('shift_date', from);
      }
      if (to) {
        query = query.lte('shift_date', to);
      }

      const { data, error } = await query.order('shift_date').order('start_time');
      if (error) throw error;
      return NextResponse.json({ ok: true, data: data || [] });
    }

    if (action === 'create_schedule') {
      if (!body.schedule) {
        return NextResponse.json({ ok: false, error: 'schedule data required.' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('staff_schedules')
        .insert(body.schedule)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    if (action === 'delete_schedule') {
      if (!body.scheduleId) {
        return NextResponse.json({ ok: false, error: 'scheduleId required.' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('staff_schedules')
        .delete()
        .eq('id', body.scheduleId);
      if (error) throw error;
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