'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  X, Send, CheckCircle, Wifi, Check, Coffee, Dumbbell, Printer,
  WashingMachine, IceCream, Car, Bus, Flame, AlertTriangle,
  AlarmSmoke, Crosshair, ShieldCheck, Phone, Star, ExternalLink,
  Plane, UserCheck,
} from 'lucide-react';
import {
  supabase, getHotelConfig, HotelConfig,
  getAllShuttleSlotsForHotel, bookShuttleSlot, createShuttleRequest,
  getShuttleRoutes, getCruiseSchedules,
  ShuttleSlot, ShuttleRoute, CruiseSchedule,
  getKnowledgeBase, KnowledgeEntry,
  getMessages,
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

/* ── Message / Chat ────────────────────────────────────────── */
type ChatMsg = {
  from: 'guest' | 'bot';
  text: string;
  isConfirm?: boolean;
  confirmType?: string;
  confirmDetails?: string;
};

export function MessageSheetContent() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [guestName, setGuestName] = useState('Guest');
  const [guestRoom, setGuestRoom] = useState('?');
  const [kb, setKb] = useState<KnowledgeEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setGuestName(s.name || 'Guest');
        setGuestRoom(s.room || '?');
      } catch { localStorage.removeItem('guestSession'); }
    }
    // Load hotel knowledge base
    getHotelConfig().then(async hotel => {
      if (hotel?.id) {
        getKnowledgeBase(hotel.id).then(setKb);
        // Load past messages
        const stored = localStorage.getItem('guestSession');
        if (stored) {
          try {
            const s = JSON.parse(stored);
            if (s.name && s.room) {
              const pastMessages = await getMessages(hotel.id, s.name, s.room);
              const chatMsgs: ChatMsg[] = pastMessages.map(m => ({
                from: m.sender === 'guest' ? 'guest' : 'bot',
                text: m.body,
              }));
              setMessages(chatMsgs);
            }
          } catch { /* ignore */ }
        }
      }
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const createRequest = useCallback(async (type: string, details: string) => {
    const hotel = await getHotelConfig();
    await supabase.from('requests').insert({ hotel_id: hotel?.id, guest_name: guestName, room: guestRoom, type, details, status: 'pending' });
    if (hotel?.notificationEmail) {
      fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_request', data: { notificationEmail: hotel.notificationEmail, hotelName: hotel.name, guestName, room: guestRoom, requestType: type, details } }),
      }).catch(() => {});
    }
  }, [guestName, guestRoom]);

  const handleConfirm = async (type: string, details: string) => {
    await createRequest(type, details);
    setMessages(prev => [...prev,
      { from: 'guest', text: `Yes, please send ${details.toLowerCase()}` },
      { from: 'bot', text: '✅ Request sent! Our team will take care of this shortly.' },
    ]);
  };

  const handleDismiss = () => {
    setMessages(prev => [...prev,
      { from: 'guest', text: 'No thanks' },
      { from: 'bot', text: 'No problem! Let me know if you need anything else.' },
    ]);
  };

  // Fuzzy-match against knowledge base: returns best matching entry or null
  const matchKb = (lower: string): KnowledgeEntry | null => {
    let best: KnowledgeEntry | null = null;
    let bestScore = 0;
    for (const entry of kb) {
      const qWords = entry.question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const kwds = (entry.keywords || []).map(k => k.toLowerCase());
      const allTerms = [...qWords, ...kwds];
      const score = allTerms.filter(t => lower.includes(t)).length;
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    return bestScore >= 1 ? best : null;
  };

  const send = async (overrideText?: string) => {
    const userMsg = (overrideText ?? text).trim();
    if (!userMsg) return;
    const hotel = await getHotelConfig();

    // Save to messages table (guest chat log)
    await supabase.from('messages').insert({ hotel_id: hotel?.id, guest_name: guestName, room: guestRoom, sender: 'guest', body: userMsg });

    // Also insert into requests so it appears in Live Orders in real time
    await supabase.from('requests').insert({ hotel_id: hotel?.id, guest_name: guestName, room: guestRoom, type: 'Guest Message', details: userMsg, status: 'pending' });

    if (hotel?.notificationEmail) {
      fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'guest_message', data: { notificationEmail: hotel.notificationEmail, hotelName: hotel.name, guestName, room: guestRoom, message: userMsg } }),
      }).catch(() => {});
    }
    setMessages(prev => [...prev, { from: 'guest', text: userMsg }]);
    setText('');

    const lower = userMsg.toLowerCase();

    // 1. Check knowledge base first
    const kbMatch = matchKb(lower);
    if (kbMatch) {
      setTimeout(() => setMessages(prev => [...prev, { from: 'bot', text: kbMatch.answer }]), 600);
      return;
    }

    // 2. Check for actionable service requests
    const requestable = (() => {
      if (lower.includes('towel')) return { type: 'Amenity Request', details: 'Towel Service', reply: 'I can send a towel request to housekeeping. Would you like me to?' };
      if (lower.includes('water') || lower.includes('bottle')) return { type: 'Amenity Request', details: 'Water / Beverages', reply: 'I can send a water request to room service. Would you like me to?' };
      if (lower.includes('taxi') || lower.includes('uber')) return { type: 'Transport Request', details: 'Ride Service', reply: 'I can request transport for you. Shall I send that?' };
      if (lower.includes('food') || lower.includes('order')) return { type: 'Food Order', details: 'Restaurant Order', reply: 'I can place a food order request. Shall I?' };
      if (lower.includes('clean') || lower.includes('housekeep')) return { type: 'Housekeeping', details: 'Cleaning Service', reply: 'I can send a housekeeping request. Would you like me to?' };
      if (lower.includes('late') && lower.includes('check')) return { type: 'Front Desk Request', details: 'Late Checkout', reply: 'I can request late checkout from the front desk. Shall I?' };
      if (lower.includes('wake') || lower.includes('alarm')) return { type: 'Front Desk Request', details: 'Wake-Up Call', reply: 'I can request a wake-up call. Would you like me to?' };
      return undefined;
    })();

    setTimeout(() => {
      if (requestable) {
        setMessages(prev => [...prev, { from: 'bot', text: requestable.reply, isConfirm: true, confirmType: requestable.type, confirmDetails: requestable.details }]);
      } else {
        // 3. Generic fallback
        let reply = 'Thanks! Our front desk team will assist you shortly.';
        if (lower.includes('wifi') || lower.includes('internet')) reply = 'WiFi is complimentary! Ask the front desk for the network name and password.';
        else if (lower.includes('pool')) reply = 'Our pool is open 6 AM – 10 PM daily. Towels available at the front desk.';
        else if (lower.includes('breakfast')) reply = 'Complimentary breakfast is served 6:30 AM – 9:30 AM in the lobby.';
        else if (lower.includes('check')) reply = 'Check-out is at 11:00 AM. Late check-out requests can be made at the front desk.';
        setMessages(prev => [...prev, { from: 'bot', text: reply }]);
      }
    }, 600);
  };

  // Quick replies all flow through the chat now
  const quickReplies = [
    { label: 'WiFi Password' },
    { label: 'Pool Hours' },
    { label: 'Breakfast Time' },
    { label: 'Request Towels' },
    { label: 'Late Check-out' },
    { label: 'Housekeeping' },
    { label: 'Wake-Up Call' },
  ];

  return (
    <>
      <div className="px-4 pb-1 shrink-0">
        <p className="text-[11px] text-green-500 font-medium">● Online now</p>
      </div>
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F4F4F5]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'guest' ? 'justify-end' : 'justify-start'}`}>
            {m.isConfirm ? (
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-gray-100 px-4 py-3 shadow-sm">
                <p className="text-[13px] text-gray-800 mb-3 leading-relaxed">{m.text}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleConfirm(m.confirmType!, m.confirmDetails!)} className="flex-1 py-2.5 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: BURGUNDY }}>Yes, send request</button>
                  <button onClick={handleDismiss} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-[12px] font-bold">No thanks</button>
                </div>
              </div>
            ) : (
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${m.from === 'guest' ? 'text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'}`} style={m.from === 'guest' ? { backgroundColor: BURGUNDY } : undefined}>
                {m.text}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Quick replies — all route through send() so they appear in chat & Live Orders */}
      {messages.length < 4 && (
        <div className="shrink-0 px-4 py-2 flex gap-2 overflow-x-auto bg-white" style={{ scrollbarWidth: 'none' }}>
          {quickReplies.map((q) => (
            <button key={q.label} onClick={() => send(q.label)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[11px] text-gray-600 font-medium">
              {q.label}
            </button>
          ))}
        </div>
      )}
      {/* Input */}
      <div className="shrink-0 px-4 pb-5 pt-2 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Type a message..." className="flex-1 bg-gray-50 rounded-full px-4 py-3 text-[16px] text-gray-800 outline-none border border-gray-200" />
          <button onClick={() => send()} disabled={!text.trim()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: text.trim() ? BURGUNDY : '#e5e7eb' }}>
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </>
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

function OnDemandInner() {
  const [direction, setDirection] = useState<'arrival' | 'departure'>('departure');
  const [form, setForm] = useState({ guestName: '', room: '', date: '', time: '', airline: '', flight: '', destination: '', pax: 1, notes: '' });
  const [routes, setRoutes] = useState<ShuttleRoute[]>([]);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getHotelConfig().then(async h => {
      if (h?.id) { const r = await getShuttleRoutes(h.id); setRoutes(r); if (r.length > 0) setForm(f => ({ ...f, destination: r[0].name })); }
    });
    try {
      const gs = localStorage.getItem('guestSession');
      if (gs) { const s = JSON.parse(gs); setForm(f => ({ ...f, guestName: s.name || '', room: s.room || '' })); }
    } catch {}
  }, []);

  const handleSubmit = async () => {
    if (!form.guestName || !form.room) { setError('Name and room number are required.'); return; }
    setSubmitting(true); setError('');
    try {
      const hotel = await getHotelConfig();
      await createShuttleRequest({ hotel_id: hotel?.id || '', guest_name: form.guestName, room_number: form.room, pickup_location: direction === 'departure' ? 'Hotel Lobby' : form.destination, destination: direction === 'arrival' ? 'Hotel' : form.destination, date: form.date || undefined, time: form.time || undefined, pax: form.pax, notes: [form.airline ? `Airline: ${form.airline}${form.flight ? ` ${form.flight}` : ''}` : '', form.notes].filter(Boolean).join('. ') });
      setSent(true);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to submit.'); }
    finally { setSubmitting(false); }
  };

  if (sent) return (
    <div className="bg-gray-50 rounded-2xl p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><Send size={20} className="text-green-600" /></div>
      <h2 className="text-[16px] font-bold text-black mb-1">Request Sent!</h2>
      <p className="text-[13px] text-gray-500">Our team will confirm your transport shortly.</p>
      <button onClick={() => setSent(false)} className="mt-4 text-[13px] font-semibold" style={{ color: BURGUNDY }}>New Request</button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="bg-gray-100 rounded-2xl p-1 flex">
        <button onClick={() => setDirection('arrival')} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 ${direction === 'arrival' ? 'text-white' : 'text-gray-500'}`} style={direction === 'arrival' ? { backgroundColor: BURGUNDY } : undefined}><Plane size={13} /> Arrival</button>
        <button onClick={() => setDirection('departure')} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 ${direction === 'departure' ? 'text-white' : 'text-gray-500'}`} style={direction === 'departure' ? { backgroundColor: BURGUNDY } : undefined}>Departure <Plane size={13} /></button>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1"><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Guest Name</label><input placeholder="Your name" value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" /></div>
          <div className="w-24"><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Room</label><input placeholder="201" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" /></div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1"><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" /></div>
          <div className="flex-1"><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Time</label><input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" /></div>
        </div>
        {direction === 'arrival' && (
          <div className="flex gap-2">
            <input placeholder="Airline / Cruise line" value={form.airline} onChange={e => setForm(f => ({ ...f, airline: e.target.value }))} className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            <input placeholder="Flight #" value={form.flight} onChange={e => setForm(f => ({ ...f, flight: e.target.value }))} className="w-24 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
          </div>
        )}
        {routes.length > 0 ? (
          <select value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
            {routes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        ) : (
          <input placeholder="Destination (Airport, Downtown, etc.)" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
        )}
        <div className="flex gap-2 items-end">
          <div className="w-20"><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Pax</label><input type="number" min={1} max={20} value={form.pax} onChange={e => setForm(f => ({ ...f, pax: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none text-center" /></div>
          <div className="flex-1"><textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none resize-none h-[42px]" /></div>
        </div>
      </div>
      {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-xl px-4 py-2.5 text-center">{error}</p>}
      <button onClick={handleSubmit} disabled={submitting} className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: BURGUNDY }}>
        {submitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</> : 'Submit Request'}
      </button>
      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
        <p className="text-[11px] text-amber-700">Pickup requests are confirmed by staff. Contact front desk at ext. 0 for immediate needs.</p>
      </div>
    </div>
  );
}

/* ── Facilities ────────────────────────────────────────────── */
export function FacilitiesSheetContent() {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  useEffect(() => { getHotelConfig().then(setConfig); }, []);

  const wifiName = config?.wifiName || 'Hotel-WiFi';
  const wifiPassword = config?.wifiPassword || '';
  const copyWiFi = () => { navigator.clipboard.writeText(wifiPassword || wifiName); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const amenities = [
    { icon: <Coffee size={18} />, title: 'Complimentary Breakfast', desc: '6:30 AM — 9:30 AM daily. Hot & continental options.' },
    { icon: <Dumbbell size={18} />, title: 'Pool & Fitness Center', desc: 'Open 6:00 AM — 10:00 PM. Towels at front desk.' },
    { icon: <Printer size={18} />, title: 'Business Center', desc: '24-hour access. Printing, fax, and computer stations.' },
    { icon: <WashingMachine size={18} />, title: 'Guest Laundry', desc: 'Coin-operated on 2nd floor. Detergent at front desk.' },
    { icon: <IceCream size={18} />, title: 'Ice & Vending', desc: 'Ice machines every floor. Snack & beverage vending in lobby.' },
    { icon: <Car size={18} />, title: 'Complimentary Parking', desc: 'Free for hotel guests. Oversized spots available.' },
    { icon: <Bus size={18} />, title: 'Airport / Cruise Shuttle', desc: 'Scheduled shuttle to MIA & Port of Miami. Book 24hrs ahead.' },
  ];

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
export function SafetySheetContent() {
  const [config, setConfig] = useState<HotelConfig | null>(null);
  useEffect(() => { getHotelConfig().then(setConfig); }, []);
  const frontDesk = config?.frontDeskPhone || 'Ext. 0';

  return (
    <div className="overflow-y-auto px-5 pt-2 pb-8 space-y-3">
      <div className="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
        <div><p className="text-[13px] font-bold text-red-800 mb-1">In Case of Emergency</p><p className="text-[12px] text-red-700 leading-relaxed">Remain calm. Call 911 for immediate emergency response, then notify the front desk at {frontDesk}.</p></div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Emergency Contacts</p>
        {[{ label: 'Emergency (Police, Fire, Medical)', number: '911' }, { label: 'Front Desk', number: frontDesk }, { label: 'Hotel Security', number: 'Ext. 0' }].map((e, i) => (
          <a key={i} href={`tel:${e.number.replace(/[^0-9]/g, '')}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 active:bg-gray-100 mb-1.5">
            <div className="flex items-center gap-3"><Phone size={16} style={{ color: BURGUNDY }} /><p className="text-[13px] font-semibold text-gray-800">{e.label}</p></div>
            <span className="text-[14px] font-bold" style={{ color: BURGUNDY }}>{e.number}</span>
          </a>
        ))}
      </div>
      {[
        { icon: <Flame size={17} className="text-orange-500" />, title: 'Fire Safety', items: ['Smoke detectors in every room, tested monthly.', 'Know your nearest fire exit — posted on your door.', 'In case of fire: Do not use elevators. Use stairs.', 'If trapped: Seal door cracks, signal from window, call 911.', 'Assembly point is in the front parking lot.'] },
        { icon: <AlarmSmoke size={17} style={{ color: BURGUNDY }} />, title: 'CO & Smoke Detection', items: ['CO detectors on every floor and inside every room.', 'Chirping sound = notify front desk. Do not silence it.', 'CO symptoms: headache, dizziness, nausea — seek fresh air and call 911.', 'Smoke alarms are interconnected — one triggers all.', 'Do not tamper with detectors.'] },
        { icon: <Crosshair size={17} style={{ color: BURGUNDY }} />, title: 'Property Security', items: ['Exterior doors locked 10 PM – 6 AM. Use room key.', 'Security cameras in public areas, parking, and hallways.', 'Report suspicious activity to front desk.', 'Lock door and use deadbolt when inside.', 'Use in-room safe or front desk deposit for valuables.'] },
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
        <p className="text-[11px] text-amber-700 text-center">Contact the front desk at any time for safety concerns. Your wellbeing is our top priority.</p>
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
