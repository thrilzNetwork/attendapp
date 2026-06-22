'use client';

import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { getAllShuttleSlotsForHotel, bookShuttleSlot, createShuttleRequest, ShuttleSlot, HotelConfig } from '@/lib/supabase';

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmt12(time: string) { const [h] = time.split(':').map(Number); return `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`; }

export function AirportSchedule({ brandColor, config }: { brandColor: string; config: HotelConfig | null }) {
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ShuttleSlot | null>(null);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [pax, setPax] = useState(1);
  const [date, setDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const gs = localStorage.getItem('guestSession');
      if (gs) { const s = JSON.parse(gs); setName(s.name || ''); setRoom(s.room || ''); }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!config?.id) { setLoading(false); return; }
      const s = await getAllShuttleSlotsForHotel(config.id);
      if (cancelled) return;
      setSlots(s.filter(sl => sl.route_type === 'airport'));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [config?.id]);

  function generateHourlySlots(): ShuttleSlot[] {
    const [startH] = (config?.shuttleStartTime || '06:00').split(':').map(Number);
    const [endH] = (config?.shuttleEndTime || '23:00').split(':').map(Number);
    const out: ShuttleSlot[] = [];
    for (let h = startH; h <= endH; h++)
      out.push({ id: `virtual-${h}`, route_id: '', departure_time: `${String(h).padStart(2,'0')}:00:00`, route_name: 'Airport Shuttle', route_type: 'airport', route_price: 0, override_price: null, capacity: 0, bookings_count: 0, days_of_week: [0,1,2,3,4,5,6], event_label: null, date: null, active: true } as unknown as ShuttleSlot);
    return out;
  }

  const displaySlots = slots.length > 0 ? slots : generateHourlySlots();
  const allFree = displaySlots.every(s => (s.override_price ?? s.route_price ?? 0) === 0);

  const handleBook = async () => {
    if (!name.trim() || !room.trim()) return;
    setSubmitting(true);
    const isVirtual = selected!.id.startsWith('virtual-');
    await Promise.all([
      isVirtual ? Promise.resolve() : bookShuttleSlot({ slot_id: selected!.id, guest_name: name, room_number: room, pax, notes: '', price_charged: 0, charge_accepted: false }),
      config?.id ? createShuttleRequest({ hotel_id: config.id, guest_name: name, room_number: room, pickup_location: config.shuttlePickupLocation || 'Hotel Lobby', destination: selected!.route_name || 'Airport', date, time: selected!.departure_time || undefined, pax, status: 'pending' }) : Promise.resolve(),
    ]);
    setSubmitting(false);
    setDone(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: brandColor, borderTopColor: 'transparent' }} />
    </div>
  );

  if (done) return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center min-h-[400px]">
      <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#dcfce7' }}>
        <CheckCircle size={60} className="text-emerald-500" />
      </div>
      <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2">Confirmed</p>
      <p className="text-[44px] font-black leading-none mb-1" style={{ color: brandColor }}>{fmt12(selected!.departure_time)}</p>
      <p className="text-[16px] text-gray-600 mt-2">{pax} {pax === 1 ? 'passenger' : 'passengers'} · {date}</p>
      <p className="text-[14px] text-gray-400 mt-1">Meet at {config?.shuttlePickupLocation || 'Hotel Lobby'}</p>
      <div className="mt-8 w-full bg-emerald-50 border border-emerald-200 rounded-3xl px-6 py-5 text-[15px] text-emerald-700 font-bold">
        ✓ Staff will confirm your spot shortly
      </div>
      <button onClick={() => { setDone(false); setSelected(null); }} className="mt-8 text-[15px] font-bold" style={{ color: brandColor }}>
        ← Book a different time
      </button>
    </div>
  );

  if (selected) return (
    <div className="flex flex-col min-h-[500px]">
      <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-[15px] font-bold mb-6" style={{ color: brandColor }}>
        ← Back
      </button>

      <div className="rounded-3xl py-8 px-6 mb-8 text-center" style={{ backgroundColor: `${brandColor}0d`, border: `2px solid ${brandColor}20` }}>
        <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.15em] mb-2">Your shuttle</p>
        <p className="text-[64px] font-black leading-none" style={{ color: brandColor }}>{fmt12(selected.departure_time)}</p>
        <p className="text-[14px] text-gray-500 mt-3">{config?.shuttlePickupLocation || 'Hotel Lobby'} → Airport</p>
        {allFree && (
          <span className="inline-block mt-4 text-[13px] font-extrabold text-emerald-600 bg-white border-2 border-emerald-300 px-5 py-2 rounded-full">
            🎟 Complimentary · FREE
          </span>
        )}
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <p className="text-[12px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 pl-1">Your Name</p>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. John Smith"
            autoComplete="name"
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-5 text-[18px] font-semibold text-gray-900 outline-none placeholder:text-gray-300"
            style={{ WebkitAppearance: 'none' }}
          />
        </div>

        <div>
          <p className="text-[12px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 pl-1">Room Number</p>
          <input
            value={room} onChange={e => setRoom(e.target.value)}
            placeholder="e.g. 101"
            inputMode="numeric"
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-5 text-[18px] font-semibold text-gray-900 outline-none placeholder:text-gray-300"
            style={{ WebkitAppearance: 'none' }}
          />
        </div>

        <div>
          <p className="text-[12px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 pl-1">Date</p>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-5 text-[18px] font-semibold text-gray-900 outline-none"
            style={{ WebkitAppearance: 'none' }}
          />
        </div>

        <div>
          <p className="text-[12px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 pl-1">Passengers</p>
          <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 gap-4">
            <button onClick={() => setPax(p => Math.max(1, p - 1))} className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-200 text-2xl font-black flex items-center justify-center active:scale-90 active:bg-gray-100 shrink-0">−</button>
            <span className="flex-1 text-center text-[32px] font-black text-gray-900">{pax}</span>
            <button onClick={() => setPax(p => Math.min(10, p + 1))} className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-200 text-2xl font-black flex items-center justify-center active:scale-90 active:bg-gray-100 shrink-0">+</button>
          </div>
        </div>
      </div>

      <button
        onClick={handleBook}
        disabled={submitting || !name.trim() || !room.trim()}
        className="w-full mt-8 py-6 rounded-3xl text-white text-[18px] font-extrabold tracking-wide active:scale-[0.98] transition-all disabled:opacity-40"
        style={{ backgroundColor: brandColor }}
      >
        {submitting ? 'Booking…' : `Confirm ${fmt12(selected.departure_time)} Shuttle`}
      </button>
    </div>
  );

  return (
    <div>
      <div className="text-center mb-8">
        <p className="text-[24px] font-extrabold text-gray-900 leading-tight">When do you need<br />the shuttle?</p>
        <p className="text-[14px] text-gray-400 mt-2">{config?.shuttlePickupLocation || 'Hotel Lobby'} · Every hour on the hour</p>
        {allFree && (
          <span className="inline-block mt-3 text-[13px] font-extrabold text-emerald-600 bg-emerald-50 border-2 border-emerald-200 px-5 py-2 rounded-full">
            🚌 Always FREE · Complimentary
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {displaySlots.map(slot => {
          const full = slot.capacity > 0 && (slot.bookings_count || 0) >= slot.capacity;
          return (
            <button
              key={slot.id}
              onClick={() => !full && setSelected(slot)}
              disabled={full}
              className={`rounded-2xl py-6 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                full ? 'bg-gray-100 opacity-40 cursor-not-allowed' : 'bg-white border-2 border-gray-100 shadow-sm'
              }`}
            >
              <span className="text-[20px] font-black text-gray-900 leading-none">{fmt12(slot.departure_time)}</span>
              {full
                ? <span className="text-[11px] font-bold text-gray-400">Full</span>
                : allFree
                  ? <span className="text-[12px] font-extrabold text-emerald-500">Free</span>
                  : <span className="text-[12px] font-extrabold text-amber-600">${slot.override_price ?? slot.route_price ?? 0}</span>
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}