import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

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
      address?: { road?: string; city?: string; town?: string; state?: string; country?: string; house_number?: string };
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

    return NextResponse.json(results, {
      headers: { 'Cache-Control': 's-maxage=300' },
    });
  } catch {
    return NextResponse.json([]);
  }
}
