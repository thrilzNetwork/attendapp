'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Bell, MessageSquare, Bus, Settings, Users,
  LogOut, RefreshCw, Plus, Trash2, Eye, EyeOff, Save,
  Wifi, Hotel as HotelIcon, ExternalLink, ImageIcon, type LucideIcon,
  Store, QrCode as QrCodeIcon, Building2, Copy, Check, ChevronDown, ChevronUp,
  UtensilsCrossed, UserPlus, BookOpen, Pencil, X as XIcon,
} from 'lucide-react';
import {
  supabase, subscribeToRequests, subscribeToMessages, updateRequestStatus, deleteRequest,
  getHotelConfig, updateHotelConfig, HotelConfig,
  getStaffAccounts, getStaffAccountsForHotel, createStaffAccountWithDetails,
  deleteStaffAccount, updateStaffDetails, updateStaffPermissions, StaffAccount,
  getPartners, createPartner, updatePartner, deletePartner, Partner,
  getPartnerMenuItems, createPartnerMenuItem, deletePartnerMenuItem, PartnerMenuItem,
  getQrCodes, createQrCode, deleteQrCode, QrCode as QrCodeRow,
  getAllHotels, createHotel,
  getShuttleRoutes, createShuttleRoute, deleteShuttleRoute,
  getAllShuttleSlotsForHotel, createShuttleSlot, deleteShuttleSlot,
  getAllShuttleBookingsForHotel, cancelShuttleBooking,
  getShuttleRequests, updateShuttleRequest, ShuttleRoute, ShuttleSlot, ShuttleBooking, ShuttleRequest,
  getCruiseSchedulesAll, createCruiseSchedule, deleteCruiseSchedule, CruiseSchedule,
  getAllKnowledgeBase, createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry, KnowledgeEntry,
} from '@/lib/supabase';

/* ── Types ─────────────────────────────────────────────── */
type Role = 'admin' | 'staff' | 'superadmin' | 'vendor';
type NavTab =
  | 'orders' | 'messages' | 'shuttle'
  | 'hotel' | 'staff_mgmt'
  | 'partners' | 'qrcodes' | 'properties'
  | 'vendor_manifest' | 'knowledge' | 'guests';

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
  vendorType?: string;
}

/* ── Constants ─────────────────────────────────────────── */
const ADMIN_PIN = '2025';
const SUPERADMIN_PIN = '9999';
const TEAL = '#0D9488';

const NAV: { tab: NavTab; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { tab: 'orders',          label: 'Live Orders',       icon: Bell,            roles: ['admin', 'staff', 'superadmin'] },
  { tab: 'messages',        label: 'Guest Messages',     icon: MessageSquare,   roles: ['admin', 'staff', 'superadmin'] },
  { tab: 'shuttle',         label: 'Shuttle Schedule',   icon: Bus,             roles: ['admin', 'staff', 'superadmin'] },
  { tab: 'guests',          label: 'Guest Check-ins',    icon: Users,           roles: ['admin', 'staff', 'superadmin'] },
  { tab: 'vendor_manifest', label: 'Vendor Dashboard',   icon: Users,           roles: ['vendor'] },
  { tab: 'hotel',           label: 'Hotel Settings',     icon: Settings,        roles: ['admin', 'superadmin'] },
  { tab: 'staff_mgmt',      label: 'Staff Management',   icon: Users,           roles: ['admin', 'superadmin'] },
  { tab: 'partners',        label: 'Partners & Menu',    icon: Store,           roles: ['admin', 'superadmin'] },
  { tab: 'qrcodes',         label: 'QR Codes',           icon: QrCodeIcon,      roles: ['admin', 'superadmin'] },
  { tab: 'knowledge',       label: 'Knowledge Base',     icon: BookOpen,        roles: ['admin', 'superadmin'] },
  { tab: 'properties',      label: 'All Properties',     icon: Building2,       roles: ['superadmin'] },
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
      const role: Role =
        data.role === 'manager' || data.role === 'admin' ? 'admin' :
        data.role === 'vendor' ? 'vendor' : 'staff';
      setSession({ name: data.name, role, vendorType: data.vendor_type || undefined });
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
    const ch1 = subscribeToRequests(() => { reload(session.role); });
    const ch2 = subscribeToMessages(() => { reload(session.role); });
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
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
  // Vendors land on their manifest tab
  const effectiveTab = (session.role === 'vendor' && tab === 'orders') ? 'vendor_manifest' : tab;

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
                effectiveTab === item.tab ? 'text-white' : 'text-gray-500'
              }`}
              style={effectiveTab === item.tab ? { backgroundColor: TEAL } : {}}
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
            session.role === 'admin' ? 'bg-teal-100 text-teal-700' :
            session.role === 'vendor' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {session.role === 'superadmin' ? 'Super Admin' : session.role === 'admin' ? 'Admin' : session.role === 'vendor' ? `Vendor · ${session.vendorType || ''}` : 'Staff'}
          </span>
        </div>

        <nav className="px-3 py-3 flex-1">
          {visibleNav.map(item => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors text-left mb-0.5 ${
                effectiveTab === item.tab ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'
              }`}
              style={effectiveTab === item.tab ? { backgroundColor: TEAL } : {}}
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
        {effectiveTab === 'orders' && (
          <OrdersView
            requests={requests}
            messages={messages}
            onStatusChange={async (id, s) => { await updateRequestStatus(id, s); reload(session.role); }}
            onDelete={async id => { await deleteRequest(id); reload(session.role); }}
            onRefresh={() => reload(session.role)}
          />
        )}
        {effectiveTab === 'messages' && <MessagesView messages={messages} />}
        {effectiveTab === 'shuttle' && config?.id && (
          <ShuttleView hotelId={config.id} isAdmin={isAdmin} />
        )}
        {effectiveTab === 'vendor_manifest' && config?.id && (
          <VendorDashboard hotelId={config.id} vendorType={session.vendorType || 'shuttle'} vendorName={session.name} />
        )}
        {effectiveTab === 'hotel' && isAdmin && config && (
          <HotelSettingsView
            config={config}
            onSaved={async () => { const c = await getHotelConfig(); if (c) setConfig(c); }}
          />
        )}
        {effectiveTab === 'staff_mgmt' && isAdmin && config?.id && (
          <StaffView hotelId={config.id} hotelName={config.name} hotelSlug={config.slug} staff={staff} onRefresh={async () => setStaff(await getStaffAccountsForHotel(config.id!))} />
        )}
        {effectiveTab === 'partners' && isAdmin && config?.id && (
          <PartnersView hotelId={config.id} />
        )}
        {effectiveTab === 'qrcodes' && isAdmin && config?.id && config?.slug && (
          <QrCodesView hotelId={config.id} hotelSlug={config.slug} />
        )}
        {effectiveTab === 'knowledge' && isAdmin && config?.id && (
          <KnowledgeBaseView hotelId={config.id} />
        )}
        {effectiveTab === 'properties' && session.role === 'superadmin' && (
          <PropertiesView
            onSwitchHotel={async (slug: string) => {
              localStorage.setItem('attenda_hotel_slug', slug);
              const c = await getHotelConfig(slug);
              if (c) { setConfig(c); setTab('orders'); }
            }}
          />
        )}
        {effectiveTab === 'guests' && config?.id && (
          <GuestsView hotelId={config.id} />
        )}
      </main>
    </div>
  );
}

/* ── Orders View ──────────────────────────────────────── */
function OrdersView({
  requests, messages, onStatusChange, onDelete, onRefresh,
}: {
  requests: Request[];
  messages: Message[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [statusTab, setStatusTab] = useState<'active' | 'completed' | 'messages'>('active');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Food' | 'Transport' | 'Amenities' | 'Other'>('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<Record<string, string>>({});

  // Guest messages (sender=guest only, most recent first)
  const guestMessages = messages.filter(m => m.sender === 'guest')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

      <div className="grid grid-cols-4 gap-4 mb-4">
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

      {statusTab !== 'messages' && <div className="space-y-3">
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
      </div>}
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

/* ── Shuttle View (In-App) ──────────────────────────────── */
function ShuttleView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [tab, setTab] = useState<'routes' | 'requests' | 'cruise'>('routes');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Shuttle Operations</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTab('routes')}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === 'routes' ? 'bg-white border border-gray-200 text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
            🚐 Routes & Bookings
          </button>
          <button onClick={() => setTab('requests')}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === 'requests' ? 'bg-white border border-gray-200 text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
            📋 Pickup Requests
          </button>
          <button onClick={() => setTab('cruise')}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === 'cruise' ? 'bg-white border border-gray-200 text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
            🚢 Cruise Calendar
          </button>
        </div>
      </div>
      {tab === 'routes' && <ShuttleRoutesPanel hotelId={hotelId} isAdmin={isAdmin} />}
      {tab === 'requests' && <ShuttleRequestsPanel hotelId={hotelId} />}
      {tab === 'cruise' && <CruiseCalendarPanel hotelId={hotelId} isAdmin={isAdmin} />}
    </div>
  );
}

/* ── Shuttle Routes Panel ───────────────────────────────── */
function ShuttleRoutesPanel({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [routes, setRoutes] = useState<ShuttleRoute[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [bookings, setBookings] = useState<Record<string, ShuttleBooking[]>>({});
  const [loading, setLoading] = useState(true);
  const [newRoute, setNewRoute] = useState({ name: '', type: 'airport', price: 0 });
  const [newSlot, setNewSlot] = useState<{ route_id: string; show: boolean; time: string; days: number[]; capacity: number; event_label: string; override_price: number | null }>({ route_id: '', show: false, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null });
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const load = useCallback(async () => {
    const r = await getShuttleRoutes(hotelId);
    setRoutes(r);
    const s = await getAllShuttleSlotsForHotel(hotelId);
    setSlots(s);
    const b = await getAllShuttleBookingsForHotel(hotelId);
    const bySlot: Record<string, ShuttleBooking[]> = {};
    b.forEach(bk => { if (!bySlot[bk.slot_id]) bySlot[bk.slot_id] = []; bySlot[bk.slot_id].push(bk); });
    setBookings(bySlot);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleAddRoute = async () => {
    if (!newRoute.name) return;
    await createShuttleRoute({ hotel_id: hotelId, name: newRoute.name, type: newRoute.type, price: newRoute.price });
    setNewRoute({ name: '', type: 'airport', price: 0 });
    load();
  };

  const handleAddSlot = async () => {
    if (!newSlot.time || !newSlot.route_id) return;
    await createShuttleSlot({ route_id: newSlot.route_id, departure_time: newSlot.time + ':00', days_of_week: newSlot.days, capacity: newSlot.capacity, event_label: newSlot.event_label, override_price: newSlot.override_price ?? undefined });
    setNewSlot({ route_id: '', show: false, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null });
    load();
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      {/* Add Route */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-extrabold text-[15px] mb-3">+ Add Route</h3>
          <div className="flex gap-2 items-end flex-wrap">
            <input placeholder="Route name (e.g. MIA Airport)" value={newRoute.name} onChange={e => setNewRoute({ ...newRoute, name: e.target.value })}
              className="flex-1 min-w-[160px] bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            <select value={newRoute.type} onChange={e => setNewRoute({ ...newRoute, type: e.target.value })}
              className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
              <option value="airport">Airport (free)</option><option value="cruise">Cruise Port</option><option value="custom">Custom</option>
            </select>
            <div>
              <label className="text-[10px] text-gray-400 block">$ per person</label>
              <input type="number" min="0" step="0.01" value={newRoute.price || ''} placeholder="0" onChange={e => setNewRoute({ ...newRoute, price: parseFloat(e.target.value)||0 })}
                className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none w-[72px]" />
            </div>
            <button onClick={handleAddRoute} className="px-4 py-2.5 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: '#0D9488' }}>Add</button>
          </div>
        </div>
      )}

      {/* Routes & Slots */}
      {routes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Bus size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No shuttle routes configured yet.</p>
          {isAdmin && <p className="text-[12px] text-gray-400 mt-1">Add your first route above.</p>}
        </div>
      ) : routes.map(route => {
        const routeSlots = slots.filter(s => s.route_id === route.id);
        return (
          <div key={route.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-700">{route.type}</span>
                <h3 className="font-extrabold text-[16px] text-gray-900">{route.name}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: (route.price||0) > 0 ? '#FEF3C7' : '#D1FAE5', color: (route.price||0) > 0 ? '#92400E' : '#065F46' }}>{(route.price||0) > 0 ? `$${route.price}/person` : 'Free'}</span>
                <span className="text-[12px] text-gray-400">{routeSlots.length} slots</span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setNewSlot({ route_id: route.id, show: true, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null }); }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-600">+ Slot</button>
                    <button onClick={e => { e.stopPropagation(); if(confirm('Delete this route and all slots?')) { deleteShuttleRoute(route.id); load(); } }}
                      className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </>
                )}
                {expandedRoute === route.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {expandedRoute === route.id && (
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                {/* Add slot form */}
                {newSlot.show && newSlot.route_id === route.id && (
                  <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4 space-y-3">
                    <div className="space-y-3">
                      <div className="flex gap-2 items-end">
                        <div>
                          <label className="text-[10px] text-gray-400 block">Time</label>
                          <input type="time" value={newSlot.time} onChange={e => setNewSlot({ ...newSlot, time: e.target.value })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Capacity (0=unlimited)</label>
                          <input type="number" min="0" max="99" value={newSlot.capacity} onChange={e => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value)||0 })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-24" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Override $ (optional)</label>
                          <input type="number" min="0" step="0.01" value={newSlot.override_price ?? ''} placeholder="--" onChange={e => setNewSlot({ ...newSlot, override_price: e.target.value ? parseFloat(e.target.value) : null })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-[80px]" />
                        </div>
                        <button onClick={handleAddSlot} className="px-4 py-2 rounded-lg text-white font-bold text-[12px]" style={{ backgroundColor: '#0D9488' }}>Save</button>
                        <button onClick={() => setNewSlot({ route_id: '', show: false, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null })} className="px-3 py-2 text-[12px] text-gray-400">Cancel</button>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block">Event / Cruise Line (optional)</label>
                        <input value={newSlot.event_label} onChange={e => setNewSlot({ ...newSlot, event_label: e.target.value })} placeholder="e.g. Royal Caribbean · May 17" 
                          className="w-full bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map((d, i) => {
                        const dayNum = i + 1;
                        const active = newSlot.days.includes(dayNum);
                        return (
                          <button key={d} onClick={() => setNewSlot({ ...newSlot, days: active ? newSlot.days.filter(x => x !== dayNum) : [...newSlot.days, dayNum] })}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{d}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Slots list */}
                {routeSlots.length === 0 ? (
                  <p className="text-[13px] text-gray-400 py-2">No time slots yet.</p>
                ) : routeSlots.map(slot => {
                  const slotBookings = bookings[slot.id] || [];
                  const dayNames = (slot.days_of_week || []).map(d => DAYS[d-1]).join(', ') || 'One-off';
                  return (
                    <div key={slot.id} className="bg-white rounded-xl border border-gray-100 mb-2 overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSlot(expandedSlot === slot.id ? null : slot.id)}>
                        <div className="flex items-center gap-4">
                          <span className="text-[18px] font-extrabold text-gray-900">{slot.departure_time?.slice(0,5)}</span>
                          <span className="text-[11px] text-gray-400">{slot.event_label ? slot.event_label : dayNames}</span>
                          {(slot.override_price ?? slot.route_price ?? 0) > 0 && <span className="text-[11px] font-semibold text-amber-700">${slot.override_price ?? slot.route_price}/pp</span>}
                          {slot.capacity > 0 && <span className="text-[11px] font-semibold text-emerald-600">{slot.capacity - slotBookings.length} / {slot.capacity} spots</span>}
                          <span className="text-[11px] font-semibold text-purple-600">{slotBookings.length} booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && <button onClick={e => { e.stopPropagation(); if(confirm('Delete slot?')) { deleteShuttleSlot(slot.id); load(); } }} className="text-red-400"><Trash2 size={12} /></button>}
                          {expandedSlot === slot.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                      {expandedSlot === slot.id && (
                        <div className="border-t border-gray-100 px-4 py-3">
                          {slotBookings.length === 0 ? (
                            <p className="text-[12px] text-gray-400">No bookings yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {slotBookings.map(b => (
                                <div key={b.id} className="flex items-center justify-between text-[12px]">
                                  <div>
                                    <span className="font-semibold text-gray-800">{b.guest_name} · Room {b.room_number} · {b.pax} pax</span>
                                    {(b.price_charged || 0) > 0 && <span className="ml-2 text-[10px] text-amber-700 font-bold">${b.price_charged} charged {b.charge_accepted ? '✅' : '⚠️ not accepted'}</span>}
                                  </div>
                                  <button onClick={() => { cancelShuttleBooking(b.id); load(); }} className="text-[10px] text-red-500 font-bold">Cancel</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Shuttle Requests Panel ─────────────────────────────── */
function ShuttleRequestsPanel({ hotelId }: { hotelId: string }) {
  const [requests, setRequests] = useState<ShuttleRequest[]>([]);
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [reqs, staff] = await Promise.all([getShuttleRequests(hotelId), getStaffAccountsForHotel(hotelId)]);
    setRequests(reqs);
    setStaffList(staff.filter(s => s.active));
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = requests.filter(r => r.status === 'pending');
  const active = requests.filter(r => r.status === 'assigned' || r.status === 'in_progress');
  const done = requests.filter(r => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="space-y-6">
      {pending.length + active.length === 0 && done.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Bus size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No pickup requests yet.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-amber-600 uppercase tracking-wider mb-2">Pending ({pending.length})</h3>
              <div className="space-y-2">
                {pending.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{r.guest_name} · Room {r.room_number} · {r.pax} pax</p>
                        <p className="text-[12px] text-gray-500">{r.destination} · {r.date || 'No date'} {r.time || ''}</p>
                        {r.notes && <p className="text-[11px] text-gray-400 mt-0.5">{r.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select onChange={async e => { if(e.target.value) { await updateShuttleRequest(r.id, { assigned_driver_id: e.target.value, status: 'assigned' }); load(); } }}
                        className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border text-[12px] outline-none">
                        <option value="">Assign driver...</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name} {s.phone ? `· ${s.phone}` : ''}</option>)}
                      </select>
                      <button onClick={async () => { await updateShuttleRequest(r.id, { status: 'cancelled' }); load(); }}
                        className="px-3 py-2 rounded-lg text-[11px] font-bold text-red-600 bg-red-50">Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-blue-600 uppercase tracking-wider mb-2">In Progress ({active.length})</h3>
              <div className="space-y-2">
                {active.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{r.guest_name} · Room {r.room_number}</p>
                        <p className="text-[12px] text-gray-500">{r.destination} · Driver: {r.assigned_driver_name || 'Unassigned'}</p>
                      </div>
                      <button onClick={async () => { await updateShuttleRequest(r.id, { status: 'completed' }); load(); }}
                        className="px-3 py-2 rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: '#0D9488' }}>Complete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Completed ({done.length})</summary>
              <div className="space-y-1 mt-2">
                {done.map(r => (
                  <div key={r.id} className="flex items-center gap-3 text-[12px] text-gray-500 py-1">
                    <span>{r.guest_name} · {r.destination}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100">{r.status}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/* ── Cruise Calendar Panel ───────────────────────────────── */
function CruiseCalendarPanel({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [schedules, setSchedules] = useState<CruiseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ship_name: '', cruise_line: '', terminal: '', departure_date: '', departure_time: '', notes: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const data = await getCruiseSchedulesAll(hotelId);
    setSchedules(data);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.ship_name || !form.departure_date || !form.departure_time) return;
    setAdding(true);
    await createCruiseSchedule({ hotel_id: hotelId, ...form });
    setForm({ ship_name: '', cruise_line: '', terminal: '', departure_date: '', departure_time: '', notes: '' });
    await load();
    setAdding(false);
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = schedules.filter(s => s.departure_date >= today);
  const past = schedules.filter(s => s.departure_date < today);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-extrabold text-[15px] mb-3">+ Add Cruise Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Ship Name *</label>
              <input value={form.ship_name} onChange={e => setForm({ ...form, ship_name: e.target.value })} placeholder="e.g. Harmony of the Seas"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Cruise Line</label>
              <input value={form.cruise_line} onChange={e => setForm({ ...form, cruise_line: e.target.value })} placeholder="e.g. Royal Caribbean"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Terminal</label>
              <input value={form.terminal} onChange={e => setForm({ ...form, terminal: e.target.value })} placeholder="e.g. Terminal D"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Departure Date *</label>
              <input type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Departure Time *</label>
              <input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Pier, parking, check-in info..."
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={adding || !form.ship_name || !form.departure_date || !form.departure_time}
            className="mt-4 px-5 py-2.5 rounded-xl text-white font-semibold text-[13px] disabled:opacity-40"
            style={{ backgroundColor: TEAL }}>
            {adding ? 'Adding...' : 'Add to Calendar'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="text-[18px]">🚢</span>
          <h3 className="font-extrabold text-[15px]">Upcoming Departures ({upcoming.length})</h3>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No upcoming cruises scheduled.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map(s => (
              <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{s.cruise_line || 'Cruise'}</span>
                    {s.terminal && <span className="text-[11px] text-gray-400">{s.terminal}</span>}
                  </div>
                  <p className="text-[15px] font-bold text-gray-900">{s.ship_name}</p>
                  <p className="text-[13px] text-gray-600">
                    {new Date(s.departure_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {s.departure_time.slice(0, 5)}
                  </p>
                  {s.notes && <p className="text-[11px] text-gray-400 mt-0.5">{s.notes}</p>}
                </div>
                {isAdmin && (
                  <button onClick={async () => { await deleteCruiseSchedule(s.id); load(); }}
                    className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Past Departures ({past.length})</summary>
          <div className="space-y-2 mt-3">
            {past.map(s => (
              <div key={s.id} className="flex items-center justify-between text-[12px] py-1">
                <span className="text-gray-500">{s.ship_name} · {s.departure_date} {s.departure_time.slice(0,5)}</span>
                {isAdmin && (
                  <button onClick={async () => { await deleteCruiseSchedule(s.id); load(); }} className="text-red-400 text-[11px]">Remove</button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── Vendor Dashboard ────────────────────────────────────── */
function VendorDashboard({ hotelId, vendorType, vendorName }: { hotelId: string; vendorType: string; vendorName: string }) {
  const isShuttle = vendorType === 'shuttle' || vendorType === 'taxi';
  const isCatering = vendorType === 'catering' || vendorType === 'restaurant';

  return (
    <div>
      {isShuttle && <ShuttleVendorView hotelId={hotelId} vendorName={vendorName} vendorType={vendorType} />}
      {isCatering && <RestaurantVendorView hotelId={hotelId} vendorName={vendorName} />}
      {!isShuttle && !isCatering && <GeneralVendorView hotelId={hotelId} vendorName={vendorName} vendorType={vendorType} />}
    </div>
  );
}

function ShuttleVendorView({ hotelId, vendorName, vendorType }: { hotelId: string; vendorName: string; vendorType: string }) {
  const [bookings, setBookings] = useState<ShuttleBooking[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [allBookings, allSlots] = await Promise.all([
      getAllShuttleBookingsForHotel(hotelId),
      getAllShuttleSlotsForHotel(hotelId),
    ]);
    setBookings(allBookings);
    setSlots(allSlots);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const today = new Date().toISOString().split('T')[0];
  const slotMap = Object.fromEntries(slots.map(s => [s.id, s]));
  const filteredBookings = bookings.filter(b => {
    if (!dateFilter) return true;
    const slot = slotMap[b.slot_id];
    return (slot?.date || today) === dateFilter;
  });
  const totalPax = filteredBookings.reduce((sum, b) => sum + (b.pax || 1), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Passenger Manifest</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · {vendorType} operator</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Bookings</p>
          <p className="text-[28px] font-extrabold text-teal-600">{filteredBookings.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Passengers</p>
          <p className="text-[28px] font-extrabold text-blue-600">{totalPax}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Routes Active</p>
          <p className="text-[28px] font-extrabold text-gray-700">{slots.length}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none" />
        {dateFilter && <button onClick={() => setDateFilter('')} className="text-[12px] text-gray-400">Clear</button>}
        <span className="text-[12px] text-gray-400">{dateFilter ? `Showing ${dateFilter}` : 'All bookings'}</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-[14px]">Booking List ({filteredBookings.length})</h3>
        </div>
        {filteredBookings.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No bookings found.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredBookings.map((b, i) => {
              const slot = slotMap[b.slot_id];
              return (
                <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-[12px] font-bold text-gray-400 w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-gray-900">{b.guest_name}</p>
                    <p className="text-[11px] text-gray-500">Room {b.room_number} · {b.pax} pax{b.notes ? ` · ${b.notes}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-gray-700">{slot?.route_name || b.route_name || '—'}</p>
                    <p className="text-[11px] text-gray-400">{slot?.departure_time?.slice(0,5) || '—'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {b.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RestaurantVendorView({ hotelId, vendorName }: { hotelId: string; vendorName: string }) {
  const [orders, setOrders] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('type', 'Food Order')
      .order('created_at', { ascending: false });
    setOrders((data || []) as Request[]);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await updateRequestStatus(id, status);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as Request['status'] } : o));
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = orders.filter(o => o.status === 'pending');
  const inProgress = orders.filter(o => o.status === 'in-progress');
  const completed = orders.filter(o => o.status === 'completed');

  const OrderCard = ({ order }: { order: Request }) => (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${order.status === 'pending' ? 'border-amber-300' : order.status === 'in-progress' ? 'border-teal-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[14px] font-bold text-gray-900">{order.guest_name}</p>
          <p className="text-[11px] text-gray-500">Room {order.room} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : order.status === 'in-progress' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
          {order.status}
        </span>
      </div>
      <p className="text-[13px] text-gray-700 mb-3 line-clamp-2">{order.details}</p>
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button onClick={() => updateStatus(order.id, 'in-progress')}
            className="flex-1 py-2 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
            Start Preparing
          </button>
        )}
        {order.status === 'in-progress' && (
          <button onClick={() => updateStatus(order.id, 'completed')}
            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[12px] font-bold">
            Mark Delivered
          </button>
        )}
        {order.status === 'completed' && (
          <span className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-400 text-[12px] font-bold text-center">Delivered</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Incoming Orders</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · Food & Beverage</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pending.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-teal-200 p-4 shadow-sm">
          <p className="text-[11px] text-teal-500 uppercase font-bold">Preparing</p>
          <p className="text-[28px] font-extrabold text-teal-600">{inProgress.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Delivered Today</p>
          <p className="text-[28px] font-extrabold text-gray-700">{completed.length}</p>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <UtensilsCrossed size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-400">No orders yet</p>
          <p className="text-[12px] text-gray-300 mt-1">New orders will appear here in real time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending ({pending.length})</p>
              {pending.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
          {inProgress.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wider mt-4">Preparing ({inProgress.length})</p>
              {inProgress.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
          {completed.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-4">Delivered ({completed.length})</p>
              {completed.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GeneralVendorView({ hotelId, vendorName, vendorType }: { hotelId: string; vendorName: string; vendorType: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(50);
    setRequests((data || []) as Request[]);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Vendor Dashboard</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · {vendorType}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Requests</p>
          <p className="text-[28px] font-extrabold text-teal-600">{requests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pending}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-[14px]">Recent Requests</h3>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No requests yet.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.map(r => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{r.guest_name} — Room {r.room}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">{r.type} · {r.details?.slice(0, 60)}{r.details?.length > 60 ? '…' : ''}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Enhanced Staff View ─────────────────────────────────── */
function StaffView({ hotelId, hotelName, hotelSlug, staff, onRefresh }: { hotelId: string; hotelName: string; hotelSlug: string; staff: StaffAccount[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', pin: '', role: 'staff', vendor_type: '' });
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [editingPerms, setEditingPerms] = useState<string | null>(null);
  const ALL_PERMS = ['orders', 'messages', 'shuttle', 'hotel', 'staff_mgmt', 'partners', 'qrcodes'];

  const handleAdd = async () => {
    setPinError('');
    if (!form.name || !form.pin) return;
    if (!/^\d{4,6}$/.test(form.pin)) {
      setPinError('PIN must be 4–6 digits.');
      return;
    }
    await createStaffAccountWithDetails({
      hotel_id: hotelId, name: form.name, role: form.role,
      email: form.email, phone: form.phone, pin_code: form.pin,
      permissions: form.role === 'vendor' ? [] : ['orders', 'messages', 'shuttle'],
      vendor_type: form.role === 'vendor' ? form.vendor_type || 'shuttle' : undefined,
    });

    if (form.email) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'staff_welcome',
          data: {
            staffEmail: form.email,
            staffName: form.name,
            staffRole: form.role,
            hotelName,
            hotelSlug,
            pin: form.pin,
          },
        }),
      }).catch(() => {});
    }

    setForm({ name: '', email: '', phone: '', pin: '', role: 'staff', vendor_type: '' });
    onRefresh();
  };

  const handlePermToggle = async (staffId: string, perm: string, current: string[]) => {
    const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
    await updateStaffPermissions(staffId, updated);
    onRefresh();
  };

  const handleToggleActive = async (s: StaffAccount) => {
    await updateStaffDetails(s.id!, { active: !s.active });
    onRefresh();
  };

  const permLabels: Record<string, string> = {
    orders: 'Live Orders', messages: 'Guest Messages', shuttle: 'Shuttle Ops',
    hotel: 'Hotel Settings', staff_mgmt: 'Staff Mgmt', partners: 'Partners', qrcodes: 'QR Codes',
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-[26px] font-extrabold text-gray-900 mb-6">Staff Management</h1>
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-[15px] mb-3">Add Staff Member</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="vendor">Vendor (external)</option>
                </select>
              </div>
            </div>
            {form.role === 'vendor' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Vendor Type</label>
                <select value={form.vendor_type} onChange={e => setForm({ ...form, vendor_type: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-orange-200 text-[13px] outline-none">
                  <option value="shuttle">Shuttle Company</option>
                  <option value="taxi">Taxi / Rideshare</option>
                  <option value="tour">Tour Operator</option>
                  <option value="catering">Catering</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-[10px] text-orange-600 mt-1">Vendors only see their own manifest — no hotel data.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@hotel.com"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="305-555-0100"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">PIN Code *</label>
              <div className="relative">
                <input type={showPin ? 'text' : 'password'} value={form.pin} onChange={e => { setForm({ ...form, pin: e.target.value }); setPinError(''); }} maxLength={6} placeholder="4-6 digits"
                  className={`w-full bg-gray-50 rounded-xl px-3 py-2.5 border text-[13px] outline-none pr-10 ${pinError ? 'border-red-400' : 'border-gray-200'}`} />
                <button onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPin ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {pinError && <p className="text-[11px] text-red-500 mt-1">{pinError}</p>}
            </div>
            <button onClick={handleAdd} className="w-full py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: '#0D9488' }}>ADD STAFF MEMBER</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-bold text-[15px]">Active Staff ({staff.filter(s => s.active).length})</h3></div>
          <div className="divide-y divide-gray-50">
            {staff.filter(s => s.active).length === 0 ? (
              <div className="px-5 py-6 text-center"><p className="text-[13px] text-gray-400">No staff accounts yet.</p></div>
            ) : staff.filter(s => s.active).map(s => (
              <div key={s.id} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{s.name}
                      <span className="text-[10px] text-gray-400 capitalize font-normal">· {s.role}{s.vendor_type ? ` (${s.vendor_type})` : ''}</span>
                    </p>
                    <p className="text-[11px] text-gray-400">{s.email}{s.email && s.phone ? ' · ' : ''}{s.phone} · PIN: ••••</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditingPerms(editingPerms === s.id ? null : s.id!)}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">Permissions</button>
                    <button onClick={() => handleToggleActive(s)} className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 text-amber-700">Deactivate</button>
                    <button onClick={() => { if(confirm('Delete?')) { deleteStaffAccount(s.id!); onRefresh(); } }}
                      className="text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
                {editingPerms === s.id && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ALL_PERMS.map(p => {
                      const has = (s.permissions || []).includes(p);
                      return (
                        <button key={p} onClick={() => handlePermToggle(s.id!, p, s.permissions || [])}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${has ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{permLabels[p]}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inactive staff */}
        {staff.filter(s => !s.active).length > 0 && (
          <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Inactive ({staff.filter(s => !s.active).length})</summary>
            <div className="space-y-2 mt-2">
              {staff.filter(s => !s.active).map(s => (
                <div key={s.id} className="flex items-center justify-between text-[12px] py-1">
                  <span className="text-gray-500">{s.name} · {s.role}</span>
                  <button onClick={() => handleToggleActive(s)} className="text-[10px] font-bold text-emerald-600">Reactivate</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/* ── Guest Home Preview ─────────────────────────────────── */
function GuestHomePreview({ color, hotelName }: { color: string; hotelName: string }) {
  const tiles = [
    { label: 'WELCOME', filled: true },
    { label: 'TRANSPORT', filled: false },
    { label: 'FACILITIES', filled: false },
    { label: 'MESSAGE', filled: false },
  ];
  return (
    <div className="relative mx-auto" style={{ width: 200, height: 400 }}>
      {/* Phone frame */}
      <div className="absolute inset-0 rounded-[28px] border-[6px] border-gray-800 bg-[#F4F4F5] overflow-hidden shadow-2xl">
        {/* Status bar */}
        <div className="bg-white px-3 pt-2 pb-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[9px] font-black text-black leading-none">Hello!</div>
              <div className="text-[6px] text-gray-400 mt-0.5">What do you need today?</div>
            </div>
            <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            </div>
          </div>
        </div>
        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-1 p-1.5 h-[160px]">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-xl flex items-center justify-center text-[6px] font-bold tracking-wider"
              style={t.filled
                ? { backgroundColor: color, color: 'white' }
                : { backgroundColor: 'white', color, border: '1px solid #e5e7eb' }}
            >
              {t.label}
            </div>
          ))}
        </div>
        {/* Restaurant banner */}
        <div className="mx-1.5 rounded-xl overflow-hidden" style={{ height: 44, backgroundColor: color, opacity: 0.15 }}>
          <div className="flex items-end h-full px-2 pb-1">
            <span className="text-[6px] font-bold" style={{ color }}>RESTAURANTS</span>
          </div>
        </div>
        {/* Bottom row */}
        <div className="flex gap-1 p-1.5 mt-1" style={{ height: 70 }}>
          <div className="w-[38%] rounded-xl" style={{ backgroundColor: color, opacity: 0.2 }} />
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex-1 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
              <span className="text-[5px] font-bold" style={{ color }}>NEARBY</span>
            </div>
            <div className="flex-1 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
              <span className="text-[5px] font-bold" style={{ color }}>REVIEW</span>
            </div>
          </div>
        </div>
        {/* Hotel name chip */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <div className="px-2 py-0.5 rounded-full text-white text-[5px] font-bold" style={{ backgroundColor: color }}>
            {hotelName || 'Your Hotel'}
          </div>
        </div>
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
    <div className="flex gap-8 p-8 min-h-full">
      {/* ── Left: Form ── */}
      <div className="flex-1 max-w-lg space-y-5">
        <h1 className="text-[26px] font-extrabold text-gray-900">Hotel Settings</h1>

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

        <Section title="Branding" Icon={Settings}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Set the accent color used across the guest-facing app. Preview updates live on the right.
          </p>
          <div className="flex items-center gap-3 mt-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Brand Color</label>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="color"
                value={form.brandColor || '#6B1D3C'}
                onChange={e => setForm({ ...form, brandColor: e.target.value })}
                className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5"
              />
              <input
                type="text"
                value={form.brandColor || '#6B1D3C'}
                onChange={e => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setForm({ ...form, brandColor: val });
                }}
                maxLength={7}
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100 font-mono focus:outline-none"
                placeholder="#6B1D3C"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {['#6B1D3C','#0D9488','#1D4ED8','#7C3AED','#B45309','#DC2626','#0F172A'].map(c => (
              <button
                key={c}
                onClick={() => setForm({ ...form, brandColor: c })}
                className="w-7 h-7 rounded-lg border-2 transition-transform active:scale-90"
                style={{ backgroundColor: c, borderColor: form.brandColor === c ? '#111' : 'transparent' }}
                title={c}
              />
            ))}
          </div>
          <Field label="Team Photo URL" value={form.teamPhotoUrl} onChange={v => setForm({ ...form, teamPhotoUrl: v })} placeholder="https://..." />
          <Field label="Website URL" value={form.websiteUrl} onChange={v => setForm({ ...form, websiteUrl: v })} placeholder="https://yourhotel.com" />
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

        <Section title="Review Links" Icon={ExternalLink}>
          <Field label="Google Review URL" value={form.googleReviewUrl} onChange={v => setForm({ ...form, googleReviewUrl: v })} placeholder="https://g.page/r/..." />
          <Field label="TripAdvisor URL" value={form.tripadvisorUrl} onChange={v => setForm({ ...form, tripadvisorUrl: v })} placeholder="https://tripadvisor.com/..." />
          <Field label="Yelp URL" value={form.yelpUrl} onChange={v => setForm({ ...form, yelpUrl: v })} placeholder="https://yelp.com/biz/..." />
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

        <Section title="Shuttle Management" Icon={Bus}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Shuttle routes, time slots, and bookings are managed from the <strong>Shuttle Schedule</strong> tab.
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Add airport, cruise port, or custom routes with departure times. Guests book slots from their app.
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

      {/* ── Right: Live Preview ── */}
      <div className="hidden lg:flex flex-col items-center gap-4 pt-12 sticky top-8 self-start">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Live Preview</p>
        <GuestHomePreview color={form.brandColor || '#6B1D3C'} hotelName={form.name} />
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: form.brandColor || '#6B1D3C' }}>
            {form.brandColor || '#6B1D3C'}
          </div>
          <p className="text-[10px] text-gray-400">Updates as you edit</p>
        </div>
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
    attenda_fee_percent: '15', hotel_revenue_share_percent: '5',
  });
  const [cloverForm, setCloverForm] = useState({
    merchantId: '', accessToken: '', refreshToken: '', enabled: false,
  });
  const [deliveryProviders, setDeliveryProviders] = useState<{ name: string; url: string }[]>([]);
  const [deliveryProviderForm, setDeliveryProviderForm] = useState({ name: '', url: '' });
  const [menuForm, setMenuForm] = useState<Record<string, { name: string; description: string; price: string }>>({});
  const [dpForm, setDpForm] = useState<Record<string, { name: string; url: string }>>({});
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
      delivery_providers: deliveryProviders,
      attenda_fee_percent: parseFloat(form.attenda_fee_percent) || 15,
      hotel_revenue_share_percent: parseFloat(form.hotel_revenue_share_percent) || 5,
    });
    setForm({ name: '', category: 'restaurant', description: '', image_url: '', phone: '', address: '', hours: '', distance: '', rating: '0', has_ordering: false, email: '', attenda_fee_percent: '15', hotel_revenue_share_percent: '5' });
    setCloverForm({ merchantId: '', accessToken: '', refreshToken: '', enabled: false });
    setDeliveryProviders([]);
    setDeliveryProviderForm({ name: '', url: '' });
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

            {/* ── Delivery Setup (restaurants only) ── */}
            {form.category === 'restaurant' && (
              <div className="col-span-2 mt-2 space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-1">Delivery Setup</p>

                {/* Tier A — Restaurant-managed */}
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <p className="text-[13px] font-bold text-gray-800 mb-0.5">A · Restaurant manages their own delivery</p>
                  <p className="text-[11px] text-gray-500 mb-3">Guests see tap-to-order buttons for their existing apps. Attenda just displays the links — zero extra cost.</p>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={deliveryProviderForm.name}
                      onChange={e => setDeliveryProviderForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                    >
                      <option value="">Choose app…</option>
                      <option value="Uber Eats">Uber Eats</option>
                      <option value="DoorDash">DoorDash</option>
                      <option value="Grubhub">Grubhub</option>
                      <option value="Order Inn">Order Inn</option>
                      <option value="Instacart">Instacart</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      placeholder="Paste their store link…"
                      value={deliveryProviderForm.url}
                      onChange={e => setDeliveryProviderForm(f => ({ ...f, url: e.target.value }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                    />
                    <button type="button"
                      onClick={() => {
                        if (!deliveryProviderForm.name || !deliveryProviderForm.url) return;
                        setDeliveryProviders(prev => [...prev, { name: deliveryProviderForm.name, url: deliveryProviderForm.url }]);
                        setDeliveryProviderForm({ name: '', url: '' });
                      }}
                      className="px-3 py-2 rounded-lg text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                      + Add
                    </button>
                  </div>
                  {deliveryProviders.length > 0 && (
                    <div className="space-y-1">
                      {deliveryProviders.map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <span className="text-[12px] font-semibold text-gray-800">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 max-w-[150px] truncate">{p.url}</span>
                            <button type="button" onClick={() => setDeliveryProviders(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><XIcon size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tier B — Attenda-powered */}
                <div className={`rounded-xl border-2 p-4 transition-colors ${form.has_ordering ? 'border-[#0D9488] bg-teal-50/40' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-2.5 mb-2">
                    <input type="checkbox" id="has_ordering" checked={form.has_ordering}
                      onChange={e => setForm({ ...form, has_ordering: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 shrink-0" />
                    <div>
                      <label htmlFor="has_ordering" className="text-[13px] font-bold text-gray-800 cursor-pointer">B · Attenda-powered delivery</label>
                      <p className="text-[11px] text-gray-500 mt-0.5">Restaurant saves vs. Uber Eats rates. Hotel earns revenue on every order. Exclusively powered by Clover POS.</p>
                    </div>
                  </div>

                  {form.has_ordering && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-teal-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Attenda charges restaurant</label>
                          <div className="relative">
                            <input type="number" min="1" max="50" step="0.5"
                              value={form.attenda_fee_percent}
                              onChange={e => setForm({ ...form, attenda_fee_percent: e.target.value })}
                              className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] border border-gray-200 focus:outline-none pr-7" />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hotel earns per order</label>
                          <div className="relative">
                            <input type="number" min="0" max="50" step="0.5"
                              value={form.hotel_revenue_share_percent}
                              onChange={e => setForm({ ...form, hotel_revenue_share_percent: e.target.value })}
                              className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] border border-gray-200 focus:outline-none pr-7" />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-teal-100 text-[11px] text-teal-700">
                        On a $100 order: restaurant pays ${((parseFloat(form.attenda_fee_percent) || 15)).toFixed(0)}, hotel earns ${((parseFloat(form.hotel_revenue_share_percent) || 5)).toFixed(0)}, Attenda keeps ${Math.max(0, (parseFloat(form.attenda_fee_percent) || 15) - (parseFloat(form.hotel_revenue_share_percent) || 5)).toFixed(0)}.
                      </div>
                      <div className="space-y-2">
                        <a href={`/api/clover-oauth?partner=new&hotel=${hotelId}`}
                          className="w-full py-2.5 rounded-lg font-bold text-[12px] flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700">
                          🔗 Connect Clover (OAuth)
                        </a>
                        <p className="text-[10px] text-gray-400 text-center">Exclusive Attenda × Clover integration</p>
                        <details className="text-[11px]">
                          <summary className="text-gray-400 cursor-pointer hover:text-gray-600">Enter credentials manually</summary>
                          <div className="space-y-2 mt-2">
                            <Field label="Clover Merchant ID" value={cloverForm.merchantId} onChange={v => setCloverForm({ ...cloverForm, merchantId: v })} placeholder="ABC123DEF456" />
                            <Field label="Clover Access Token" value={cloverForm.accessToken} onChange={v => setCloverForm({ ...cloverForm, accessToken: v })} placeholder="sk_..." />
                            <Field label="Clover Refresh Token" value={cloverForm.refreshToken} onChange={v => setCloverForm({ ...cloverForm, refreshToken: v })} placeholder="rt_..." />
                            <div className="flex items-center gap-2">
                              <input type="checkbox" id="clover_enabled" checked={cloverForm.enabled}
                                onChange={e => setCloverForm({ ...cloverForm, enabled: e.target.checked })} className="w-4 h-4 rounded" />
                              <label htmlFor="clover_enabled" className="text-[12px] font-medium text-gray-700">Enable Clover POS</label>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                    {p.delivery_providers && p.delivery_providers.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        {p.delivery_providers.length} app{p.delivery_providers.length > 1 ? 's' : ''} linked
                      </span>
                    )}
                    {p.has_ordering && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                        Attenda-powered
                      </span>
                    )}
                    {p.clover_enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        Clover ✓
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-[15px] text-gray-900">{p.name}</p>
                  {p.description && <p className="text-[12px] text-gray-500 mt-0.5 truncate">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {(p.has_ordering || (p.delivery_providers && p.delivery_providers.length > 0)) && (
                    <button onClick={() => toggle(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                      Manage {expanded === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                  {p.has_ordering && !p.clover_enabled && (
                    <a href={`/api/clover-oauth?partner=${p.id}&hotel=${hotelId}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-600 hover:bg-purple-100">
                      🔗 Connect Clover
                    </a>
                  )}
                  {p.has_ordering && p.clover_enabled && p.clover_merchant_id && p.clover_access_token && (
                    <button onClick={() => handleCloverSync(p)} disabled={syncing === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50">
                      {syncing === p.id ? 'Syncing…' : 'Sync Clover'}
                    </button>
                  )}
                  <button onClick={() => handleDelete(p.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expanded === p.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-5">

                  {/* ── Tier A: Own delivery apps ── */}
                  {p.category === 'restaurant' && (
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">A · Restaurant&apos;s own delivery apps</h4>
                      <div className="flex gap-2 mb-2">
                        <select value={dpForm[p.id]?.name || ''}
                          onChange={e => setDpForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))}
                          className="bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none">
                          <option value="">App…</option>
                          <option value="Uber Eats">Uber Eats</option>
                          <option value="DoorDash">DoorDash</option>
                          <option value="Grubhub">Grubhub</option>
                          <option value="Order Inn">Order Inn</option>
                          <option value="Instacart">Instacart</option>
                          <option value="Other">Other</option>
                        </select>
                        <input placeholder="Paste store link…" value={dpForm[p.id]?.url || ''}
                          onChange={e => setDpForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], url: e.target.value } }))}
                          className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
                        <button onClick={async () => {
                          const name = dpForm[p.id]?.name; const url = dpForm[p.id]?.url;
                          if (!name || !url) return;
                          await updatePartner(p.id, { delivery_providers: [...(p.delivery_providers || []), { name, url }] });
                          setDpForm(prev => ({ ...prev, [p.id]: { name: '', url: '' } }));
                          loadPartners();
                        }} className="px-3 py-2 rounded-lg text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                          + Add
                        </button>
                      </div>
                      {(p.delivery_providers || []).length > 0 ? (
                        <div className="space-y-1">
                          {(p.delivery_providers || []).map((dp, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <span className="text-[12px] font-semibold text-gray-800">{dp.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 max-w-[180px] truncate">{dp.url}</span>
                                <button onClick={async () => {
                                  await updatePartner(p.id, { delivery_providers: (p.delivery_providers || []).filter((_, j) => j !== i) });
                                  loadPartners();
                                }} className="text-red-400 hover:text-red-600"><XIcon size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400">No apps linked — guests will only see in-room ordering or contact info.</p>
                      )}
                    </div>
                  )}

                  {/* ── Tier B: Attenda-powered ── */}
                  {p.category === 'restaurant' && (
                    <div className={`rounded-xl border-2 p-4 ${p.has_ordering ? 'border-teal-200 bg-white' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[12px] font-bold text-gray-800">B · Attenda-powered delivery</p>
                          <p className="text-[11px] text-gray-500">Restaurant saves, hotel earns. Powered by Clover.</p>
                        </div>
                        <input type="checkbox" checked={p.has_ordering}
                          onChange={async e => { await updatePartner(p.id, { has_ordering: e.target.checked }); loadPartners(); }}
                          className="w-4 h-4 rounded" />
                      </div>
                      {p.has_ordering && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-teal-100">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Attenda charges</label>
                              <div className="relative">
                                <input type="number" min="1" max="50" step="0.5"
                                  defaultValue={p.attenda_fee_percent ?? 15}
                                  onBlur={async e => { await updatePartner(p.id, { attenda_fee_percent: parseFloat(e.target.value) || 15 }); loadPartners(); }}
                                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none pr-6" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">%</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hotel earns</label>
                              <div className="relative">
                                <input type="number" min="0" max="50" step="0.5"
                                  defaultValue={p.hotel_revenue_share_percent ?? 5}
                                  onBlur={async e => { await updatePartner(p.id, { hotel_revenue_share_percent: parseFloat(e.target.value) || 5 }); loadPartners(); }}
                                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none pr-6" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Menu items (Attenda-powered only) ── */}
                  {p.has_ordering && (
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu Items</h4>
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
  const [startRoom, setStartRoom] = useState(101);

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
        <h3 className="font-bold text-[14px] mb-2">Batch Generate All Rooms</h3>
        <p className="text-[12px] text-gray-400 mb-3">
          If the hotel has room_count configured, generate all room QR codes at once.
        </p>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Starting room number</label>
            <input
              type="number"
              value={startRoom}
              onChange={e => setStartRoom(parseInt(e.target.value) || 101)}
              className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={async () => {
                const cfg = await getHotelConfig();
                const roomCount = cfg?.roomCount || 0;
                if (!roomCount) return alert('No room count configured. Set it in Hotel Settings first.');
                let count = 0;
                let skipped = 0;
                for (let i = 0; i < roomCount; i++) {
                  const room = (startRoom + i).toString();
                  const exists = codes.some(c => c.label === room);
                  if (!exists) {
                    await createQrCode(hotelId, room, 'room', getUrl(room));
                    count++;
                  } else {
                    skipped++;
                  }
                }
                alert(`✅ Generated ${count} new QR codes (${skipped} already existed, skipped)`);
                loadCodes();
              }}
              className="px-5 py-3 rounded-xl text-white font-semibold text-[13px] whitespace-nowrap"
              style={{ backgroundColor: TEAL }}
            >
              Generate All Room QR Codes
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h3 className="font-bold text-[14px] mb-4">Generate Single QR Code</h3>
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
                  <Image src={qrImgUrl} alt={`QR for ${code.label}`} width={80} height={80} className="rounded-lg border border-gray-100 shrink-0" unoptimized />
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
      const hotel = await createHotel({ slug: form.slug, name: form.name, adminEmail: form.adminEmail || undefined });
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

/* ── Knowledge Base View ────────────────────────────────── */
const KB_CATEGORIES = ['General', 'WiFi & Tech', 'Amenities', 'Transport', 'Food & Dining', 'Check-in / Check-out', 'Safety', 'Local Area'];

function KnowledgeBaseView({ hotelId }: { hotelId: string }) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ category: 'General', question: '', answer: '', keywords: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setEntries(await getAllKnowledgeBase(hotelId));
    setLoading(false);
  };

  useEffect(() => { load(); }, [hotelId, load]);

  const resetForm = () => { setForm({ category: 'General', question: '', answer: '', keywords: '' }); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    const keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (editingId) {
      await updateKnowledgeEntry(editingId, { category: form.category, question: form.question.trim(), answer: form.answer.trim(), keywords });
    } else {
      await createKnowledgeEntry({ hotel_id: hotelId, category: form.category, question: form.question.trim(), answer: form.answer.trim(), keywords });
    }
    await load();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (e: KnowledgeEntry) => {
    setForm({ category: e.category, question: e.question, answer: e.answer, keywords: (e.keywords || []).join(', ') });
    setEditingId(e.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await deleteKnowledgeEntry(id);
    await load();
  };

  const handleToggle = async (e: KnowledgeEntry) => {
    await updateKnowledgeEntry(e.id, { active: !e.active });
    await load();
  };

  const usedCategories = ['All', ...Array.from(new Set(entries.map(e => e.category)))];
  const visible = entries.filter(e => {
    const catOk = filterCat === 'All' || e.category === filterCat;
    const searchOk = !search || e.question.toLowerCase().includes(search.toLowerCase()) || e.answer.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const grouped: Record<string, KnowledgeEntry[]> = {};
  visible.forEach(e => { if (!grouped[e.category]) grouped[e.category] = []; grouped[e.category].push(e); });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold text-gray-900">Knowledge Base</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage Q&A that the chatbot uses to answer guests automatically</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-sm"
          style={{ backgroundColor: TEAL }}>
          <Plus size={15} /> Add Entry
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[15px]">{editingId ? 'Edit Entry' : 'New Knowledge Entry'}</h3>
            <button onClick={resetForm}><XIcon size={18} className="text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none">
                {KB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Question / Topic</label>
              <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="e.g. What time is breakfast served?"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Answer</label>
              <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                placeholder="e.g. Complimentary breakfast is served 6:30 AM – 9:30 AM daily in the lobby."
                rows={3}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Keywords (comma-separated, optional)</label>
              <input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                placeholder="e.g. breakfast, food, morning, eat"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none" />
              <p className="text-[11px] text-gray-400 mt-1">Helps the chatbot match guest messages more accurately</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.question.trim() || !form.answer.trim()}
              className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add to Knowledge Base'}
            </button>
            <button onClick={resetForm} className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-[14px]">Cancel</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Entries', count: entries.length, color: 'text-gray-800' },
          { label: 'Active', count: entries.filter(e => e.active).length, color: 'text-emerald-600' },
          { label: 'Categories', count: new Set(entries.map(e => e.category)).size, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p>
            <p className={`text-[26px] font-extrabold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search questions & answers…"
          className="flex-1 min-w-[200px] bg-white rounded-xl px-3.5 py-2 border border-gray-200 text-[13px] outline-none" />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {usedCategories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${filterCat === c ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
              style={filterCat === c ? { backgroundColor: TEAL } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: TEAL }} /></div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-500">No entries yet</p>
          <p className="text-[12px] text-gray-400 mt-1">Add Q&A pairs to help the chatbot answer guests automatically</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
              <div className="space-y-2">
                {items.map(entry => (
                  <div key={entry.id} className={`bg-white rounded-xl border p-4 shadow-sm transition-opacity ${entry.active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-gray-900 mb-1">{entry.question}</p>
                        <p className="text-[13px] text-gray-600 leading-relaxed">{entry.answer}</p>
                        {entry.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.keywords.map((k, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500 font-medium">{k}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleToggle(entry)} title={entry.active ? 'Deactivate' : 'Activate'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${entry.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                          {entry.active ? <Check size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button onClick={() => handleEdit(entry)}
                          className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(entry.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Guests View ──────────────────────────────────────── */
interface GuestSessionData {
  name: string;
  room: string;
  checkout: string;
  checkedIn: string;
  validationStatus?: 'pending' | 'confirmed';
  validatedAt?: string;
  lastSeen?: string;
}

function GuestsView({ hotelId }: { hotelId: string }) {
  const [guests, setGuests] = useState<GuestSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  useEffect(() => {
    loadGuests();
    // Subscribe to localStorage changes for real-time updates
    const handleStorage = () => loadGuests();
    window.addEventListener('storage', handleStorage);
    // Poll for updates every 5 seconds
    const interval = setInterval(loadGuests, 5000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const loadGuests = () => {
    // In a real implementation, this would fetch from a database
    // For now, we check localStorage and also track requests to see active guests
    const stored = localStorage.getItem('guestSession');
    const guestList: GuestSessionData[] = [];

    if (stored) {
      try {
        const session = JSON.parse(stored);
        guestList.push({
          name: session.name,
          room: session.room,
          checkout: session.checkout,
          checkedIn: session.checkedIn,
          validationStatus: session.validationStatus || 'pending',
          validatedAt: session.validatedAt,
          lastSeen: new Date().toISOString(),
        });
      } catch {}
    }

    // Also get guests from recent requests (real-time data)
    supabase
      .from('requests')
      .select('guest_name, room')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          const seen = new Set(guestList.map(g => `${g.name}-${g.room}`));
          data.forEach((r: { guest_name: string; room: string }) => {
            const key = `${r.guest_name}-${r.room}`;
            if (!seen.has(key)) {
              seen.add(key);
              guestList.push({
                name: r.guest_name,
                room: r.room,
                checkout: '',
                checkedIn: '',
                validationStatus: 'pending',
                lastSeen: new Date().toISOString(),
              });
            }
          });
          setGuests(guestList);
          setLoading(false);
        }
      });
  };

  const confirmGuest = (guest: GuestSessionData) => {
    // Update localStorage if it's the current session
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.name === guest.name && session.room === guest.room) {
          session.validationStatus = 'confirmed';
          session.validatedAt = new Date().toISOString();
          localStorage.setItem('guestSession', JSON.stringify(session));
          // Broadcast to other tabs
          window.dispatchEvent(new StorageEvent('storage'));
        }
      } catch {}
    }
    loadGuests();
  };

  const filteredGuests = guests.filter(g => {
    if (filter === 'pending') return g.validationStatus !== 'confirmed';
    if (filter === 'confirmed') return g.validationStatus === 'confirmed';
    return true;
  });

  const confirmedCount = guests.filter(g => g.validationStatus === 'confirmed').length;
  const pendingCount = guests.length - confirmedCount;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Guest Check-ins</h1>
        <button onClick={loadGuests} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Guests</p>
          <p className="text-[28px] font-extrabold text-gray-900">{guests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-emerald-500 uppercase font-bold">Confirmed</p>
          <p className="text-[28px] font-extrabold text-emerald-600">{confirmedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'confirmed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              filter === f
                ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All Guests' : f === 'pending' ? 'Pending' : 'Confirmed'}
          </button>
        ))}
      </div>

      {/* Guest List */}
      <div className="space-y-3">
        {filteredGuests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <Users size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500">No guests found.</p>
          </div>
        ) : (
          filteredGuests.map((guest, i) => (
            <div
              key={`${guest.name}-${guest.room}-${i}`}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      guest.validationStatus === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                      guest.validationStatus === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {guest.validationStatus === 'confirmed' ? 'Validated' : 'Pending Validation'}
                    </span>
                  </div>
                  <p className="text-[16px] font-bold text-gray-900">{guest.name}</p>
                  <p className="text-[13px] text-gray-500">Room {guest.room}</p>
                  {guest.checkout && (
                    <p className="text-[12px] text-gray-400 mt-1">
                      Checkout: {new Date(guest.checkout).toLocaleDateString()}
                    </p>
                  )}
                  {guest.validatedAt && (
                    <p className="text-[11px] text-emerald-600 mt-1">
                      Confirmed at {new Date(guest.validatedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {guest.validationStatus !== 'confirmed' ? (
                    <button
                      onClick={() => confirmGuest(guest)}
                      className="px-4 py-2 rounded-lg text-white text-[12px] font-bold bg-emerald-500 hover:bg-emerald-600 transition-colors"
                    >
                      Confirm Guest
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[12px] font-bold">
                      ✓ Confirmed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Note */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-[13px] text-amber-800">
          <strong>Note:</strong> Since PMS integration is not yet active, guests show as &quot;Pending&quot; until manually confirmed by staff.
          Guests can still use the app while pending, but they will need to validate before placing orders or booking transport.
        </p>
      </div>
    </div>
  );
}
