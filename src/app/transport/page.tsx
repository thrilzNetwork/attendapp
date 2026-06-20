'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plane, Bus, Ship, Car, UserCheck, X } from 'lucide-react';
import { getHotelConfig, HotelConfig, getAllShuttleSlotsForHotel, bookShuttleSlot, getCruiseSchedules, ShuttleSlot, CruiseSchedule } from '@/lib/supabase';
import { TransportBooker } from '@/components/GuestSheets';
import { goBackToHotel } from '@/lib/guest-context';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TransportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'airport' | 'cruise' | 'private'>('airport');
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
          {/* 3-tab nav */}
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex mb-4">
            {[
              { key: 'airport' as const, label: 'Airport', icon: <Plane size={14} /> },
              { key: 'cruise' as const, label: 'Cruise Port', icon: <Ship size={14} /> },
              { key: 'private' as const, label: 'Private', icon: <Car size={14} /> },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  tab === t.key ? 'text-white' : 'text-gray-500'
                }`}
                style={tab === t.key ? { backgroundColor: brandColor } : undefined}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {tab === 'airport' && (
            <div className="space-y-4">
              <TransportBooker brandColor={brandColor} defaultFromText="Fort Lauderdale Airport (FLL)" skipModeScreen={false} />
              <AirportSchedule brandColor={brandColor} config={config} />
            </div>
          )}
          {tab === 'cruise' && (
            <div className="space-y-4">
              <TransportBooker brandColor={brandColor} defaultFromText="Port Everglades, Fort Lauderdale" skipModeScreen={false} />
              <CruiseScheduleSection brandColor={brandColor} config={config} />
            </div>
          )}
          {tab === 'private' && <PrivateTransport brandColor={brandColor} />}
        </div>
      </div>
    </div>
  );
}

/* ── Airport Shuttle ───────────────────────── */
function AirportSchedule({ brandColor, config }: { brandColor: string; config: HotelConfig | null }) {
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState<{ slot_id: string; show: boolean; name: string; room: string; pax: number; notes: string; charge_accepted: boolean }>({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false });
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
                      <button onClick={() => setBookingForm({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false })} className="text-gray-400"><X size={16} /></button>
                      <button onClick={handleBook} className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white disabled:opacity-40" style={{ backgroundColor: brandColor }} disabled={pricePer > 0 && !bookingForm.charge_accepted}>Confirm</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setBookingForm({ slot_id: slot.id, show: true, name: '', room: '', pax: 1, notes: '', charge_accepted: false })}
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
  const [bookingForm, setBookingForm] = useState<{ slot_id: string; show: boolean; name: string; room: string; pax: number; notes: string; charge_accepted: boolean }>({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false });
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
                    <button onClick={() => setBookingForm({ slot_id: slot.id, show: true, name: '', room: '', pax: 1, notes: '', charge_accepted: false })}
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
            <button onClick={() => setBookingForm({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false })} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Private Transport / Vendor ─────────────── */
function PrivateTransport({ brandColor }: { brandColor: string }) {
  return <TransportBooker brandColor={brandColor} />;
}
