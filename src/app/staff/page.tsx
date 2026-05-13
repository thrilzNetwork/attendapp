'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell, MessageSquare, Bus, Settings, Users, UtensilsCrossed,
  LogOut, RefreshCw, Plus, Trash2, Eye, EyeOff, Save,
  Wifi, Hotel as HotelIcon, ExternalLink, ImageIcon, type LucideIcon,
} from 'lucide-react';
import {
  supabase, subscribeToRequests, updateRequestStatus, deleteRequest,
  getHotelConfig, updateHotelConfig, HotelConfig,
  getStaffAccounts, createStaffAccount, deleteStaffAccount, StaffAccount,
} from '@/lib/supabase';

/* ── Types ─────────────────────────────────────────────── */
type Role = 'admin' | 'staff';
type NavTab = 'orders' | 'messages' | 'shuttle' | 'hotel' | 'staff_mgmt' | 'restaurants';

interface Request {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
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
const TEAL = '#0D9488';

const NAV: { tab: NavTab; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { tab: 'orders',      label: 'Live Orders',       icon: Bell,            roles: ['admin', 'staff'] },
  { tab: 'messages',    label: 'Guest Messages',     icon: MessageSquare,   roles: ['admin', 'staff'] },
  { tab: 'shuttle',     label: 'Shuttle Schedule',   icon: Bus,             roles: ['admin', 'staff'] },
  { tab: 'hotel',       label: 'Hotel Settings',     icon: Settings,        roles: ['admin'] },
  { tab: 'staff_mgmt',  label: 'Staff Management',   icon: Users,           roles: ['admin'] },
  { tab: 'restaurants', label: 'Restaurant Orders',  icon: UtensilsCrossed, roles: ['admin'] },
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

  const handleLogin = async () => {
    setPinError('');
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
    const [req, msg] = await Promise.all([
      supabase.from('requests').select('*').order('created_at', { ascending: false }),
      supabase.from('messages').select('*').order('created_at', { ascending: false }),
    ]);
    if (req.data) setRequests(req.data);
    if (msg.data) setMessages(msg.data);
    if (role === 'admin') {
      const [cfg, stf] = await Promise.all([getHotelConfig(), getStaffAccounts()]);
      if (cfg) setConfig(cfg);
      setStaff(stf);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    reload(session.role);
    const ch = subscribeToRequests(() =>
      supabase.from('requests').select('*').order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setRequests(data); })
    );
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
            style={{ focusBorderColor: TEAL } as React.CSSProperties}
          />
          {pinError && <p className="text-red-500 text-[12px] text-center mb-2">{pinError}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px]"
            style={{ backgroundColor: TEAL }}
          >
            ACCESS DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  /* ── Dashboard ────────────────────────────────────── */
  const visibleNav = NAV.filter(n => n.roles.includes(session.role));
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const foodOrders = requests.filter(r =>
    ['food_order', 'order', 'restaurant', 'food'].some(kw => r.type?.toLowerCase().includes(kw))
  );

  return (
    <div className="min-h-screen bg-white flex">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="w-[230px] bg-[#F3F4F6] flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div className="px-5 pt-5 pb-4">
          <div className="inline-flex items-center justify-center w-10 h-6 rounded mb-2" style={{ backgroundColor: `${TEAL}20` }}>
            <span className="text-[10px] font-bold" style={{ color: TEAL }}>A</span>
          </div>
          <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
            {config?.name || 'Attenda Hotel'}
          </h2>
          <p className="text-[12px] text-gray-500">Miami, FL</p>
        </div>

        <div className="px-5 py-3 border-t border-gray-200/60">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Logged in as</p>
          <p className="text-[14px] font-semibold text-gray-900">{session.name}</p>
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${session.role === 'admin' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
            {session.role === 'admin' ? 'Admin' : 'Staff'}
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
            <a
              href={config.googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-teal-600 transition-colors"
            >
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
      <main className="flex-1 overflow-auto bg-[#FAFAFA]">
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
            isAdmin={session.role === 'admin'}
            onGoToSettings={() => setTab('hotel')}
          />
        )}
        {tab === 'hotel' && session.role === 'admin' && config && (
          <HotelSettingsView
            config={config}
            onSaved={async () => { const c = await getHotelConfig(); if (c) setConfig(c); }}
          />
        )}
        {tab === 'staff_mgmt' && session.role === 'admin' && (
          <StaffView staff={staff} onRefresh={async () => setStaff(await getStaffAccounts())} />
        )}
        {tab === 'restaurants' && session.role === 'admin' && (
          <RestaurantView
            orders={foodOrders}
            onStatusChange={async (id, s) => { await updateRequestStatus(id, s); reload(session.role); }}
            onRefresh={() => reload(session.role)}
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
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const active = requests.filter(r => r.status !== 'completed');
  const completed = requests.filter(r => r.status === 'completed');
  const visible = tab === 'active' ? active : completed;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Live Orders</h1>
        <button onClick={onRefresh} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', count: requests.filter(r => r.status === 'pending').length, color: 'text-amber-600' },
          { label: 'In Progress', count: requests.filter(r => r.status === 'in-progress').length, color: 'text-blue-600' },
          { label: 'Completed', count: requests.filter(r => r.status === 'completed').length, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p>
            <p className={`text-[28px] font-extrabold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {(['active', 'completed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              tab === t ? 'bg-white border border-gray-200 text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {t === 'active' ? `Active (${active.length})` : `Completed (${completed.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <p className="text-[13px] text-gray-500">{tab === 'active' ? 'No active orders.' : 'No completed orders.'}</p>
          </div>
        ) : visible.map(req => (
          <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${req.status === 'pending' ? 'bg-amber-400' : req.status === 'in-progress' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{req.type}</span>
                <span className="text-[11px] text-gray-400">• {new Date(req.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[14px] font-bold text-gray-900 mb-0.5">{req.guest_name} — Room {req.room}</p>
              <p className="text-[13px] text-gray-600 truncate">{req.details}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {req.status === 'pending' && (
                <>
                  <button onClick={() => onStatusChange(req.id, 'in-progress')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold hover:opacity-80"
                    style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                    Start
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
        ))}
      </div>
    </div>
  );
}

/* ── Messages View ──────────────────────────────────────── */
function MessagesView({ messages }: { messages: Message[] }) {
  return (
    <div className="p-8">
      <h1 className="text-[26px] font-extrabold text-gray-900 mb-6">Guest Messages</h1>
      {messages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500">No messages yet.</p>
          <p className="text-[11px] text-gray-400 mt-1">Messages sent by guests appear here in real time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[14px] font-bold text-gray-900">{msg.guest_name} — Room {msg.room}</p>
                <span className="text-[11px] text-gray-400">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[13px] text-gray-700 leading-snug">{msg.body}</p>
            </div>
          ))}
        </div>
      )}
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

  const handleSave = async () => {
    await updateHotelConfig(form);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-[26px] font-extrabold text-gray-900 mb-6">Hotel Settings</h1>
      <div className="space-y-5">
        <Section title="Hotel Identity" Icon={HotelIcon}>
          <Field label="Hotel Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Field label="Manager Name" value={form.managerName} onChange={v => setForm({ ...form, managerName: v })} />
          <Field label="Front Desk Phone" value={form.frontDeskPhone} onChange={v => setForm({ ...form, frontDeskPhone: v })} />
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

        <Section title="Operations Sheet" Icon={ExternalLink}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Paste a Google Sheet URL. In Google Sheets: File → Share → Publish to web → Copy link.
          </p>
          <Field
            label="Google Sheet URL"
            value={form.googleSheetUrl}
            onChange={v => setForm({ ...form, googleSheetUrl: v })}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
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

/* ── Restaurant View ──────────────────────────────────────── */
function RestaurantView({ orders, onStatusChange, onRefresh }: {
  orders: Request[];
  onStatusChange: (id: string, status: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Restaurant Orders</h1>
        <button onClick={onRefresh} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <UtensilsCrossed size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No food orders yet.</p>
          <p className="text-[11px] text-gray-400 mt-1">Guest orders from the Restaurants section appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${req.status === 'pending' ? 'bg-amber-400' : req.status === 'in-progress' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase">{req.type}</span>
                  <span className="text-[11px] text-gray-400">• {new Date(req.created_at).toLocaleString()}</span>
                </div>
                <p className="text-[14px] font-bold text-gray-900">{req.guest_name} — Room {req.room}</p>
                <p className="text-[13px] text-gray-600 whitespace-pre-wrap">{req.details}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {req.status === 'pending' && (
                  <button onClick={() => onStatusChange(req.id, 'in-progress')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                    style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                    Notify Restaurant
                  </button>
                )}
                {req.status === 'in-progress' && (
                  <button onClick={() => onStatusChange(req.id, 'completed')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                    Mark Done
                  </button>
                )}
                {req.status === 'completed' && (
                  <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-bold">Done</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
