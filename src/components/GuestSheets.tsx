'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X, CheckCircle, Wifi, Check, Coffee, Dumbbell, Printer,
  WashingMachine, IceCream, Car, Bus, Flame, AlertTriangle,
  AlarmSmoke, Crosshair, ShieldCheck, Phone, Star, ExternalLink,
  Plane, UserCheck, MapPin, Utensils, ShoppingBag, Bell, Globe,
  User, Clock, DoorOpen, TrendingUp,
} from 'lucide-react';
import {
  supabase, getHotelConfig, HotelConfig,
  FacilitiesAmenity,
  getAllShuttleSlotsForHotel, bookShuttleSlot, createShuttleRequest,
  getCruiseSchedules,
  ShuttleSlot, CruiseSchedule,

} from '@/lib/supabase';

const BURGUNDY = '#6B1D3C';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ── Modal wrapper — centered, same style as check-in modal ── */
export function GuestSheet({
  open, onClose, title, children, fullHeight = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — clicking it closes the modal, nothing else moves */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal card — same shape/shadow as check-in modal, just taller */}
      <div
        className="relative bg-white rounded-[20px] w-full shadow-2xl flex flex-col"
        style={{
          maxWidth: 380,
          maxHeight: fullHeight ? '88dvh' : '85dvh',
          height: fullHeight ? '88dvh' : undefined,
        }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-[18px] font-bold text-black">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className={fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'flex-1 overflow-y-auto'}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Request Now ───────────────────────────────────────────── */

const REQUEST_CATEGORIES = [
  {
    icon: <Bell size={22} />,
    label: 'Towels',
    type: 'Amenity Request',
    details: 'Towel Service',
    color: '#0D9488',
  },
  {
    icon: <WashingMachine size={22} />,
    label: 'Housekeeping',
    type: 'Housekeeping',
    details: 'Cleaning Service',
    color: '#7C3AED',
  },
  {
    icon: <Utensils size={22} />,
    label: 'Room Service',
    type: 'Amenity Request',
    details: 'Room Service / Food',
    color: '#D97706',
  },
  {
    icon: <ShoppingBag size={22} />,
    label: 'Amenities',
    type: 'Amenity Request',
    details: 'Toiletries / Amenities',
    color: '#DB2777',
  },
  {
    icon: <Clock size={22} />,
    label: 'Late Check-out',
    type: 'Front Desk Request',
    details: 'Late Checkout',
    color: '#2563EB',
  },
  {
    icon: <Bell size={22} />,
    label: 'Wake-Up Call',
    type: 'Front Desk Request',
    details: 'Wake-Up Call',
    color: '#059669',
  },
  {
    icon: <Flame size={22} />,
    label: 'Maintenance',
    type: 'Maintenance',
    details: 'Maintenance Issue',
    color: '#DC2626',
  },
  {
    icon: <Phone size={22} />,
    label: 'Contact Me',
    type: 'Front Desk Request',
    details: 'Please contact guest',
    color: '#6B7280',
  },
];

export function MessageSheetContent() {
  const [guestName, setGuestName] = useState('Guest');
  const [guestRoom, setGuestRoom] = useState('?');
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [hotelColor, setHotelColor] = useState(BURGUNDY);

  useEffect(() => {
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setGuestName(s.name || 'Guest');
        setGuestRoom(s.room || '?');
      } catch { localStorage.removeItem('guestSession'); }
    }
    getHotelConfig().then(h => {
      if (h?.brandColor) setHotelColor(h.brandColor);
    });
  }, []);

  const sendRequest = async (type: string, details: string, label: string) => {
    if (sending) return;
    setSending(true);
    try {
      const hotel = await getHotelConfig();
      await supabase.from('requests').insert({
        hotel_id: hotel?.id,
        guest_name: guestName,
        room: guestRoom,
        type,
        details,
        status: 'pending',
      });
      if (hotel?.notificationEmail) {
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
          body: JSON.stringify({ type: 'new_request', data: { notificationEmail: hotel.notificationEmail, hotelName: hotel.name, guestName, room: guestRoom, requestType: type, details } }),
        }).catch(() => {});
      }
      setSent(label);
    } catch { /* ignore */ }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${hotelColor}15` }}>
          <CheckCircle size={32} style={{ color: hotelColor }} />
        </div>
        <h3 className="text-[18px] font-extrabold text-gray-900 mb-1">Request Sent!</h3>
        <p className="text-[14px] text-gray-500 mb-6">Our team has been notified and will assist you shortly.</p>
        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-[13px] text-gray-600 mb-6">
          <span className="font-semibold">{sent}</span> · Room {guestRoom}
        </div>
        <button onClick={() => setSent(null)} className="text-[13px] font-bold" style={{ color: hotelColor }}>
          + Make another request
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <p className="text-[12px] text-gray-400 mb-4 text-center">Tap a request — our team will be right with you.</p>
      <div className="grid grid-cols-2 gap-3">
        {REQUEST_CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() => sendRequest(cat.type, cat.details, cat.label)}
            disabled={sending}
            className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-gray-100 bg-white py-5 px-3 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
              {cat.icon}
            </div>
            <span className="text-[13px] font-bold text-gray-800">{cat.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 text-center mt-5">Room {guestRoom} · {guestName}</p>
    </div>
  );
}

/* ── Transport ─────────────────────────────────────────────── */
export function TransportSheetContent() {
  const [view, setView] = useState<'request' | 'schedule'>('request');
  return (
    <div className="overflow-y-auto flex-1">
      <div className="px-5 pt-2 pb-6">
        <div className="bg-gray-100 rounded-2xl p-1 flex mb-4">
          <button onClick={() => setView('request')} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${view === 'request' ? 'text-white' : 'text-gray-500'}`} style={view === 'request' ? { backgroundColor: BURGUNDY } : undefined}>Request Pickup</button>
          <button onClick={() => setView('schedule')} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${view === 'schedule' ? 'text-white' : 'text-gray-500'}`} style={view === 'schedule' ? { backgroundColor: BURGUNDY } : undefined}>Airport & Cruise</button>
        </div>
        {view === 'schedule' ? <ShuttleScheduleInner /> : <OnDemandInner />}
      </div>
    </div>
  );
}

function ShuttleScheduleInner() {
  const [hotel, setHotel] = useState<HotelConfig | null>(null);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [cruises, setCruises] = useState<CruiseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shuttle' | 'cruise'>('shuttle');
  const [bookingForm, setBookingForm] = useState<{ slot_id: string; show: boolean; name: string; room: string; pax: number; notes: string; charge_accepted: boolean }>({ slot_id: '', show: false, name: '', room: '', pax: 1, notes: '', charge_accepted: false });
  const [booked, setBooked] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const h = await getHotelConfig();
      setHotel(h);
      if (h?.id) {
        const [s, c] = await Promise.all([getAllShuttleSlotsForHotel(h.id), getCruiseSchedules(h.id)]);
        setSlots(s); setCruises(c);
        if (c.length > 0) setActiveTab('cruise');
      }
      // Pre-fill name/room from guest session
      try {
        const gs = localStorage.getItem('guestSession');
        if (gs) { const s = JSON.parse(gs); setBookingForm(f => ({ ...f, name: s.name || '', room: s.room || '' })); }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleBook = async () => {
    if (!bookingForm.name || !bookingForm.room) return;
    const slot = slots.find(s => s.id === bookingForm.slot_id);
    const pricePer = slot?.override_price ?? slot?.route_price ?? 0;
    await bookShuttleSlot({ slot_id: bookingForm.slot_id, guest_name: bookingForm.name, room_number: bookingForm.room, pax: bookingForm.pax, notes: bookingForm.notes, price_charged: pricePer * bookingForm.pax, charge_accepted: bookingForm.charge_accepted });
    setBooked(bookingForm.slot_id);
    setBookingForm(f => ({ ...f, slot_id: '', show: false }));
    if (hotel?.id) setSlots(await getAllShuttleSlotsForHotel(hotel.id));
  };

  const byRoute: Record<string, ShuttleSlot[]> = {};
  slots.forEach(s => { const k = s.route_name || 'Unknown'; if (!byRoute[k]) byRoute[k] = []; byRoute[k].push(s); });

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[#6B1D3C] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  if (slots.length === 0 && cruises.length === 0) return (
    <div className="bg-gray-50 rounded-2xl p-6 text-center">
      <Bus size={36} className="text-gray-300 mx-auto mb-2" />
      <p className="text-[13px] text-gray-500">No shuttle schedule available yet.</p>
      <p className="text-[12px] text-gray-400 mt-1">Check with the front desk for current times.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {cruises.length > 0 && (
        <div className="bg-gray-100 rounded-2xl p-1 flex">
          <button onClick={() => setActiveTab('cruise')} className={`flex-1 py-2 rounded-xl text-[12px] font-bold ${activeTab === 'cruise' ? 'text-white' : 'text-gray-500'}`} style={activeTab === 'cruise' ? { backgroundColor: BURGUNDY } : undefined}>🚢 Cruise Schedule</button>
          <button onClick={() => setActiveTab('shuttle')} className={`flex-1 py-2 rounded-xl text-[12px] font-bold ${activeTab === 'shuttle' ? 'text-white' : 'text-gray-500'}`} style={activeTab === 'shuttle' ? { backgroundColor: BURGUNDY } : undefined}>✈️ Shuttle Times</button>
        </div>
      )}
      {activeTab === 'cruise' && cruises.map(c => (
        <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.cruise_line || 'Cruise'}</span>
                {c.terminal && <span className="text-[10px] text-gray-400">{c.terminal}</span>}
              </div>
              <p className="text-[16px] font-extrabold text-gray-900">{c.ship_name}</p>
              <p className="text-[13px] text-gray-600">{new Date(c.departure_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p className="text-[13px] font-semibold" style={{ color: BURGUNDY }}>Departs {c.departure_time.slice(0, 5)}</p>
              {c.notes && <p className="text-[11px] text-gray-400 mt-0.5">{c.notes}</p>}
            </div>
            <button onClick={() => setActiveTab('shuttle')} className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-bold text-white" style={{ backgroundColor: BURGUNDY }}>Book Shuttle</button>
          </div>
        </div>
      ))}
      {activeTab === 'shuttle' && Object.entries(byRoute).map(([routeName, routeSlots]) => (
        <div key={routeName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Bus size={15} style={{ color: BURGUNDY }} />
            <h3 className="font-extrabold text-[14px] text-gray-900">{routeName}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {routeSlots.map(slot => {
              const dayNames = (slot.days_of_week || []).map((d: number) => DAYS[d - 1]).join(', ');
              const full = slot.capacity > 0 && (slot.bookings_count || 0) >= slot.capacity;
              const isBooked = booked === slot.id;
              const showingForm = bookingForm.show && bookingForm.slot_id === slot.id;
              return (
                <div key={slot.id}>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[48px]">
                        <p className="text-[18px] font-extrabold text-gray-900">{slot.departure_time?.slice(0, 5)}</p>
                        <p className="text-[9px] text-gray-400">{slot.event_label || dayNames || (slot.date ? new Date(slot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Daily')}</p>
                      </div>
                      <div>
                        {(() => { const p = slot.override_price ?? slot.route_price ?? 0; return p > 0 ? <p className="text-[10px] font-semibold text-amber-700">${p}/person</p> : null; })()}
                        {slot.capacity > 0 && <p className={`text-[10px] font-semibold ${full ? 'text-red-500' : 'text-emerald-600'}`}>{full ? 'Full' : `${slot.capacity - (slot.bookings_count || 0)} spots left`}</p>}
                      </div>
                    </div>
                    {isBooked ? (
                      <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full"><UserCheck size={12} /> Booked</span>
                    ) : full ? (
                      <span className="text-[12px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">Full</span>
                    ) : showingForm ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setBookingForm(f => ({ ...f, show: false, slot_id: '' }))} className="text-gray-400"><X size={16} /></button>
                        <button onClick={handleBook} className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: BURGUNDY }}>Confirm</button>
                      </div>
                    ) : (
                      <button onClick={() => setBookingForm(f => ({ ...f, slot_id: slot.id, show: true }))} className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: BURGUNDY }}>Sign Up</button>
                    )}
                  </div>
                  {showingForm && (
                    <div className="px-4 pb-4 space-y-2 bg-gray-50">
                      <input placeholder="Your name" value={bookingForm.name} onChange={e => setBookingForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-white rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                      <div className="flex gap-2">
                        <input placeholder="Room" value={bookingForm.room} onChange={e => setBookingForm(f => ({ ...f, room: e.target.value }))} className="flex-1 bg-white rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                        <input type="number" min={1} max={10} value={bookingForm.pax} onChange={e => setBookingForm(f => ({ ...f, pax: parseInt(e.target.value) || 1 }))} className="w-16 bg-white rounded-xl px-2 py-2.5 border border-gray-200 text-[13px] outline-none text-center" />
                      </div>
                      {(() => { const p = (slot.override_price ?? slot.route_price ?? 0); const total = p * bookingForm.pax; return total > 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                          <div className="flex justify-between text-[12px]"><span className="text-amber-800">${p} × {bookingForm.pax}</span><span className="font-extrabold text-amber-900">${total.toFixed(2)}</span></div>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={bookingForm.charge_accepted} onChange={e => setBookingForm(f => ({ ...f, charge_accepted: e.target.checked }))} className="w-4 h-4 accent-[#6B1D3C]" /><span className="text-[11px] text-amber-900 font-semibold">I accept this charge to my final bill</span></label>
                        </div>
                      ) : null; })()}
                      <textarea placeholder="Notes (optional)" value={bookingForm.notes} onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-white rounded-xl px-3 py-2 border border-gray-200 text-[13px] outline-none resize-none h-14" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

interface PlaceResult {
  display_name: string;
  short_name: string;
  lat: number;
  lng: number;
}

interface UberTransportQuote {
  feeCents: number;
  fee_display: string;
  eta_minutes: number;
}

export function TransportBooker({ brandColor = BURGUNDY }: { brandColor?: string }) {
  const [screen, setScreen] = useState<'mode' | 'address' | 'confirm' | 'done'>('mode');
  const [mode, setMode] = useState<'shuttle' | 'uber'>('uber');
  const [config, setConfig] = useState<HotelConfig | null>(null);

  // FROM field
  const [fromText, setFromText] = useState('');
  const [fromPlace, setFromPlace] = useState<PlaceResult | null>(null);

  // TO field
  const [toText, setToText] = useState('');
  const [toPlace, setToPlace] = useState<PlaceResult | null>(null);
  const [toSuggestions, setToSuggestions] = useState<PlaceResult[]>([]);
  const [toLoading, setToLoading] = useState(false);

  // Quote
  const [quote, setQuote] = useState<UberTransportQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Booking details
  const [guestName, setGuestName] = useState('');
  const [room, setRoom] = useState('');
  const [pax, setPax] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  const debounceRef = { current: undefined as ReturnType<typeof setTimeout> | undefined };

  useEffect(() => {
    getHotelConfig().then(h => {
      setConfig(h);
      if (h?.name) setFromText(h.name);
    });
    try {
      const gs = localStorage.getItem('guestSession');
      if (gs) { const s = JSON.parse(gs); setGuestName(s.name || ''); setRoom(s.room || ''); }
    } catch {}
  }, []);

  // Autocomplete for TO field
  useEffect(() => {
    if (toText.length < 2) { setToSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setToLoading(true);
      try {
        const res = await fetch(`/api/places-autocomplete?q=${encodeURIComponent(toText)}`);
        const data = await res.json();
        setToSuggestions(data);
      } catch { setToSuggestions([]); }
      finally { setToLoading(false); }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toText]);

  // Fetch Uber quote when both places are selected and mode is uber
  useEffect(() => {
    if (mode !== 'uber' || !fromPlace || !toPlace) return;
    let cancelled = false;
    setQuoteLoading(true);
    const params = new URLSearchParams({
      fromAddress: fromPlace.display_name,
      toAddress: toPlace.display_name,
      fromLat: String(fromPlace.lat),
      fromLng: String(fromPlace.lng),
      toLat: String(toPlace.lat),
      toLng: String(toPlace.lng),
    });
    fetch(`/api/uber-direct/transport-quote?${params}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d.ok) setQuote({ feeCents: d.feeCents, fee_display: d.fee_display, eta_minutes: d.eta_minutes }); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; };
  }, [fromPlace, toPlace, mode]);

  const handleBook = async () => {
    if (!guestName || !room) { setError('Name and room number are required.'); return; }
    if (!toPlace) { setError('Please select a destination.'); return; }
    setSubmitting(true); setError('');
    try {
      const shuttleReq = await createShuttleRequest({
        hotel_id: config?.id || '',
        guest_name: guestName,
        room_number: room,
        pickup_location: fromPlace?.display_name || fromText || 'Hotel',
        destination: toPlace.display_name,
        pax,
        notes: notes || undefined,
        status: mode === 'uber' ? 'pending_uber' : 'pending',
      });

      if (mode === 'uber' && shuttleReq?.id) {
        try {
          const res = await fetch('/api/uber-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dispatch', requestId: shuttleReq.id, mode: 'transport' }),
          });
          const data = await res.json();
          if (data.trackingUrl) setTrackingUrl(data.trackingUrl);
        } catch {}
      }
      setScreen('done');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to book.'); }
    finally { setSubmitting(false); }
  };

  const hasFreeShuttle = config?.hasFreeShuttle !== false;

  // Screen: mode selection
  if (screen === 'mode') return (
    <div className="space-y-3">
      <p className="text-[13px] text-gray-500 text-center">How would you like to travel?</p>
      {hasFreeShuttle && (
        <button
          onClick={() => { setMode('shuttle'); setScreen('address'); }}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Bus size={22} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-gray-900">Hotel Shuttle</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">FREE</span>
            </div>
            <p className="text-[12px] text-gray-400 mt-0.5">Our team confirms availability</p>
          </div>
        </button>
      )}
      <button
        onClick={() => { setMode('uber'); setScreen('address'); }}
        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0">
          <Car size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-gray-900">Book a Ride</span>
            <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">Uber Direct</span>
          </div>
          <p className="text-[12px] text-gray-400 mt-0.5">Real-time price · GPS tracking</p>
        </div>
      </button>
    </div>
  );

  // Screen: address picker
  if (screen === 'address') return (
    <div className="space-y-3">
      <button onClick={() => setScreen('mode')} className="text-[12px] font-semibold flex items-center gap-1" style={{ color: brandColor }}>
        ← Back
      </button>

      {/* FROM field */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><MapPin size={10} /> From</label>
          <input
            value={fromText}
            onChange={e => { setFromText(e.target.value); setFromPlace(null); }}
            placeholder="Pickup location"
            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none text-gray-800"
          />
        </div>

        {/* TO field */}
        <div className="relative">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><MapPin size={10} className="text-red-400" /> To</label>
          <input
            value={toText}
            onChange={e => { setToText(e.target.value); setToPlace(null); setQuote(null); }}
            placeholder="Where are you going?"
            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none text-gray-800"
            autoFocus
          />
          {toLoading && (
            <div className="absolute right-3 top-8">
              <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin inline-block" />
            </div>
          )}
          {toSuggestions.length > 0 && !toPlace && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden">
              {toSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setToPlace(s); setToText(s.short_name); setToSuggestions([]); }}
                  className="w-full px-4 py-3 text-left border-b border-gray-50 last:border-0 active:bg-gray-50 hover:bg-gray-50"
                >
                  <p className="text-[13px] font-semibold text-gray-900">{s.short_name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{s.display_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {toPlace && (
        <button
          onClick={() => setScreen('confirm')}
          className="w-full py-3.5 rounded-xl text-white font-bold text-[14px]"
          style={{ backgroundColor: brandColor }}
        >
          Continue →
        </button>
      )}
    </div>
  );

  // Screen: confirm booking
  if (screen === 'confirm') return (
    <div className="space-y-3">
      <button onClick={() => setScreen('address')} className="text-[12px] font-semibold flex items-center gap-1" style={{ color: brandColor }}>
        ← Back
      </button>

      {/* Route card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <MapPin size={14} className="text-emerald-500" />
            <div className="w-0.5 h-5 bg-gray-200" />
            <MapPin size={14} className="text-red-500" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-[12px] font-semibold text-gray-800">{fromPlace?.short_name || fromText}</p>
            <p className="text-[12px] font-semibold text-gray-800">{toPlace?.short_name || toText}</p>
          </div>
        </div>
      </div>

      {/* Price row */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        {mode === 'shuttle' ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bus size={16} className="text-emerald-600" />
              <span className="text-[13px] font-bold text-gray-800">Hotel Shuttle</span>
            </div>
            <span className="text-[13px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Free</span>
          </div>
        ) : quoteLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-[13px]">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            Getting price…
          </div>
        ) : quote ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car size={16} className="text-gray-700" />
              <div>
                <span className="text-[13px] font-bold text-gray-800">Uber Direct</span>
                <p className="text-[11px] text-gray-400">~{quote.eta_minutes} min estimated</p>
              </div>
            </div>
            <span className="text-[15px] font-extrabold text-gray-900">{quote.fee_display}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car size={16} className="text-gray-700" />
              <span className="text-[13px] font-bold text-gray-800">Uber Direct</span>
            </div>
            <span className="text-[12px] text-gray-400">Price unavailable</span>
          </div>
        )}
      </div>

      {/* Guest details */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Name</label>
            <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your name" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
          </div>
          <div className="w-24">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Room</label>
            <input value={room} onChange={e => setRoom(e.target.value)} placeholder="201" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[12px] font-bold text-gray-600">Party size</label>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setPax(Math.max(1, pax - 1))} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-[16px]">−</button>
            <span className="w-6 text-center text-[14px] font-bold">{pax}</span>
            <button onClick={() => setPax(Math.min(20, pax + 1))} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-[16px]">+</button>
          </div>
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none resize-none h-14" />
      </div>

      {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-xl px-4 py-2.5 text-center">{error}</p>}

      <button onClick={handleBook} disabled={submitting} className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: brandColor }}>
        {submitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Booking…</> : 'Book Now'}
      </button>
    </div>
  );

  // Screen: done
  return (
    <div className="bg-gray-50 rounded-2xl p-6 text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <CheckCircle size={24} className="text-green-600" />
      </div>
      <h2 className="text-[17px] font-extrabold text-black">Your ride is booked!</h2>
      {trackingUrl ? (
        <>
          <p className="text-[13px] text-gray-500">Your Uber driver is on the way.</p>
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-bold text-[13px]"
            style={{ backgroundColor: brandColor }}>
            <ExternalLink size={14} /> Track Your Ride
          </a>
        </>
      ) : (
        <p className="text-[13px] text-gray-500">
          {mode === 'shuttle' ? 'Our team will confirm your shuttle shortly.' : 'Staff will coordinate your transport.'}
        </p>
      )}
      <button onClick={() => { setScreen('mode'); setToText(''); setToPlace(null); setFromPlace(null); setQuote(null); setTrackingUrl(''); setError(''); }}
        className="text-[13px] font-semibold" style={{ color: brandColor }}>
        New Booking
      </button>
    </div>
  );
}

function OnDemandInner() {
  return <TransportBooker brandColor={BURGUNDY} />;
}

/* ── Facilities ────────────────────────────────────────────── */
export function FacilitiesSheetContent() {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  useEffect(() => { getHotelConfig().then(setConfig); }, []);

  const wifiName = config?.wifiName || 'Hotel-WiFi';
  const wifiPassword = config?.wifiPassword || '';
  const copyWiFi = () => { navigator.clipboard.writeText(wifiPassword || wifiName); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const iconMap: Record<string, React.ReactNode> = {
    Coffee: <Coffee size={18} />,
    Dumbbell: <Dumbbell size={18} />,
    Printer: <Printer size={18} />,
    WashingMachine: <WashingMachine size={18} />,
    IceCream: <IceCream size={18} />,
    Car: <Car size={18} />,
    Bus: <Bus size={18} />,
    Wifi: <Wifi size={18} />,
    Check: <Check size={18} />,
    MapPin: <MapPin size={18} />,
    Phone: <Phone size={18} />,
    Utensils: <Utensils size={18} />,
    ShoppingBag: <ShoppingBag size={18} />,
    Star: <Star size={18} />,
    Bell: <Bell size={18} />,
    ShieldCheck: <ShieldCheck size={18} />,
    Globe: <Globe size={18} />,
    User: <User size={18} />,
    Plane: <Plane size={18} />,
    Clock: <Clock size={18} />,
    DoorOpen: <DoorOpen size={18} />,
    Flame: <Flame size={18} />,
    AlarmSmoke: <AlarmSmoke size={18} />,
    Crosshair: <Crosshair size={18} />,
    TrendingUp: <TrendingUp size={18} />,
  };

  const defaultAmenities = [
    { icon: <Coffee size={18} />, title: 'Complimentary Breakfast', desc: '6:30 AM — 9:30 AM daily. Hot & continental options.' },
    { icon: <Dumbbell size={18} />, title: 'Pool & Fitness Center', desc: 'Open 6:00 AM — 10:00 PM. Towels at front desk.' },
    { icon: <Printer size={18} />, title: 'Business Center', desc: '24-hour access. Printing, fax, and computer stations.' },
    { icon: <WashingMachine size={18} />, title: 'Guest Laundry', desc: 'Coin-operated on 2nd floor. Detergent at front desk.' },
    { icon: <IceCream size={18} />, title: 'Ice & Vending', desc: 'Ice machines every floor. Snack & beverage vending in lobby.' },
    { icon: <Car size={18} />, title: 'Complimentary Parking', desc: 'Free for hotel guests. Oversized spots available.' },
    { icon: <Bus size={18} />, title: 'Airport / Cruise Shuttle', desc: 'Scheduled shuttle to MIA & Port of Miami. Book 24hrs ahead.' },
  ];

  const amenities = (config?.facilitiesContent && config.facilitiesContent.length > 0)
    ? config.facilitiesContent.map((a: FacilitiesAmenity) => ({
        icon: iconMap[a.icon] || <span className="text-[12px] font-bold">?</span>,
        title: a.title,
        desc: a.description,
      }))
    : defaultAmenities;

  return (
    <div className="overflow-y-auto px-5 pt-2 pb-8 space-y-3">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${BURGUNDY}18` }}><Wifi size={20} style={{ color: BURGUNDY }} /></div>
          <div><p className="text-[14px] font-bold text-gray-800">Free Wi-Fi</p><p className="text-[11px] text-gray-400">Complimentary high-speed internet</p></div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Network</p>
            <p className="text-[15px] font-mono font-bold text-gray-800">{wifiName}</p>
            {wifiPassword && (<><p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Password</p><p className="text-[14px] font-mono font-bold text-gray-800">{wifiPassword}</p></>)}
          </div>
          <button onClick={copyWiFi} className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold flex items-center gap-1" style={{ backgroundColor: BURGUNDY }}>
            {copied ? <><Check size={12} />Copied</> : 'Copy'}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Amenities</p>
        <div className="space-y-3">
          {amenities.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${BURGUNDY}18`, color: BURGUNDY }}>{a.icon}</div>
              <div><p className="text-[13px] font-semibold text-gray-800">{a.title}</p><p className="text-[12px] text-gray-500">{a.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Safety ────────────────────────────────────────────────── */
const DEFAULT_EMERGENCY_MSG = "Remain calm. Call 911 for immediate emergency response, then notify the front desk at";
const DEFAULT_CONTACTS: { label: string; number: string }[] = [
  { label: 'Emergency (Police, Fire, Medical)', number: '911' },
];
const DEFAULT_FIRE_ITEMS = [
  'Smoke detectors in every room, tested monthly.',
  'Know your nearest fire exit — posted on your door.',
  'In case of fire: Do not use elevators. Use stairs.',
  'If trapped: Seal door cracks, signal from window, call 911.',
  'Assembly point is in the front parking lot.',
];
const DEFAULT_CO_ITEMS = [
  'CO detectors on every floor and inside every room.',
  'Chirping sound = notify front desk. Do not silence it.',
  'CO symptoms: headache, dizziness, nausea — seek fresh air and call 911.',
  'Smoke alarms are interconnected — one triggers all.',
  'Do not tamper with detectors.',
];
const DEFAULT_SECURITY_ITEMS = [
  'Exterior doors locked 10 PM – 6 AM. Use room key.',
  'Security cameras in public areas, parking, and hallways.',
  'Report suspicious activity to front desk.',
  'Lock door and use deadbolt when inside.',
  'Use in-room safe or front desk deposit for valuables.',
];
const DEFAULT_CLOSING_MSG = 'Contact the front desk at any time for safety concerns. Your wellbeing is our top priority.';

export function SafetySheetContent() {
  const [config, setConfig] = useState<HotelConfig | null>(null);
  useEffect(() => { getHotelConfig().then(setConfig); }, []);
  const frontDesk = config?.frontDeskPhone || 'Ext. 0';
  const sc = config?.safetyContent;

  const emergencyMessage = sc?.emergency_message ?? DEFAULT_EMERGENCY_MSG;
  const emergencyContacts = sc?.emergency_contacts?.length
    ? sc.emergency_contacts
    : [
        ...DEFAULT_CONTACTS,
        { label: 'Front Desk', number: frontDesk },
        { label: 'Hotel Security', number: 'Ext. 0' },
      ];
  const fireItems = sc?.fire_safety_items?.length ? sc.fire_safety_items : DEFAULT_FIRE_ITEMS;
  const coItems = sc?.co_items?.length ? sc.co_items : DEFAULT_CO_ITEMS;
  const securityItems = sc?.security_items?.length ? sc.security_items : DEFAULT_SECURITY_ITEMS;
  const closingMessage = sc?.closing_message ?? DEFAULT_CLOSING_MSG;

  return (
    <div className="overflow-y-auto px-5 pt-2 pb-8 space-y-3">
      <div className="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
        <div><p className="text-[13px] font-bold text-red-800 mb-1">In Case of Emergency</p><p className="text-[12px] text-red-700 leading-relaxed">{emergencyMessage} {frontDesk}.</p></div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Emergency Contacts</p>
        {emergencyContacts.map((e, i) => (
          <a key={i} href={`tel:${e.number.replace(/[^0-9]/g, '')}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 active:bg-gray-100 mb-1.5">
            <div className="flex items-center gap-3"><Phone size={16} style={{ color: BURGUNDY }} /><p className="text-[13px] font-semibold text-gray-800">{e.label}</p></div>
            <span className="text-[14px] font-bold" style={{ color: BURGUNDY }}>{e.number}</span>
          </a>
        ))}
      </div>
      {[
        { icon: <Flame size={17} className="text-orange-500" />, title: 'Fire Safety', items: fireItems },
        { icon: <AlarmSmoke size={17} style={{ color: BURGUNDY }} />, title: 'CO & Smoke Detection', items: coItems },
        { icon: <Crosshair size={17} style={{ color: BURGUNDY }} />, title: 'Property Security', items: securityItems },
      ].map(section => (
        <div key={section.title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">{section.icon}<p className="text-[14px] font-bold text-gray-800">{section.title}</p></div>
          {section.items.map((text, i) => (
            <div key={i} className="flex items-start gap-2 mb-2">
              <ShieldCheck size={13} className="text-gray-300 shrink-0 mt-0.5" />
              <p className="text-[12px] text-gray-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      ))}
      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
        <p className="text-[11px] text-amber-700 text-center">{closingMessage}</p>
      </div>
    </div>
  );
}

/* ── Welcome Letter ────────────────────────────────────────── */
export function WelcomeSheetContent() {
  const [config, setConfig] = useState<HotelConfig | null>(null);
  useEffect(() => { getHotelConfig().then(setConfig); }, []);
  if (!config) return <div className="flex-1 flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: BURGUNDY }} /></div>;

  return (
    <div className="overflow-y-auto px-5 pt-2 pb-8 space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{config.welcomeLetter || 'Thank you for choosing our hotel. We hope you have a wonderful stay.'}</p>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[14px] font-bold" style={{ color: BURGUNDY }}>{config.managerName || 'Hotel Manager'}</p>
          <p className="text-[12px] text-gray-400">{config.name}</p>
        </div>
      </div>
      {config.teamPhotoUrl ? (
        <div className="rounded-2xl overflow-hidden border border-gray-100">
          <div className="relative h-56 w-full"><Image src={config.teamPhotoUrl} alt="Team" fill className="object-cover" sizes="100vw" /></div>
          <div className="p-3 bg-white"><p className="text-[12px] font-semibold text-gray-700">Your team at {config.name}</p></div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Review ────────────────────────────────────────────────── */
export function ReviewSheetContent({ onClose: closeSheet }: { onClose: () => void }) {
  const [step, setStep] = useState<'rating' | 'feedback' | 'done'>('rating');
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleStarClick = (val: number) => { setRating(val); setStep(val <= 2 ? 'feedback' : 'done'); };

  const handleSubmitFeedback = async () => {
    const hotel = await getHotelConfig();
    const sesh = JSON.parse(localStorage.getItem('guestSession') || '{}');
    if (hotel?.notificationEmail) {
      const body = `Low guest review.\nRating: ${rating} stars\nFeedback: ${feedback.trim() || 'None'}\nGuest: ${sesh.name || 'Unknown'} Room ${sesh.room || 'N/A'}`;
      window.location.href = `mailto:${hotel.notificationEmail}?subject=Guest Complaint ${rating} Stars&body=${encodeURIComponent(body)}`;
    }
    setStep('done');
  };

  const openReview = async (url: string) => {
    const hotel = await getHotelConfig();
    const map: Record<string, string | undefined> = { google: hotel?.googleReviewUrl, tripadvisor: hotel?.tripadvisorUrl, yelp: hotel?.yelpUrl };
    const fallback: Record<string, string> = { google: `https://www.google.com/search?q=${encodeURIComponent((hotel?.name || '') + ' reviews')}`, tripadvisor: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(hotel?.name || '')}`, yelp: `https://www.yelp.com/search?find_desc=${encodeURIComponent(hotel?.name || '')}` };
    window.open(map[url] || fallback[url], '_blank');
  };

  const labelColors = ['', 'text-red-500', 'text-red-400', 'text-amber-400', 'text-amber-400', 'text-emerald-600'];
  const labels = ['', 'Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'];

  return (
    <div className="overflow-y-auto px-5 pt-2 pb-8">
      {step === 'rating' && (
        <div className="text-center py-6">
          <p className="text-[22px] font-bold text-black mb-1">How was your stay?</p>
          <p className="text-[13px] text-gray-400 mb-6">Tap a star to rate your experience</p>
          <div className="flex justify-center gap-2 mb-4">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => handleStarClick(s)} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} className="active:scale-90 transition-transform">
                <Star size={44} className={s <= (hovered || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
              </button>
            ))}
          </div>
          {rating > 0 && <p className={`text-[13px] font-semibold ${labelColors[rating]}`}>{labels[rating]}</p>}
        </div>
      )}
      {step === 'feedback' && (
        <div className="py-4">
          <div className="text-center mb-4">
            <p className="text-[20px] font-bold text-black mb-1">We&apos;re sorry to hear that</p>
            <p className="text-[13px] text-gray-400">Tell us so we can make it right</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3">
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What went wrong?" className="w-full bg-gray-50 rounded-xl p-3 text-[14px] text-gray-800 outline-none border border-gray-200 resize-none h-28" />
          </div>
          <button onClick={handleSubmitFeedback} className="w-full py-3.5 rounded-[14px] text-white font-bold text-[15px]" style={{ backgroundColor: BURGUNDY }}>Submit Feedback to Manager</button>
        </div>
      )}
      {step === 'done' && rating >= 3 && (
        <div className="py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-500" /></div>
          <p className="text-[22px] font-bold text-black mb-2">Thank you!</p>
          <p className="text-[13px] text-gray-400 mb-6">Your feedback helps others. Share on a platform:</p>
          <div className="space-y-2.5">
            {[{ label: 'Google', letter: 'G', url: 'google' }, { label: 'TripAdvisor', letter: 'T', url: 'tripadvisor' }, { label: 'Yelp', letter: 'Y', url: 'yelp' }].map(p => (
              <button key={p.label} onClick={() => openReview(p.url)} className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 active:scale-[0.98]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${BURGUNDY}18` }}><span className="text-[14px] font-bold" style={{ color: BURGUNDY }}>{p.letter}</span></div>
                <span className="flex-1 text-left text-[14px] font-bold text-gray-800">{p.label}</span>
                <ExternalLink size={15} className="text-gray-400" />
              </button>
            ))}
          </div>
          <button onClick={closeSheet} className="mt-4 text-[13px] font-semibold text-gray-400">Close</button>
        </div>
      )}
      {step === 'done' && rating <= 2 && (
        <div className="py-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${BURGUNDY}18` }}><CheckCircle size={32} style={{ color: BURGUNDY }} /></div>
          <p className="text-[22px] font-bold text-black mb-2">Thank you</p>
          <p className="text-[13px] text-gray-400 mb-6">Your feedback has been sent to management.</p>
          <button onClick={closeSheet} className="w-full py-3.5 rounded-[14px] bg-gray-100 text-[15px] font-bold text-gray-700">Close</button>
        </div>
      )}
    </div>
  );
}
