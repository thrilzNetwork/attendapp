import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

// Nominatim (OSM geocoding) + Overpass API — 100% free, no API key required

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Category-based placeholder images (Unsplash, free)
const PLACEHOLDERS: Record<string, string> = {
  restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&fit=crop',
  cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&fit=crop',
  bar: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=600&fit=crop',
  attraction: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&fit=crop',
  museum: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&fit=crop',
};

interface OsmNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

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

    const { hotelId, address } = await req.json();
    if (!hotelId || !address) {
      return NextResponse.json({ error: 'Missing hotelId or address' }, { status: 400 });
    }

    // 1. Geocode with Nominatim (free OSM geocoding)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Attenda/1.0 (hotel concierge app)' }, signal: AbortSignal.timeout(8000) }
    );
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error('Address not found — try a more specific address');
    const lat = parseFloat(geoData[0].lat);
    const lng = parseFloat(geoData[0].lon);

    // 2. Query Overpass API for nearby amenities (free OSM data)
    const overpassQuery = `
      [out:json][timeout:30];
      (
        node["amenity"~"restaurant|cafe|bar|fast_food|pub|food_court|ice_cream|bakery"](around:1500,${lat},${lng});
        node["tourism"~"attraction|museum|gallery|viewpoint|theme_park|zoo"](around:1500,${lat},${lng});
        node["leisure"~"park|garden|stadium|sports_centre"](around:1500,${lat},${lng});
      );
      out body;
    `.trim();

    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'text/plain' },
      signal: AbortSignal.timeout(35000),
    });
    const overpassData = await overpassRes.json();
    const nodes: OsmNode[] = overpassData.elements || [];

    // Filter to named places only
    const named = nodes.filter(n => n.tags?.name);

    // Get already-imported place IDs for this hotel
    const { data: existing } = await supabase
      .from('partners')
      .select('google_place_id')
      .eq('hotel_id', hotelId)
      .not('google_place_id', 'is', null);
    const existingIds = new Set((existing || []).map(e => e.google_place_id as string));

    let added = 0;
    for (const node of named) {
      const osmId = `osm:${node.id}`;
      if (existingIds.has(osmId)) continue;

      const tags = node.tags;
      const amenity = tags.amenity || '';
      const tourism = tags.tourism || '';
      const leisure = tags.leisure || '';

      const isRestaurant = ['restaurant', 'cafe', 'bar', 'fast_food', 'pub', 'food_court', 'ice_cream', 'bakery'].includes(amenity);
      const category = isRestaurant ? 'restaurant' : 'attraction';

      const distMiles = haversine(lat, lng, node.lat, node.lon);
      const distance = distMiles < 0.1 ? 'On-site' : `${distMiles.toFixed(1)} mi`;

      // Pick placeholder image by type
      const imageKey = amenity || tourism || leisure || category;
      const image_url = PLACEHOLDERS[imageKey] || PLACEHOLDERS[category];

      // Build description from OSM tags
      const descParts = [tags['addr:street'] && tags['addr:housenumber']
        ? `${tags['addr:housenumber']} ${tags['addr:street']}`
        : tags['addr:street'] || '']
        .filter(Boolean);
      const description = descParts.join(', ') || tags.description || '';

      await supabase.from('partners').insert({
        hotel_id: hotelId,
        google_place_id: osmId,
        name: tags.name,
        category,
        description,
        address: description,
        rating: 0,
        distance,
        image_url,
        phone: tags.phone || tags['contact:phone'] || '',
        hours: tags.opening_hours || '',
        has_ordering: false,
        is_active: true,
      });
      added++;
    }

    return NextResponse.json({ added, total: named.length });
  } catch (e) {
    console.error('Places sync error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
