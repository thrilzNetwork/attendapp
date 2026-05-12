'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, ShoppingBag, Star, Clock, MapPin, Phone, Navigation } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useGuest } from '@/lib/guest-context';

interface MenuItem {
  id: string;
  name: string;
  desc: string;
  price: number;
}

interface Restaurant {
  name: string;
  type: string;
  rating: number;
  time: string;
  dist: string;
  image: string;
  address: string;
  phone: string;
  hours: string;
  description: string;
  orderNow: boolean;
  menu: MenuItem[];
}

const nearbyRestaurants: Record<string, Restaurant> = {
  '1': {
    name: 'El Rincon Mexicano',
    type: 'Mexican',
    rating: 4.7,
    time: '8 min',
    dist: '0.3 mi',
    image: 'https://images.unsplash.com/photo-1565299624476-4f6d8256e8f8?w=400&fit=crop',
    address: '124 SW 8th St, Miami, FL 33130',
    phone: '+1 (305) 555-1201',
    hours: '11 AM – 10 PM daily',
    description: 'Authentic Mexican street food since 2005. Family recipes, fresh tortillas daily.',
    orderNow: true,
    menu: [
      { id:'t1', name:'Carne Asada Tacos', desc:'3 grilled steak tacos with cilantro, onion, salsa', price:12.99 },
      { id:'t2', name:'Chicken Quesadilla', desc:'Flour tortilla, cheese, pico de gallo', price:10.99 },
      { id:'t3', name:'Burrito Bowl', desc:'Rice, beans, choice of protein, guac', price:13.99 },
      { id:'t4', name:'Nachos Supreme', desc:'Tortilla chips, cheese, jalapenos, sour cream', price:9.99 },
      { id:'t5', name:'Horchata', desc:'Traditional rice drink, cinnamon', price:3.99 },
    ]
  },
  '2': {
    name: 'Sakura Sushi Bar',
    type: 'Japanese',
    rating: 4.5,
    time: '12 min',
    dist: '0.5 mi',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&fit=crop',
    address: '88 NW 1st Ave, Miami, FL 33128',
    phone: '+1 (305) 555-3402',
    hours: '5 PM – 11 PM, closed Mon',
    description: 'Premium sushi and sake bar. Chef-prepared omakase available by reservation.',
    orderNow: true,
    menu: [
      { id:'s1', name:'Salmon Roll (8pc)', desc:'Fresh salmon, avocado, cucumber', price:14.99 },
      { id:'s2', name:'Spicy Tuna Roll', desc:'Tuna, spicy mayo, tempura flakes', price:13.99 },
      { id:'s3', name:'Miso Soup', desc:'Tofu, wakame, green onion', price:3.99 },
      { id:'s4', name:'Edamame', desc:'Steamed soybeans, sea salt', price:5.99 },
    ]
  },
  '3': {
    name: 'Burger Joint No.5',
    type: 'Burgers',
    rating: 4.2,
    time: '6 min',
    dist: '0.2 mi',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&fit=crop',
    address: '55 Biscayne Blvd, Miami, FL 33132',
    phone: '+1 (305) 555-5603',
    hours: '10 AM – 11 PM daily',
    description: 'Hand-ground beef, brioche buns, milkshakes. Miami\'s favorite late-night burger.',
    orderNow: false,
    menu: [
      { id:'b1', name:'Classic Cheeseburger', desc:'Beef patty, cheddar, lettuce, tomato, onion', price:11.99 },
      { id:'b2', name:'Bacon Double', desc:'Two patties, bacon, american cheese, special sauce', price:15.99 },
      { id:'b3', name:'Crispy Fries', desc:'Hand-cut, sea salt', price:4.99 },
      { id:'b4', name:'Vanilla Shake', desc:'Creamy vanilla milkshake', price:5.99 },
    ]
  },
  '4': {
    name: 'La Pizzeria Napoletana',
    type: 'Italian',
    rating: 4.6,
    time: '15 min',
    dist: '0.8 mi',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&fit=crop',
    address: '210 NE 3rd St, Miami, FL 33132',
    phone: '+1 (305) 555-7804',
    hours: '11:30 AM – 10 PM, closed Tue',
    description: 'Wood-fired Neapolitan pizza. San Marzano tomatoes, buffalo mozzarella, 90-second bake.',
    orderNow: false,
    menu: [
      { id:'p1', name:'Margherita', desc:'San Marzano, mozzarella, basil, olive oil', price:16.99 },
      { id:'p2', name:'Diavola', desc:'Spicy salami, mozzarella, chili flakes', price:18.99 },
      { id:'p3', name:'Quattro Formaggi', desc:'Mozzarella, gorgonzola, fontina, parmigiano', price:19.99 },
    ]
  },
};

function RestaurantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addRequest } = useGuest();
  const id = searchParams.get('r') || '';
  const r = nearbyRestaurants[id];
  const [cart, setCart] = useState<Record<string, number>>({});

  if (!r) return (
    <div className="h-screen flex items-center justify-center text-gray-500 font-bold">
      Restaurant not found
    </div>
  );

  const items = Object.entries(cart).filter(([,qty]) => qty > 0).map(([id, qty]) => {
    const item = r.menu.find((m) => m.id === id)!;
    return { ...item, qty };
  });
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const placeOrder = () => {
    const details = items.map((i) => `${i.qty}x ${i.name}`).join(', ');
    addRequest('Food Order', `${r.name}: ${details} — $${total.toFixed(2)}`);
    router.push('/confirmation');
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-[#F5F5F5] flex flex-col overflow-hidden">
      <div className="relative h-44 shrink-0">
        <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Link href="/nearby" className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          <ArrowLeft size={18} className="text-[#3A1A2D]" />
        </Link>
        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="text-xl font-extrabold text-white">{r.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-white/80 flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400"/> {r.rating}</span>
            <span className="text-xs text-white/80 flex items-center gap-1"><Clock size={12}/> {r.time}</span>
            <span className="text-xs text-white/80 flex items-center gap-1"><MapPin size={12}/> {r.dist}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Info card */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">{r.description}</p>

          <div className="bg-white rounded-xl p-4 space-y-2.5 shadow-sm border border-gray-100">
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Address</p>
                <p className="text-sm text-gray-800">{r.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Hours</p>
                <p className="text-sm text-gray-800">{r.hours}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Phone</p>
                <a href={`tel:${r.phone}`} className="text-sm text-[#6B1D3C] font-bold">{r.phone}</a>
              </div>
            </div>
          </div>

          {r.orderNow ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">In-Room Ordering Available</span>
              </div>

              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">Menu</div>
              {r.menu.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.desc}</div>
                    <div className="text-sm font-extrabold text-[#3A1A2D] mt-1">${item.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => setCart(c => ({ ...c, [item.id]: Math.max((c[item.id]||0)-1, 0) }))} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90"><Minus size={14}/></button>
                    <span className="w-4 text-center text-sm font-bold">{cart[item.id]||0}</span>
                    <button onClick={() => setCart(c => ({ ...c, [item.id]: (c[item.id]||0)+1 }))} className="w-7 h-7 rounded-full bg-[#3A1A2D] text-white flex items-center justify-center active:scale-90"><Plus size={14}/></button>
                  </div>
                </div>
              ))}

              {items.length > 0 && (
                <div className="pt-2 pb-4">
                  <button onClick={placeOrder} className="w-full bg-[#3A1A2D] text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-between px-5 active:scale-[0.97] transition-transform">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={18}/>
                      <span className="text-sm">{items.reduce((s, i) => s+i.qty, 0)} items</span>
                    </div>
                    <span className="text-lg font-extrabold">${total.toFixed(2)}</span>
                  </button>
                  <p className="text-[10px] text-gray-400 text-center mt-2">Charged to your room or pay at front desk</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Order at Restaurant</span>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  This restaurant does not offer in-room ordering yet. Call ahead, visit in person, or ask front desk to arrange.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <a href={`tel:${r.phone}`} className="flex-1 py-3 rounded-xl bg-[#6B1D3C] text-white flex items-center justify-center gap-2 active:scale-95">
                  <Phone size={16} />
                  <span className="text-sm font-bold">Call to Order</span>
                </a>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.address)}`} target="_blank" className="flex-1 py-3 rounded-xl bg-gray-100 flex items-center justify-center gap-2 active:scale-95">
                  <Navigation size={16} className="text-gray-700" />
                  <span className="text-sm font-bold text-gray-700">Directions</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NearbyDetailPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#3A1A2D] border-t-transparent rounded-full animate-spin" /></div>}>
      <RestaurantContent />
    </Suspense>
  );
}
