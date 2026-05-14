'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell, MessageSquare, Bus, Settings, Users,
  LogOut, RefreshCw, Plus, Trash2, Eye, EyeOff, Save,
  Wifi, Hotel as HotelIcon, ExternalLink, ImageIcon, type LucideIcon,
  Store, QrCode as QrCodeIcon, Building2, Copy, Check, ChevronDown, ChevronUp,
  UtensilsCrossed, UserPlus,
} from 'lucide-react';
import {
  supabase, subscribeToRequests, updateRequestStatus, deleteRequest,
  getHotelConfig, updateHotelConfig, HotelConfig,
  getStaffAccounts, createStaffAccount, deleteStaffAccount, StaffAccount,
  getPartners, createPartner, deletePartner, Partner,
  getPartnerMenuItems, createPartnerMenuItem, deletePartnerMenuItem, PartnerMenuItem,
  getQrCodes, createQrCode, deleteQrCode, QrCode as QrCodeRow,
  getAllHotels, createHotel,
} from '@/lib/supabase';

/* ── Types ─────────────────────────────────────────────── */
type Role = 'admin' | 'staff' | 'superadmin';
type NavTab =
  | 'orders' | 'messages' | 'shuttle'
  | 'hotel' | 'staff_mgmt'
  | 'partners' | 'qrcodes' | 'properties';

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

interface Session {
  name: string;
  role: Role;
}

/* ── Constants ─────────────────────────────────────────── */
const ADMIN_PIN = '2025';
const SUPERADMIN_PIN = '9999';
const TEAL = '#0D9488';

const NAV: { tab: NavTab; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { tab: 'orders',      label: 'Live Orders',       icon: Bell,            roles: ['admin', 'staff', 'superadmin'] },
  { tab: 'messages',    label: 'Guest Messages',     icon: MessageSquare,   roles: ['admin', 'staff', 'superadmin'] },
  { tab: 'shuttle',     label: 'Shuttle Schedule',   icon: Bus,             roles: ['admin', 'staff', 'superadmin'] },
  { tab: 'hotel',       label: 'Hotel Settings',     icon: Settings,        roles: ['admin', 'superadmin'] },
  { tab: 'staff_mgmt',  label: 'Staff Management',   icon: Users,           roles: ['admin', 'superadmin'] },
  { tab: 'partners',    label: 'Partners & Menu',    icon: Store,           roles: ['admin', 'superadmin'] },
  { tab: 'qrcodes',     label: 'QR Codes',           icon: QrCodeIcon,      roles: ['admin', 'superadmin'] },
  { tab: 'properties',  label: 'All Properties',     icon: Building2,       roles: ['superadmin'] },
];

/* ── Main Component ───────────────────────────────────── */
export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<NavTab>('orders');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [requests, setRequests] = useState<Request[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [staff, setStaff] = useState<StaffAccount[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
  }, []);

  const handleLogin = async () => {
    setPinError('');
    if (pin === SUPERADMIN_PIN) {
      setSession({ name: 'Super Admin', role: 'superadmin' });
      return;
    }
    if (pin === ADMIN_PIN) {
      setSession({ name: 'Admin', role: 'admin' });
      return;
    }
    const { data } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('pin_code', pin)
      .eq('active', true)
      .single();
    if (data) {
      setSession({ name: data.name, role: data.role === 'manager' ? 'admin' : 'staff' });
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPin('');
    }
  };

  const reload = useCallback(async (role: Role) => {
    // Always load config first so we can filter by hotel
    const cfg = await getHotelConfig();
    if (cfg) setConfig(cfg);
    const hotelId = cfg?.id;

    const [req, msg] = await Promise.all([
      hotelId
        ? supabase.from('requests').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false })
        : supabase.from('requests').select('*').order('created_at', { ascending: false }),
      hotelId
        ? supabase.from('messages').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false })
        : supabase.from('messages').select('*').order('created_at', { ascending: false }),
    ]);
    if (req.data) setRequests(req.data);
    if (msg.data) setMessages(msg.data);

    if (role === 'admin' || role === 'superadmin') {
      setStaff(await getStaffAccounts());
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    reload(session.role);
    const ch = subscribeToRequests(() => { reload(session.role); });
    return () => { supabase.removeChannel(ch); };
  }, [session, reload]);

  /* ── Login screen ─────────────────────────────────── */
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
            <HotelIcon size={28} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">Staff Access</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Enter your PIN to continue</p>
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="PIN"
            maxLength={6}
            className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] border border-gray-100 focus:outline-none text-center tracking-[0.3em] font-mono mb-2"
          />
          {pinError && <p className="text-red-500 text-[12px] text-center mb-2">{pinError}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px]"
            style={{ backgroundColor: TEAL }}
          >
            ACCESS DASHBOARD
          </button>
          <p className="text-center mt-4 text-[12px] text-gray-400">
            Platform admin?{' '}
            <a href="/superadmin" className="font-semibold underline" style={{ color: TEAL }}>Sign in with Google →</a>
          </p>
        </div>
      </div>
    );
  }

  /* ── Dashboard ────────────────────────────────────── */
  const visibleNav = NAV.filter(n => n.roles.includes(session.role));
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const isAdmin = session.role === 'admin' || session.role === 'superadmin';

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">

      {/* ── Mobile top bar ──────────────────────────── */}
      <header className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[15px] font-bold text-gray-900 leading-tight">{config?.name || 'Attenda'}</p>
            <p className="text-[11px] text-gray-500">{session.name} ·{' '}
              <span className={`font-semibold ${session.role === 'superadmin' ? 'text-purple-600' : session.role === 'admin' ? 'text-teal-600' : 'text-blue-600'}`}>
                {session.role === 'superadmin' ? 'Super Admin' : session.role === 'admin' ? 'Admin' : 'Staff'}
              </span>
            </p>
          </div>
          <button
            onClick={() => { setSession(null); setPin(''); setTab('orders'); }}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
        {/* Scrollable tab strip */}
        <div className="flex overflow-x-auto no-scrollbar border-t border-gray-100 bg-gray-50">
          {visibleNav.map(item => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`relative shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap ${
                tab === item.tab ? 'text-white' : 'text-gray-500'
              }`}
              style={tab === item.tab ? { backgroundColor: TEAL } : {}}
            >
              <item.icon size={13} />
              {item.label}
              {item.tab === 'orders' && pendingCount > 0 && (
                <span className="bg-amber-400 text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="hidden md:flex w-[230px] bg-[#F3F4F6] flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div className="px-5 pt-5 pb-4">
          <div className="inline-flex items-center justify-center w-10 h-6 rounded mb-2" style={{ backgroundColor: `${TEAL}20` }}>
            <span className="text-[10px] font-bold" style={{ color: TEAL }}>A</span>
          </div>
          <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
            {config?.name || 'Attenda Hotel'}
          </h2>
          <p className="text-[12px] text-gray-500">
            {config?.slug ? `@${config.slug}` : 'Dashboard'}
          </p>
        </div>

        <div className="px-5 py-3 border-t border-gray-200/60">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Logged in as</p>
          <p className="text-[14px] font-semibold text-gray-900">{session.name}</p>
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
            session.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
            session.role === 'admin' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {session.role === 'superadmin' ? 'Super Admin' : session.role === 'admin' ? 'Admin' : 'Staff'}
          </span>
        </div>

        <nav className="px-3 py-3 flex-1">
          {visibleNav.map(item => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors text-left mb-0.5 ${
                tab === item.tab ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'
              }`}
              style={tab === item.tab ? { backgroundColor: TEAL } : {}}
            >
              <item.icon size={15} />
              {item.label}
              {item.tab === 'orders' && pendingCount > 0 && (
                <span className="ml-auto bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {config?.googleSheetUrl && (
          <div className="px-4 pb-3">
            <a href={config.googleSheetUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-teal-600 transition-colors">
              <ExternalLink size={11} /> Operations Sheet
            </a>
          </div>
        )}

        <div className="p-4 border-t border-gray-200/60">
          <button
            onClick={() => { setSession(null); setPin(''); setTab('orders'); }}
            className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-[#FAFAFA]">
        {tab === 'orders' && (
          <OrdersView
            requests={requests}
            onStatusChange={async (id, s) => { await updateRequestStatus(id, s); reload(session.role); }}
            onDelete={async id => { await deleteRequest(id); reload(session.role); }}
            onRefresh={() => reload(session.role)}
          />
        )}
        {tab === 'messages' && <MessagesView messages={messages} />}
        {tab === 'shuttle' && (
          <ShuttleView
            sheetUrl={config?.googleSheetUrl}
            isAdmin={isAdmin}
            onGoToSettings={() => setTab('hotel')}
          />
        )}
        {tab === 'hotel' && isAdmin && config && (
          <HotelSettingsView
            config={config}
            onSaved={async () => { const c = await getHotelConfig(); if (c) setConfig(c); }}
          />
        )}
        {tab === 'staff_mgmt' && isAdmin && (
          <StaffView staff={staff} onRefresh={async () => setStaff(await getStaffAccounts())} />
        )}
        {tab === 'partners' && isAdmin && config?.id && (
          <PartnersView hotelId={config.id} />
        )}
        {tab === 'qrcodes' && isAdmin && config?.id && config?.slug && (
          <QrCodesView hotelId={config.id} hotelSlug={config.slug} />
        )}
        {tab === 'properties' && session.role === 'superadmin' && (
          <PropertiesView
            onSwitchHotel={async (slug: string) => {
              localStorage.setItem('attenda_hotel_slug', slug);
              const c = await getHotelConfig(slug);
              if (c) { setConfig(c); setTab('orders'); }
            }}
          />
        )}
      </main>
    </div>
  );
}

/* ── Orders View ──────────────────────────────────────── */
function OrdersView({
  requests, onStatusChange, onDelete, onRefresh,
}: {
  requests: Request[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [statusTab, setStatusTab] = useState<'active' | 'completed'>('active');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Food' | 'Transport' | 'Amenities' | 'Other'>('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<Record<string, string>>({});

  const handleAssign = async (reqId: string, name: string) => {
    if (!name.trim()) return;
    await onStatusChange(reqId, 'in-progress');
    // Update assigned_to in Supabase
    await supabase.from('requests').update({ assigned_to: name.trim() }).eq('id', reqId);
    setAssignForm(prev => ({ ...prev, [reqId]: '' }));
    // Send email notification
    const cfg = await getHotelConfig();
    if (cfg?.notificationEmail) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'assignment',
          data: {
            notificationEmail: cfg.notificationEmail,
            hotelName: cfg.name,
            assignedTo: name.trim(),
            requestId: reqId,
          },
        }),
      }).catch(() => {});
    }
  };

  const isFood = (r: Request) =>
    ['food_order', 'order', 'restaurant', 'food'].some(kw => r.type?.toLowerCase().includes(kw));
  const isTransport = (r: Request) =>
    ['transport', 'shuttle', 'taxi', 'uber', 'ride'].some(kw => r.type?.toLowerCase().includes(kw));
  const isAmenity = (r: Request) =>
    ['amenity', 'towel', 'housekeep', 'clean', 'water', 'bottle', 'toilet'].some(kw => r.type?.toLowerCase().includes(kw));

  const filtered = requests.filter(r => {
    if (typeFilter === 'All') return true;
    if (typeFilter === 'Food') return isFood(r);
    if (typeFilter === 'Transport') return isTransport(r);
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Live Orders</h1>
        <button onClick={onRefresh} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Pending', count: filtered.filter(r => r.status === 'pending').length, color: 'text-amber-600' },
          { label: 'In Progress', count: filtered.filter(r => r.status === 'in-progress').length, color: 'text-blue-600' },
          { label: 'Completed', count: filtered.filter(r => r.status === 'completed').length, color: 'text-emerald-600' },
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

      {/* Active/Completed tabs */}
      <div className="flex gap-2 mb-4">
        {(['active', 'completed'] as const).map(t => (
          <button key={t} onClick={() => setStatusTab(t)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              statusTab === t ? 'bg-white border border-gray-200 text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {t === 'active' ? `Active (${active.length})` : `Completed (${completed.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <p className="text-[13px] text-gray-500">
              {statusTab === 'active' ? 'No active orders.' : 'No completed orders.'}
            </p>
          </div>
        ) : visible.map(req => {
          const foodOrder = isFood(req);
          return (
          <div key={req.id}>
            <div
              onClick={() => setExpanded(expanded === req.id ? null : req.id)}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 shadow-sm cursor-pointer hover:border-teal-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${req.status === 'pending' ? 'bg-amber-400' : req.status === 'in-progress' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{req.type}</span>
                  {foodOrder && <UtensilsCrossed size={11} className="text-amber-500" />}
                  {req.details?.includes('Clover #') && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      Clover POS
                    </span>
                  )}
                  {req.assigned_to && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
                      👤 {req.assigned_to}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">• {new Date(req.created_at).toLocaleString()}</span>
                </div>
                <p className="text-[14px] font-bold text-gray-900 mb-0.5">{req.guest_name} — Room {req.room}</p>
                <p className="text-[13px] text-gray-600 truncate">{req.details}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                {req.status === 'pending' && (
                  <>
                    <button onClick={() => onStatusChange(req.id, 'in-progress')}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold hover:opacity-80"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                      {foodOrder ? 'Notify Restaurant' : 'Start'}
                    </button>
                    <button onClick={() => onDelete(req.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-100">
                      Delete
                    </button>
                  </>
                )}
                {req.status === 'in-progress' && (
                  <button onClick={() => onStatusChange(req.id, 'completed')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold hover:bg-emerald-100">
                    Done
                  </button>
                )}
                {req.status === 'completed' && (
                  <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-bold">Completed</span>
                )}
              </div>
            </div>

            {/* Expanded panel */}
            {expanded === req.id && (
              <div className="bg-gray-50 border border-t-0 border-gray-200 rounded-b-xl p-5 space-y-3 shadow-sm">
                {/* Full details */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Full Details</p>
                  <p className="text-[13px] text-gray-800 whitespace-pre-wrap leading-relaxed">{req.details}</p>
                </div>

                {/* Guest info */}
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <span className="text-gray-400">Guest:</span>{' '}
                    <span className="font-semibold text-gray-800">{req.guest_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Room:</span>{' '}
                    <span className="font-semibold text-gray-800">{req.room}</span>
                  </div>
                </div>

                {/* Clover delivery panel */}
                {req.details?.includes('Clover #') && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1">Clover Delivery</p>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <span className="text-gray-400">Status:</span>{' '}
                        <span className="font-semibold text-purple-700">
                          {req.status === 'pending' ? 'Sent to Kitchen' : req.status === 'in-progress' ? 'Cooking' : 'Ready'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Delivery:</span>{' '}
                        <span className="font-semibold text-gray-800">Uber Direct</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Fee (5%):</span>{' '}
                        <span className="font-semibold text-emerald-600">
                          ${((parseFloat(req.details?.match(/— \$([\d.]+)/)?.[1] || '0')) * 0.05).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assign to */}
                {req.status !== 'completed' && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assign to</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Staff name..."
                        value={assignForm[req.id] || ''}
                        onChange={e => {
                          setAssignForm(prev => ({ ...prev, [req.id]: e.target.value }));
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleAssign(req.id, assignForm[req.id] || '');
                          }
                        }}
                        className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none focus:border-teal-400"
                      />
                      <button
                        onClick={() => handleAssign(req.id, assignForm[req.id] || '')}
                        disabled={!assignForm[req.id]?.trim()}
                        className="px-3 py-2 rounded-lg text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-30 transition-colors"
                        style={{ backgroundColor: assignForm[req.id]?.trim() ? TEAL : '#e5e7eb', color: assignForm[req.id]?.trim() ? 'white' : '#9ca3af' }}
                      >
                        <UserPlus size={13} /> Assign & Notify
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}

/* ── Messages View ──────────────────────────────────────── */
function MessagesView({ messages }: { messages: Message[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 p-8 pb-4">
        <h1 className="text-[26px] font-extrabold text-gray-900">Guest Messages</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">All guest conversations appear here in real time.</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
        {messages.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500">No messages yet.</p>
            <p className="text-[11px] text-gray-400 mt-1">Messages sent by guests appear here in real time.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'guest' ? 'items-end' : 'items-start'}`}>
              {/* Name + Room header */}
              <div className={`flex items-center gap-2 mb-1 px-1 ${msg.sender === 'guest' ? 'flex-row-reverse' : ''}`}>
                <span className="text-[11px] font-semibold text-gray-600">
                  {msg.guest_name} — Room {msg.room}
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {/* Bubble */}
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                msg.sender === 'guest'
                  ? 'bg-[#6B1D3C] text-white rounded-br-md'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
              }`}>
                {msg.body}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Shuttle View ──────────────────────────────────────── */
function ShuttleView({ sheetUrl, isAdmin, onGoToSettings }: {
  sheetUrl?: string;
  isAdmin: boolean;
  onGoToSettings: () => void;
}) {
  if (!sheetUrl) {
    return (
      <div className="p-8">
        <h1 className="text-[26px] font-extrabold text-gray-900 mb-6">Shuttle Schedule</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <Bus size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-[14px] mb-1">No operations sheet connected yet.</p>
          <p className="text-gray-400 text-[12px]">The admin connects a Google Sheet to manage shuttle times and operations.</p>
          {isAdmin && (
            <button onClick={onGoToSettings} className="mt-4 text-[13px] font-bold underline" style={{ color: TEAL }}>
              + Connect Google Sheet in Hotel Settings →
            </button>
          )}
        </div>
      </div>
    );
  }

  const embedUrl = sheetUrl.includes('/pubhtml')
    ? sheetUrl
    : sheetUrl.replace(/\/edit.*$/, '/pubhtml?widget=true&headers=false');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Shuttle Schedule</h1>
        <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
          <ExternalLink size={14} /> Open in Sheets
        </a>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm" style={{ height: 560 }}>
        <iframe src={embedUrl} className="w-full h-full border-0" title="Shuttle Schedule" />
      </div>
    </div>
  );
}

/* ── Hotel Settings View ────────────────────────────────── */
function HotelSettingsView({ config, onSaved }: { config: HotelConfig; onSaved: () => void }) {
  const [form, setForm] = useState<HotelConfig>(config);
  const [saved, setSaved] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{ added: number; total: number } | null>(null);

  const handleSave = async () => {
    await updateHotelConfig(form);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDiscover = async () => {
    if (!form.address || !config.id) return;
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      await updateHotelConfig(form);
      const res = await fetch('/api/places-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: config.id, address: form.address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discovery failed');
      setDiscoverResult(data);
      onSaved();
    } catch (e) {
      alert('Discovery failed: ' + (e as Error).message);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-[26px] font-extrabold text-gray-900 mb-6">Hotel Settings</h1>
      <div className="space-y-5">
        <Section title="Hotel Identity" Icon={HotelIcon}>
          <Field label="Hotel Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Field label="Manager Name" value={form.managerName} onChange={v => setForm({ ...form, managerName: v })} />
          <Field label="Front Desk Phone" value={form.frontDeskPhone} onChange={v => setForm({ ...form, frontDeskPhone: v })} />
          <Field
            label="Hotel Address"
            value={form.address}
            onChange={v => setForm({ ...form, address: v })}
            placeholder="1601 NW 42nd Ave, Miami, FL 33126"
          />
          {form.address && (
            <div>
              <button
                onClick={handleDiscover}
                disabled={discovering}
                className="w-full py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#7C3AED', color: 'white' }}
              >
                {discovering ? 'Discovering...' : 'Auto-Discover Nearby Places'}
              </button>
              {discoverResult && (
                <p className="text-[12px] text-emerald-600 font-medium text-center mt-2">
                  Added {discoverResult.added} new places ({discoverResult.total} found nearby)
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                Scans real restaurants &amp; attractions from OpenStreetMap within 1.5 km
              </p>
            </div>
          )}
        </Section>

        <Section title="WiFi Settings" Icon={Wifi}>
          <Field label="Network Name" value={form.wifiName} onChange={v => setForm({ ...form, wifiName: v })} />
          <Field label="Password" value={form.wifiPassword} onChange={v => setForm({ ...form, wifiPassword: v })} />
        </Section>

        <Section title="Welcome Letter" Icon={ImageIcon}>
          <textarea
            value={form.welcomeLetter}
            onChange={e => setForm({ ...form, welcomeLetter: e.target.value })}
            rows={5}
            className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none"
            placeholder="Dear Guest, welcome to our hotel..."
          />
        </Section>

        <Section title="Email Notifications" Icon={Bell}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Receive an email whenever a guest submits a request or sends a message.
          </p>
          <Field
            label="Notification Email"
            value={form.notificationEmail}
            onChange={v => setForm({ ...form, notificationEmail: v })}
            placeholder="frontdesk@yourhotel.com"
          />
        </Section>

        <Section title="Shuttle Operations Sheet" Icon={ExternalLink}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Paste a Google Sheet URL. Attenda will auto-build SCHEDULE, REQUESTS, and DRIVERS tabs.
          </p>
          <Field
            label="Google Sheet URL"
            value={form.googleSheetUrl}
            onChange={v => setForm({ ...form, googleSheetUrl: v })}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
          {form.googleSheetUrl && (
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/sheets-init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sheetUrl: form.googleSheetUrl }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  setForm({
                    ...form,
                    serviceAccountEmail: data.email,
                  });
                  alert(`✅ Shuttle sheet is ready!\\n\\n⚠️ IMPORTANT: Share this sheet with:\\n${data.email}\\n(as Editor)`);
                } catch (e) {
                  alert('Setup failed: ' + (e as Error).message);
                }
              }}
              className="w-full py-2.5 rounded-xl font-semibold text-[13px] text-white"
              style={{ backgroundColor: TEAL }}
            >
              🚐 Initialize Shuttle Sheet
            </button>
          )}
          {form.serviceAccountEmail && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-[11px] text-amber-700">
                ⚠️ Share sheet with: <code className="bg-amber-100 px-1 rounded">{form.serviceAccountEmail}</code> (Editor access)
              </p>
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-1">
            Staff sees full sheet in Shuttle tab. Guests see SCHEDULE tab only.
          </p>
        </Section>

        {saved && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-[13px] font-medium text-center">
            ✅ Saved
          </div>
        )}

        <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2" style={{ backgroundColor: TEAL }}>
          <Save size={16} /> SAVE CHANGES
        </button>
      </div>
    </div>
  );
}

/* ── Staff View ─────────────────────────────────────────── */
function StaffView({ staff, onRefresh }: { staff: StaffAccount[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ name: '', pin: '', role: 'staff' });
  const [showPin, setShowPin] = useState(false);

  const handleAdd = async () => {
    if (!form.name || !form.pin) return;
    await createStaffAccount({ name: form.name, pin_code: form.pin, role: form.role });
    setForm({ name: '', pin: '', role: 'staff' });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this staff member?')) return;
    await deleteStaffAccount(id);
    onRefresh();
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-[26px] font-extrabold text-gray-900 mb-6">Staff Management</h1>
      <div className="space-y-5">
        <Section title="Add Staff Member" Icon={Plus}>
          <Field label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Staff name" />
          <div>
            <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">PIN Code</label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={form.pin}
                onChange={e => setForm({ ...form, pin: e.target.value })}
                maxLength={6}
                placeholder="4–6 digit PIN"
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none pr-10"
              />
              <button onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none">
              <option value="staff">Staff (limited access)</option>
              <option value="manager">Manager (admin access)</option>
            </select>
          </div>
          <button onClick={handleAdd} className="w-full py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: TEAL }}>
            ADD STAFF MEMBER
          </button>
        </Section>

        <Section title={`Active Staff (${staff.length})`} Icon={Users}>
          {staff.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-2">No staff accounts yet.</p>
          ) : staff.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-[14px] font-semibold text-gray-900">{s.name}</p>
                <p className="text-[11px] text-gray-400 capitalize">{s.role} • PIN: ••••</p>
              </div>
              <button onClick={() => handleDelete(s.id!)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

/* ── Partners View ──────────────────────────────────────── */
function PartnersView({ hotelId }: { hotelId: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<Record<string, PartnerMenuItem[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'restaurant', description: '', image_url: '',
    phone: '', address: '', hours: '', distance: '', rating: '0', has_ordering: false, email: '',
  });
  const [cloverForm, setCloverForm] = useState({
    merchantId: '', accessToken: '', refreshToken: '', enabled: false,
  });
  const [menuForm, setMenuForm] = useState<Record<string, { name: string; description: string; price: string }>>({});
  const [syncing, setSyncing] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    const data = await getPartners(hotelId);
    setPartners(data);
  }, [hotelId]);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  const loadMenu = async (partnerId: string) => {
    const items = await getPartnerMenuItems(partnerId);
    setMenuItems(prev => ({ ...prev, [partnerId]: items }));
  };

  const toggle = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadMenu(id);
  };

  const handleAdd = async () => {
    if (!form.name) return;
    await createPartner({
      hotel_id: hotelId,
      name: form.name,
      category: form.category,
      description: form.description,
      image_url: form.image_url,
      phone: form.phone,
      address: form.address,
      hours: form.hours,
      distance: form.distance,
      rating: parseFloat(form.rating) || 0,
      has_ordering: form.has_ordering,
      email: form.email,
      clover_merchant_id: cloverForm.merchantId || undefined,
      clover_access_token: cloverForm.accessToken || undefined,
      clover_refresh_token: cloverForm.refreshToken || undefined,
      clover_enabled: cloverForm.enabled,
    });
    setForm({ name: '', category: 'restaurant', description: '', image_url: '', phone: '', address: '', hours: '', distance: '', rating: '0', has_ordering: false, email: '' });
    setCloverForm({ merchantId: '', accessToken: '', refreshToken: '', enabled: false });
    setShowForm(false);
    loadPartners();
  };

  const handleCloverSync = async (p: Partner) => {
    if (!p.clover_merchant_id || !p.clover_access_token) return;
    setSyncing(p.id);
    try {
      const { getCloverMenu } = await import('@/lib/clover');
      const items = await getCloverMenu(p.clover_merchant_id, p.clover_access_token);
      const existing = await getPartnerMenuItems(p.id);
      for (const item of existing) await deletePartnerMenuItem(item.id);
      for (const item of items) {
        await createPartnerMenuItem({
          partner_id: p.id,
          name: item.name,
          description: item.description || '',
          price: item.price / 100,
        });
      }
      alert(`Synced ${items.length} items from Clover`);
      loadMenu(p.id);
    } catch (e) {
      alert('Sync failed: ' + (e as Error).message);
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this partner and all their menu items?')) return;
    await deletePartner(id);
    loadPartners();
  };

  const handleAddMenuItem = async (partnerId: string) => {
    const mf = menuForm[partnerId];
    if (!mf?.name || !mf?.price) return;
    await createPartnerMenuItem({
      partner_id: partnerId,
      name: mf.name,
      description: mf.description || '',
      price: parseFloat(mf.price),
    });
    setMenuForm(prev => ({ ...prev, [partnerId]: { name: '', description: '', price: '' } }));
    loadMenu(partnerId);
  };

  const handleDeleteMenuItem = async (itemId: string, partnerId: string) => {
    await deletePartnerMenuItem(itemId);
    loadMenu(partnerId);
  };

  const catColor: Record<string, string> = {
    restaurant: 'bg-orange-100 text-orange-700',
    attraction: 'bg-blue-100 text-blue-700',
    service: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Partners & Menu</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage nearby partners, restaurants, and their menus.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-semibold"
          style={{ backgroundColor: TEAL }}>
          <Plus size={14} /> Add Partner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-[15px] mb-4">New Partner</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none">
                <option value="restaurant">Restaurant</option>
                <option value="attraction">Attraction</option>
                <option value="service">Service</option>
              </select>
            </div>
            <Field label="Distance (e.g. 0.3 mi)" value={form.distance} onChange={v => setForm({ ...form, distance: v })} />
            <div className="col-span-2">
              <Field label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
            </div>
            <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
            <Field label="Email (order notifications)" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="orders@restaurant.com" />
            <Field label="Hours" value={form.hours} onChange={v => setForm({ ...form, hours: v })} placeholder="Mon–Sun 8am–10pm" />
            <div className="col-span-2">
              <Field label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} />
            </div>
            <div className="col-span-2">
              <Field label="Image URL" value={form.image_url} onChange={v => setForm({ ...form, image_url: v })} placeholder="https://..." />
            </div>
            <Field label="Rating (0–5)" value={form.rating} onChange={v => setForm({ ...form, rating: v })} />
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="has_ordering" checked={form.has_ordering}
                onChange={e => setForm({ ...form, has_ordering: e.target.checked })}
                className="w-4 h-4 rounded" />
              <label htmlFor="has_ordering" className="text-[13px] font-medium text-gray-700">In-Room Ordering</label>
            </div>

            {/* Clover Integration */}
            <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
              <p className="text-[12px] font-bold text-purple-600 mb-2">Clover POS Integration</p>
            </div>
            <div className="col-span-2">
              <a
                href={`/api/clover-oauth?partner=new&hotel=${hotelId}`}
                className="w-full py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700"
              >
                🔗 Connect Clover (OAuth)
              </a>
              <p className="text-[10px] text-gray-400 mt-1 text-center">One-click authorized connection</p>
            </div>
            <div className="col-span-2 border-t border-gray-100 my-1">
              <p className="text-[11px] font-medium text-gray-400 mt-2 mb-1">Or enter manually:</p>
            </div>
            <div className="col-span-2">
              <Field label="Clover Merchant ID" value={cloverForm.merchantId} onChange={v => setCloverForm({ ...cloverForm, merchantId: v })} placeholder="ABC123DEF456" />
            </div>
            <div className="col-span-2">
              <Field label="Clover Access Token" value={cloverForm.accessToken} onChange={v => setCloverForm({ ...cloverForm, accessToken: v })} placeholder="sk_..." />
            </div>
            <div className="col-span-2">
              <Field label="Clover Refresh Token" value={cloverForm.refreshToken} onChange={v => setCloverForm({ ...cloverForm, refreshToken: v })} placeholder="rt_..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="clover_enabled" checked={cloverForm.enabled}
                onChange={e => setCloverForm({ ...cloverForm, enabled: e.target.checked })}
                className="w-4 h-4 rounded" />
              <label htmlFor="clover_enabled" className="text-[13px] font-medium text-gray-700">Enable Clover POS</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: TEAL }}>
              SAVE PARTNER
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[13px]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <Store size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No partners yet. Add your first partner above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor[p.category] || 'bg-gray-100 text-gray-600'}`}>
                      {p.category}
                    </span>
                    {p.has_ordering && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        In-Room Ordering
                      </span>
                    )}
                    {p.clover_enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        Clover POS
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-[15px] text-gray-900">{p.name}</p>
                  {p.description && <p className="text-[12px] text-gray-500 mt-0.5 truncate">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {p.has_ordering && (
                    <button onClick={() => toggle(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                      Menu {expanded === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                  {!p.clover_enabled && p.has_ordering && (
                    <a
                      href={`/api/clover-oauth?partner=${p.id}&hotel=${hotelId}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-600 hover:bg-purple-100"
                    >
                      🔗 Connect Clover
                    </a>
                  )}
                  {p.clover_enabled && p.clover_merchant_id && p.clover_access_token && (
                    <button
                      onClick={() => handleCloverSync(p)}
                      disabled={syncing === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50"
                    >
                      {syncing === p.id ? 'Syncing...' : 'Sync Clover'}
                    </button>
                  )}
                  <button onClick={() => handleDelete(p.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expanded === p.id && p.has_ordering && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">Menu Items</h4>
                  <div className="flex gap-2 mb-4">
                    <input
                      placeholder="Item name *"
                      value={menuForm[p.id]?.name || ''}
                      onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none"
                    />
                    <input
                      placeholder="Description"
                      value={menuForm[p.id]?.description || ''}
                      onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: e.target.value } }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none"
                    />
                    <input
                      placeholder="$0.00"
                      type="number"
                      step="0.01"
                      value={menuForm[p.id]?.price || ''}
                      onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                      className="w-20 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none"
                    />
                    <button onClick={() => handleAddMenuItem(p.id)}
                      className="px-3 py-2 rounded-lg text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
                      Add
                    </button>
                  </div>
                  {(menuItems[p.id] || []).length === 0 ? (
                    <p className="text-[12px] text-gray-400">No menu items yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(menuItems[p.id] || []).map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                          <div>
                            <span className="text-[13px] font-semibold text-gray-900">{item.name}</span>
                            {item.description && <span className="text-[11px] text-gray-400 ml-2">{item.description}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[13px] font-bold text-gray-700">${Number(item.price).toFixed(2)}</span>
                            <button onClick={() => handleDeleteMenuItem(item.id, p.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── QR Codes View ──────────────────────────────────────── */
function QrCodesView({ hotelId, hotelSlug }: { hotelId: string; hotelSlug: string }) {
  const [codes, setCodes] = useState<QrCodeRow[]>([]);
  const [form, setForm] = useState({ label: '', location_type: 'room' });
  const [copied, setCopied] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    const data = await getQrCodes(hotelId);
    setCodes(data);
  }, [hotelId]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda.vercel.app';
  const getUrl = (label: string) => `${baseUrl}/?hotel=${hotelSlug}&room=${encodeURIComponent(label)}`;

  const handleAdd = async () => {
    if (!form.label) return;
    const url = getUrl(form.label);
    await createQrCode(hotelId, form.label, form.location_type, url);
    setForm({ label: '', location_type: 'room' });
    loadCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this QR code?')) return;
    await deleteQrCode(id);
    loadCodes();
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">QR Codes</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Generate QR codes for each room or location. Guests scan to open the app pre-filled with their info.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-[14px] mb-4">Generate New QR Code</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Label (room # or location name)" value={form.label} onChange={v => setForm({ ...form, label: v })} placeholder="205 or Pool Deck" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Type</label>
            <select value={form.location_type} onChange={e => setForm({ ...form, location_type: e.target.value })}
              className="bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none">
              {['room', 'lobby', 'pool', 'elevator', 'restaurant', 'gym', 'spa'].map(lt => (
                <option key={lt} value={lt} className="capitalize">{lt.charAt(0).toUpperCase() + lt.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleAdd}
              className="px-5 py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: TEAL }}>
              Generate
            </button>
          </div>
        </div>
      </div>

      {codes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <QrCodeIcon size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No QR codes yet. Generate your first above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {codes.map(code => {
            const url = code.url || getUrl(code.label);
            const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
            return (
              <div key={code.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex gap-4">
                  <img src={qrImgUrl} alt={`QR for ${code.label}`} className="w-20 h-20 rounded-lg border border-gray-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-bold text-[15px] text-gray-900">{code.label}</p>
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize mt-0.5">
                          {code.location_type}
                        </span>
                      </div>
                      <button onClick={() => handleDelete(code.id)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 break-all mt-2 line-clamp-2">{url}</p>
                    <button
                      onClick={() => handleCopy(url, code.id)}
                      className="mt-2 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}
                    >
                      {copied === code.id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy URL</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Properties View ──────────────────────────────────────── */
function PropertiesView({ onSwitchHotel }: { onSwitchHotel: (slug: string) => void }) {
  const [hotels, setHotels] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [form, setForm] = useState({ slug: '', name: '', adminEmail: '' });
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getAllHotels().then(setHotels);
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda.vercel.app';
  const getGuestUrl = (slug: string) => `${baseUrl}/?hotel=${slug}`;
  const getAdminUrl = (slug: string) => `${baseUrl}/staff?hotel=${slug}`;

  const handleCreate = async () => {
    if (!form.slug || !form.name) return;
    setCreating(true);
    try {
      const hotel = await createHotel(form.slug, form.name);
      if (form.adminEmail && hotel) {
        const origin = window.location.origin;
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'tenant_onboarding',
            data: {
              hotelName: form.name,
              slug: form.slug,
              adminEmail: form.adminEmail,
              guestUrl: `${origin}/?hotel=${form.slug}`,
              adminUrl: `${origin}/staff?hotel=${form.slug}`,
            },
          }),
        });
      }
      setForm({ slug: '', name: '', adminEmail: '' });
      getAllHotels().then(setHotels);
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : '') || (typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : '');
      alert(msg.includes('unique') || msg.includes('duplicate') ? 'Slug already in use. Try a different one.' : msg || 'Failed to create hotel. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">All Properties</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">{hotels.length} hotel{hotels.length !== 1 ? 's' : ''} on this platform.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-[14px] mb-4">Create New Property</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Hotel Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Miami Airport Hotel" />
          <Field label="URL Slug *" value={form.slug} onChange={v => setForm({ ...form, slug: v.toLowerCase().replace(/\s+/g, '-') })} placeholder="miami-airport" />
          <div className="col-span-2">
            <Field label="Admin Email (optional — for onboarding email)" value={form.adminEmail} onChange={v => setForm({ ...form, adminEmail: v })} placeholder="manager@hotel.com" />
          </div>
        </div>
        {form.slug && (
          <p className="text-[11px] text-gray-400 mb-3 font-mono">Guest URL preview: {getGuestUrl(form.slug)}</p>
        )}
        <button onClick={handleCreate} disabled={creating}
          className="px-6 py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-60" style={{ backgroundColor: TEAL }}>
          {creating ? 'Creating...' : 'CREATE PROPERTY'}
        </button>
      </div>

      <div className="space-y-4">
        {hotels.map(hotel => {
          const guestUrl = getGuestUrl(hotel.slug);
          const adminUrl = getAdminUrl(hotel.slug);
          return (
            <div key={hotel.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-extrabold text-[16px] text-gray-900">{hotel.name}</p>
                  <p className="text-[12px] text-gray-400 font-mono mt-0.5">@{hotel.slug}</p>
                </div>
                <button onClick={() => onSwitchHotel(hotel.slug)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                  Manage this hotel
                </button>
              </div>

              <div className="space-y-2">
                {([
                  { label: 'Guest App URL', url: guestUrl, id: hotel.id + '-guest', note: 'Share with guests or embed in QR code' },
                  { label: 'Admin / Staff URL', url: adminUrl, id: hotel.id + '-admin', note: 'Send to hotel admin • Admin PIN: 2025' },
                ] as const).map(({ label, url, id, note }) => (
                  <div key={id} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="text-[12px] text-gray-700 font-mono truncate mt-0.5">{url}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>
                    </div>
                    <button onClick={() => handleCopy(url, id)}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                      {copied === id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Shared UI Helpers ──────────────────────────────────── */
function Section({ title, Icon, children }: {
  title: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} style={{ color: TEAL }} />
        <h3 className="font-bold text-[14px]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
      />
    </div>
  );
}
