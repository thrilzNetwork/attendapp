'use client';

import { useState, useEffect } from 'react';
import { MapPin, Clock, Users, CreditCard, CheckCircle, ExternalLink } from 'lucide-react';
import { createShuttleRequest, getHotelConfig, HotelConfig } from '@/lib/supabase';
import { loadStripe } from '@stripe/stripe-js';

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function nowTime() { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export type TaxiQuoteResult = { quoteId: string; base_fare_cents: number; surcharge_cents: number; total_cents: number; estimated_mins: number; vehicle_type: string };
export type TaxiBookingConfirm = { booking_id: string; driver_name: string; driver_phone: string; vehicle_plate: string; tracking_url: string };

export function TaxiCallerRide({
  brandColor,
  config,
  title = 'Book a Ride',
  pickupDefault = '',
  onBack,
}: {
  brandColor: string;
  config: HotelConfig | null;
  title?: string;
  pickupDefault?: string;
  onBack?: () => void;
}) {
  const [form, setForm] = useState({ name: '', room: '', phone: '', pickup: pickupDefault || config?.address || '', destination: '', date: todayISO(), time: nowTime(), pax: 1, notes: '' });
  const [step, setStep] = useState<'form' | 'quote' | 'paying' | 'done'>('form');
  const [quote, setQuote] = useState<TaxiQuoteResult | null>(null);
  const [confirm, setConfirm] = useState<TaxiBookingConfirm | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config?.address && !form.pickup) setForm(f => ({ ...f, pickup: config!.address }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const hotelConfig = config || await getHotelConfig();
      const hotelId = hotelConfig?.id || '';
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

  const reset = () => {
    setStep('form'); setQuote(null); setConfirm(null); setError('');
    setForm(f => ({ ...f, destination: '', notes: '' }));
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
        <button onClick={onBack ?? reset}
          className="w-full py-2.5 rounded-2xl text-[13px] font-semibold text-gray-500 bg-gray-100">
          {onBack ? 'Done' : 'Book Another Ride'}
        </button>
      </div>
    );
  }

  if (step === 'quote' && quote) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('form')} className="text-gray-400 hover:text-gray-600">←</button>
          <h4 className="font-extrabold text-[15px] text-gray-900">Price Quote</h4>
        </div>
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
        <div className="space-y-2">
          <div className="flex justify-between text-[13px] text-gray-600">
            <span>Base fare</span><span>{fmt(quote.base_fare_cents)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-gray-600">
            <span>Service fee (10%)</span><span>{fmt(quote.surcharge_cents)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between text-[15px] font-extrabold text-gray-900">
            <span>Total</span><span>{fmt(quote.total_cents)}</span>
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

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
      {onBack && (
        <button onClick={onBack} className="text-[13px] font-semibold flex items-center gap-1 text-gray-500 mb-1">
          ← Back
        </button>
      )}
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
