'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Clock, Star, ShoppingBag, Car, Check } from 'lucide-react';
import { getHotelConfig, getPartners, Partner, supabase } from '@/lib/supabase';
import { goBackToHotel } from '@/lib/guest-context';

function RideCard({ brandColor }: { brandColor: string }) {
  const [phone, setPhone] = useState('');
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    getHotelConfig().then(cfg => { if (cfg?.frontDeskPhone) setPhone(cfg.frontDeskPhone); });
  }, []);

  const requestRide = async () => {
    setRequesting(true);
    try {
      const stored = localStorage.getItem('guestSession');
      const session = stored ? JSON.parse(stored) : null;
      const qrRoom = localStorage.getItem('attenda_qr_room');
      const cfg = await getHotelConfig();
      await supabase.from('requests').insert({
        hotel_id: cfg?.id,
        guest_name: session?.name || 'Guest',
        room: qrRoom || session?.room || '?',
        type: 'Transport Request',
        details: 'Guest needs a ride — destination to be confirmed by front desk.',
        status: 'pending',
      });
      setRequested(true);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}10` }}>
          <Car size={22} style={{ color: brandColor }} />
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-bold text-black">Need a ride?</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">Airport shuttle, taxi, or Uber — front desk will arrange it.</p>
          <div className="flex gap-2 mt-2.5">
            {requested ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                <Check size={12} /> Requested — front desk will contact you
              </div>
            ) : (
              <button
                onClick={requestRide}
                disabled={requesting}
                className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: brandColor }}
              >
                {requesting ? '...' : 'Request Ride'}
              </button>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] font-bold text-gray-700 active:scale-95">
                Call Front Desk
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NearbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'attractions';
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandColor, setBrandColor] = useState('#6B1D3C');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hotel = await getHotelConfig();
      if (cancelled) return;
      if (hotel?.id) {
        const data = await getPartners(hotel.id);
        if (!cancelled) setPartners(data);
      }
      if (hotel?.brandColor) setBrandColor(hotel.brandColor);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const restaurants = partners.filter(p => p.category === 'restaurant');
  const attractions = partners.filter(p => p.category === 'attraction');
  const services = partners.filter(p => p.category === 'service');

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => goBackToHotel(router)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">{tab === 'restaurants' ? 'Partner Restaurants' : 'Nearby'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-3 pb-8 space-y-3">

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: brandColor }} />
            </div>
          ) : (
            <>
              {/* Restaurants — only when tab=restaurants */}
              {tab === 'restaurants' && restaurants.length > 0 && (
                <>
                  <p className="text-[12px] text-gray-400 uppercase tracking-wider font-semibold pt-1">Partner Restaurants</p>
                  {restaurants.map(r => (
                    <button
                      key={r.id}
                      onClick={() => router.push(`/nearby/detail?id=${r.id}`)}
                      className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform text-left"
                    >
                      <div className="relative h-32">
                        <Image src={r.image_url || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&fit=crop'} alt={r.name} fill className="object-cover" sizes="100vw" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                          <div>
                            <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider capitalize">{r.category}</p>
                            <h3 className="text-[15px] font-bold text-white">{r.name}</h3>
                          </div>
                          {r.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star size={12} className="text-amber-400 fill-amber-400" />
                              <span className="text-[12px] font-bold text-white">{r.rating}</span>
                            </div>
                          )}
                        </div>
                        {r.has_ordering && (
                          <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2 py-1 rounded-lg flex items-center gap-1">
                            <ShoppingBag size={12} />
                            <span className="text-[10px] font-bold">ORDER NOW</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="text-[11px] text-gray-500">{r.distance}</span>
                        </div>
                        {r.has_ordering ? (
                          <span className="text-[11px] font-bold text-emerald-600">In-Room Delivery</span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-600">Dine-In / Call</span>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Transport — only when tab=attractions */}
              {tab === 'attractions' && (
              <RideCard brandColor={brandColor} />
              )}

              {/* Attractions — only when tab=attractions */}
              {tab === 'attractions' && attractions.length > 0 && (
                <>
                  <p className="text-[12px] text-gray-400 uppercase tracking-wider font-semibold pt-3">Things to Do</p>
                  {attractions.map(a => (
                    <div key={a.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                      {a.image_url && (
                        <div className="relative h-32 w-full">
                          <Image src={a.image_url} alt={a.name} fill className="object-cover" sizes="100vw" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider capitalize" style={{ color: brandColor }}>{a.category}</p>
                            <h3 className="text-[15px] font-bold text-black">{a.name}</h3>
                          </div>
                          {a.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star size={12} className="text-amber-400 fill-amber-400" />
                              <span className="text-[12px] font-bold text-gray-700">{a.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500 leading-relaxed">{a.description}</p>
                        {a.address && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <MapPin size={12} className="text-gray-400" />
                            <span className="text-[11px] text-gray-500">{a.distance} · {a.address}</span>
                          </div>
                        )}
                        {a.hours && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock size={12} className="text-gray-400" />
                            <span className="text-[11px] text-gray-500">{a.hours}</span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          {a.phone && (
                            <a href={`tel:${a.phone}`} className="flex-1 py-2.5 rounded-xl bg-gray-100 flex items-center justify-center gap-1.5 active:scale-95">
                              <Phone size={14} className="text-gray-600" />
                              <span className="text-[12px] font-bold text-gray-700">Call</span>
                            </a>
                          )}
                          {a.address && (
                            <a href={`https://www.google.com/maps/search/${encodeURIComponent(a.name + ' ' + a.address)}`} target="_blank" rel="noopener noreferrer"
                              className="flex-1 py-2.5 rounded-xl text-white flex items-center justify-center gap-1.5 active:scale-95" style={{ backgroundColor: brandColor }}>
                              <MapPin size={14} />
                              <span className="text-[12px] font-bold">Directions</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Services — only when tab=attractions */}
              {tab === 'attractions' && services.length > 0 && (
                <>
                  <p className="text-[12px] text-gray-400 uppercase tracking-wider font-semibold pt-3">Services</p>
                  {services.map(s => (
                    <button key={s.id} onClick={() => router.push(`/nearby/detail?id=${s.id}`)}
                      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left active:scale-[0.98]">
                      <h3 className="text-[14px] font-bold text-black">{s.name}</h3>
                      <p className="text-[12px] text-gray-500 mt-0.5">{s.description}</p>
                    </button>
                  ))}
                </>
              )}

              {(tab === 'restaurants' && restaurants.length === 0) && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-[14px]">No restaurant partners added yet.</p>
                </div>
              )}

              {(tab === 'attractions' && attractions.length === 0 && services.length === 0) && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-[14px]">No nearby places added yet.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NearbyPage() {
  return (
    <Suspense fallback={
      <div className="h-dvh w-full flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-gray-300 rounded-full animate-spin" />
      </div>
    }>
      <NearbyContent />
    </Suspense>
  );
}
