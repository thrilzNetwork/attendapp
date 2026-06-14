const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('/Users/thrilzco/Projects/attenda/.env.local', 'utf8');
const svcKey = env.match(/SUPABASE_SERVICE_KEY=([^\n]+)/)[1];
const supabase = createClient('https://bdmmstatrsenidlgjock.supabase.co', svcKey);
const hotelId = 'f1f8de36-3126-4ba8-9cc6-b11cefb276ca';

(async () => {
  // Geocode
  const geo = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=1700+W+Commercial+Blvd+Fort+Lauderdale+FL+33309&limit=1', {
    headers: { 'User-Agent': 'AttendaApp/1.0' }
  });
  const geoData = await geo.json();
  if (!geoData || !geoData[0]) { console.log('Geocode failed'); return; }
  const lat = geoData[0].lat;
  const lon = geoData[0].lon;
  console.log('Geocoded:', lat, lon);

  // OSM Overpass query
  const overpassQ = '[out:json];(node["amenity"~"restaurant|cafe|bar|fast_food"](around:1500,'+lat+','+lon+');node["tourism"~"attraction|museum|artwork"](around:1500,'+lat+','+lon+');node["shop"~"supermarket|convenience"](around:1500,'+lat+','+lon+');node["leisure"~"park|playground"](around:1500,'+lat+','+lon+'););out center 20;';
  const osm = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'User-Agent': 'AttendaApp/1.0' },
    body: overpassQ
  });
  const osmData = await osm.json();
  if (!osmData || !osmData.elements) { console.log('OSM fetch failed:', JSON.stringify(osmData).slice(0,200)); return; }

  console.log('Found', osmData.elements.length, 'nearby places');

  // Clear existing
  await supabase.from('nearby_places').delete().eq('hotel_id', hotelId);

  const categoryMap = {
    restaurant: 'restaurant', cafe: 'cafe', bar: 'bar', fast_food: 'restaurant',
    attraction: 'attraction', museum: 'museum', artwork: 'attraction',
    supermarket: 'shop', convenience: 'shop', park: 'attraction', playground: 'attraction'
  };
  const placeholders = {
    restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&fit=crop',
    cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&fit=crop',
    bar: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=600&fit=crop',
    attraction: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&fit=crop',
    museum: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&fit=crop',
    shop: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&fit=crop'
  };

  let inserted = 0;
  for (const el of osmData.elements) {
    const tags = el.tags || {};
    const amenity = tags.amenity || '';
    const tourism = tags.tourism || '';
    const shop = tags.shop || '';
    const leisure = tags.leisure || '';

    let cat = categoryMap[amenity] || categoryMap[tourism] || categoryMap[shop] || categoryMap[leisure];
    if (!cat) cat = 'restaurant';

    const p = {
      hotel_id: hotelId,
      name: tags.name || (cat.charAt(0).toUpperCase() + cat.slice(1)) || 'Nearby Place',
      category: cat,
      lat: el.lat || el.center?.lat || parseFloat(lat),
      lng: el.lon || el.center?.lon || parseFloat(lon),
      address: tags['addr:street'] ? (tags['addr:housenumber']||'') + ' ' + tags['addr:street'] : null,
      phone: tags.phone || null,
      website: tags.website || null,
      description: tags.description || null,
      image_url: placeholders[cat] || null,
      is_active: true,
    };

    const { error } = await supabase.from('nearby_places').insert(p);
    if (!error) inserted++;
  }

  console.log('Inserted', inserted, 'nearby places');
  console.log('Done');
})();