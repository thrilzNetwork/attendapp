const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('/Users/thrilzco/Projects/attenda/.env.local', 'utf8');
const svcKey = env.match(/SUPABASE_SERVICE_KEY=([^\n]+)/)[1];
const supabase = createClient('https://bdmmstatrsenidlgjock.supabase.co', svcKey);
const hotelId = 'f1f8de36-3126-4ba8-9cc6-b11cefb276ca';

(async () => {
  // Clear old partners
  await supabase.from('partners').delete().eq('hotel_id', hotelId);

  const nearbyPlaces = [
    // Restaurants
    { name: "La Bamba Mexican Grill", category: "restaurant", lat: 26.188, lng: -80.163, description: "Authentic Mexican cuisine. Tacos, burritos, margaritas. Open 11am-10pm.", phone: "(954) 123-4567", website: "https://labamba.com" },
    { name: "The Commercial Grill", category: "restaurant", lat: 26.189, lng: -80.166, description: "American classics, steaks, seafood. Breakfast served all day.", phone: "(954) 234-5678" },
    { name: "Sakura Sushi Bar", category: "restaurant", lat: 26.187, lng: -80.162, description: "Fresh sushi, sashimi, and Japanese hot dishes. Lunch specials M-F.", phone: "(954) 345-6789" },
    { name: "Mamma Mia Italian", category: "restaurant", lat: 26.190, lng: -80.165, description: "Family-owned Italian restaurant. Homemade pasta, wood-fired pizza.", phone: "(954) 456-7890" },
    { name: "Golden Dragon Chinese", category: "restaurant", lat: 26.186, lng: -80.164, description: "Cantonese and Szechuan cuisine. Delivery available.", phone: "(954) 567-8901" },

    // Cafes
    { name: "Brew & Bean Coffee", category: "cafe", lat: 26.188, lng: -80.165, description: "Artisan coffee, fresh pastries, free WiFi. Open 6am-8pm.", phone: "(954) 678-9012" },
    { name: "Sunrise Bakery", category: "cafe", lat: 26.189, lng: -80.163, description: "Fresh-baked bread, croissants, danishes. Breakfast sandwiches.", phone: "(954) 789-0123" },

    // Bars / Nightlife
    { name: "The Sports Page", category: "bar", lat: 26.187, lng: -80.166, description: "Sports bar with 12 TVs, pool tables, beer on tap. Open till 2am.", phone: "(954) 890-1234" },
    { name: "Skyline Lounge", category: "bar", lat: 26.190, lng: -80.164, description: "Rooftop lounge with views, craft cocktails, live music Fri-Sat.", phone: "(954) 901-2345" },

    // Attractions
    { name: "FLL Beach Boardwalk", category: "attraction", lat: 26.120, lng: -80.110, description: "3-mile beachfront boardwalk. Restaurants, shops, bike rentals. 15 min drive.", website: "https://fortlauderdale.gov/beach" },
    { name: "Las Olas Boulevard", category: "attraction", lat: 26.120, lng: -80.130, description: "Upscale shopping, dining, galleries. A must-visit! 10 min drive." },
    { name: "Everglades Safari Park", category: "attraction", lat: 26.080, lng: -80.400, description: "Airboat tours, alligator shows, nature trails. 30 min drive.", phone: "(954) 321-9999" },

    // Services
    { name: "Walgreens Pharmacy", category: "service", lat: 26.189, lng: -80.162, description: "Pharmacy, groceries, toiletries. Open 7am-11pm.", phone: "(954) 111-2222" },
    { name: "Publix Super Market", category: "service", lat: 26.190, lng: -80.160, description: "Grocery store, deli, bakery. Open 7am-10pm.", phone: "(954) 333-4444" },
    { name: "Budget Rent a Car", category: "service", lat: 26.186, lng: -80.167, description: "Car rentals at the hotel. Daily/weekly rates. Ask front desk.", phone: "(954) 555-6666" },
  ];

  let count = 0;
  for (const p of nearbyPlaces) {
    const { error } = await supabase.from('partners').insert({
      hotel_id: hotelId,
      name: p.name,
      category: p.category,
      lat: p.lat,
      lng: p.lng,
      description: p.description || null,
      phone: p.phone || null,
      website: p.website || null,
      is_active: true,
    });
    if (!error) count++;
  }
  console.log('Inserted', count, 'nearby places into partners table');

  // Verify
  const { data: check } = await supabase.from('partners').select('name, category').eq('hotel_id', hotelId);
  console.log('\nNearby Places now available:');
  check.forEach(p => console.log('  ' + p.category.padEnd(15) + p.name));
})();