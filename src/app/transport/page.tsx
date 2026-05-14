'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Plane, Bus, UserCheck, X } from 'lucide-react';
import { getHotelConfig, HotelConfig, getAllShuttleSlotsForHotel, bookShuttleSlot, createShuttleRequest, ShuttleSlot } from '@/lib/supabase';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TransportPage() {
  const router = useRouter();
  const [view, setView] = useState<'request' | 'schedule'>('request');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
  }, []);

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => router.push('/')} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Transport</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8">
          {/* View Toggle */}
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex mb-3">
            <button
              onClick={() => setView('request')}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${view === 'request' ? 'text-white' : 'text-gray-500'}`}
              style={view === 'request' ? { backgroundColor: '#6B1D3C' } : undefined}
            >
              Request Pickup
            </button>
            <button
              onClick={() => setView('schedule')}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${view === 'schedule' ? 'text-white' : 'text-gray-500'}`}
              style={view === 'schedule' ? { backgroundColor: '#6B1D3C' } : undefined}
            >
              Airport & Cruise Shuttle
            </button>
          </div>

          {view === 'schedule' ? <ShuttleScheduleView /> : <OnDemandRequest />}
        </div>
      </div>
    </div>
  );
}

/* ── Shuttle Schedule (Airport + Cruise Port) ───────────── */
function ShuttleScheduleView() {
  const [hotel, setHotel] = useState<HotelConfig | null>(null);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState<{ slot_id: string; show: boolean; name: string; room: string; pax: number; notes: string; charge_accepted: boolean }>({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false });
  const [booked, setBooked] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const h = await getHotelConfig();
      setHotel(h);
      if (h?.id) {
        const s = await getAllShuttleSlotsForHotel(h.id);
        setSlots(s);
      }
      setLoading(false);
    })();
  }, []);

  const handleBook = async () => {
    if (!bookingForm.name || !bookingForm.room) return;
    const slot = slots.find(s => s.id === bookingForm.slot_id);
    const pricePer = slot?.override_price ?? slot?.route_price ?? 0;
    await bookShuttleSlot({
      slot_id: bookingForm.slot_id,
      guest_name: bookingForm.name,
      room_number: bookingForm.room,
      pax: bookingForm.pax,
      notes: bookingForm.notes,
      price_charged: pricePer * bookingForm.pax,
      charge_accepted: bookingForm.charge_accepted,
    });
    setBooked(bookingForm.slot_id);
    setBookingForm({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false });
    // Refresh slots
    if (hotel?.id) {
      const s = await getAllShuttleSlotsForHotel(hotel.id);
      setSlots(s);
    }
  };

  // Group slots by route
  const byRoute: Record<string, ShuttleSlot[]> = {};
  slots.forEach(s => {
    const key = s.route_name || 'Unknown';
    if (!byRoute[key]) byRoute[key] = [];
    byRoute[key].push(s);
  });

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <div className="w-6 h-6 border-2 border-[#6B1D3C] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <Bus size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500">No shuttle schedule available yet.</p>
        <p className="text-[12px] text-gray-400 mt-1">Check with the front desk for current times.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(byRoute).map(([routeName, routeSlots]) => (
        <div key={routeName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Bus size={16} className="text-[#6B1D3C]" />
            <h3 className="font-extrabold text-[15px] text-gray-900">{routeName}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {routeSlots.map(slot => {
              const dayNames = (slot.days_of_week || []).map(d => DAYS[d - 1]).join(', ');
              const full = slot.capacity > 0 && (slot.bookings_count || 0) >= slot.capacity;
              const isBooked = booked === slot.id;
              return (
                <div key={slot.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[48px]">
                      <p className="text-[18px] font-extrabold text-gray-900">{slot.departure_time?.slice(0, 5)}</p>
                      <p className="text-[9px] text-gray-400">{slot.event_label || dayNames || (slot.date ? new Date(slot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Daily')}</p>
                    </div>
                    <div>
                      {(() => { const p = slot.override_price ?? slot.route_price ?? 0; return p > 0 ? <p className="text-[10px] font-semibold text-amber-700">${p}/person</p> : null; })()}
                      {slot.capacity > 0 && (
                        <p className={`text-[10px] font-semibold ${full ? 'text-red-500' : 'text-emerald-600'}`}>
                          {full ? 'Full' : `${slot.capacity - (slot.bookings_count || 0)} spots left`}
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
                      <button onClick={() => setBookingForm({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false })} className="text-gray-400"><X size={16} /></button>
                      <button onClick={handleBook} className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white disabled:opacity-40" style={{ backgroundColor: '#6B1D3C' }} disabled={(() => { const pricePer = slot.override_price ?? slot.route_price ?? 0; return pricePer > 0 && !bookingForm.charge_accepted; })()}>Confirm</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setBookingForm({ slot_id: slot.id, show: true, name: '', room: '', pax: 1, notes: '', charge_accepted: false })}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white active:scale-95"
                      style={{ backgroundColor: '#6B1D3C' }}
                    >
                      Sign Up
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
                    className="w-4 h-4 rounded accent-[#6B1D3C]" />
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

/* ── On-Demand Pickup Request ───────────────────────────── */
function OnDemandRequest() {
  const [direction, setDirection] = useState<'arrival' | 'departure'>('departure');
  const [form, setForm] = useState({ guestName: '', room: '', date: '', time: '', airline: '', flight: '', destination: 'airport', pax: 1, notes: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.guestName || !form.room) { setError('Name and room number are required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const hotel = await getHotelConfig();
      const destMap: Record<string, string> = {
        airport: 'Miami International Airport (MIA)',
        cruiseport: 'Port of Miami Cruise Terminal',
        fortlauderdale: 'Fort Lauderdale Airport (FLL)',
      };
      await createShuttleRequest({
        hotel_id: hotel?.id || '',
        guest_name: form.guestName,
        room_number: form.room,
        pickup_location: direction === 'departure' ? 'Hotel Lobby' : destMap[form.destination] || form.destination,
        destination: direction === 'arrival' ? 'Hotel' : destMap[form.destination] || form.destination,
        date: form.date || undefined,
        time: form.time || undefined,
        pax: form.pax,
        notes: [form.airline ? `Airline: ${form.airline}${form.flight ? ` ${form.flight}` : ''}` : '', form.notes].filter(Boolean).join('. '),
      });
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Send size={20} className="text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-black mb-1">Request Sent!</h2>
        <p className="text-[13px] text-gray-500">Our team will confirm your transport shortly.</p>
        <button onClick={() => setSent(false)} className="mt-4 text-[13px] font-semibold text-[#6B1D3C]">New Request</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Direction Toggle */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex">
        <button
          onClick={() => setDirection('arrival')}
          className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 ${direction === 'arrival' ? 'text-white' : 'text-gray-500 bg-gray-50'}`}
          style={direction === 'arrival' ? { backgroundColor: '#6B1D3C' } : undefined}
        >
          <Plane size={14} /> Arrival
        </button>
        <button
          onClick={() => setDirection('departure')}
          className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 ${direction === 'departure' ? 'text-white' : 'text-gray-500 bg-gray-50'}`}
          style={direction === 'departure' ? { backgroundColor: '#6B1D3C' } : undefined}
        >
          Departure <Plane size={14} />
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] text-gray-400 block mb-1 font-semibold uppercase tracking-wider">Guest Name</label>
            <input placeholder="Your name" value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" />
          </div>
          <div className="w-24">
            <label className="text-[11px] text-gray-400 block mb-1 font-semibold uppercase tracking-wider">Room</label>
            <input placeholder="201" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] text-gray-400 block mb-1 font-semibold uppercase tracking-wider">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-gray-400 block mb-1 font-semibold uppercase tracking-wider">Time</label>
            <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" />
          </div>
        </div>

        {direction === 'arrival' ? (
          <>
            <div className="flex gap-2">
              <div className="flex-1"><input placeholder="Airline / Cruise line" value={form.airline} onChange={e => setForm({ ...form, airline: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" /></div>
              <div className="w-24"><input placeholder="Flight #" value={form.flight} onChange={e => setForm({ ...form, flight: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" /></div>
            </div>
            <select value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none">
              <option value="airport">Miami International Airport (MIA)</option>
              <option value="cruiseport">Port of Miami Cruise Terminal</option>
              <option value="fortlauderdale">Fort Lauderdale Airport (FLL)</option>
            </select>
          </>
        ) : (
          <select value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none">
            <option value="airport">Miami International Airport (MIA)</option>
            <option value="cruiseport">Port of Miami Cruise Terminal</option>
            <option value="fortlauderdale">Fort Lauderdale Airport (FLL)</option>
          </select>
        )}

        <div className="flex gap-2 items-end">
          <div className="w-20">
            <label className="text-[11px] text-gray-400 block mb-1 font-semibold uppercase tracking-wider">Pax</label>
            <input type="number" min={1} max={20} value={form.pax} onChange={e => setForm({ ...form, pax: parseInt(e.target.value) || 1 })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none" />
          </div>
          <div className="flex-1">
            <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none resize-none h-[42px]" />
          </div>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-xl px-4 py-2.5 text-center">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ backgroundColor: '#6B1D3C' }}
      >
        {submitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</> : 'Submit Request'}
      </button>

      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
        <p className="text-[11px] text-amber-700">Pickup requests are confirmed by staff. Contact the front desk at ext. 0 for immediate needs.</p>
      </div>
    </div>
  );
}
