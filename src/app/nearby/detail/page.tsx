'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Star, Clock, MapPin, Phone, Navigation, ExternalLink, X, ChevronRight, CheckCircle, ShoppingBag, CreditCard, Lock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getPartnerById, getPartnerMenuItems, getHotelConfig, Partner, PartnerMenuItem, supabase } from '@/lib/supabase';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Inline Stripe card-payment step shown inside the checkout sheet.
function PaymentForm({ onSuccess, onBack, brandColor, amountLabel }: {
  onSuccess: () => void;
  onBack: () => void;
  brandColor: string;
  amountLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/confirmation' },
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock size={13} className="text-emerald-600" />
        <span className="text-[13px] font-bold text-gray-900">Secure Card Payment</span>
      </div>
      <PaymentElement />
      {error && <p className="text-[12px] text-red-600 font-medium">{error}</p>}
      <button onClick={pay} disabled={paying || !stripe}
        className="w-full text-white font-extrabold py-4 rounded-2xl text-[16px] shadow-lg active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ backgroundColor: brandColor }}>
        <CreditCard size={17} /> {paying ? 'Processing…' : `Pay ${amountLabel}`}
      </button>
      <button onClick={onBack} disabled={paying} className="w-full text-[13px] font-bold text-gray-400 py-1">
        ← Back
      </button>
      <p className="text-[10px] text-gray-400 text-center">Powered by Stripe · Your card is never stored</p>
    </div>
  );
}

function PartnerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';

  const [partner, setPartner] = useState<Partner | null>(null);
  const [menuItems, setMenuItems] = useState<PartnerMenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [brandColor, setBrandColor] = useState('#6B1D3C');
  const [hotelAddress, setHotelAddress] = useState('');

  // Checkout sheet state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const stripeEnabled = !!stripePromise;

  // Uber delivery quote
  const [uberQuote, setUberQuote] = useState<{ fee_display: string; feeCents: number } | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    (async () => {
      try {
        const [p, m, cfg] = await Promise.all([getPartnerById(id), getPartnerMenuItems(id), getHotelConfig()]);
        setPartner(p);
        setMenuItems(m);
        if (cfg?.brandColor) setBrandColor(cfg.brandColor);
        if (p?.hotel_id) {
          try {
            const { data: hotel } = await supabase.from('hotels').select('address').eq('id', p.hotel_id).maybeSingle();
            if (hotel?.address) setHotelAddress(hotel.address);
          } catch { /* hotel address is optional */ }
        }
      } catch (e) {
        console.error('Failed to load partner data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Pre-fill from session
  useEffect(() => {
    try {
      const stored = localStorage.getItem('guestSession');
      const session = stored ? JSON.parse(stored) : null;
      const qrRoom = localStorage.getItem('attenda_qr_room');
      if (session?.name) setGuestName(session.name);
      if (qrRoom || session?.room) setRoomNumber(qrRoom || session?.room || '');
    } catch { /* ignore */ }
  }, []);

  // Fetch Uber quote when cart has items and partner uses uber_direct
  useEffect(() => {
    const totalQty = Object.values(cart).reduce((s, q) => s + q, 0);
    if (!partner || totalQty === 0) { setUberQuote(null); return; }
    if (!partner.delivery_providers?.some(d => d.name.toLowerCase().includes('uber'))) return;
    let cancelled = false;
    fetch(`/api/uber-direct/quote?partnerId=${partner.id}&hotelId=${partner.hotel_id}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled && d.ok && d.quote) {
          setUberQuote({ fee_display: d.quote.fee_display || `$${(d.quote.fee?.total / 100).toFixed(2)}`, feeCents: d.quote.fee?.total || 0 });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [partner, cart]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brandColor} transparent transparent transparent` }} />
    </div>
  );

  if (!partner) return (
    <div className="h-screen flex items-center justify-center text-gray-500 font-bold">Partner not found</div>
  );

  // Cart calculations
  const cartItems = menuItems
    .filter(i => (cart[i.id] || 0) > 0)
    .map(i => ({ ...i, qty: cart[i.id] }));
  const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);
  const subtotal = cartItems.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const serviceFee = +(subtotal * 0.10).toFixed(2);
  const deliveryFee = uberQuote ? uberQuote.feeCents / 100 : 0;
  const total = +(subtotal + serviceFee + deliveryFee).toFixed(2);

  // Group menu items by category
  const categories = Array.from(new Set(menuItems.map(i => i.category || 'Menu'))).filter(Boolean);
  const itemsByCategory = categories.reduce<Record<string, PartnerMenuItem[]>>((acc, cat) => {
    acc[cat] = menuItems.filter(i => (i.category || 'Menu') === cat);
    return acc;
  }, {});

  const addItem = (itemId: string) => setCart(c => ({ ...c, [itemId]: (c[itemId] || 0) + 1 }));
  const removeItem = (itemId: string) => setCart(c => ({ ...c, [itemId]: Math.max((c[itemId] || 0) - 1, 0) }));

  const placeOrder = async () => {
    if (ordering || !partner) return;
    if (!guestName.trim() || !roomNumber.trim()) return;
    setOrdering(true);
    try {
      const details = cartItems.map(i => `${i.qty}x ${i.name}`).join(', ');
      const { data: row, error } = await supabase.from('requests').insert({
        hotel_id: partner.hotel_id,
        guest_name: guestName.trim(),
        room: roomNumber.trim(),
        type: 'Food Order',
        details: `${partner.name}: ${details}${notes ? ` — Note: ${notes}` : ''} — $${total.toFixed(2)}`,
        status: 'pending',
        partner_id: partner.id,
        vendor_status: 'new',
        total_amount: total,
        vendor_payout: +subtotal.toFixed(2),
        uber_fee_cents: uberQuote ? Math.round(uberQuote.feeCents) : 0,
        stripe_payment_status: stripeEnabled ? 'pending' : 'room_charge',
      }).select('id').single();
      if (error) throw error;

      // If card payments are enabled, fetch a PaymentIntent and show the card step.
      if (stripeEnabled && row?.id) {
        const res = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: row.id,
            amountCents: Math.round(total * 100),
            partnerId: partner.id,
            description: `${partner.name} — Room ${roomNumber.trim()}`,
          }),
        });
        const data = await res.json();
        if (data.ok && data.clientSecret) {
          setPendingRequestId(row.id);
          setClientSecret(data.clientSecret);
          setOrdering(false);
          return; // wait for card payment; email sent on success
        }
        // Stripe not configured server-side → fall through to room-charge confirmation
      }

      sendOrderEmail();
      setOrderDone(true);
    } catch (e) {
      console.error('Order failed:', e);
      alert('Something went wrong. Please try again.');
    }
    setOrdering(false);
  };

  const sendOrderEmail = () => {
    if (!partner) return;
    getHotelConfig().then(hotelConfig => {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({
          type: 'food_order',
          data: {
            notificationEmail: hotelConfig?.notificationEmail || '',
            partnerEmail: partner.email || '',
            hotelName: hotelConfig?.name || 'Hotel',
            guestName: guestName.trim(),
            room: roomNumber.trim(),
            partnerName: partner.name,
            items: cartItems.map(i => ({ name: i.name, qty: i.qty, price: Number(i.price) })),
            total: total.toFixed(2),
          },
        }),
      }).catch(() => {});
    });
  };

  const onPaymentSuccess = () => {
    sendOrderEmail();
    setClientSecret(null);
    setOrderDone(true);
  };

  const onPaymentBack = async () => {
    // Guest backed out of card payment — cancel the pending order row
    if (pendingRequestId) {
      await supabase.from('requests').update({ status: 'closed', stripe_payment_status: 'abandoned' }).eq('id', pendingRequestId);
    }
    setClientSecret(null);
    setPendingRequestId(null);
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-[#F5F5F5] flex flex-col overflow-hidden relative">

      {/* ── Hero ── */}
      <div className="relative h-48 shrink-0">
        <Image
          src={partner.image_url || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&fit=crop'}
          alt={partner.name} fill className="object-cover" sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Top-right cart icon with item count badge */}
        {totalQty > 0 && (
          <button onClick={() => setCheckoutOpen(true)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            style={{ backgroundColor: brandColor }}>
            <ShoppingBag size={17} className="text-white" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-white flex items-center justify-center text-[11px] font-extrabold shadow"
              style={{ color: brandColor }}>
              {totalQty}
            </span>
          </button>
        )}

        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="text-[22px] font-extrabold text-white leading-tight">{partner.name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {partner.rating > 0 && (
              <span className="text-xs text-white/90 flex items-center gap-1">
                <Star size={11} className="text-yellow-400 fill-yellow-400" /> {partner.rating}
              </span>
            )}
            {partner.hours && (
              <span className="text-xs text-white/80 flex items-center gap-1"><Clock size={11} /> {partner.hours}</span>
            )}
            {partner.distance && (
              <span className="text-xs text-white/80 flex items-center gap-1"><MapPin size={11} /> {partner.distance}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* Delivery providers */}
        {partner.delivery_providers && partner.delivery_providers.length > 0 && (
          <div className="px-4 pt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Order via</p>
            <div className="space-y-2">
              {partner.delivery_providers.map((dp, i) => (
                <a key={i} href={dp.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between w-full py-3 px-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                  <span className="text-[14px] font-bold text-gray-900">{dp.name}</span>
                  <ExternalLink size={14} className="text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* In-room ordering menu */}
        {partner.has_ordering && menuItems.length > 0 ? (
          <>
            {/* Category sections */}
            {categories.map(cat => (
              <div key={cat}>
                <div className="px-4 pt-5 pb-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{cat}</p>
                </div>
                <div className="px-4 space-y-2.5">
                  {itemsByCategory[cat].map(item => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div key={item.id}
                        className={`bg-white rounded-2xl shadow-sm border transition-all ${qty > 0 ? 'border-2' : 'border-gray-100'}`}
                        style={{ borderColor: qty > 0 ? brandColor : undefined }}>
                        <div className="flex items-center gap-3 p-3.5">
                          {item.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image_url} alt={item.name}
                              className="w-[72px] h-[72px] rounded-xl object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[14px] text-gray-900 leading-snug">{item.name}</p>
                            {item.description && (
                              <p className="text-[12px] text-gray-400 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-[15px] font-extrabold mt-1.5" style={{ color: brandColor }}>
                              ${Number(item.price).toFixed(2)}
                            </p>
                          </div>
                          {/* +/- controls */}
                          <div className="flex items-center gap-2 shrink-0 ml-1">
                            {qty > 0 ? (
                              <>
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform">
                                  <Minus size={15} className="text-gray-600" />
                                </button>
                                <span className="w-5 text-center text-[15px] font-extrabold" style={{ color: brandColor }}>{qty}</span>
                                <button
                                  onClick={() => addItem(item.id)}
                                  className="w-8 h-8 rounded-full text-white flex items-center justify-center active:scale-90 transition-transform"
                                  style={{ backgroundColor: brandColor }}>
                                  <Plus size={15} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => addItem(item.id)}
                                className="w-8 h-8 rounded-full text-white flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                                style={{ backgroundColor: brandColor }}>
                                <Plus size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        ) : !partner.has_ordering && !partner.delivery_providers?.length ? (
          <div className="px-4 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-[13px] font-bold text-amber-800 mb-1">Visit or Call Ahead</p>
              <p className="text-[13px] text-amber-700 leading-relaxed">
                This restaurant doesn&apos;t offer delivery. Call ahead, visit in person, or ask the front desk.
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              {partner.phone && (
                <a href={`tel:${partner.phone}`}
                  className="flex-1 py-3.5 rounded-2xl text-white flex items-center justify-center gap-2 font-bold active:scale-95"
                  style={{ backgroundColor: brandColor }}>
                  <Phone size={16} /><span className="text-[14px]">Call</span>
                </a>
              )}
              {partner.address && (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(partner.address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-3.5 rounded-2xl bg-gray-200 flex items-center justify-center gap-2 active:scale-95">
                  <Navigation size={16} className="text-gray-700" />
                  <span className="text-[14px] font-bold text-gray-700">Directions</span>
                </a>
              )}
            </div>
          </div>
        ) : null}

        {/* Partner info footer */}
        <div className="px-4 pt-5 pb-2 space-y-2">
          {(partner.address || partner.phone) && (
            <div className="bg-white rounded-2xl p-4 space-y-2 border border-gray-100 shadow-sm">
              {partner.address && (
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <p className="text-[13px] text-gray-600">{partner.address}</p>
                </div>
              )}
              {partner.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-gray-400 shrink-0" />
                  <a href={`tel:${partner.phone}`} className="text-[13px] font-bold" style={{ color: brandColor }}>{partner.phone}</a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating cart bar ── */}
      {totalQty > 0 && !checkoutOpen && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-2 bg-gradient-to-t from-[#F5F5F5] via-[#F5F5F5]/95 to-transparent">
          <button
            onClick={() => setCheckoutOpen(true)}
            className="w-full text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-between px-5 active:scale-[0.97] transition-transform"
            style={{ backgroundColor: brandColor }}>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center">
                <span className="text-[13px] font-extrabold">{totalQty}</span>
              </div>
              <span className="text-[15px]">View Order</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[17px] font-extrabold">${total.toFixed(2)}</span>
              <ChevronRight size={16} className="opacity-70" />
            </div>
          </button>
        </div>
      )}

      {/* ── Checkout bottom sheet ── */}
      {checkoutOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !ordering && setCheckoutOpen(false)} />

          {/* Sheet */}
          <div ref={sheetRef} className="relative bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-[17px] font-extrabold text-gray-900">Your Order</h2>
              <button onClick={() => setCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90">
                <X size={16} className="text-gray-600" />
              </button>
            </div>

            {orderDone ? (
              /* ── Success state ── */
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${brandColor}15` }}>
                  <CheckCircle size={32} style={{ color: brandColor }} />
                </div>
                <h3 className="text-[20px] font-extrabold text-gray-900 mb-2">Order Placed!</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
                  {partner.name} received your order. We&apos;ll bring it to Room <strong>{roomNumber}</strong>.
                </p>
                <button
                  onClick={() => { setOrderDone(false); setCheckoutOpen(false); setCart({}); }}
                  className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
                  style={{ backgroundColor: brandColor }}>
                  Done
                </button>
              </div>
            ) : clientSecret ? (
              /* ── Card payment step ── */
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <PaymentForm
                    onSuccess={onPaymentSuccess}
                    onBack={onPaymentBack}
                    brandColor={brandColor}
                    amountLabel={`$${total.toFixed(2)}`}
                  />
                </Elements>
              </div>
            ) : (
              /* ── Order form ── */
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* Items list */}
                <div className="space-y-2">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => removeItem(item.id)}
                            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90">
                            <Minus size={13} className="text-gray-600" />
                          </button>
                          <span className="w-4 text-center text-[14px] font-extrabold" style={{ color: brandColor }}>{item.qty}</span>
                          <button onClick={() => addItem(item.id)}
                            className="w-7 h-7 rounded-full text-white flex items-center justify-center active:scale-90"
                            style={{ backgroundColor: brandColor }}>
                            <Plus size={13} />
                          </button>
                        </div>
                        <p className="text-[14px] font-semibold text-gray-800 truncate">{item.name}</p>
                      </div>
                      <p className="text-[14px] font-bold text-gray-700 shrink-0">${(Number(item.price) * item.qty).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Fee breakdown */}
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-gray-500">Subtotal</p>
                    <p className="text-[13px] text-gray-600">${subtotal.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-gray-500">Service fee (10%)</p>
                    <p className="text-[13px] text-gray-600">${serviceFee.toFixed(2)}</p>
                  </div>
                  {uberQuote && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] text-gray-500">Delivery fee</p>
                        <p className="text-[13px] text-gray-600">{uberQuote.fee_display}</p>
                      </div>
                      {partner?.address && hotelAddress && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                          🚗 {partner.address} → {hotelAddress}
                        </p>
                      )}
                    </>
                  )}
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                    <p className="text-[15px] font-bold text-gray-700">Total</p>
                    <p className="text-[18px] font-extrabold" style={{ color: brandColor }}>${total.toFixed(2)}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Guest info */}
                <div className="space-y-3">
                  <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Deliver to</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Your Name</label>
                      <input
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="e.g. Maria G."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] font-medium outline-none focus:border-gray-400"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Room #</label>
                      <input
                        value={roomNumber}
                        onChange={e => setRoomNumber(e.target.value)}
                        placeholder="101"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] font-medium text-center outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Special Instructions <span className="font-normal text-gray-400">(optional)</span></label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Allergies, no onions, extra sauce…"
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-gray-400 resize-none"
                    />
                  </div>
                </div>

                {/* Place order button */}
                <div className="pb-2">
                  <button
                    onClick={placeOrder}
                    disabled={ordering || !guestName.trim() || !roomNumber.trim()}
                    className="w-full text-white font-extrabold py-4 rounded-2xl text-[16px] shadow-lg active:scale-[0.97] transition-transform disabled:opacity-50"
                    style={{ backgroundColor: brandColor }}>
                    {ordering ? 'Placing Order…' : stripeEnabled ? `Continue to Payment · $${total.toFixed(2)}` : `Place Order · $${total.toFixed(2)}`}
                  </button>
                  <p className="text-[11px] text-gray-400 text-center mt-2">
                    {stripeEnabled ? 'Pay securely by card · powered by Stripe' : 'Charged to your room or pay at front desk'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NearbyDetailPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    }>
      <PartnerContent />
    </Suspense>
  );
}
