import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    // Require API key
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Origin check
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!isAllowedOrigin(origin, referer)) {
      return originBlocked();
    }

    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: 'No search query provided' }, { status: 400 });

    // Nominatim geocoding — free, no API key, 1 req/sec rate limit
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': 'Attenda/1.0 (hotel guest-services platform)' }, signal: AbortSignal.timeout(8000) }
    );
    const geoData = await geoRes.json();

    if (!geoData.length) {
      return NextResponse.json({
        found: false,
        googleReviewUrl: `https://www.google.com/search?q=${encodeURIComponent(query + ' reviews')}`,
        tripadvisorUrl: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(query)}`,
        yelpUrl: `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}`,
      });
    }

    const place = geoData[0];
    const displayName = place.display_name || '';

    // Build review links from the formatted name
    const hotelName = displayName.split(',')[0] || query;
    const googleReviewUrl = `https://www.google.com/search?q=${encodeURIComponent(hotelName + ' reviews')}`;
    const tripadvisorUrl = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(hotelName)}`;
    const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(hotelName)}`;

    return NextResponse.json({
      found: true,
      address: displayName,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      hotelName,
      googleReviewUrl,
      tripadvisorUrl,
      yelpUrl,
    });
  } catch (e) {
    console.error('Hotel lookup error:', e);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
