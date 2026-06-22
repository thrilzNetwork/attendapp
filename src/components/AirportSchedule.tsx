'use client';

import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { getAllShuttleSlotsForHotel, bookShuttleSlot, createShuttleRequest, ShuttleSlot, HotelConfig } from '@/lib/supabase';

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function fmt12(time: string) {
  const [h] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12} ${ampm}`;
}

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
    const start = config?.shuttleStartTime || '06:00';
    const end = config?.shuttleEndTime || '23:00';
    const [startH] = start.split(':').map(Number);
    const [endH] = end.split(':').map(Number);
    const out: ShuttleSlot[] = [];
    for (let h = startH; h <= endH; h++) {
      out.push({ id: `virtual-${h}`, route_id: '', departure_time: `${String(h).padStart(2,'0')}:00:00`, route_name: 'Airport Shuttle', route_type: 'airport', route_price: 0, override_price: null, capacity: 0, bookings_count: 0, days_of_week: [0,1,2,3,4,5,6], event_label: null, date: null, active: true } as unknown as ShuttleSlot);
    }
    return out;
  }

  const displaySlots = slots.length > 0 ? slots : generateHourlySlots();
  const allFree = displaySlots.every(s => (s.override_price ?? s.route_price ?? 0) === 0);

  const handleBook = async () => {
    if (!name.trim() || !room.trim()) return;
    setSubmitting(true);
    const isVirtual = selected!.id.startsWith('virtual-');
    await Promise.all([
      isVirtual ? Promise.resolve() : bookShuttleSlot({
        slot_id: selected!.id, guest_name: name, room_number: room, pax, notes: '', price_charged: 0, charge_accepted: false,
      }),
      config?.id ? createShuttleRequest({
        hotel_id: config.id, guest_name: name, room_number: room,
        pickup_location: config.shuttlePickupLocation || 'Hotel Lobby',
        destination: selected!.route_name || 'Airport',
        date, time: selected!.departure_time || undefined, pax, status: 'pending',
      }) : Promise.resolve(),
    ]);
    setSubmitting(false);
    setDone(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: brandColor, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: '#dcfce7' }}>
          <CheckCircle size={52} className="text-emerald-500" />
        </div>
        <h2 className="text-[24px] font-extrabold text-gray-900 mb-2">You&apos;re booked!</h2>
        <p className="text-[32px] font-black mt-1" style={{ color: brandColor }}>{fmt12(selected!.departure_time)}</p>
        <p className="text-[15px] text-gray-500 mt-1">{date} · {pax} {pax === 1 ? 'passenger' : 'passengers'}</p>
        <p className="text-[14px] text-gray-400 mt-1">Meet at {config?.shuttlePickupLocation || 'Hotel Lobby'}</p>
        <div className="mt-6 w-full bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-[14px] text-emerald-700 font-semibold text-center">
          ✓ Staff will confirm your spot shortly
        </div>
        <button onClick={() => { setDone(false); setSelected(null); }} className="mt-6 text-[14px] font-bold" style={{ color: brandColor }}>
          Book another time →
        </button>
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-[14px] font-bold mb-5" style={{ color: brandColor }}>
          ← Back
        </button>

        <div className="rounded-3xl p-6 mb-6 text-center" style={{ backgroundColor: `${brandColor}0d`, border: `2px solid ${brandColor}25` }}>
          <p className="text-[13px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Your shuttle</p>
          <p className="text-[56px] font-black leading-none" style={{ color: brandColor }}>{fmt12(selected.departure_time)}</p>
          <p className="text-[14px] text-gray-500 mt-2">{config?.shuttlePickupLocation || 'Hotel Lobby'} → Airport</p>
          {allFree && (
            <span className="inline-block mt-3 text-[12px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full">
              COMPLIMENTARY · FREE
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-extrabold text-gray-500 uppercase tracking-wide mb-2 block">Your Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-[17px] text-gray-900 outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[12px] font-extrabold text-gray-500 uppercase tracking-wide mb-2 block">Room #</label>
              <input
                value={room} onChange={e => setRoom(e.target.value)}
                placeholder="101"
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-[17px] text-gray-900 outline-none focus:border-gray-400 transition-colors"
              />
            </div>
            <div className="w-32">
              <label className="text-[12px] font-extrabold text-gray-500 uppercase tracking-wide mb-2 block">Passengers</label>
              <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-2 py-2.5 gap-1">
                <button onClick={() => setPax(p => Math.max(1, p - 1))} className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-xl font-bold flex items-center justify-center active:scale-90 shrink-0">−</button>
                <span className="flex-1 text-center text-[18px] font-black text-gray-900">{pax}</span>
                <button onClick={() => setPax(p => Math.min(10, p + 1))} className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-xl font-bold flex items-center justify-center active:scale-90 shrink-0">+</button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-extrabold text-gray-500 uppercase tracking-wide mb-2 block">Date</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-[17px] text-gray-900 outline-none focus:border-gray-400 transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleBook}
          disabled={submitting || !name.trim() || !room.trim()}
          className="w-full mt-6 py-5 rounded-2xl text-white text-[17px] font-extrabold active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg"
          style={{ backgroundColor: brandColor }}
        >
          {submitting ? 'Booking…' : `Book ${fmt12(selected.departure_time)} Shuttle`}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <p className="text-[20px] font-extrabold text-gray-900">Pick your departure time</p>
        <p className="text-[13px] text-gray-400 mt-1">
          {config?.shuttlePickupLocation || 'Hotel Lobby'} · Runs every hour
        </p>
        {allFree && (
          <span className="inline-block mt-2 text-[12px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full">
            🚌 Always FREE · Complimentary service
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
              className={`rounded-2xl py-5 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                full
                  ? 'bg-gray-100 opacity-40 cursor-not-allowed'
                  : 'bg-white border-2 border-gray-100 shadow-sm active:shadow-none hover:border-gray-200'
              }`}
            >
              <span className="text-[19px] font-black text-gray-900 leading-none">{fmt12(slot.departure_time)}</span>
              {full
                ? <span className="text-[10px] font-bold text-gray-400">Full</span>
                : allFree
                  ? <span className="text-[11px] font-extrabold text-emerald-500">Free</span>
                  : <span className="text-[11px] font-extrabold text-amber-600">${slot.override_price ?? slot.route_price ?? 0}</span>
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}