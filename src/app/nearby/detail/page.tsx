'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, ShoppingBag, Star, Clock, MapPin, Phone, Navigation } from 'lucide-react';
import { getPartnerById, getPartnerMenuItems, getHotelConfig, Partner, PartnerMenuItem, supabase } from '@/lib/supabase';
import { createCloverOrder, requestDelivery } from '@/lib/clover';

function PartnerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';

  const [partner, setPartner] = useState<Partner | null>(null);
  const [menuItems, setMenuItems] = useState<PartnerMenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    Promise.all([getPartnerById(id), getPartnerMenuItems(id)]).then(([p, m]) => {
      setPartner(p);
      setMenuItems(m);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#3A1A2D] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!partner) return (
    <div className="h-screen flex items-center justify-center text-gray-500 font-bold">Partner not found</div>
  );

  const cartItems = menuItems
    .filter(i => (cart[i.id] || 0) > 0)
    .map(i => ({ ...i, qty: cart[i.id] }));
  const total = cartItems.reduce((s, i) => s + Number(i.price) * i.qty, 0);

  const placeOrder = async () => {
    if (ordering) return;
    setOrdering(true);
    try {
      const stored = localStorage.getItem('guestSession');
      const session = stored ? JSON.parse(stored) : null;
      const qrRoom = localStorage.getItem('attenda_qr_room');
      const guestName = session?.name || 'Guest';
      const room = qrRoom || session?.room || '?';

      const subtotal = cartItems.reduce((s, i) => s + Number(i.price) * i.qty, 0);
      const feePercent = 5;
      const feeAmount = subtotal * (feePercent / 100);

      let cloverOrderId: string | undefined;

      if (partner.clover_enabled && partner.clover_merchant_id && partner.clover_access_token) {
        try {
          const cloverOrder = await createCloverOrder(
            partner.clover_merchant_id,
            partner.clover_access_token,
            cartItems.map(i => ({ itemId: i.id, name: i.name, qty: i.qty, price: Number(i.price) })),
            { name: guestName, room },
          );
          cloverOrderId = cloverOrder.id;

          // Fire-and-forget delivery — don't block order on delivery dispatch
          requestDelivery(
            partner.clover_merchant_id,
            partner.clover_access_token,
            cloverOrder.id,
            `Hotel, Room ${room}`,
          ).catch(e => console.error('Delivery dispatch failed:', e));

          await supabase.from('attenda_fees').insert({
            hotel_id: partner.hotel_id,
            partner_id: partner.id,
            order_id: cloverOrder.id,
            order_total: subtotal,
            fee_percent: feePercent,
            fee_amount: feeAmount,
          });
        } catch (e) {
          // Clover failure must not block the guest's order
          console.error('Clover order failed, falling back to internal order:', e);
        }
      }

      const details = cartItems.map(i => `${i.qty}x ${i.name}`).join(', ');
      await supabase.from('requests').insert({
        hotel_id: partner.hotel_id,
        guest_name: guestName,
        room,
        type: 'Food Order',
        details: `${partner.name}: ${details} — $${subtotal.toFixed(2)}${cloverOrderId ? ` (Clover #${cloverOrderId})` : ''}`,
        status: 'pending',
      });

      const hotelConfig = await getHotelConfig();
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'food_order',
          data: {
            notificationEmail: hotelConfig?.notificationEmail || '',
            partnerEmail: partner.email || '',
            hotelName: hotelConfig?.name || 'Hotel',
            guestName,
            room,
            partnerName: partner.name,
            items: cartItems.map(i => ({ name: i.name, qty: i.qty, price: Number(i.price) })),
            total: subtotal.toFixed(2),
            cloverOrderId,
          },
        }),
      }).catch(() => {});

      router.push('/confirmation');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-[#F5F5F5] flex flex-col overflow-hidden">
      {/* Hero */}
      <div className="relative h-44 shrink-0">
        <img src={partner.image_url || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&fit=crop'} alt={partner.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button onClick={() => router.back()} className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          <ArrowLeft size={18} className="text-[#3A1A2D]" />
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="text-xl font-extrabold text-white">{partner.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            {partner.rating > 0 && <span className="text-xs text-white/80 flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400" /> {partner.rating}</span>}
            {partner.hours && <span className="text-xs text-white/80 flex items-center gap-1"><Clock size={12} /> {partner.hours}</span>}
            {partner.distance && <span className="text-xs text-white/80 flex items-center gap-1"><MapPin size={12} /> {partner.distance}</span>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 space-y-3">
          {partner.description && <p className="text-sm text-gray-600 leading-relaxed">{partner.description}</p>}

          {/* Info card */}
          <div className="bg-white rounded-xl p-4 space-y-2.5 shadow-sm border border-gray-100">
            {partner.address && (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Address</p>
                  <p className="text-sm text-gray-800">{partner.address}</p>
                </div>
              </div>
            )}
            {partner.hours && (
              <div className="flex items-start gap-2">
                <Clock size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Hours</p>
                  <p className="text-sm text-gray-800">{partner.hours}</p>
                </div>
              </div>
            )}
            {partner.phone && (
              <div className="flex items-start gap-2">
                <Phone size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Phone</p>
                  <a href={`tel:${partner.phone}`} className="text-sm text-[#6B1D3C] font-bold">{partner.phone}</a>
                </div>
              </div>
            )}
          </div>

          {/* Ordering */}
          {partner.has_ordering ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">In-Room Ordering Available</span>
              </div>

              {menuItems.length > 0 && (
                <>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">Menu</div>
                  {menuItems.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-900 truncate">{item.name}</div>
                        {item.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</div>}
                        <div className="text-sm font-extrabold text-[#3A1A2D] mt-1">${Number(item.price).toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button onClick={() => setCart(c => ({ ...c, [item.id]: Math.max((c[item.id] || 0) - 1, 0) }))}
                          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90">
                          <Minus size={14} />
                        </button>
                        <span className="w-4 text-center text-sm font-bold">{cart[item.id] || 0}</span>
                        <button onClick={() => setCart(c => ({ ...c, [item.id]: (c[item.id] || 0) + 1 }))}
                          className="w-7 h-7 rounded-full bg-[#3A1A2D] text-white flex items-center justify-center active:scale-90">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {cartItems.length > 0 && (
                    <div className="pt-2 pb-4">
                      <button onClick={placeOrder} disabled={ordering}
                        className="w-full bg-[#3A1A2D] text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-between px-5 active:scale-[0.97] transition-transform disabled:opacity-60">
                        <div className="flex items-center gap-2">
                          <ShoppingBag size={18} />
                          <span className="text-sm">{cartItems.reduce((s, i) => s + i.qty, 0)} items</span>
                        </div>
                        <span className="text-lg font-extrabold">${total.toFixed(2)}</span>
                      </button>
                      <p className="text-[10px] text-gray-400 text-center mt-2">Charged to your room or pay at front desk</p>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Visit or Call Ahead</span>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  This partner does not offer in-room ordering. Call ahead, visit in person, or ask the front desk.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                {partner.phone && (
                  <a href={`tel:${partner.phone}`} className="flex-1 py-3 rounded-xl bg-[#6B1D3C] text-white flex items-center justify-center gap-2 active:scale-95">
                    <Phone size={16} />
                    <span className="text-sm font-bold">Call</span>
                  </a>
                )}
                {partner.address && (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(partner.address)}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl bg-gray-100 flex items-center justify-center gap-2 active:scale-95">
                    <Navigation size={16} className="text-gray-700" />
                    <span className="text-sm font-bold text-gray-700">Directions</span>
                  </a>
                )}
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
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3A1A2D] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PartnerContent />
    </Suspense>
  );
}
