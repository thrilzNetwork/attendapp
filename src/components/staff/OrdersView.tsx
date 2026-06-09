'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, MessageSquare, X as XIcon } from 'lucide-react';
import { supabase, getHotelConfig } from '@/lib/supabase';

/* ── Types ─────────────────────────────────────────────── */
interface Request {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
  assigned_to?: string;
}

interface Message {
  id: string;
  guest_name: string;
  room: string;
  sender: string;
  body: string;
  created_at: string;
}

/* ── Constants ─────────────────────────────────────────── */
const TEAL = '#0D9488';

/* ── Props ─────────────────────────────────────────────── */
interface OrdersViewProps {
  requests: Request[];
  messages: Message[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

/* ── Orders View ──────────────────────────────────────── */
function OrdersView({
  requests: initialRequests, messages, onStatusChange, onRefresh,
}: OrdersViewProps) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  useEffect(() => { setRequests(initialRequests); }, [initialRequests]);
  const [statusTab, setStatusTab] = useState<'active' | 'completed' | 'messages'>('active');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [typeFilter, setTypeFilter] = useState<'All' | 'Food' | 'Transport' | 'Amenities' | 'Other'>('All');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [transportSubFilter, setTransportSubFilter] = useState<'all' | 'airport' | 'cruise'>('all');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expanded, setExpanded] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [assignForm, setAssignForm] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ guest_name: '', room: '', type: 'Other', details: '', step: 'category' });

  // Guest messages (sender=guest only, most recent first)
  const guestMessages = messages.filter(m => m.sender === 'guest')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const checkTypeOrDetails = (r: Request, keywords: string[]) =>
    keywords.some(kw => r.type?.toLowerCase().includes(kw) || r.details?.toLowerCase().includes(kw));

  const isFood = (r: Request) =>
    checkTypeOrDetails(r, ['food_order', 'order', 'restaurant', 'food', 'burger', 'pizza', 'menu', 'delivery']);
  const isTransport = (r: Request) =>
    checkTypeOrDetails(r, ['transport', 'shuttle', 'taxi', 'uber', 'ride', 'pickup', 'dropoff']);

  const isAirport = (r: Request) =>
    isTransport(r) && r.details?.toLowerCase().includes('airport');
  const isCruise = (r: Request) =>
    isTransport(r) && r.details?.toLowerCase().includes('cruise');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isCheckinRequest = (r: Request) =>
    r.type?.toLowerCase().includes('check-in') || r.type?.toLowerCase().includes('checkin');

  const isAmenity = (r: Request) =>
    checkTypeOrDetails(r, ['amenity', 'towel', 'housekeep', 'clean', 'water', 'bottle', 'toilet', 'soap', 'shampoo']);

  const filtered = requests.filter(r => {
    if (typeFilter === 'All') return true;
    if (typeFilter === 'Food') return isFood(r);
    if (typeFilter === 'Transport') {
      if (transportSubFilter === 'airport') return isAirport(r);
      if (transportSubFilter === 'cruise') return isCruise(r);
      return isTransport(r);
    }
    if (typeFilter === 'Amenities') return isAmenity(r);
    return !isFood(r) && !isTransport(r) && !isAmenity(r);
  });

  const active = filtered.filter(r => r.status !== 'completed');
  const completed = filtered.filter(r => r.status === 'completed');
  const visible = statusTab === 'active' ? active : completed;

  const FILTERS: Array<{ key: 'All' | 'Food' | 'Transport' | 'Amenities' | 'Other'; label: string }> = [
    { key: 'All', label: 'All' },
    { key: 'Food', label: '🍴 Food' },
    { key: 'Transport', label: '🚗 Transport' },
    { key: 'Amenities', label: '🛁 Amenities' },
    { key: 'Other', label: '📋 Other' },
  ];

  const handleCreateRequest = async () => {
    if (!createForm.guest_name.trim() || !createForm.room.trim()) return;
    const hotelSlug = localStorage.getItem('attenda_hotel_slug');
    const cfg = await getHotelConfig(hotelSlug || undefined);
    await supabase.from('requests').insert({
      hotel_id: cfg?.id,
      guest_name: createForm.guest_name.trim(),
      room: createForm.room.trim(),
      type: createForm.type,
      details: createForm.details.trim() || createForm.type,
      status: 'pending',
    });
    setShowCreateModal(false);
    setCreateForm({ guest_name: '', room: '', type: 'Other', details: '', step: 'category' });
    onRefresh();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Live Orders</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-90 transition-opacity" style={{ backgroundColor: TEAL }}>
            <Plus size={16} /> New Request
          </button>
          <button onClick={onRefresh} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
        {[
          { label: 'Pending', count: filtered.filter(r => r.status === 'pending').length, color: 'text-amber-600' },
          { label: 'In Progress', count: filtered.filter(r => r.status === 'in-progress').length, color: 'text-blue-600' },
          { label: 'Completed', count: filtered.filter(r => r.status === 'completed').length, color: 'text-emerald-600' },
          { label: 'Messages', count: guestMessages.length, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p>
            <p className={`text-[28px] font-extrabold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Type filter bar */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
              typeFilter === f.key
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            style={typeFilter === f.key ? { backgroundColor: TEAL } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transport sub-tabs */}
      {typeFilter === 'Transport' && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
          {[
            { key: 'all' as const, label: 'All Transport' },
            { key: 'airport' as const, label: '✈️ Airport' },
            { key: 'cruise' as const, label: '🚢 Cruise' },
          ].map(sub => (
            <button
              key={sub.key}
              onClick={() => setTransportSubFilter(sub.key)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                transportSubFilter === sub.key
                  ? 'text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
              style={transportSubFilter === sub.key ? { backgroundColor: TEAL } : {}}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Active/Completed/Messages tabs */}
      <div className="flex gap-2 mb-4">
        {(['active', 'completed', 'messages'] as const).map(t => (
          <button key={t} onClick={() => setStatusTab(t)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              statusTab === t ? 'bg-white border border-gray-200 text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {t === 'active' ? `Active (${active.length})` : t === 'completed' ? `Completed (${completed.length})` : `💬 Messages (${guestMessages.length})`}
          </button>
        ))}
      </div>

      {/* Messages feed */}
      {statusTab === 'messages' && (
        <div className="space-y-3">
          {guestMessages.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-[13px] text-gray-500">No guest messages yet.</p>
            </div>
          ) : guestMessages.map(msg => (
            <div key={msg.id} className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">💬 Guest Message</span>
                    <span className="text-[11px] text-gray-400">• {new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[14px] font-bold text-gray-900 mb-0.5">{msg.guest_name} — Room {msg.room}</p>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{msg.body}</p>
                </div>
                <a href="/staff?tab=messages" className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-600 hover:bg-purple-100 whitespace-nowrap">
                  Reply →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {statusTab !== 'messages' && <div className="grid grid-cols-2 gap-3">
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <p className="text-[13px] text-gray-500">
              {statusTab === 'active' ? 'No active orders.' : 'No completed orders.'}
            </p>
          </div>
        ) : visible.map(req => {
                  const foodOrder = isFood(req);
                  const typeIcon = foodOrder ? '🍴' : isTransport(req) ? (isAirport(req) ? '✈️' : '🚢') : isAmenity(req) ? '🧹' : '📋';
                  const statusColor = req.status === 'pending' ? '#F59E0B' : req.status === 'in-progress' ? '#3B82F6' : '#10B981';
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const statusLabel = req.status === 'pending' ? 'PENDING' : req.status === 'in-progress' ? 'ACTIVE' : 'DONE';
                  const bgGradient = req.status === 'pending'
                    ? 'from-amber-50 to-amber-100/60 border-amber-200'
                    : req.status === 'in-progress'
                    ? 'from-blue-50 to-blue-100/60 border-blue-200'
                    : 'from-emerald-50 to-emerald-100/60 border-emerald-200';
                  const btnClass = req.status === 'pending'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : req.status === 'in-progress'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'text-gray-400';

                  return (
                  <div key={req.id} className={`bg-gradient-to-br ${bgGradient} rounded-2xl border-2 p-4 shadow-sm relative min-h-[140px] flex flex-col justify-between`}>
                    {/* Top row: type badge + status dot */}
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg leading-none">{typeIcon}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{req.type}</span>
                        {req.assigned_to && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 text-gray-600">
                            👤 {req.assigned_to}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: statusColor }} />
                      </div>
                    </div>

                    {/* Guest info — big & readable */}
                    <div className="flex-1">
                      <p className="text-[16px] font-extrabold text-gray-900 leading-tight">{req.guest_name}</p>
                      <p className="text-[13px] font-semibold text-gray-600">Room {req.room}</p>
                      {req.details && req.details !== req.type && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{req.details}</p>
                      )}
                    </div>

                    {/* Action button — big, square, one-tap */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (req.status === 'pending') {
                          setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'in-progress' } : r));
                          await onStatusChange(req.id, 'in-progress');
                        } else if (req.status === 'in-progress') {
                          setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'completed' } : r));
                          await onStatusChange(req.id, 'completed');
                        }
                      }}
                      className={`w-full mt-2 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97] shadow-sm ${btnClass}`}
                    >
                      {req.status === 'pending' ? '▶ Accept' : req.status === 'in-progress' ? '✓ Complete' : '✓ Done'}
                    </button>

                    {/* Cancel on completed */}
                    {req.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Re-open this request?')) {
                            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'pending' } : r));
                            onStatusChange(req.id, 'pending');
                          }
                        }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/60 flex items-center justify-center text-[10px] text-red-400 hover:text-red-600 hover:bg-white"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                );})}
      </div>}

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-bold text-gray-900">New Request</h3>
                <p className="text-[12px] text-gray-400">Tap a category to start</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200"><XIcon size={16} /></button>
            </div>

            {/* Step 1: POS-style grid */}
            {createForm.step === 'category' && (
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'Food Order',         icon: '🍴', label: 'Food Order',     color: 'bg-orange-50 border-orange-200 hover:bg-orange-100', iconBg: 'bg-orange-100 text-orange-600' },
                    { key: 'Airport Shuttle',     icon: '✈️', label: 'Airport Shuttle', color: 'bg-sky-50 border-sky-200 hover:bg-sky-100',     iconBg: 'bg-sky-100 text-sky-600' },
                    { key: 'Cruise Shuttle',      icon: '🚢', label: 'Cruise Shuttle',  color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',    iconBg: 'bg-blue-100 text-blue-600' },
                    { key: 'Housekeeping',        icon: '🧹', label: 'Housekeeping',    color: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100', iconBg: 'bg-emerald-100 text-emerald-600' },
                    { key: 'Maintenance',         icon: '🔧', label: 'Maintenance',     color: 'bg-amber-50 border-amber-200 hover:bg-amber-100', iconBg: 'bg-amber-100 text-amber-600' },
                    { key: 'Amenity',             icon: '🛁', label: 'Amenity',         color: 'bg-purple-50 border-purple-200 hover:bg-purple-100', iconBg: 'bg-purple-100 text-purple-600' },
                  ].map(cat => (
                    <button key={cat.key} onClick={() => setCreateForm({ ...createForm, type: cat.key, step: 'details' })}
                      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-5 transition-all active:scale-95 ${cat.color}`}
                      style={{ minHeight: 100 }}
                    >
                      <span className="text-3xl leading-none">{cat.icon}</span>
                      <span className="text-[12px] font-bold text-gray-700 text-center leading-tight">{cat.label}</span>
                    </button>
                  ))}
                  <button onClick={() => setCreateForm({ ...createForm, type: 'Other', step: 'details' })}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 p-5 bg-gray-50 hover:bg-gray-100 transition-all active:scale-95"
                    style={{ minHeight: 100 }}
                  >
                    <span className="text-3xl leading-none">📋</span>
                    <span className="text-[12px] font-bold text-gray-500 text-center leading-tight">Other</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Guest details */}
            {createForm.step === 'details' && (
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setCreateForm({ ...createForm, step: 'category', type: '', guest_name: '', room: '', details: '' })} className="text-[12px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    ← Back
                  </button>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{createForm.type}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={createForm.guest_name} onChange={e => setCreateForm({ ...createForm, guest_name: e.target.value })}
                    placeholder="Guest name *" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[16px] border border-gray-100 outline-none focus:border-teal-400" />
                  <input value={createForm.room} onChange={e => setCreateForm({ ...createForm, room: e.target.value })}
                    placeholder="Room *" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[16px] border border-gray-100 outline-none focus:border-teal-400" />
                </div>
                <textarea value={createForm.details} onChange={e => setCreateForm({ ...createForm, details: e.target.value })}
                  placeholder="Details (optional)" rows={3} className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 outline-none resize-none focus:border-teal-400" />
                <button onClick={handleCreateRequest} disabled={!createForm.guest_name.trim() || !createForm.room.trim()}
                  className="w-full py-4 rounded-2xl text-white text-[16px] font-bold disabled:opacity-40 hover:opacity-90 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: TEAL }}>
                  <Plus size={18} className="inline mr-1.5" /> Submit {createForm.type}
                </button>
              </div>
            )}

            {/* Step 3: Quick-add presets */}
            {createForm.step === 'quick' && (
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setCreateForm({ ...createForm, step: 'category' })} className="text-[12px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    ← Categories
                  </button>
                  <span className="text-[11px] font-bold text-gray-500">Quick Add</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Fresh Towels', 'Extra Pillows', 'Water Bottles', 'Toiletries', 'Wake Up Call', 'Late Checkout'].map(preset => (
                    <button key={preset} onClick={async () => {
                      const hotelSlug = localStorage.getItem('attenda_hotel_slug');
                      const cfg = await getHotelConfig(hotelSlug || undefined);
                      await supabase.from('requests').insert({
                        hotel_id: cfg?.id,
                        guest_name: createForm.guest_name,
                        room: createForm.room,
                        type: 'Amenity',
                        details: preset,
                        status: 'pending',
                      });
                      setShowCreateModal(false);
                      setCreateForm({ guest_name: '', room: '', type: 'Other', details: '', step: 'category' });
                      onRefresh();
                    }}
                      className="text-left px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[13px] font-semibold text-gray-700 hover:bg-gray-100 transition-all active:scale-95"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersView;