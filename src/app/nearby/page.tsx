'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Clock, Star, ShoppingBag } from 'lucide-react';

const restaurants = [
  {
    id: '1',
    name: 'El Rincon Mexicano',
    type: 'Mexican',
    dist: '0.3 mi',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1565299624476-4f6d8256e8f8?w=400&h=300&fit=crop',
    orderNow: true,
  },
  {
    id: '2',
    name: 'Sakura Sushi Bar',
    type: 'Japanese',
    dist: '0.5 mi',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop',
    orderNow: true,
  },
  {
    id: '3',
    name: 'Burger Joint No.5',
    type: 'Burgers',
    dist: '0.2 mi',
    rating: 4.2,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    orderNow: false,
  },
  {
    id: '4',
    name: 'La Pizzeria Napoletana',
    type: 'Italian',
    dist: '0.8 mi',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
    orderNow: false,
  },
];

const attractions = [
  {
    name: 'South Beach',
    category: 'Beach',
    distance: '4.2 mi',
    rating: 4.8,
    description: 'World-famous beach with turquoise water, Art Deco architecture, and vibrant nightlife.',
    address: 'Ocean Dr, Miami Beach, FL 33139',
    phone: '+1 (305) 673-7000',
    hours: 'Open 24 hours',
    image: 'https://images.unsplash.com/photo-1535498730771-e735b998cd44?w=400&h=300&fit=crop',
  },
  {
    name: 'Port of Miami Cruise Terminal',
    category: 'Cruise',
    distance: '2.1 mi',
    rating: 4.5,
    description: 'Gateway to Caribbean cruises. Royal Caribbean, Carnival, Norwegian depart daily.',
    address: '1015 N America Way, Miami, FL 33132',
    phone: '+1 (305) 324-8609',
    hours: 'Check-in varies by cruise',
    image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&h=300&fit=crop',
  },
  {
    name: 'Miami Seaquarium',
    category: 'Attraction',
    distance: '6.8 mi',
    rating: 4.3,
    description: 'Marine life park with dolphin shows, sea turtles, and manatee exhibits.',
    address: '4400 Rickenbacker Causeway, Miami, FL 33149',
    phone: '+1 (305) 361-5705',
    hours: '10 AM – 6 PM daily',
    image: 'https://images.unsplash.com/photo-1568430462989-44149eb63a3f?w=400&h=300&fit=crop',
  },
];

export default function NearbyPage() {
  const router = useRouter();

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => router.push('/')} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Restaurants & Attractions</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-3 pb-8 space-y-3">

          {/* Restaurants section */}
          <p className="text-[12px] text-gray-400 uppercase tracking-wider font-semibold pt-1">Partner Restaurants</p>

          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/nearby/detail?r=${r.id}`)}
              className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform text-left"
            >
              <div className="relative h-32">
                <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">{r.type}</p>
                    <h3 className="text-[15px] font-bold text-white">{r.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-[12px] font-bold text-white">{r.rating}</span>
                  </div>
                </div>
                {r.orderNow && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2 py-1 rounded-lg flex items-center gap-1">
                    <ShoppingBag size={12} />
                    <span className="text-[10px] font-bold">ORDER NOW</span>
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500">{r.dist}</span>
                </div>
                {r.orderNow ? (
                  <span className="text-[11px] font-bold text-emerald-600">In-Room Delivery</span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-600">Dine-In / Call</span>
                )}
              </div>
            </button>
          ))}

          {/* Taxi card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#6B1D3C]/10 flex items-center justify-center shrink-0">
                <MapPin size={22} className="text-[#6B1D3C]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold text-black">Need a ride?</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">Taxi, Uber, or Lyft available 24/7. Ask front desk to book.</p>
                <div className="flex gap-2 mt-2">
                  <a href="tel:+13051234567" className="px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] font-bold text-gray-700 active:scale-95">Call Taxi</a>
                  <a href="https://m.uber.com" target="_blank" className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold active:scale-95" style={{ backgroundColor: '#6B1D3C' }}>Open Uber</a>
                </div>
              </div>
            </div>
          </div>

          {/* Attractions section */}
          <p className="text-[12px] text-gray-400 uppercase tracking-wider font-semibold pt-3">Things to Do</p>

          {attractions.map((a) => (
            <div key={a.name} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <img src={a.image} alt={a.name} className="w-full h-32 object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-[10px] text-[#6B1D3C] font-bold uppercase tracking-wider">{a.category}</p>
                    <h3 className="text-[15px] font-bold text-black">{a.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-[12px] font-bold text-gray-700">{a.rating}</span>
                  </div>
                </div>

                <p className="text-[12px] text-gray-500 leading-relaxed">{a.description}</p>

                <div className="flex items-center gap-1.5 mt-2">
                  <MapPin size={12} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500">{a.distance} · {a.address}</span>
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500">{a.hours}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  {a.phone && (
                    <a href={`tel:${a.phone}`} className="flex-1 py-2.5 rounded-xl bg-gray-100 flex items-center justify-center gap-1.5 active:scale-95">
                      <Phone size={14} className="text-gray-600" />
                      <span className="text-[12px] font-bold text-gray-700">Call</span>
                    </a>
                  )}
                  <a href={`https://www.google.com/maps/search/${encodeURIComponent(a.name + ' ' + a.address)}`} target="_blank" className="flex-1 py-2.5 rounded-xl text-white flex items-center justify-center gap-1.5 active:scale-95" style={{ backgroundColor: '#6B1D3C' }}>
                    <MapPin size={14} />
                    <span className="text-[12px] font-bold">Directions</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
