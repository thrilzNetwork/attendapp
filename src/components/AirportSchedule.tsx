'use client';

import { useState, useEffect } from 'react';
import { Plane, UserCheck, X } from 'lucide-react';
import { getAllShuttleSlotsForHotel, bookShuttleSlot, createShuttleRequest, ShuttleSlot, HotelConfig } from '@/lib/supabase';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

export function AirportSchedule({ brandColor, config }: { brandColor: string; config: HotelConfig | null }) {
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

  const byDay: Record<string, ShuttleSlot[]> = {};
  slots.forEach(slot => {
    const days = (slot.days_of_week || []).length > 0 ? slot.days_of_week : [new Date().getDay()];
    days.forEach(d => {
      const dayLabel = DAYS[d];
      if (!byDay[dayLabel]) byDay[dayLabel] = [];
      byDay[dayLabel].push(slot);
    });
  });
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
      <div className={`rounded-2xl p-3 border flex items-start gap-2.5 ${isFreeShuttle ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <Plane size={18} className={isFreeShuttle ? 'text-emerald-600' : 'text-amber-600'} />
        <div>
          <p className="text-[12px] font-bold text-gray-800 mb-0.5">
            {isFreeShuttle ? 'Complimentary Airport Shuttle' : 'Airport Shuttle'}
          </p>
          <p className="text-[11px] text-gray-600">
            {config?.shuttlePickupLocation || 'Hotel lobby'} pickup · {config?.shuttleStartTime?.slice(0, 5) || '—'} to {config?.shuttleEndTime?.slice(0, 5) || '—'}
            {!isFreeShuttle && <span className="font-semibold"> · Charges apply</span>}
          </p>
        </div>
      </div>

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
                      {slot.event_label && <p className="text-[9px] text-gray-400">{slot.event_label}</p>}
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
                    <button onClick={() => setBookingForm({ slot_id: slot.id, show: true, name: '', room: '', pax: 1, notes: '', charge_accepted: false, date: todayISO() })}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white active:scale-95"
                      style={{ backgroundColor: brandColor }}>
                      Book
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {bookingForm.show && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h4 className="font-extrabold text-[14px] text-gray-900">Reserve Your Spot</h4>
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
          <textarea placeholder="Notes (optional)" value={bookingForm.notes} onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none resize-none h-16" />
        </div>
      )}
    </div>
  );
}
