import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

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

    const body = await req.json();
    const { forecasts } = body as { forecasts: ForecastRow[] };

    if (!forecasts || !Array.isArray(forecasts) || forecasts.length === 0) {
      return NextResponse.json({ ok: false, error: 'No forecasts provided' }, { status: 400 });
    }

    const results: { date: string; ok: boolean }[] = [];

    const serviceClient = getServiceClient();

    for (const f of forecasts) {
      const { error } = await serviceClient
        .from('weekly_forecasts')
        .upsert(
          {
            hotel_id: f.hotel_id,
            week_start: f.week_start,
            date: f.date,
            occupancy_pct: f.occupancy_pct,
            arrivals: f.arrivals,
            rooms_occupied: f.rooms_occupied,
            departures: f.departures,
            total_rooms: f.total_rooms,
            prev_night_occ: f.prev_night_occ,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'hotel_id, date' }
        );

      results.push({ date: f.date, ok: !error });
      if (error) {
        console.error(`Forecast upsert error for ${f.date}:`, error.message);
      }
    }

    const allOk = results.every((r) => r.ok);
    return NextResponse.json({ ok: allOk, results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('upsert-forecast error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}