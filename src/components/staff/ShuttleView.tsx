'use client';

import { useState, useEffect, useCallback } from 'react';
import BouncieLiveShuttle from '@/components/staff/BouncieLiveShuttle';
import {
  getShuttleRoutes, createShuttleRoute, deleteShuttleRoute, updateShuttleRoute,
  getAllShuttleSlotsForHotel, createShuttleSlot, deleteShuttleSlot,
  bookShuttleSlot, cancelShuttleBooking,
  getShuttleRequests, createShuttleRequest, updateShuttleRequest,
  subscribeToShuttleRequests,
  getPartners, supabase,
  getStaffSchedulesRange,
  type ShuttleRoute, type ShuttleSlot, type ShuttleBooking, type ShuttleRequest, type Partner, type StaffAccount,
} from '@/lib/supabase';
import { Bus, Plus, Trash2, X, CheckCircle, AlertCircle, MapPin, RefreshCw, ChevronDown, Settings, Navigation, Truck, ExternalLink, User } from 'lucide-react';

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const TEAL = '#0D9488';
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Tab = 'today' | 'requests' | 'setup';
type DispatchType = 'arrival' | 'departure';
type AssignMode = 'inhouse' | 'uber';

interface Props { hotelId: string; isAdmin: boolean; staffName?: string; staffList?: StaffAccount[]; }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayDow() { return new Date().getDay(); }

function fmt(t?: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`;
}

function hourLabel(h: number) {
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}${ampm}`;
}

function getReqHour(r: ShuttleRequest): number | null {
  if (!r.time) return null;
  return parseInt(r.time.split(':')[0]);
}

function nextAvailableHour(): string {
  const now = new Date();
  let h = now.getHours() + 1;
  if (h > 23) h = 23;
  return `${String(h).padStart(2, '0')}:00`;
}

function getTodaySlots(slots: ShuttleSlot[]) {
  const today = todayStr();
  const dow   = todayDow();
  return slots
    .filter(s => (s.date === today) || (!s.date && Array.isArray(s.days_of_week) && s.days_of_week.includes(dow)))
    .sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || ''));
}

const statusColors: Record<string, string> = {
  pending:     'bg-amber-50 text-amber-700 border-amber-200',
  assigned:    'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-teal-50 text-teal-700 border-teal-200',
  completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:   'bg-gray-100 text-gray-400 border-gray-200',
};

const statusBorder: Record<string, string> = {
  pending:     'border-l-amber-400',
  assigned:    'border-l-blue-400',
  in_progress: 'border-l-teal-400',
  completed:   'border-l-emerald-300',
  cancelled:   'border-l-gray-200',
};

/* ── Inline booking form per slot ── */
function SlotRow({ slot, isAdmin, onRefresh }: { slot: ShuttleSlot; isAdmin: boolean; onRefresh: () => void; }) {
  const [open,       setOpen]       = useState(false);
  const [bookings,   setBookings]   = useState<ShuttleBooking[]>([]);
  const [showAdd,    setShowAdd]    = useState(false);
  const [form,       setForm]       = useState({ guest_name: '', room_number: '', pax: 1, notes: '' });
  const [saving,     setSaving]     = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    const { getShuttleBookings } = await import('@/lib/supabase');
    const b = await getShuttleBookings(slot.id);
    setBookings(b.filter(bk => bk.status !== 'cancelled'));
  }, [slot.id]);

  useEffect(() => { if (open) loadBookings(); }, [open, loadBookings]);

  const totalPax = bookings.reduce((s, b) => s + (b.pax || 1), 0);
  const capacity = slot.capacity || 0;
  const pct      = capacity > 0 ? Math.min(100, Math.round((totalPax / capacity) * 100)) : 0;
  const isFull   = capacity > 0 && totalPax >= capacity;
  const price    = slot.override_price ?? slot.route_price ?? 0;

  const handleAdd = async () => {
    if (!form.guest_name.trim() || !form.room_number.trim()) return;
    setSaving(true);
    try {
      await bookShuttleSlot({ slot_id: slot.id, guest_name: form.guest_name.trim(), room_number: form.room_number.trim(), pax: form.pax, notes: form.notes.trim() });
      setForm({ guest_name: '', room_number: '', pax: 1, notes: '' });
      setShowAdd(false);
      await loadBookings();
      onRefresh();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleCancel = async (id: string) => {
    setCancelling(id);
    await cancelShuttleBooking(id);
    await loadBookings();
    onRefresh();
    setCancelling(null);
  };

  return (
    <div className={`border-b border-gray-100 last:border-0 ${isFull ? 'opacity-60' : ''}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TEAL}15` }}>
            <Bus size={14} style={{ color: TEAL }} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900">{fmt(slot.departure_time)}</p>
            <p className="text-[11px] text-gray-500">{slot.route_name || slot.event_label || 'Shuttle Run'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {price > 0 && <span className="text-[11px] font-bold text-amber-700">${price}/person</span>}
          {isFull ? (
            <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">FULL</span>
          ) : (
            <span className="text-[12px] font-bold text-gray-500">
              {totalPax}{capacity > 0 ? `/${capacity}` : ''} <span className="text-[10px] font-normal text-gray-400">pax</span>
            </span>
          )}
          {capacity > 0 && (
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : TEAL }} />
            </div>
          )}
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3 bg-gray-50">
          {bookings.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic py-2">No bookings yet.</p>
          ) : (
            <div className="space-y-1.5 pt-1">
              {bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{b.guest_name}</p>
                    <p className="text-[11px] text-gray-500">Room {b.room_number} · {b.pax} pax{b.notes ? ` · ${b.notes}` : ''}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleCancel(b.id)} disabled={cancelling === b.id}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isFull && (
            showAdd ? (
              <div className="bg-white rounded-xl border border-teal-100 p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
                    placeholder="Guest name" className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-100" />
                  <input value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))}
                    placeholder="Room" className="w-20 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-100 text-center" />
                  <input type="number" min={1} value={form.pax} onChange={e => setForm(f => ({ ...f, pax: parseInt(e.target.value) || 1 }))}
                    className="w-16 bg-gray-50 rounded-lg px-2 py-2 text-[12px] border border-gray-100 text-center" />
                </div>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes (flight #, etc.)" className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-100" />
                <div className="flex gap-2">
                  <button onClick={handleAdd} disabled={saving || !form.guest_name || !form.room_number}
                    className="flex-1 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                    {saving ? 'Adding…' : 'Add Guest'}
                  </button>
                  <button onClick={() => setShowAdd(false)} className="px-3 py-2 rounded-lg text-gray-400 hover:text-gray-600 text-[12px]">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 text-[12px] font-bold text-teal-600 hover:text-teal-700 py-1">
                <Plus size={13} /> Add Guest
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ── Route card with destination coords editor ── */
function RouteCard({ route, slots, onDelete, onDeleteSlot, onSaved }: {
  route: ShuttleRoute; slots: ShuttleSlot[]; onDelete: () => void; onDeleteSlot: (id: string) => void; onSaved: () => void;
}) {
  const [editDest, setEditDest] = useState(false);
  const [destAddr, setDestAddr] = useState(route.destination_address || '');
  const [destLat,  setDestLat]  = useState(route.destination_lat?.toString() || '');
  const [destLng,  setDestLng]  = useState(route.destination_lng?.toString() || '');
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');

  const handleSaveDest = async () => {
    setSaving(true); setMsg('');
    try {
      await updateShuttleRoute(route.id, {
        destination_address: destAddr.trim() || undefined,
        destination_lat: destLat ? parseFloat(destLat) : undefined,
        destination_lng: destLng ? parseFloat(destLng) : undefined,
      });
      setMsg('✅ Saved'); setEditDest(false); onSaved();
    } catch { setMsg('❌ Failed to save'); }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-bold text-gray-900">{route.name}</p>
          <p className="text-[11px] text-gray-500">{slots.length} time slot{slots.length !== 1 ? 's' : ''}{route.price > 0 ? ` · $${route.price}/person` : ' · Complimentary'}</p>
        </div>
        <button onClick={onDelete} className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      {slots.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {slots.map(s => (
            <div key={s.id} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2.5 py-1 border border-gray-100 group">
              <span className="text-[12px] font-bold text-gray-700">{fmt(s.departure_time)}</span>
              <button onClick={() => onDeleteSlot(s.id)} className="text-gray-200 hover:text-red-400 group-hover:text-gray-300 ml-0.5 transition-colors">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-gray-100 pt-3">
        {!editDest ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Navigation size={12} className="text-gray-400" />
              {route.destination_lat && route.destination_lng ? (
                <span className="text-[12px] text-gray-700 font-medium">
                  {route.destination_address || `${route.destination_lat.toFixed(4)}, ${route.destination_lng.toFixed(4)}`}
                </span>
              ) : (
                <span className="text-[12px] text-gray-400 italic">No destination set — add for trip ETA</span>
              )}
            </div>
            <button onClick={() => setEditDest(true)} className="text-[11px] font-bold text-teal-600 hover:text-teal-800 px-2 py-1 rounded-lg hover:bg-teal-50">
              {route.destination_lat ? 'Edit' : '+ Add Destination'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Destination Coordinates</p>
            <input value={destAddr} onChange={e => setDestAddr(e.target.value)}
              placeholder="e.g. Miami International Airport"
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-0.5">Latitude</label>
                <input type="number" step="0.0001" value={destLat} onChange={e => setDestLat(e.target.value)}
                  placeholder="25.7959" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100 font-mono" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-0.5">Longitude</label>
                <input type="number" step="0.0001" value={destLng} onChange={e => setDestLng(e.target.value)}
                  placeholder="-80.2870" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100 font-mono" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">Find coords: Google Maps → right-click location → copy lat/lng</p>
            {msg && <p className={`text-[12px] ${msg.startsWith('✅') ? 'text-teal-700' : 'text-red-600'}`}>{msg}</p>}
            <div className="flex gap-2">
              <button onClick={handleSaveDest} disabled={saving}
                className="flex-1 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                {saving ? 'Saving…' : 'Save Destination'}
              </button>
              <button onClick={() => { setEditDest(false); setMsg(''); }} className="px-4 py-2 rounded-xl text-[13px] text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ShuttleView ── */
export default function ShuttleView({ hotelId, isAdmin, staffList = [] }: Props) {
  const [tab,      setTab]      = useState<Tab>('today');
  const [routes,   setRoutes]   = useState<ShuttleRoute[]>([]);
  const [slots,    setSlots]    = useState<ShuttleSlot[]>([]);
  const [requests, setRequests] = useState<ShuttleRequest[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [shuttlePos, setShuttlePos] = useState<{ lat: number; lng: number; speed_mph: number } | null>(null);
  const [todayDrivers, setTodayDrivers] = useState<{ id: string; name: string; start_time: string; end_time?: string }[]>([]);

  // Dispatch sheet state
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatchType, setDispatchType] = useState<DispatchType>('arrival');
  const [assignMode, setAssignMode] = useState<AssignMode>('inhouse');
  const [dispatchForm, setDispatchForm] = useState({
    guest_name: '', room_number: '', pax: 1, pickup_location: '', destination: '',
    time: nextAvailableHour(), notes: '', driver_id: '',
  });
  const [dispatching, setDispatching] = useState(false);
  const [dispatchDone, setDispatchDone] = useState(false);

  // Filter state for timeline
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [filterDir, setFilterDir] = useState<'all' | 'arrival' | 'departure'>('all');

  // Setup wizard state
  const [schedule, setSchedule] = useState({
    routeName: 'Hotel Shuttle', routeType: 'custom',
    fromTime: '06:00', toTime: '23:00', interval: 60,
    days: [0, 1, 2, 3, 4, 5, 6] as number[], capacity: 8, price: 0, vendorId: '',
  });
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupMsg,    setSetupMsg]    = useState<string | null>(null);

  const [uberDispatching, setUberDispatching] = useState<string | null>(null);
  const [uberError, setUberError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const [r, s, req, p, vehRes] = await Promise.all([
        getShuttleRoutes(hotelId),
        getAllShuttleSlotsForHotel(hotelId),
        getShuttleRequests(hotelId),
        getPartners(hotelId),
        fetch(`/api/bouncie/vehicles?hotelId=${encodeURIComponent(hotelId)}`).then(r => r.json()).catch(() => ({ devices: [] })),
      ]);
      setRoutes(r);
      setSlots(s);
      setRequests(req);
      setPartners(p.filter(p => p.category === 'transport' || p.category === 'transportation'));
      const shuttle = (vehRes.devices || []).find((d: { is_shuttle: boolean }) => d.is_shuttle) || (vehRes.devices || [])[0];
      const loc = shuttle?.bouncie_locations?.[0];
      setShuttlePos(loc ? { lat: loc.lat, lng: loc.lng, speed_mph: loc.speed_mph ?? 0 } : null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Load failed'); }
    setLoading(false);
  }, [hotelId]);

  // Load today's driver schedules
  useEffect(() => {
    if (!hotelId) return;
    const today = todayStr();
    getStaffSchedulesRange(hotelId, today, today).then(schedules => {
      const driverSchedules = schedules.filter(s => {
        const staff = staffList.find(st => st.name === s.staff_name);
        return staff?.department === 'drivers' || staff?.role === 'driver' || s.role === 'driver';
      });
      setTodayDrivers(driverSchedules.map(s => ({
        id: s.id, name: s.staff_name,
        start_time: s.start_time, end_time: s.end_time,
      })));
    }).catch(() => {});
  }, [hotelId, staffList]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!hotelId) return;
    const ch = subscribeToShuttleRequests(hotelId, load);
    return () => { supabase.removeChannel(ch); };
  }, [hotelId, load]);

  const todaySlots = getTodaySlots(slots);
  const pendingReqs = requests.filter(r => r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress');

  // Pickup / dropoff presets
  const ARRIVAL_PICKUPS = ['Terminal 1', 'Terminal 2', 'Terminal 3', 'Terminal 4', 'Cruise Terminal', 'Port Everglades', 'Curbside', 'Other'];
  const DEPARTURE_DROPOFFS = ['MIA – Miami Intl', 'FLL – Fort Lauderdale', 'Port Everglades', 'Other'];

  const resetDispatch = () => {
    setDispatchForm({ guest_name: '', room_number: '', pax: 1, pickup_location: '', destination: '', time: nextAvailableHour(), notes: '', driver_id: '' });
    setDispatchType('arrival');
    setAssignMode('inhouse');
    setDispatchDone(false);
  };

  const handleDispatchSubmit = async () => {
    const { guest_name, room_number, pax, pickup_location, destination, time, notes, driver_id } = dispatchForm;
    if (!guest_name.trim() || !room_number.trim()) return;
    setDispatching(true);
    try {
      const pickup = dispatchType === 'arrival' ? pickup_location : 'Hotel Lobby';
      const dest   = dispatchType === 'departure' ? destination : 'Hotel';
      const req = await createShuttleRequest({
        hotel_id: hotelId,
        guest_name: guest_name.trim(),
        room_number: room_number.trim(),
        pickup_location: pickup,
        destination: dest,
        date: todayStr(),
        time: time || undefined,
        pax,
        notes: notes.trim(),
        status: assignMode === 'inhouse' && driver_id ? 'assigned' : 'pending',
        assigned_driver_id: assignMode === 'inhouse' && driver_id ? driver_id : undefined,
      });
      if (assignMode === 'uber' && req) {
        await fetch('/api/uber-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'dispatch', requestId: req.id, mode: 'transport' }),
        });
      }
      setDispatchDone(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dispatch failed');
    }
    setDispatching(false);
  };

  const handleUpdateRequest = async (id: string, status: string) => {
    await updateShuttleRequest(id, { status: status as ShuttleRequest['status'] });
    await load();
  };

  const handleUberDispatch = async (r: ShuttleRequest) => {
    setUberDispatching(r.id); setUberError(null);
    try {
      const res = await fetch('/api/uber-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch', requestId: r.id, mode: 'transport' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Dispatch failed');
      await load();
    } catch (e) { setUberError(e instanceof Error ? e.message : 'Uber dispatch failed'); }
    setUberDispatching(null);
  };

  const handleGenerateSchedule = async () => {
    if (!schedule.routeName.trim() || !schedule.fromTime || !schedule.toTime) return;
    setSetupSaving(true); setSetupMsg(null);
    try {
      const route = await createShuttleRoute({ hotel_id: hotelId, name: schedule.routeName.trim(), type: schedule.routeType, price: schedule.price });
      if (!route) throw new Error('Failed to create route');
      const [fh, fm] = schedule.fromTime.split(':').map(Number);
      const [th, tm] = schedule.toTime.split(':').map(Number);
      const fromMins = fh * 60 + fm, toMins = th * 60 + tm;
      let created = 0;
      for (let m = fromMins; m <= toMins; m += schedule.interval) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        await createShuttleSlot({ route_id: route.id, hotel_id: hotelId, departure_time: `${hh}:${mm}`, days_of_week: schedule.days, capacity: schedule.capacity });
        created++;
      }
      setSetupMsg(`✅ Schedule created — ${created} time slots (${fmt(schedule.fromTime)} – ${fmt(schedule.toTime)})`);
      await load();
    } catch (e) { setSetupMsg('❌ ' + (e instanceof Error ? e.message : 'Failed')); }
    setSetupSaving(false);
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Delete this route and ALL its time slots?')) return;
    await deleteShuttleRoute(id); await load();
  };
  const handleDeleteSlot = async (id: string) => { await deleteShuttleSlot(id); await load(); };

  // Timeline: filter requests for today
  const todayRequests = requests.filter(r => !r.date || r.date === todayStr());
  const filteredRequests = todayRequests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterDir !== 'all') {
      const isArrival = !r.destination || r.destination.toLowerCase().includes('hotel');
      if (filterDir === 'arrival' && !isArrival) return false;
      if (filterDir === 'departure' && isArrival) return false;
    }
    return true;
  });

  const currentHour = new Date().getHours();
  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am–11pm

  const driverName = (id: string) => todayDrivers.find(d => d.id === id)?.name || id;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900 flex items-center gap-2">
            <Bus size={20} style={{ color: TEAL }} /> Shuttle
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[12px] text-gray-400">
              {DAYS_FULL[todayDow()]}, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
            {pendingReqs.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                {pendingReqs.length} active
              </span>
            )}
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          {error} <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Quick Dispatch Bar */}
      <button onClick={() => { resetDispatch(); setShowDispatch(true); }}
        className="w-full mb-5 py-3.5 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        style={{ background: `linear-gradient(135deg, #0D9488 0%, #0F766E 100%)`, boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}>
        <Plus size={17} strokeWidth={2.5} /> New Pickup
      </button>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {([
          { key: 'today',    label: 'Today' },
          { key: 'requests', label: `Requests${pendingReqs.length > 0 ? ` (${pendingReqs.length})` : ''}` },
          ...(isAdmin ? [{ key: 'setup', label: '⚙ Setup' }] : []),
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: TEAL }} />
        </div>
      ) : (
        <>
          {/* ── TODAY — Hourly Timeline ── */}
          {tab === 'today' && (
            <div className="space-y-4">
              <BouncieLiveShuttle hotelId={hotelId} />

              {/* Trip estimator */}
              {shuttlePos && routes.filter(r => r.destination_lat && r.destination_lng).length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation size={14} style={{ color: TEAL }} />
                    <span className="text-[13px] font-bold text-gray-800">Trip Estimator</span>
                  </div>
                  <div className="space-y-2">
                    {routes.filter(r => r.destination_lat && r.destination_lng).map(route => {
                      const mi = distanceMiles(shuttlePos.lat, shuttlePos.lng, route.destination_lat!, route.destination_lng!);
                      const speed = shuttlePos.speed_mph > 2 ? shuttlePos.speed_mph : 30;
                      const mins = Math.round((mi / speed) * 60);
                      return (
                        <div key={route.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="text-[13px] font-semibold text-gray-900">{route.name}</p>
                            {route.destination_address && <p className="text-[11px] text-gray-400">{route.destination_address}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-[14px] font-extrabold" style={{ color: TEAL }}>~{mins} min</p>
                            <p className="text-[11px] text-gray-400">{mi.toFixed(1)} mi</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex gap-2 flex-wrap items-center">
                <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-full">
                  {(['all', 'pending', 'in_progress', 'completed'] as const).map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                      {s === 'all' ? 'All' : s === 'in_progress' ? 'En Route' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-full">
                  {(['all', 'arrival', 'departure'] as const).map(d => (
                    <button key={d} onClick={() => setFilterDir(d)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${filterDir === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                      {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hourly timeline */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {HOURS.map(h => {
                  const hourReqs = filteredRequests.filter(r => getReqHour(r) === h);
                  const isNow = h === currentHour;
                  return (
                    <div key={h} className={`flex items-start border-b border-gray-50 last:border-0 ${isNow ? 'bg-teal-50/40' : ''}`}>
                      {/* Hour label column */}
                      <div className={`w-14 shrink-0 text-right pr-3 pt-3 pb-3 text-[11px] font-semibold select-none ${isNow ? 'text-teal-600 font-bold' : 'text-gray-300'}`}>
                        {hourLabel(h)}
                      </div>
                      {/* Divider */}
                      <div className={`w-px self-stretch ${isNow ? 'bg-teal-300' : 'bg-gray-100'}`} />
                      {/* Content */}
                      <div className="flex-1 min-w-0 px-3 py-2 space-y-2">
                        {hourReqs.length === 0 ? (
                          <div className="h-6 flex items-center">
                            <div className="w-full h-px bg-gray-100" />
                          </div>
                        ) : (
                          hourReqs.map(r => (
                            <div key={r.id} className={`rounded-2xl border bg-white shadow-sm border-l-4 px-3 py-2.5 ${statusBorder[r.status] || 'border-l-gray-200'} border-gray-100`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[14px] font-bold text-gray-900 leading-snug">{r.guest_name}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColors[r.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                      {r.status.replace('_', ' ')}
                                    </span>
                                    {r.pax > 1 && <span className="text-[10px] text-gray-400 font-medium">{r.pax} pax</span>}
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-0.5">Rm {r.room_number} · <span className="text-gray-500">{r.pickup_location || '—'} → {r.destination || '—'}</span></p>
                                  {r.assigned_driver_id && (
                                    <p className="text-[11px] text-blue-500 font-medium mt-0.5 flex items-center gap-1">
                                      <User size={10} /> {driverName(r.assigned_driver_id)}
                                    </p>
                                  )}
                                  {r.uber_delivery_id && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Truck size={10} className="text-gray-400" />
                                      <span className="text-[11px] text-gray-500 font-medium capitalize">{r.uber_status?.replace(/_/g, ' ') || 'Uber dispatched'}</span>
                                      {r.uber_tracking_url && (
                                        <a href={r.uber_tracking_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-teal-600 flex items-center gap-0.5 ml-1">
                                          Track <ExternalLink size={9} />
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {r.notes && <p className="text-[11px] text-gray-400 italic mt-0.5">{r.notes}</p>}
                                </div>
                              </div>
                              {isAdmin && r.status !== 'completed' && r.status !== 'cancelled' && (
                                <div className="flex gap-1.5 mt-2 flex-wrap">
                                  {(r.status === 'pending' || r.status === 'assigned') && (
                                    <button onClick={() => handleUpdateRequest(r.id, 'in_progress')}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 hover:bg-teal-100">
                                      En Route
                                    </button>
                                  )}
                                  <button onClick={() => handleUpdateRequest(r.id, 'completed')}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                                    Complete
                                  </button>
                                  <button onClick={() => handleUpdateRequest(r.id, 'cancelled')}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-50 text-gray-400 hover:bg-gray-100">
                                    Cancel
                                  </button>
                                  {!r.uber_delivery_id && !r.assigned_driver_id && (
                                    <button onClick={() => handleUberDispatch(r)} disabled={uberDispatching === r.id}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-black text-white flex items-center gap-1 disabled:opacity-50">
                                      <Truck size={10} /> {uberDispatching === r.id ? '…' : 'Uber'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scheduled runs for today */}
              {todaySlots.length > 0 && (
                <div>
                  <h2 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Scheduled Runs</h2>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {todaySlots.map(slot => (
                      <SlotRow key={slot.id} slot={slot} isAdmin={isAdmin} onRefresh={load} />
                    ))}
                  </div>
                </div>
              )}

              {uberError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">⚠️ {uberError}</div>
              )}
            </div>
          )}

          {/* ── REQUESTS ── */}
          {tab === 'requests' && (
            <div className="space-y-3">
              {uberError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700 font-medium">⚠️ {uberError}</div>
              )}
              {requests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                  <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-[14px] font-semibold text-gray-600">No shuttle requests</p>
                </div>
              ) : (
                requests.map(r => (
                  <div key={r.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-l-4 ${statusBorder[r.status] || 'border-l-gray-200'}`}>
                    <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[15px] font-bold text-gray-900">{r.guest_name}</p>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${statusColors[r.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[12px] text-gray-400">Room {r.room_number} · {r.pax} {r.pax === 1 ? 'guest' : 'guests'}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin size={11} className="text-gray-300 shrink-0" />
                          <p className="text-[12px] text-gray-700 font-medium">{r.pickup_location || r.destination}</p>
                          {r.pickup_location && r.destination && <span className="text-gray-400 text-[11px]">→ {r.destination}</span>}
                        </div>
                        {(r.date || r.time) && (
                          <p className="text-[11px] text-gray-400 mt-0.5">{r.date}{r.time ? ` at ${fmt(r.time)}` : ''}</p>
                        )}
                        {r.assigned_driver_id && (
                          <p className="text-[11px] text-blue-500 font-medium mt-0.5 flex items-center gap-1">
                            <User size={10} /> {driverName(r.assigned_driver_id)}
                          </p>
                        )}
                        {r.notes && <p className="text-[11px] text-gray-400 italic mt-1">{r.notes}</p>}
                      </div>
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
                    {r.status !== 'completed' && r.status !== 'cancelled' && (
                      !r.uber_delivery_id ? (
                        <button onClick={() => handleUberDispatch(r)} disabled={uberDispatching === r.id}
                          className="mt-2 w-full py-2 rounded-xl text-white font-bold text-[12px] bg-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
                          <Truck size={13} />
                          {uberDispatching === r.id ? 'Dispatching…' : 'Send Uber Driver'}
                        </button>
                      ) : (
                        <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                          <Truck size={13} className="text-black shrink-0" />
                          <span className="text-[12px] font-bold text-gray-700 capitalize">{r.uber_status?.replace(/_/g, ' ') || 'Dispatched'}</span>
                          {r.uber_tracking_url && (
                            <a href={r.uber_tracking_url} target="_blank" rel="noopener noreferrer"
                              className="ml-auto text-[11px] font-bold text-teal-600 flex items-center gap-1">
                              Track <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      )
                    )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── SETUP (admin) ── */}
          {tab === 'setup' && isAdmin && (
            <div className="space-y-5">
              {setupMsg && (
                <div className={`text-[13px] rounded-xl px-4 py-3 flex items-center justify-between border ${setupMsg.startsWith('✅') ? 'bg-teal-50 border-teal-100 text-teal-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
                  {setupMsg}
                  <button onClick={() => setSetupMsg(null)}><X size={14} /></button>
                </div>
              )}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-[15px] font-bold mb-1 flex items-center gap-2">
                  <Settings size={15} style={{ color: TEAL }} /> Create a Schedule
                </h2>
                <p className="text-[12px] text-gray-400 mb-4">Set your hours and interval — slots generate automatically.</p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Schedule Name</label>
                      <input value={schedule.routeName} onChange={e => setSchedule(s => ({ ...s, routeName: e.target.value }))}
                        placeholder="e.g. Hotel Shuttle, Airport Run"
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Type</label>
                      <select value={schedule.routeType} onChange={e => setSchedule(s => ({ ...s, routeType: e.target.value }))}
                        className="bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100 h-full">
                        <option value="custom">🚐 General</option>
                        <option value="airport">✈️ Airport</option>
                        <option value="cruise">🚢 Cruise</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Start Time</label>
                      <input type="time" value={schedule.fromTime} onChange={e => setSchedule(s => ({ ...s, fromTime: e.target.value }))}
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">End Time</label>
                      <input type="time" value={schedule.toTime} onChange={e => setSchedule(s => ({ ...s, toTime: e.target.value }))}
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Every</label>
                      <select value={schedule.interval} onChange={e => setSchedule(s => ({ ...s, interval: parseInt(e.target.value) }))}
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100">
                        <option value={30}>30 min</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>90 min</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Days of Week</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS_SHORT.map((d, i) => (
                        <button key={i} onClick={() => setSchedule(s => ({ ...s, days: s.days.includes(i) ? s.days.filter(x => x !== i) : [...s.days, i] }))}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${schedule.days.includes(i) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>
                          {d}
                        </button>
                      ))}
                      <button onClick={() => setSchedule(s => ({ ...s, days: s.days.length === 7 ? [] : [0,1,2,3,4,5,6] }))}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-400 hover:border-gray-400">
                        {schedule.days.length === 7 ? 'None' : 'All'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Capacity per Run</label>
                      <input type="number" min={0} value={schedule.capacity} onChange={e => setSchedule(s => ({ ...s, capacity: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100 text-center" />
                      <p className="text-[10px] text-gray-400 mt-0.5">0 = unlimited</p>
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Price per Person ($)</label>
                      <input type="number" min={0} step={0.50} value={schedule.price || ''} placeholder="0"
                        onChange={e => setSchedule(s => ({ ...s, price: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100 text-center" />
                      <p className="text-[10px] text-gray-400 mt-0.5">0 = complimentary</p>
                    </div>
                  </div>
                  {partners.length > 0 && (
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Transport Vendor (optional)</label>
                      <select value={schedule.vendorId} onChange={e => setSchedule(s => ({ ...s, vendorId: e.target.value }))}
                        className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100">
                        <option value="">— No vendor linked —</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                  {schedule.fromTime && schedule.toTime && schedule.interval && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3 text-[12px] text-gray-600">
                      <span className="font-bold text-gray-700">Preview: </span>
                      {(() => {
                        const [fh, fm] = schedule.fromTime.split(':').map(Number);
                        const [th, tm] = schedule.toTime.split(':').map(Number);
                        const count = Math.floor(((th * 60 + tm) - (fh * 60 + fm)) / schedule.interval) + 1;
                        return `${count > 0 ? count : 0} slots · ${fmt(schedule.fromTime)} to ${fmt(schedule.toTime)} · every ${schedule.interval < 60 ? `${schedule.interval}min` : `${schedule.interval / 60}hr`} · ${schedule.days.length} day${schedule.days.length !== 1 ? 's' : ''}/week`;
                      })()}
                    </div>
                  )}
                  <button onClick={handleGenerateSchedule} disabled={setupSaving || !schedule.routeName.trim() || schedule.days.length === 0}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] disabled:opacity-50 transition-colors" style={{ backgroundColor: TEAL }}>
                    {setupSaving ? 'Generating…' : '🚐 Generate Schedule'}
                  </button>
                </div>
              </div>

              {routes.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">Active Schedules</h2>
                  {routes.map(route => (
                    <RouteCard key={route.id} route={route}
                      slots={slots.filter(s => s.route_id === route.id).sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || ''))}
                      onDelete={() => handleDeleteRoute(route.id)}
                      onDeleteSlot={handleDeleteSlot}
                      onSaved={load}
                    />
                  ))}
                </div>
              )}

              {partners.length === 0 && (
                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-[13px] text-teal-700">
                  <p className="font-bold mb-1">💡 Want to connect a transport vendor?</p>
                  <p className="text-[12px] text-teal-600">Add a transport company as a partner in the Partners section.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Dispatch Bottom Sheet ── */}
      {showDispatch && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white py-3 px-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-gray-900">New Pickup</h2>
              <button onClick={() => { setShowDispatch(false); resetDispatch(); }}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            {dispatchDone ? (
              <div className="p-8 text-center">
                <CheckCircle size={48} className="mx-auto mb-3" style={{ color: TEAL }} />
                <p className="text-[17px] font-bold text-gray-900 mb-1">Pickup logged!</p>
                <p className="text-[13px] text-gray-500 mb-6">Appears on the timeline above.</p>
                <div className="flex gap-3">
                  <button onClick={() => { resetDispatch(); }}
                    className="flex-1 py-3 rounded-2xl text-white font-bold text-[14px]" style={{ backgroundColor: TEAL }}>
                    + Another
                  </button>
                  <button onClick={() => { setShowDispatch(false); resetDispatch(); }}
                    className="flex-1 py-3 rounded-2xl bg-gray-100 font-bold text-[14px] text-gray-700">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 space-y-2.5">
                {/* Trip type toggle */}
                <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                  {(['arrival', 'departure'] as const).map(t => (
                    <button key={t} onClick={() => { setDispatchType(t); setDispatchForm(f => ({ ...f, pickup_location: '', destination: '' })); }}
                      className={`flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all ${dispatchType === t ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}>
                      {t === 'arrival' ? '✈️ Arrival → Hotel' : '🚗 Hotel → Out'}
                    </button>
                  ))}
                </div>

                {/* Guest + Room + Pax in one row */}
                <div className="flex gap-1.5">
                  <input value={dispatchForm.guest_name} onChange={e => setDispatchForm(f => ({ ...f, guest_name: e.target.value }))}
                    placeholder="Guest name" className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100 focus:outline-none focus:border-teal-300" />
                  <input value={dispatchForm.room_number} onChange={e => setDispatchForm(f => ({ ...f, room_number: e.target.value }))}
                    placeholder="Rm" className="w-14 bg-gray-50 rounded-lg px-2 py-2 text-[13px] border border-gray-100 text-center focus:outline-none focus:border-teal-300" />
                  <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-100 rounded-lg px-1.5">
                    <button onClick={() => setDispatchForm(f => ({ ...f, pax: Math.max(1, f.pax - 1) }))}
                      className="w-5 h-5 rounded text-gray-500 text-[14px] font-bold flex items-center justify-center hover:bg-gray-200">−</button>
                    <span className="text-[12px] font-bold text-gray-900 w-4 text-center">{dispatchForm.pax}</span>
                    <button onClick={() => setDispatchForm(f => ({ ...f, pax: f.pax + 1 }))}
                      className="w-5 h-5 rounded text-white text-[14px] font-bold flex items-center justify-center" style={{ backgroundColor: TEAL }}>+</button>
                  </div>
                </div>

                {/* Pickup location chips */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {dispatchType === 'arrival' ? 'Pickup' : 'Dropoff'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(dispatchType === 'arrival' ? ARRIVAL_PICKUPS : DEPARTURE_DROPOFFS).map(loc => {
                      const active = dispatchType === 'arrival' ? dispatchForm.pickup_location === loc : dispatchForm.destination === loc;
                      return (
                        <button key={loc} onClick={() => setDispatchForm(f => dispatchType === 'arrival' ? { ...f, pickup_location: loc } : { ...f, destination: loc })}
                          className={`px-2 py-1 rounded-full text-[11px] font-semibold border transition-all ${active ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                          {loc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time + Notes side by side */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Time</p>
                    <input type="time" value={dispatchForm.time} onChange={e => setDispatchForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100 focus:outline-none focus:border-teal-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Flight / Notes</p>
                    <input value={dispatchForm.notes} onChange={e => setDispatchForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="AA123, notes…" className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100 focus:outline-none focus:border-teal-300" />
                  </div>
                </div>

                {/* Assign To */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Assign To</p>
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg mb-1.5">
                    {(['inhouse', 'uber'] as const).map(m => (
                      <button key={m} onClick={() => setAssignMode(m)}
                        className={`flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all ${assignMode === m ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}>
                        {m === 'inhouse' ? '👤 In-House Driver' : '🚗 Send Uber'}
                      </button>
                    ))}
                  </div>
                  {assignMode === 'inhouse' && (
                    <select value={dispatchForm.driver_id} onChange={e => setDispatchForm(f => ({ ...f, driver_id: e.target.value }))}
                      className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100 focus:outline-none focus:border-teal-300">
                      <option value="">— No driver assigned —</option>
                      {todayDrivers.length > 0 ? (
                        todayDrivers.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} · {fmt(d.start_time)}{d.end_time ? `–${fmt(d.end_time)}` : ''}
                          </option>
                        ))
                      ) : (
                        <option disabled value="">No drivers scheduled today</option>
                      )}
                    </select>
                  )}
                  {assignMode === 'uber' && (
                    <p className="text-[12px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      Uber will be dispatched immediately on submit.
                    </p>
                  )}
                </div>

                <button onClick={handleDispatchSubmit}
                  disabled={dispatching || !dispatchForm.guest_name.trim() || !dispatchForm.room_number.trim()}
                  className="w-full py-3 rounded-2xl text-white font-bold text-[14px] disabled:opacity-50 active:scale-[0.98] transition-all"
                  style={{ background: `linear-gradient(135deg, #0D9488 0%, #0F766E 100%)`, boxShadow: '0 4px 14px rgba(13,148,136,0.3)' }}>
                  {dispatching ? 'Logging…' : assignMode === 'uber' ? '🚗 Dispatch Uber' : '✅ Log Pickup'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
