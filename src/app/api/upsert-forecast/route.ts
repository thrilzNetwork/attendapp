import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';
import { getCaller, resolveHotelScope } from '@/lib/supabase-admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bdmmstatrsenidlgjock.supabase.co';

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY is not configured');
  return createClient(SUPABASE_URL, key);
}

interface ForecastRow {
  hotel_id: string;
  week_start: string;
  date: string;
  occupancy_pct: number;
  arrivals: number;
  rooms_occupied: number;
  departures: number;
  total_rooms: number;
  prev_night_occ: number;
}

export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
      return originBlocked();
    }

    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { forecasts } = body as { forecasts: ForecastRow[] };

    if (!forecasts || !Array.isArray(forecasts) || forecasts.length === 0) {
      return NextResponse.json({ ok: false, error: 'No forecasts provided' }, { status: 400 });
    }

    // Lock every row to the caller's own hotel — never trust client hotel_id.
    const scopedHotelId = resolveHotelScope(caller, forecasts[0]?.hotel_id);
    if (!scopedHotelId) {
      return NextResponse.json({ ok: false, error: 'No hotel in scope.' }, { status: 400 });
    }

    const db = getServiceClient();
    const now = new Date().toISOString();

    const rows = forecasts.map((f) => ({
      hotel_id: scopedHotelId,
      week_start: f.week_start,
      date: f.date,
      occupancy_pct: f.occupancy_pct,
      arrivals: f.arrivals,
      rooms_occupied: f.rooms_occupied,
      departures: f.departures,
      total_rooms: f.total_rooms,
      prev_night_occ: f.prev_night_occ,
      updated_at: now,
    }));

    const { error } = await db
      .from('weekly_forecasts')
      .upsert(rows, { onConflict: 'hotel_id,date' });

    if (error) {
      console.error('Forecast batch upsert error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('upsert-forecast error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
