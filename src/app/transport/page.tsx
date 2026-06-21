'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plane, Bus, Ship, Car, UserCheck, X, MapPin, CheckCircle, Users } from 'lucide-react';
import { getHotelConfig, HotelConfig, getAllShuttleSlotsForHotel, bookShuttleSlot, getCruiseSchedules, ShuttleSlot, CruiseSchedule, createShuttleRequest } from '@/lib/supabase';
import { goBackToHotel } from '@/lib/guest-context';
import { TaxiCallerRide } from '@/components/TaxiCallerRide';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function nowTime() { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

/* ── TaxiCaller moved to src/components/TaxiCallerRide.tsx ── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _TaxiCallerRidePlaceholder({ brandColor, config, title = 'Book a Ride', pickupDefault = '' }: { brandColor: string; config: HotelConfig | null; title?: string; pickupDefault?: string }) {
  const [form, setForm] = useState({ name: '', room: '', phone: '', pickup: pickupDefault || config?.address || '', destination: '', date: todayISO(), time: nowTime(), pax: 1, notes: '' });
  const [step, setStep] = useState<'form' | 'quote' | 'paying' | 'done'>('form');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [confirm, setConfirm] = useState<BookingConfirm | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Update pickup if config loads after mount
  useEffect(() => {
    if (config?.address && !form.pickup) setForm(f => ({ ...f, pickup: config.address }));
  }, [config?.address]);

  const getQuote = async () => {
    if (!form.name || !form.room || !form.destination) { setError('Please fill in name, room, and destination.'); return; }
    setError(''); setLoading(true);
    try {
      const pickupTime = new Date(`${form.date}T${form.time}`).toISOString();
      const res = await fetch('/api/taxicaller/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup: form.pickup || 'Hotel Lobby', destination: form.destination, pax: form.pax, pickupTime }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Could not get quote');
      setQuote(data);
      setStep('quote');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Quote failed');
    } finally { setLoading(false); }
  };

  const bookAndPay = async () => {
    if (!quote) return;
    setError(''); setLoading(true); setStep('paying');
    try {
      // 1. Create shuttle_request record
      const hotelId = config?.id;
      let requestId = '';
      if (hotelId) {
        const req = await createShuttleRequest({
          hotel_id: hotelId,
          guest_name: form.name,
          room_number: form.room,
          pickup_location: form.pickup || 'Hotel Lobby',
          destination: form.destination,
          date: form.date,
          time: form.time,
          pax: form.pax,
          notes: form.notes || undefined,
          status: 'pending',
        });
        requestId = req?.id ?? '';
      }

      // 2. Create Stripe PaymentIntent
      const intentRes = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          amountCents: quote.total_cents,
          partnerId: 'taxicaller',
          description: `Transport: ${form.pickup} → ${form.destination}`,
          quoteId: quote.quoteId,
        }),
      });
      const intentData = await intentRes.json();

      // 3. Confirm payment with Stripe.js
      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (stripeKey && intentData.clientSecret) {
        const stripe = await loadStripe(stripeKey);
        if (stripe) {
          const { error: stripeError } = await stripe.confirmPayment({
            clientSecret: intentData.clientSecret,
            confirmParams: { return_url: window.location.href },
            redirect: 'if_required',
          });
          if (stripeError) throw new Error(stripeError.message);
        }
      }

      // 4. Create TaxiCaller booking
      const bookRes = await fetch('/api/taxicaller/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          quoteId: quote.quoteId,
          guestName: form.name,
          guestPhone: form.phone,
          pickup: form.pickup || 'Hotel Lobby',
          destination: form.destination,
          pickupTime: new Date(`${form.date}T${form.time}`).toISOString(),
          pax: form.pax,
          notes: form.notes,
        }),
      });
      const bookData = await bookRes.json();
      if (!bookData.ok) throw new Error(bookData.error || 'Booking failed');

      setConfirm(bookData.booking);
      setStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Booking failed');
      setStep('quote');
    } finally { setLoading(false); }
  };

  if (step === 'done' && confirm) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-[18px] font-extrabold text-gray-900">Ride Confirmed!</p>
          <p className="text-[13px] text-gray-400 mt-0.5">Your driver is on the way</p>
        </div>
        {confirm.driver_name && (
          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-1.5">
            <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider">Driver</p>
            <p className="text-[15px] font-extrabold text-gray-900">{confirm.driver_name}</p>
            {confirm.driver_phone && <p className="text-[13px] text-gray-500">{confirm.driver_phone}</p>}
            {confirm.vehicle_plate && <p className="text-[12px] text-gray-400">Vehicle: {confirm.vehicle_plate}</p>}
          </div>
        )}
        {confirm.tracking_url && (
          <a href={confirm.tracking_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-[14px] text-white"
            style={{ backgroundColor: brandColor }}>
            <ExternalLink size={16} /> Track My Ride
          </a>
        )}
        <button onClick={() => { setStep('form'); setQuote(null); setConfirm(null); setForm(f => ({ ...f, destination: '', notes: '' })); }}
          className="w-full py-2.5 rounded-2xl text-[13px] font-semibold text-gray-500 bg-gray-100">
          Book Another Ride
        </button>
      </div>
    );
  }

  if (step === 'quote' && quote) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('form')} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          <h4 className="font-extrabold text-[15px] text-gray-900">Price Quote</h4>
        </div>

        {/* Route summary */}
        <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="flex flex-col items-center gap-0.5 mt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="w-0.5 h-5 bg-gray-200" />
              <MapPin size={10} style={{ color: brandColor }} />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-[12px] text-gray-600">{form.pickup || 'Hotel Lobby'}</p>
              <p className="text-[13px] font-bold text-gray-900">{form.destination}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
            <span className="flex items-center gap-1"><Users size={10} /> {form.pax} {form.pax === 1 ? 'passenger' : 'passengers'}</span>
            <span className="flex items-center gap-1"><Clock size={10} /> ~{quote.estimated_mins} min</span>
            <span className="capitalize">{quote.vehicle_type}</span>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-[13px] text-gray-600">
            <span>Base fare</span>
            <span>{fmt(quote.base_fare_cents)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-gray-600">
            <span>Service fee (10%)</span>
            <span>{fmt(quote.surcharge_cents)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between text-[15px] font-extrabold text-gray-900">
            <span>Total</span>
            <span>{fmt(quote.total_cents)}</span>
          </div>
        </div>

        {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

        <button onClick={bookAndPay} disabled={loading}
          className="w-full py-3.5 rounded-2xl font-extrabold text-[14px] text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: brandColor }}>
          <CreditCard size={16} />
          {loading ? 'Processing...' : `Book & Pay ${fmt(quote.total_cents)}`}
        </button>
        <p className="text-[11px] text-gray-400 text-center">Secure payment · Cancellable before pickup</p>
      </div>
    );
  }

  if (step === 'paying') {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderLeftColor: brandColor, borderRightColor: brandColor, borderBottomColor: brandColor }} />
        <p className="text-[13px] font-semibold text-gray-600">Confirming your booking...</p>
      </div>
    );
  }

  // Step: form
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
      <h4 className="font-extrabold text-[15px] text-gray-900">{title}</h4>

      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Your name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
        <input placeholder="Room number *" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })}
          className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
      </div>

      <input placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} type="tel"
        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />

      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <input value={form.pickup} onChange={e => setForm({ ...form, pickup: e.target.value })} placeholder="Pickup location"
          className="flex-1 bg-transparent text-[13px] outline-none" />
      </div>

      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
        <MapPin size={12} style={{ color: brandColor }} className="shrink-0" />
        <input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="Destination *"
          className="flex-1 bg-transparent text-[13px] outline-none" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
          className="col-span-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
        <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
          className="bg-gray-50 rounded-xl px-2 py-2.5 border border-gray-200 text-[13px] outline-none" />
      </div>

      <div className="flex items-center gap-2">
        <Users size={13} className="text-gray-400" />
        <input type="number" min={1} max={10} value={form.pax} onChange={e => setForm({ ...form, pax: parseInt(e.target.value) || 1 })}
          className="w-20 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 text-[13px] outline-none text-center" />
        <span className="text-[12px] text-gray-400">passengers</span>
      </div>

      <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none resize-none h-14" />

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      <button onClick={getQuote} disabled={loading || !form.name || !form.room || !form.destination}
        className="w-full py-3.5 rounded-2xl font-extrabold text-[14px] text-white disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ backgroundColor: brandColor }}>
        {loading ? 'Getting price...' : 'Get Price →'}
      </button>
    </div>
  );
}

/* ── Hotel Shuttle Request Form (no payment) ─── */
function HotelShuttleForm({ brandColor, config, onBack }: { brandColor: string; config: HotelConfig | null; onBack: () => void }) {
  const [form, setForm] = useState({ name: '', room: '', pax: 1, pickup: config?.shuttlePickupLocation || 'Hotel Lobby', destination: '', date: todayISO(), time: nowTime(), notes: '' });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.name || !form.room || !form.destination) { setError('Please fill in name, room, and destination.'); return; }
    setError(''); setLoading(true);
    try {
      await createShuttleRequest({
        hotel_id: config?.id || '',
        guest_name: form.name,
        room_number: form.room,
        pickup_location: form.pickup || 'Hotel Lobby',
        destination: form.destination,
        date: form.date,
        time: form.time,
        pax: form.pax,
        notes: form.notes || undefined,
        status: 'pending',
      });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not submit request');
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-[18px] font-extrabold text-gray-900">Request Sent!</p>
          <p className="text-[13px] text-gray-400 mt-1">Our team will confirm your shuttle shortly.</p>
        </div>
        <button onClick={() => { setDone(false); setForm({ name: '', room: '', pax: 1, pickup: config?.shuttlePickupLocation || 'Hotel Lobby', destination: '', date: todayISO(), time: nowTime(), notes: '' }); onBack(); }}
          className="w-full py-2.5 rounded-2xl text-[13px] font-semibold text-gray-500 bg-gray-100">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={16} /></button>
        <h4 className="font-extrabold text-[15px] text-gray-900">Hotel Transportation</h4>
        <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">FREE</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Your name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
        <input placeholder="Room number *" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })}
          className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
      </div>

      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <input value={form.pickup} onChange={e => setForm({ ...form, pickup: e.target.value })} placeholder="Pickup location"
          className="flex-1 bg-transparent text-[13px] outline-none" />
      </div>

      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
        <MapPin size={12} style={{ color: brandColor }} className="shrink-0" />
        <input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="Destination *"
          className="flex-1 bg-transparent text-[13px] outline-none" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
          className="col-span-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
        <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
          className="bg-gray-50 rounded-xl px-2 py-2.5 border border-gray-200 text-[13px] outline-none" />
      </div>

      <div className="flex items-center gap-2">
        <Users size={13} className="text-gray-400" />
        <input type="number" min={1} max={10} value={form.pax} onChange={e => setForm({ ...form, pax: parseInt(e.target.value) || 1 })}
          className="w-20 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 text-[13px] outline-none text-center" />
        <span className="text-[12px] text-gray-400">passengers</span>
      </div>

      <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none resize-none h-14" />

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      <button onClick={submit} disabled={loading || !form.name || !form.room || !form.destination}
        className="w-full py-3.5 rounded-2xl font-extrabold text-[14px] text-white disabled:opacity-50"
        style={{ backgroundColor: brandColor }}>
        {loading ? 'Sending...' : 'Request Shuttle'}
      </button>
    </div>
  );
}

export default function TransportPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<'book' | 'schedules'>('book');
  const [method, setMethod] = useState<null | 'shuttle' | 'taxi'>(null);
  const [brandColor, setBrandColor] = useState('#6B1D3C');
  const [config, setConfig] = useState<HotelConfig | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getHotelConfig().then(cfg => {
      if (cancelled) return;
      setConfig(cfg);
      if (cfg?.brandColor) setBrandColor(cfg.brandColor);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => goBackToHotel(router)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Transport</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8">
          {/* Main tab toggle */}
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex mb-4">
            {([
              { key: 'book' as const, label: 'Book Transport' },
              { key: 'schedules' as const, label: 'Schedules' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => { setMainTab(t.key); setMethod(null); }}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${mainTab === t.key ? 'text-white' : 'text-gray-500'}`}
                style={mainTab === t.key ? { backgroundColor: brandColor } : undefined}>
                {t.label}
              </button>
            ))}
          </div>

          {mainTab === 'book' && (
            <div>
              {/* Step 1: Option cards */}
              {!method && (
                <div className="space-y-3">
                  <p className="text-[13px] text-gray-500 font-semibold text-center mb-1">How would you like to travel?</p>

                  {/* Hotel Shuttle card */}
                  <button onClick={() => setMethod('shuttle')}
                    className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Bus size={22} className="text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-extrabold text-gray-900">Hotel Transportation</p>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">FREE</span>
                      </div>
                      <p className="text-[12px] text-gray-400 mt-0.5">Our team confirms availability</p>
                    </div>
                    <ArrowLeft size={16} className="text-gray-300 rotate-180 shrink-0" />
                  </button>

                  {/* TaxiCaller card */}
                  <button onClick={() => setMethod('taxi')}
                    className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}15` }}>
                      <Car size={22} style={{ color: brandColor }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-extrabold text-gray-900">Book a Taxi</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">Instant dispatch · Pay online</p>
                    </div>
                    <ArrowLeft size={16} className="text-gray-300 rotate-180 shrink-0" />
                  </button>
                </div>
              )}

              {/* Step 2a: Hotel Shuttle form */}
              {method === 'shuttle' && (
                <HotelShuttleForm brandColor={brandColor} config={config} onBack={() => setMethod(null)} />
              )}

              {/* Step 2b: TaxiCaller ride */}
              {method === 'taxi' && (
                <div>
                  <button onClick={() => setMethod(null)} className="flex items-center gap-1.5 text-[13px] text-gray-500 font-semibold mb-3">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <TaxiCallerRide brandColor={brandColor} config={config} title="Book a Taxi" pickupDefault={config?.address || ''} />
                </div>
              )}
            </div>
          )}

          {mainTab === 'schedules' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Plane size={14} className="text-gray-400" />
                  <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Airport Shuttle</p>
                </div>
                <AirportSchedule brandColor={brandColor} config={config} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Ship size={14} className="text-gray-400" />
                  <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Cruise Port</p>
                </div>
                <CruiseScheduleSection brandColor={brandColor} config={config} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Airport Shuttle ───────────────────────── */
function AirportSchedule({ brandColor, config }: { brandColor: string; config: HotelConfig | null }) {
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState<{ slot_id: string; show: boolean; name: string; room: string; pax: number; notes: string; charge_accepted: boolean; date: string }>({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false, date: todayISO() });
  const [booked, setBooked] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!config?.id) { setLoading(false); return; }
      const s = await getAllShuttleSlotsForHotel(config.id);
      if (cancelled) return;
      // Filter to airport routes only
      setSlots(s.filter(slot => slot.route_type === 'airport'));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [config?.id]);

  const handleBook = async () => {
    if (!bookingForm.name || !bookingForm.room) return;
    const slot = slots.find(s => s.id === bookingForm.slot_id);
    const pricePer = slot?.override_price ?? slot?.route_price ?? 0;
    await Promise.all([
      bookShuttleSlot({
        slot_id: bookingForm.slot_id,
        guest_name: bookingForm.name,
        room_number: bookingForm.room,
        pax: bookingForm.pax,
        notes: bookingForm.notes,
        price_charged: pricePer * bookingForm.pax,
        charge_accepted: bookingForm.charge_accepted,
      }),
      config?.id ? createShuttleRequest({
        hotel_id: config.id,
        guest_name: bookingForm.name,
        room_number: bookingForm.room,
        pickup_location: config.shuttlePickupLocation || 'Hotel Lobby',
        destination: slot?.route_name || 'Airport',
        date: bookingForm.date,
        time: slot?.departure_time || undefined,
        pax: bookingForm.pax,
        notes: bookingForm.notes || undefined,
        status: 'pending',
      }) : Promise.resolve(),
    ]);
    setBooked(bookingForm.slot_id);
    setBookingForm({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false, date: todayISO() });
    if (config?.id) {
      const s = await getAllShuttleSlotsForHotel(config.id);
      setSlots(s.filter(slot => slot.route_type === 'airport'));
    }
  };

  // Group slots by day, then sort by time
  const byDay: Record<string, ShuttleSlot[]> = {};
  slots.forEach(slot => {
    const days = (slot.days_of_week || []).length > 0 ? slot.days_of_week : [new Date().getDay()];
    days.forEach(d => {
      const dayLabel = DAYS[d];
      if (!byDay[dayLabel]) byDay[dayLabel] = [];
      byDay[dayLabel].push(slot);
    });
  });
  // Sort days
  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  Object.keys(byDay).forEach(k => {
    byDay[k].sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || ''));
  });

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderLeftColor: brandColor, borderRightColor: brandColor, borderBottomColor: brandColor }} />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <Plane size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500">No airport shuttle schedule available yet.</p>
        <p className="text-[12px] text-gray-400 mt-1">Check with the front desk for current times.</p>
      </div>
    );
  }

  const isFreeShuttle = config?.hasFreeShuttle;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className={`rounded-2xl p-3 border flex items-start gap-2.5 ${
        isFreeShuttle ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
      }`}>
        <Plane size={18} className={isFreeShuttle ? 'text-emerald-600' : 'text-amber-600'} />
        <div>
          <p className="text-[12px] font-bold text-gray-800 mb-0.5">
            {isFreeShuttle ? 'Complimentary Airport Shuttle' : 'Airport Shuttle'}
          </p>
          <p className="text-[11px] text-gray-600">
            {config?.shuttlePickupLocation || 'Hotel lobby'} pickup · {
              config?.shuttleStartTime?.slice(0, 5) || '—'
            } to {config?.shuttleEndTime?.slice(0, 5) || '—'}
            {!isFreeShuttle && <span className="font-semibold"> · Charges apply</span>}
          </p>
        </div>
      </div>

      {/* Daily schedule */}
      {dayOrder.filter(d => byDay[d]).map(day => (
        <div key={day} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <h3 className="font-bold text-[13px] text-gray-900">{day}s</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {byDay[day].map(slot => {
              const pricePer = slot.override_price ?? slot.route_price ?? 0;
              const full = slot.capacity > 0 && (slot.bookings_count || 0) >= slot.capacity;
              const isBooked = booked === slot.id;
              return (
                <div key={slot.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[48px]">
                      <p className="text-[18px] font-extrabold text-gray-900">{slot.departure_time?.slice(0, 5)}</p>
                      {slot.event_label && (
                        <p className="text-[9px] text-gray-400">{slot.event_label}</p>
                      )}
                    </div>
                    <div>
                      {pricePer > 0 ? (
                        <p className="text-[10px] font-semibold text-amber-700">${pricePer}/person</p>
                      ) : (
                        <p className="text-[10px] font-semibold text-emerald-600">Free</p>
                      )}
                      {slot.capacity > 0 && (
                        <p className={`text-[10px] font-semibold ${full ? 'text-red-500' : 'text-emerald-600'}`}>
                          {full ? 'Full' : `${slot.capacity - (slot.bookings_count || 0)} spots`}
                        </p>
                      )}
                    </div>
                  </div>
                  {isBooked ? (
                    <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                      <UserCheck size={12} /> Booked
                    </span>
                  ) : full ? (
                    <span className="text-[12px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">Full</span>
                  ) : bookingForm.show && bookingForm.slot_id === slot.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setBookingForm({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false, date: todayISO() })} className="text-gray-400"><X size={16} /></button>
                      <button onClick={handleBook} className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white disabled:opacity-40" style={{ backgroundColor: brandColor }} disabled={pricePer > 0 && !bookingForm.charge_accepted}>Confirm</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setBookingForm({ slot_id: slot.id, show: true, name: '', room: '', pax: 1, notes: '', charge_accepted: false, date: todayISO() })}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white active:scale-95"
                      style={{ backgroundColor: brandColor }}
                    >
                      Book
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Booking form modal */}
      {bookingForm.show && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h4 className="font-extrabold text-[14px] text-gray-900">Reserve Your Spot</h4>
          <input
            placeholder="Your name"
            value={bookingForm.name}
            onChange={e => setBookingForm({ ...bookingForm, name: e.target.value })}
            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none"
          />
          <div className="flex gap-2">
            <input
              placeholder="Room number"
              value={bookingForm.room}
              onChange={e => setBookingForm({ ...bookingForm, room: e.target.value })}
              className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none"
            />
            <div className="w-24">
              <label className="text-[10px] text-gray-400 block mb-0.5">Pax</label>
              <input
                type="number" min={1} max={10}
                value={bookingForm.pax}
                onChange={e => setBookingForm({ ...bookingForm, pax: parseInt(e.target.value) || 1 })}
                className="w-full bg-gray-50 rounded-xl px-2 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none text-center"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Date</label>
            <input type="date" value={bookingForm.date} onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" />
          </div>
          {(() => {
            const slot = slots.find(s => s.id === bookingForm.slot_id);
            const pricePer = slot?.override_price ?? slot?.route_price ?? 0;
            const total = pricePer * bookingForm.pax;
            return total > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-amber-800">${pricePer} × {bookingForm.pax} {bookingForm.pax === 1 ? 'person' : 'people'}</span>
                  <span className="font-extrabold text-amber-900">${total.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-amber-700">This amount will be added to your final bill at checkout.</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={bookingForm.charge_accepted} onChange={e => setBookingForm({ ...bookingForm, charge_accepted: e.target.checked })}
                    className="w-4 h-4 rounded" style={{ accentColor: brandColor }} />
                  <span className="text-[12px] font-semibold text-amber-900">I accept this charge to my final bill</span>
                </label>
              </div>
            ) : null;
          })()}
          <textarea
            placeholder="Notes (optional)"
            value={bookingForm.notes}
            onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none resize-none h-16"
          />
        </div>
      )}
    </div>
  );
}

/* ── Cruise Port ───────────────────────────── */
function CruiseScheduleSection({ brandColor, config }: { brandColor: string; config: HotelConfig | null }) {
  const [cruises, setCruises] = useState<CruiseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState<{ slot_id: string; show: boolean; name: string; room: string; pax: number; notes: string; charge_accepted: boolean; date: string }>({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false, date: todayISO() });
  const [booked, setBooked] = useState<string | null>(null);

  // Get airport shuttle slots so guests can book a ride to port
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!config?.id) { setLoading(false); return; }
      const [c, s] = await Promise.all([
        getCruiseSchedules(config.id),
        getAllShuttleSlotsForHotel(config.id),
      ]);
      if (cancelled) return;
      setCruises(c);
      setSlots(s.filter(slot => slot.route_type === 'airport'));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [config?.id]);

  const handleBook = async () => {
    if (!bookingForm.name || !bookingForm.room) return;
    const slot = slots.find(s => s.id === bookingForm.slot_id);
    const pricePer = slot?.override_price ?? slot?.route_price ?? 0;
    await Promise.all([
      bookShuttleSlot({
        slot_id: bookingForm.slot_id,
        guest_name: bookingForm.name,
        room_number: bookingForm.room,
        pax: bookingForm.pax,
        notes: bookingForm.notes,
        price_charged: pricePer * bookingForm.pax,
        charge_accepted: bookingForm.charge_accepted,
      }),
      config?.id ? createShuttleRequest({
        hotel_id: config.id,
        guest_name: bookingForm.name,
        room_number: bookingForm.room,
        pickup_location: config.shuttlePickupLocation || 'Hotel Lobby',
        destination: slot?.route_name || 'Cruise Port',
        date: bookingForm.date,
        time: slot?.departure_time || undefined,
        pax: bookingForm.pax,
        notes: bookingForm.notes || undefined,
        status: 'pending',
      }) : Promise.resolve(),
    ]);
    setBooked(bookingForm.slot_id);
    setBookingForm({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false, date: todayISO() });
    if (config?.id) {
      const s = await getAllShuttleSlotsForHotel(config.id);
      setSlots(s.filter(slot => slot.route_type === 'airport'));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderLeftColor: brandColor, borderRightColor: brandColor, borderBottomColor: brandColor }} />
      </div>
    );
  }

  if (cruises.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <Ship size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500">No cruise schedules available yet.</p>
        <p className="text-[12px] text-gray-400 mt-1">Check with the front desk for cruise port information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-2xl p-3 border border-blue-200 flex items-start gap-2.5">
        <Ship size={18} className="text-blue-600" />
        <div>
          <p className="text-[12px] font-bold text-blue-800 mb-0.5">Cruise Port Transfers</p>
          <p className="text-[11px] text-blue-700">Book your hotel shuttle below to arrive at the cruise port on time.</p>
        </div>
      </div>

      {/* Cruise departures */}
      {cruises.sort((a, b) => a.departure_date.localeCompare(b.departure_date)).map(c => (
        <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Ship size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.cruise_line || 'Cruise Line'}</span>
                  {c.terminal && <span className="text-[10px] text-gray-400">{c.terminal}</span>}
                </div>
                <p className="text-[16px] font-extrabold text-gray-900">{c.ship_name}</p>
                <p className="text-[13px] text-gray-600 mt-0.5">
                  {new Date(c.departure_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-[13px] font-semibold" style={{ color: brandColor }}>Departs {c.departure_time.slice(0, 5)}</p>
                {c.notes && <p className="text-[11px] text-gray-400 mt-1">{c.notes}</p>}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Shuttle times to port */}
      {slots.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-[13px] text-gray-900 flex items-center gap-1.5">
              <Bus size={14} style={{ color: brandColor }} />
              Shuttle to Port
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {slots.slice(0, 10).map(slot => {
              const pricePer = slot.override_price ?? slot.route_price ?? 0;
              const full = slot.capacity > 0 && (slot.bookings_count || 0) >= slot.capacity;
              const isBooked = booked === slot.id;
              return (
                <div key={slot.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[48px]">
                      <p className="text-[18px] font-extrabold text-gray-900">{slot.departure_time?.slice(0, 5)}</p>
                      <p className="text-[9px] text-gray-400">{slot.event_label || 'Daily'}</p>
                    </div>
                    <div>
                      {pricePer > 0 ? (
                        <p className="text-[10px] font-semibold text-amber-700">${pricePer}</p>
                      ) : (
                        <p className="text-[10px] font-semibold text-emerald-600">Free</p>
                      )}
                    </div>
                  </div>
                  {isBooked ? (
                    <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full"><UserCheck size={12} /> Booked</span>
                  ) : full ? (
                    <span className="text-[12px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">Full</span>
                  ) : (
                    <button onClick={() => setBookingForm({ slot_id: slot.id, show: true, name: '', room: '', pax: 1, notes: '', charge_accepted: false, date: todayISO() })}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white active:scale-95" style={{ backgroundColor: brandColor }}>
                      Book
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking form modal */}
      {bookingForm.show && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h4 className="font-extrabold text-[14px] text-gray-900">Reserve Shuttle to Port</h4>
          <input placeholder="Your name" value={bookingForm.name} onChange={e => setBookingForm({ ...bookingForm, name: e.target.value })}
            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" />
          <div className="flex gap-2">
            <input placeholder="Room number" value={bookingForm.room} onChange={e => setBookingForm({ ...bookingForm, room: e.target.value })}
              className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" />
            <div className="w-24">
              <label className="text-[10px] text-gray-400 block mb-0.5">Pax</label>
              <input type="number" min={1} max={10} value={bookingForm.pax} onChange={e => setBookingForm({ ...bookingForm, pax: parseInt(e.target.value) || 1 })}
                className="w-full bg-gray-50 rounded-xl px-2 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none text-center" />
            </div>
          </div>
          {(() => {
            const slot = slots.find(s => s.id === bookingForm.slot_id);
            const pricePer = slot?.override_price ?? slot?.route_price ?? 0;
            const total = pricePer * bookingForm.pax;
            return total > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-amber-800">${pricePer} × {bookingForm.pax}</span>
                  <span className="font-extrabold text-amber-900">${total.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-amber-700">Added to final bill.</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={bookingForm.charge_accepted} onChange={e => setBookingForm({ ...bookingForm, charge_accepted: e.target.checked })}
                    className="w-4 h-4 rounded" style={{ accentColor: brandColor }} />
                  <span className="text-[12px] font-semibold text-amber-900">I accept this charge</span>
                </label>
              </div>
            ) : null;
          })()}
          <textarea placeholder="Notes (optional)" value={bookingForm.notes} onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none resize-none h-16" />
          <div className="flex gap-2 pt-1">
            <button onClick={handleBook} disabled={!bookingForm.name || !bookingForm.room} className="flex-1 py-2.5 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: brandColor }}>Confirm Booking</button>
            <button onClick={() => setBookingForm({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false, date: todayISO() })} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

