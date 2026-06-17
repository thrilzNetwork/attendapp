'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getShuttleRoutes, createShuttleRoute, deleteShuttleRoute,
  getAllShuttleSlotsForHotel, createShuttleSlot, deleteShuttleSlot,
  getShuttleBookings, getAllShuttleBookingsForHotel, bookShuttleSlot, cancelShuttleBooking,
  getShuttleRequests, createShuttleRequest, updateShuttleRequest,
  type ShuttleRoute, type ShuttleSlot, type ShuttleBooking, type ShuttleRequest,
} from '@/lib/supabase';
import { Bus, Plus, Trash2, Users, Clock, ChevronDown, ChevronRight, X, CheckCircle, AlertCircle, Calendar, MapPin } from 'lucide-react';

const TEAL = '#0D9488';
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Tab = 'today' | 'book' | 'bookings' | 'requests' | 'setup';

interface Props {
  hotelId: string;
  isAdmin: boolean;
  staffName?: string;
}

function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function todayDow()  { return new Date().getDay(); } // 0=Sun

// Format time "14:30:00" → "2:30 PM"
function fmt(t?: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function routeIcon(type: string) {
  if (type === 'airport') return '✈️';
  if (type === 'cruise')  return '🚢';
  return '🚐';
}

// Slots that run today (recurring match or one-off date match)
function getTodaySlots(slots: ShuttleSlot[]) {
  const today = todayStr();
  const dow   = todayDow();
  return slots.filter(s =>
    (s.date === today) ||
    (!s.date && Array.isArray(s.days_of_week) && s.days_of_week.includes(dow))
  ).sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || ''));
}

// Slots that run on a given date
function getSlotsForDate(slots: ShuttleSlot[], date: string) {
  const dow = new Date(date + 'T00:00:00').getDay();
  return slots.filter(s =>
    (s.date === date) ||
    (!s.date && Array.isArray(s.days_of_week) && s.days_of_week.includes(dow))
  ).sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || ''));
}

// ─── Sub-component: Passenger Manifest ───────────────────────
function SlotManifest({ slot, onBook, isAdmin }: { slot: ShuttleSlot; onBook: () => void; isAdmin: boolean }) {
  const [open, setOpen]         = useState(false);
  const [bookings, setBookings] = useState<ShuttleBooking[]>([]);
  const [loading, setLoading]   = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const b = await getShuttleBookings(slot.id);
    // Filter to today's bookings by created_at date
    const today = todayStr();
    setBookings(b.filter(bk => bk.created_at.startsWith(today)));
    setLoading(false);
  };

  const handleOpen = () => {
    if (!open) load();
    setOpen(o => !o);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    setCancelling(id);
    await cancelShuttleBooking(id);
    await load();
    setCancelling(null);
  };

  const totalPax = bookings.reduce((s, b) => s + (b.pax || 1), 0);
  const seats    = slot.capacity || 0;
  const full     = seats > 0 && totalPax >= seats;

  return (
    <div>
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[22px]">{routeIcon(slot.route_type || '')}</span>
          <div className="text-left">
            <p className="text-[14px] font-bold text-gray-900">{fmt(slot.departure_time)}</p>
            <p className="text-[11px] text-gray-500">{slot.route_name || slot.event_label || 'Shuttle'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {seats > 0 ? (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${full ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {totalPax}/{seats} seats
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">{totalPax} booked</span>
          )}
          {(slot.override_price ?? slot.route_price ?? 0) > 0 ? (
            <span className="text-[11px] font-bold text-amber-700">${slot.override_price ?? slot.route_price}</span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-600">Free</span>
          )}
          {open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {loading ? (
            <p className="text-[12px] text-gray-400 py-3">Loading passengers…</p>
          ) : (
            <>
              {bookings.length === 0 ? (
                <p className="text-[12px] text-gray-400 italic py-2">No bookings yet for today&apos;s run.</p>
              ) : (
                <div className="space-y-1.5 mt-2 mb-3">
                  {bookings.map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-[13px] font-semibold text-gray-900">{b.guest_name}</p>
                        <p className="text-[11px] text-gray-500">Room {b.room_number} · {b.pax} pax{b.notes ? ` · ${b.notes}` : ''}</p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          disabled={cancelling === b.id}
                          className="text-gray-300 hover:text-red-500 disabled:opacity-40"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!full && (
                <button
                  onClick={onBook}
                  className="w-full py-2 rounded-xl text-white text-[12px] font-bold flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: TEAL }}
                >
                  <Plus size={13} /> Add Guest to This Run
                </button>
              )}
              {full && (
                <p className="text-center text-[11px] font-bold text-red-500 py-1">This run is full.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Book Guest Modal ──────────────────────────
function BookingModal({
  slot, onDone, onClose,
}: {
  slot: ShuttleSlot | null; onDone: () => void; onClose: () => void;
}) {
  const [name, setName]     = useState('');
  const [room, setRoom]     = useState('');
  const [pax, setPax]       = useState(1);
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  if (!slot) return null;

  const price = slot.override_price ?? slot.route_price ?? 0;

  const handleBook = async () => {
    if (!name.trim() || !room.trim()) { setError('Guest name and room are required.'); return; }
    setSaving(true); setError(null);
    try {
      await bookShuttleSlot({
        slot_id: slot.id, guest_name: name.trim(), room_number: room.trim(),
        pax, notes: notes.trim(), price_charged: price, charge_accepted: price > 0,
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to book');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-bold">Book Guest</h2>
            <p className="text-[12px] text-gray-500">{fmt(slot.departure_time)} · {slot.route_name || slot.event_label}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Guest Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Smith"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" autoFocus />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Room</label>
              <input value={room} onChange={e => setRoom(e.target.value)} placeholder="101"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-28">
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Passengers</label>
              <input type="number" min={1} max={20} value={pax} onChange={e => setPax(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100 text-center" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Flight info, special needs…"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
            </div>
          </div>
          {price > 0 && (
            <div className="bg-amber-50 rounded-xl px-4 py-2.5 text-[12px] text-amber-800 font-semibold">
              Price: ${price} per person · Total: ${(price * pax).toFixed(2)}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={handleBook} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
              {saving ? 'Booking…' : 'Confirm Booking'}
            </button>
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function ShuttleView({ hotelId, isAdmin }: Props) {
  const [tab, setTab]         = useState<Tab>('today');
  const [slots, setSlots]     = useState<ShuttleSlot[]>([]);
  const [routes, setRoutes]   = useState<ShuttleRoute[]>([]);
  const [bookings, setBookings] = useState<ShuttleBooking[]>([]);
  const [requests, setRequests] = useState<ShuttleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Booking modal
  const [bookingSlot, setBookingSlot] = useState<ShuttleSlot | null>(null);

  // Book-a-ride form
  const [bookDate, setBookDate]     = useState(todayStr());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [reqForm, setReqForm] = useState({ guest_name: '', room_number: '', destination: '', date: todayStr(), time: '', pax: 1, notes: '' });
  const [reqSaving, setReqSaving] = useState(false);
  const [reqDone, setReqDone]     = useState(false);

  // Setup: new route / batch slots
  const [newRoute, setNewRoute] = useState({ name: '', type: 'airport', price: 0 });
  const [setupRoute, setSetupRoute]   = useState<string>('');
  const [batchForm, setBatchForm] = useState({ from: '06:00', to: '22:00', interval: 60, days: [0,1,2,3,4,5,6] as number[], capacity: 12 });
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupMsg, setSetupMsg]       = useState<string | null>(null);
  const [singleSlot, setSingleSlot]   = useState({ time: '', date: '', days: [] as number[], capacity: 12, label: '' });
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [r, s, b, req] = await Promise.all([
        getShuttleRoutes(hotelId),
        getAllShuttleSlotsForHotel(hotelId),
        getAllShuttleBookingsForHotel(hotelId),
        getShuttleRequests(hotelId),
      ]);
      setRoutes(r); setSlots(s); setBookings(b); setRequests(req);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shuttle data');
    }
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const todaySlots = getTodaySlots(slots);
  const dateSlots  = getSlotsForDate(slots, bookDate);

  // ── Handlers ──

  const handleAddRoute = async () => {
    if (!newRoute.name.trim()) return;
    setSetupSaving(true);
    try {
      await createShuttleRoute({ hotel_id: hotelId, name: newRoute.name.trim(), type: newRoute.type, price: newRoute.price });
      setNewRoute({ name: '', type: 'airport', price: 0 });
      await load();
    } catch (e) { setSetupMsg('Failed: ' + (e instanceof Error ? e.message : 'unknown')); }
    setSetupSaving(false);
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Delete this route and all its time slots?')) return;
    await deleteShuttleRoute(id);
    await load();
  };

  const handleAddSingleSlot = async () => {
    if (!setupRoute || (!singleSlot.time && !singleSlot.date)) return;
    setSetupSaving(true);
    try {
      await createShuttleSlot({
        route_id: setupRoute,
        hotel_id: hotelId,
        departure_time: (singleSlot.time || '00:00') + ':00',
        days_of_week: singleSlot.days,
        date: singleSlot.date || undefined,
        capacity: singleSlot.capacity,
        event_label: singleSlot.label,
      });
      setSingleSlot({ time: '', date: '', days: [], capacity: 12, label: '' });
      setSetupMsg('Slot added.');
      await load();
    } catch (e) { setSetupMsg('Failed: ' + (e instanceof Error ? e.message : 'unknown')); }
    setSetupSaving(false);
  };

  const handleBatchGenerate = async () => {
    if (!setupRoute || !batchForm.from || !batchForm.to) return;
    setSetupSaving(true); setSetupMsg(null);
    try {
      const [sh, sm] = batchForm.from.split(':').map(Number);
      const [eh, em] = batchForm.to.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin   = eh * 60 + em;
      let created = 0;
      for (let m = startMin; m <= endMin; m += batchForm.interval) {
        const dep = `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}:00`;
        await createShuttleSlot({ route_id: setupRoute, hotel_id: hotelId, departure_time: dep, days_of_week: batchForm.days, capacity: batchForm.capacity });
        created++;
      }
      setSetupMsg(`Created ${created} time slots.`);
      await load();
    } catch (e) { setSetupMsg('Failed: ' + (e instanceof Error ? e.message : 'unknown')); }
    setSetupSaving(false);
  };

  const handleBookRequest = async () => {
    if (!reqForm.guest_name.trim() || !reqForm.room_number.trim() || !reqForm.destination.trim()) return;
    setReqSaving(true);
    try {
      await createShuttleRequest({
        hotel_id: hotelId,
        guest_name: reqForm.guest_name.trim(),
        room_number: reqForm.room_number.trim(),
        destination: reqForm.destination.trim(),
        date: reqForm.date || undefined,
        time: reqForm.time || undefined,
        pax: reqForm.pax,
        notes: reqForm.notes.trim(),
      });
      setReqDone(true);
      setReqForm({ guest_name: '', room_number: '', destination: '', date: todayStr(), time: '', pax: 1, notes: '' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to submit'); }
    setReqSaving(false);
  };

  const handleBookIntoSlot = async () => {
    const slot = slots.find(s => s.id === selectedSlot);
    if (slot) setBookingSlot(slot);
  };

  const handleUpdateRequest = async (id: string, status: string) => {
    await updateShuttleRequest(id, { status: status as ShuttleRequest['status'] });
    await load();
  };

  const ALL_TABS: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'today',    label: "Today's Runs" },
    { key: 'book',     label: 'Book a Ride' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'requests', label: 'Requests' },
    { key: 'setup',    label: 'Setup', adminOnly: true },
  ];
  const TABS = ALL_TABS.filter(t => !t.adminOnly || isAdmin);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    assigned: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-teal-50 text-teal-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-400',
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900 flex items-center gap-2">
            <Bus size={22} style={{ color: TEAL }} /> Shuttle
          </h1>
          <p className="text-[13px] text-gray-500">{DAYS_FULL[todayDow()]}, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4">{error}</div>}

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: TEAL }} /></div>
      ) : (
        <>
          {/* ── TODAY'S RUNS ── */}
          {tab === 'today' && (
            <div>
              {todaySlots.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                  <Bus size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-[15px] font-semibold text-gray-700 mb-1">No runs scheduled today</p>
                  {isAdmin && <p className="text-[12px] text-gray-400">Go to Setup to add routes and times.</p>}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                  {todaySlots.map(slot => (
                    <SlotManifest
                      key={slot.id}
                      slot={slot}
                      isAdmin={isAdmin}
                      onBook={() => setBookingSlot(slot)}
                    />
                  ))}
                </div>
              )}

              {/* Quick ad-hoc request shortcut */}
              <button
                onClick={() => setTab('book')}
                className="mt-4 w-full flex items-center justify-between px-4 py-3 bg-teal-50 border border-teal-100 rounded-2xl hover:bg-teal-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Plus size={16} className="text-teal-600" />
                  <p className="text-[13px] font-bold text-teal-800">Book a guest into a run or request a custom ride</p>
                </div>
                <ChevronRight size={15} className="text-teal-500" />
              </button>
            </div>
          )}

          {/* ── BOOK A RIDE ── */}
          {tab === 'book' && (
            <div className="space-y-5">
              {/* Book into existing slot */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-[15px] font-bold mb-4 flex items-center gap-2"><Clock size={15} style={{ color: TEAL }} /> Book Guest into Scheduled Run</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Date</label>
                    <input type="date" value={bookDate} onChange={e => { setBookDate(e.target.value); setSelectedSlot(''); }}
                      className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
                  </div>
                  {dateSlots.length === 0 ? (
                    <p className="text-[12px] text-gray-400 italic">No scheduled runs on this date. Use the custom request below.</p>
                  ) : (
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Select Run</label>
                      <div className="space-y-2">
                        {dateSlots.map(s => {
                          const price = s.override_price ?? s.route_price ?? 0;
                          return (
                            <button key={s.id} onClick={() => setSelectedSlot(s.id)}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${selectedSlot === s.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                              <div className="flex items-center gap-2">
                                <span>{routeIcon(s.route_type || '')}</span>
                                <div>
                                  <p className="text-[13px] font-bold text-gray-900">{fmt(s.departure_time)}</p>
                                  <p className="text-[11px] text-gray-500">{s.route_name || s.event_label}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {s.capacity > 0 && <span className="text-[11px] text-gray-400">{s.bookings_count || 0}/{s.capacity}</span>}
                                {price > 0 ? <span className="text-[11px] font-bold text-amber-700">${price}</span> : <span className="text-[10px] text-emerald-600 font-bold">Free</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {selectedSlot && (
                    <button onClick={handleBookIntoSlot} className="w-full py-3 rounded-xl text-white font-bold text-[13px]" style={{ backgroundColor: TEAL }}>
                      Book Guest into This Run
                    </button>
                  )}
                </div>
              </div>

              {/* Custom request */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-[15px] font-bold mb-4 flex items-center gap-2"><MapPin size={15} style={{ color: TEAL }} /> Custom Shuttle Request</h2>
                {reqDone ? (
                  <div className="text-center py-6">
                    <CheckCircle size={36} className="mx-auto mb-2" style={{ color: TEAL }} />
                    <p className="text-[14px] font-semibold text-gray-800">Request submitted!</p>
                    <button onClick={() => { setReqDone(false); }} className="mt-3 text-[12px] font-bold text-teal-600">+ Another Request</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Guest Name</label>
                        <input value={reqForm.guest_name} onChange={e => setReqForm(f => ({ ...f, guest_name: e.target.value }))} placeholder="e.g. Maria Santos"
                          className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                      </div>
                      <div className="w-24">
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Room</label>
                        <input value={reqForm.room_number} onChange={e => setReqForm(f => ({ ...f, room_number: e.target.value }))} placeholder="101"
                          className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Destination</label>
                      <input value={reqForm.destination} onChange={e => setReqForm(f => ({ ...f, destination: e.target.value }))} placeholder="e.g. Miami International Airport"
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Date</label>
                        <input type="date" value={reqForm.date} onChange={e => setReqForm(f => ({ ...f, date: e.target.value }))}
                          className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Time Needed</label>
                        <input type="time" value={reqForm.time} onChange={e => setReqForm(f => ({ ...f, time: e.target.value }))}
                          className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                      </div>
                      <div className="w-20">
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Pax</label>
                        <input type="number" min={1} value={reqForm.pax} onChange={e => setReqForm(f => ({ ...f, pax: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100 text-center" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Notes (optional)</label>
                      <input value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} placeholder="Flight #, special needs…"
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                    </div>
                    <button onClick={handleBookRequest} disabled={reqSaving || !reqForm.guest_name || !reqForm.room_number || !reqForm.destination}
                      className="w-full py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                      {reqSaving ? 'Submitting…' : 'Submit Request'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BOOKINGS ── */}
          {tab === 'bookings' && (
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                  <Users size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-[14px] font-semibold text-gray-600">No bookings yet</p>
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-gray-500">{bookings.length} confirmed booking{bookings.length !== 1 ? 's' : ''}</p>
                  {bookings.map(b => (
                    <div key={b.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{b.guest_name}</p>
                        <p className="text-[11px] text-gray-500">Room {b.room_number} · {b.pax} pax · {b.route_name || '—'} {b.slot_time ? `at ${fmt(b.slot_time)}` : ''}</p>
                        {b.notes && <p className="text-[11px] text-gray-400 italic">{b.notes}</p>}
                        <p className="text-[10px] text-gray-300 mt-0.5">{new Date(b.created_at).toLocaleDateString()}</p>
                      </div>
                      {isAdmin && (
                        <button onClick={async () => { if (!confirm('Cancel this booking?')) return; await cancelShuttleBooking(b.id); await load(); }}
                          className="shrink-0 p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── REQUESTS ── */}
          {tab === 'requests' && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                  <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-[14px] font-semibold text-gray-600">No shuttle requests</p>
                </div>
              ) : (
                requests.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{r.guest_name}</p>
                        <p className="text-[12px] text-gray-500">Room {r.room_number} · {r.pax} pax</p>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin size={11} className="text-gray-400" />
                          <p className="text-[12px] text-gray-700">{r.destination}</p>
                        </div>
                        {(r.date || r.time) && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Calendar size={11} className="text-gray-400" />
                            <p className="text-[12px] text-gray-500">{r.date}{r.time ? ` at ${fmt(r.time)}` : ''}</p>
                          </div>
                        )}
                        {r.notes && <p className="text-[11px] text-gray-400 italic mt-1">{r.notes}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColors[r.status] || 'bg-gray-100 text-gray-500'}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>
                    {isAdmin && r.status !== 'completed' && r.status !== 'cancelled' && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.status === 'pending' && (
                          <button onClick={() => handleUpdateRequest(r.id, 'assigned')}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100">
                            Assign Driver
                          </button>
                        )}
                        {(r.status === 'assigned' || r.status === 'pending') && (
                          <button onClick={() => handleUpdateRequest(r.id, 'in_progress')}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 hover:bg-teal-100">
                            Mark En Route
                          </button>
                        )}
                        <button onClick={() => handleUpdateRequest(r.id, 'completed')}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                          Complete
                        </button>
                        <button onClick={() => handleUpdateRequest(r.id, 'cancelled')}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gray-50 text-gray-500 hover:bg-gray-100">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── SETUP (admin) ── */}
          {tab === 'setup' && isAdmin && (
            <div className="space-y-5">
              {setupMsg && (
                <div className="bg-teal-50 border border-teal-100 text-teal-800 text-[12px] rounded-xl px-4 py-3 flex items-center justify-between">
                  {setupMsg}
                  <button onClick={() => setSetupMsg(null)}><X size={14} /></button>
                </div>
              )}

              {/* Add Route */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-[15px] font-bold mb-4">Add Route</h2>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input value={newRoute.name} onChange={e => setNewRoute(r => ({ ...r, name: e.target.value }))} placeholder="Route name, e.g. MIA Airport"
                      className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                    <select value={newRoute.type} onChange={e => setNewRoute(r => ({ ...r, type: e.target.value }))}
                      className="bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100">
                      <option value="airport">✈️ Airport</option>
                      <option value="cruise">🚢 Cruise Port</option>
                      <option value="custom">🚐 Custom</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Price per person ($, 0 = free)</label>
                      <input type="number" min={0} step={0.01} value={newRoute.price || ''} placeholder="0"
                        onChange={e => setNewRoute(r => ({ ...r, price: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                    </div>
                    <button onClick={handleAddRoute} disabled={setupSaving || !newRoute.name.trim()}
                      className="px-5 py-2.5 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                      Add Route
                    </button>
                  </div>
                </div>
              </div>

              {/* Routes list + slot management */}
              {routes.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-[14px] font-bold text-gray-700">Routes & Time Slots</h2>
                  {routes.map(route => {
                    const routeSlots = slots.filter(s => s.route_id === route.id).sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || ''));
                    const expanded = expandedRoute === route.id;
                    return (
                      <div key={route.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <button onClick={() => setExpandedRoute(expanded ? null : route.id)}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-[22px]">{routeIcon(route.type)}</span>
                            <div className="text-left">
                              <p className="text-[14px] font-bold text-gray-900">{route.name}</p>
                              <p className="text-[11px] text-gray-500">{routeSlots.length} time slot{routeSlots.length !== 1 ? 's' : ''} · {route.price > 0 ? `$${route.price}/person` : 'Free'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={e => { e.stopPropagation(); handleDeleteRoute(route.id); }}
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                              <Trash2 size={13} />
                            </button>
                            {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                          </div>
                        </button>

                        {expanded && (
                          <div className="border-t border-gray-100 p-4 space-y-4">
                            {/* Existing slots */}
                            {routeSlots.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {routeSlots.map(s => (
                                  <div key={s.id} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2.5 py-1 border border-gray-100">
                                    <span className="text-[12px] font-bold text-gray-700">{fmt(s.departure_time)}</span>
                                    {s.date && <span className="text-[10px] text-gray-400">({s.date})</span>}
                                    {!s.date && s.days_of_week?.length > 0 && (
                                      <span className="text-[10px] text-gray-400">({s.days_of_week.map(d => DAYS_SHORT[d]).join(',')})</span>
                                    )}
                                    <button onClick={() => { if (!confirm('Delete this slot?')) return; deleteShuttleSlot(s.id).then(() => load()); }}
                                      className="text-gray-300 hover:text-red-500 ml-1"><X size={10} /></button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Single slot */}
                            <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-2">
                              <p className="text-[11px] font-bold text-gray-500">Add One-Off or Recurring Slot</p>
                              <div className="flex gap-2 flex-wrap">
                                <div>
                                  <label className="text-[10px] text-gray-400 block mb-0.5">Time</label>
                                  <input type="time" value={singleSlot.time} onChange={e => setSingleSlot(f => ({ ...f, time: e.target.value }))}
                                    className="bg-white rounded-lg px-2 py-1.5 text-[12px] border border-gray-200 w-28" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400 block mb-0.5">Date (one-off)</label>
                                  <input type="date" value={singleSlot.date} onChange={e => setSingleSlot(f => ({ ...f, date: e.target.value }))}
                                    className="bg-white rounded-lg px-2 py-1.5 text-[12px] border border-gray-200 w-36" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400 block mb-0.5">Capacity (0=unlimited)</label>
                                  <input type="number" min={0} value={singleSlot.capacity} onChange={e => setSingleSlot(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))}
                                    className="bg-white rounded-lg px-2 py-1.5 text-[12px] border border-gray-200 w-24 text-center" />
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {DAYS_SHORT.map((d, i) => (
                                  <button key={i} onClick={() => setSingleSlot(f => ({ ...f, days: f.days.includes(i) ? f.days.filter(x => x !== i) : [...f.days, i] }))}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${singleSlot.days.includes(i) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                                    {d}
                                  </button>
                                ))}
                              </div>
                              <button onClick={() => { setSetupRoute(route.id); setTimeout(handleAddSingleSlot, 0); }} disabled={setupSaving || (!singleSlot.time)}
                                className="w-full py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                                Add Slot
                              </button>
                            </div>

                            {/* Batch generate */}
                            <div className="border border-dashed border-teal-100 bg-teal-50 rounded-xl p-3 space-y-2">
                              <p className="text-[11px] font-bold text-teal-700">Batch Generate Time Slots</p>
                              <div className="flex gap-2 flex-wrap">
                                <div>
                                  <label className="text-[10px] text-teal-600 block mb-0.5">From</label>
                                  <input type="time" value={batchForm.from} onChange={e => setBatchForm(f => ({ ...f, from: e.target.value }))}
                                    className="bg-white rounded-lg px-2 py-1.5 text-[12px] border border-teal-200 w-28" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-teal-600 block mb-0.5">To</label>
                                  <input type="time" value={batchForm.to} onChange={e => setBatchForm(f => ({ ...f, to: e.target.value }))}
                                    className="bg-white rounded-lg px-2 py-1.5 text-[12px] border border-teal-200 w-28" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-teal-600 block mb-0.5">Every (min)</label>
                                  <select value={batchForm.interval} onChange={e => setBatchForm(f => ({ ...f, interval: parseInt(e.target.value) }))}
                                    className="bg-white rounded-lg px-2 py-1.5 text-[12px] border border-teal-200">
                                    <option value={15}>15 min</option>
                                    <option value={30}>30 min</option>
                                    <option value={60}>1 hr</option>
                                    <option value={90}>90 min</option>
                                    <option value={120}>2 hr</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-teal-600 block mb-0.5">Capacity</label>
                                  <input type="number" min={0} value={batchForm.capacity} onChange={e => setBatchForm(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))}
                                    className="bg-white rounded-lg px-2 py-1.5 text-[12px] border border-teal-200 w-20 text-center" />
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {DAYS_SHORT.map((d, i) => (
                                  <button key={i} onClick={() => setBatchForm(f => ({ ...f, days: f.days.includes(i) ? f.days.filter(x => x !== i) : [...f.days, i] }))}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${batchForm.days.includes(i) ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-gray-400 border-gray-200'}`}>
                                    {d}
                                  </button>
                                ))}
                              </div>
                              <button onClick={() => { setSetupRoute(route.id); setTimeout(handleBatchGenerate, 0); }} disabled={setupSaving}
                                className="w-full py-2 rounded-lg bg-teal-700 text-white text-[12px] font-bold disabled:opacity-50">
                                {setupSaving ? 'Generating…' : `Generate Slots`}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Booking Modal */}
      {bookingSlot && (
        <BookingModal
          slot={bookingSlot}
          onDone={load}
          onClose={() => setBookingSlot(null)}
        />
      )}
    </div>
  );
}
