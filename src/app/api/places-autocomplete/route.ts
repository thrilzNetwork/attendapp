import { NextRequest, NextResponse } from 'next/server';

// In-memory query cache: normalized query → { results, ts }
const queryCache = new Map<string, { results: unknown; ts: number }>();
// Per-IP throttle: ip → last request timestamp
const ipTracker = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000;   // 5 minutes
const THROTTLE_MS = 400;            // min gap between requests from the same IP

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  // Per-IP throttle — protects the Nominatim quota even if client debounce breaks
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const lastCall = ipTracker.get(ip) ?? 0;
  const now = Date.now();
  if (now - lastCall < THROTTLE_MS) {
    return NextResponse.json([], { status: 429 });
  }
  ipTracker.set(ip, now);

  // Identical-query cache
  const cacheKey = q.toLowerCase();
  const cached = queryCache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.results, {
      headers: { 'Cache-Control': 's-maxage=300' },
    });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AttendaApp/1.0 (thrilznetwork@gmail.com)' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();

    const results = (data as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: { road?: string; city?: string; town?: string; house_number?: string };
    }>).map(item => {
      const a = item.address || {};
      const short = [a.house_number, a.road, a.city || a.town].filter(Boolean).join(' ') || item.display_name.split(',')[0];
      return {
        display_name: item.display_name,
        short_name: short,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    });

    queryCache.set(cacheKey, { results, ts: now });
    return NextResponse.json(results, {
      headers: { 'Cache-Control': 's-maxage=300' },
    });
  } catch {
    return NextResponse.json([]);
  }
}
