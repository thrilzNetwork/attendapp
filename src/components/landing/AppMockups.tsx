'use client';

/**
 * High-fidelity in-code mockups of the actual Attenda app screens.
 * These replicate the real UI pixel-for-pixel so the landing page always
 * shows what the product actually looks like — no screenshot drift.
 */

import React, { useState, useEffect } from 'react';
import {
  Bell, Bus, ChevronRight, Clock, DollarSign,
  Home, LayoutDashboard, LogOut, MessageSquare,
  Star, Users, Calendar, ClipboardList,
  TrendingUp, Wrench, Utensils, ShoppingBag, Phone, Layers, Truck, MapPin,
} from 'lucide-react';

const TEAL = '#0D9488';

/* ─── tiny shared atoms ─────────────────────────────────────── */

function PulsingDot({ color = '#22c55e' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: color }} />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

/* ─── iOS-style status bar (time · signal · wifi · battery) ──── */
export function PhoneStatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-5 pt-2.5 pb-1 shrink-0 text-[9px] font-bold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
      <span>9:41</span>
      <div className="flex items-center gap-1">
        {/* signal */}
        <svg width="12" height="8" viewBox="0 0 13 9" fill="currentColor" aria-hidden>
          <rect x="0" y="6" width="2" height="3" rx="0.5" />
          <rect x="3.5" y="4" width="2" height="5" rx="0.5" />
          <rect x="7" y="2" width="2" height="7" rx="0.5" />
          <rect x="10.5" y="0" width="2" height="9" rx="0.5" />
        </svg>
        {/* wifi */}
        <svg width="11" height="8" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
          <path d="M2 6.5C8 1 16 1 22 6.5" />
          <path d="M6 10.5c4-3.5 8-3.5 12 0" />
          <path d="M10.5 14.5c1-1 2-1 3 0" />
        </svg>
        {/* battery */}
        <div className="flex items-center">
          <div className={`h-[8px] w-[16px] rounded-[2.5px] border p-[1.5px] ${dark ? 'border-white/60' : 'border-gray-400'}`}>
            <div className="h-full w-[78%] rounded-[1px] bg-current" />
          </div>
          <div className={`ml-[1px] h-[3px] w-[1.5px] rounded-r-sm ${dark ? 'bg-white/60' : 'bg-gray-400'}`} />
        </div>
      </div>
    </div>
  );
}

/* ─── Top nav bar shared by all staff screens ─────────────────── */
function MobileTopBar({
  hotel = 'Sandor Hotel',
  name = 'Maria G.',
  role = 'Front Desk',
  activeTab,
  tabs,
}: {
  hotel?: string;
  name?: string;
  role?: string;
  activeTab: string;
  tabs: { id: string; label: string; icon: React.ReactNode; badge?: number }[];
}) {
  return (
    <div className="bg-white border-b border-gray-200 shrink-0">
      <PhoneStatusBar />
      <div className="flex items-center justify-between px-3 py-2">
        <div>
          <p className="text-[11px] font-bold text-gray-900 leading-tight">{hotel}</p>
          <p className="text-[9px] text-gray-500">
            {name} · <span className="font-semibold text-teal-600">{role}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PulsingDot />
          <span className="text-[8px] text-gray-400 font-semibold">Live</span>
          <LogOut size={10} className="text-gray-300" />
        </div>
      </div>
      <div className="flex overflow-x-hidden bg-gray-50 border-t border-gray-100">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`shrink-0 flex items-center gap-1 px-3 py-2 text-[9px] font-bold transition-colors whitespace-nowrap ${
              activeTab === t.id ? 'text-white' : 'text-gray-400'
            }`}
            style={activeTab === t.id ? { backgroundColor: TEAL } : {}}
          >
            {t.icon}
            {t.label}
            {t.badge ? (
              <span className="bg-amber-400 text-white text-[7px] font-bold px-1 rounded-full">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   1.  REQUESTS / FRONT DESK VIEW (mobile)
   ════════════════════════════════════════════════════════════════ */

const REQUESTS = [
  { room: '214', name: 'James K.', type: 'Extra towels', time: '2m ago', status: 'pending', avatar: 'JK' },
  { room: '108', name: 'Sofia R.', type: 'Late checkout 1 PM?', time: '8m ago', status: 'in_progress', avatar: 'SR' },
  { room: '301', name: 'David M.', type: 'Shuttle 3:30 PM airport', time: '15m ago', status: 'pending', avatar: 'DM' },
  { room: '412', name: 'Priya L.', type: 'WiFi password reset', time: '22m ago', status: 'resolved', avatar: 'PL' },
  { room: '205', name: 'Carlos V.', type: 'Restaurant recommendation', time: '1h ago', status: 'resolved', avatar: 'CV' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending',     color: '#D97706', bg: '#FEF3C7' },
  in_progress: { label: 'In Progress', color: TEAL,      bg: '#CCFBF1' },
  resolved:    { label: 'Resolved',    color: '#16A34A', bg: '#DCFCE7' },
};

export function RequestsScreenMockup() {
  const [active, setActive] = useState<number | null>(null);
  const [incoming, setIncoming] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setIncoming(true);
      return;
    }
    const id = setInterval(() => setActive(v => (v === null ? 0 : v === 4 ? null : v + 1)), 1800);
    const t = setTimeout(() => setIncoming(true), 2400);
    return () => { clearInterval(id); clearTimeout(t); };
  }, []);

  const TABS = [
    { id: 'orders',    label: 'Requests', icon: <ClipboardList size={9} />, badge: 2 },
    { id: 'messages',  label: 'Messages', icon: <MessageSquare size={9} /> },
    { id: 'shuttle',   label: 'Shuttle',  icon: <Bus size={9} /> },
    { id: 'schedule',  label: 'Schedule', icon: <Calendar size={9} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] text-left overflow-hidden">
      <MobileTopBar activeTab="orders" tabs={TABS} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {[
          { label: 'Pending', value: incoming ? '3' : '2', color: '#D97706' },
          { label: 'Active', value: '1', color: TEAL },
          { label: 'Resolved', value: '8', color: '#16A34A' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-[16px] font-black leading-tight" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-hidden">
        {['All', 'Pending', 'Active', 'Resolved'].map((f, i) => (
          <span
            key={f}
            className="shrink-0 px-2 py-0.5 rounded-full text-[8px] font-bold"
            style={i === 0 ? { backgroundColor: TEAL, color: 'white' } : { backgroundColor: '#F3F4F6', color: '#6B7280' }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Request list */}
      <div className="flex-1 overflow-hidden px-3 pb-3 space-y-2">
        {incoming && (
          <div className="animate-row-in bg-white rounded-xl border p-2.5 shadow-sm" style={{ borderColor: TEAL, boxShadow: `0 0 0 1px ${TEAL}25, 0 4px 10px -4px ${TEAL}30` }}>
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[8px] font-black shrink-0" style={{ backgroundColor: TEAL }}>
                AN
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black text-gray-900 flex items-center gap-1">
                    Room 118 <PulsingDot color="#D97706" />
                  </span>
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: '#D97706', backgroundColor: '#FEF3C7' }}>
                    New
                  </span>
                </div>
                <p className="text-[9px] text-gray-700 leading-snug mt-0.5 truncate">Ice bucket + extra pillows</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[8px] text-gray-400">Ana N. · just now</span>
                  <button className="text-[7px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: TEAL }}>
                    Accept
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {REQUESTS.map((r, i) => {
          const meta = STATUS_META[r.status];
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm transition-all duration-300"
              style={active === i ? { borderColor: TEAL, boxShadow: `0 0 0 1px ${TEAL}30` } : {}}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[8px] font-black shrink-0"
                  style={{ backgroundColor: TEAL }}
                >
                  {r.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black text-gray-900">Room {r.room}</span>
                    <span
                      className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: meta.color, backgroundColor: meta.bg }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-700 leading-snug mt-0.5 truncate">{r.type}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[8px] text-gray-400">{r.name} · {r.time}</span>
                    {r.status === 'pending' && (
                      <button
                        className="text-[7px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: TEAL }}
                      >
                        Accept
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   2.  SCHEDULE VIEW (mobile)
   ════════════════════════════════════════════════════════════════ */

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STAFF_ROWS = [
  { name: 'Maria G.',  dept: 'Front Desk',   color: '#0D9488', shifts: [1,1,1,1,1,0,0] },
  { name: 'Carlos V.', dept: 'Housekeeping', color: '#3B82F6', shifts: [1,1,0,1,1,1,0] },
  { name: 'Priya L.',  dept: 'Front Desk',   color: '#0D9488', shifts: [0,1,1,1,1,0,1] },
  { name: 'James K.',  dept: 'Maintenance',  color: '#8B5CF6', shifts: [1,0,1,1,0,1,1] },
  { name: 'Sofia R.',  dept: 'Housekeeping', color: '#3B82F6', shifts: [1,1,1,0,1,0,1] },
];

const DEPT_COLORS: Record<string, string> = {
  'Front Desk': '#0D9488',
  'Housekeeping': '#3B82F6',
  'Maintenance': '#8B5CF6',
};

export function ScheduleScreenMockup() {
  const [today] = useState(2); // Wednesday highlighted

  const TABS = [
    { id: 'dailybrief', label: 'Dashboard', icon: <LayoutDashboard size={9} /> },
    { id: 'schedule',   label: 'Schedule',  icon: <Calendar size={9} /> },
    { id: 'orders',     label: 'Requests',  icon: <ClipboardList size={9} />, badge: 2 },
    { id: 'staff',      label: 'Staff',     icon: <Users size={9} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] overflow-hidden">
      <MobileTopBar name="Alex S." role="Admin" activeTab="schedule" tabs={TABS} />

      {/* Week header */}
      <div className="bg-white border-b border-gray-100 px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black text-gray-900">Week of Jun 16</span>
          <div className="flex gap-1">
            <button className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center">
              <ChevronRight size={10} className="text-gray-500 rotate-180" />
            </button>
            <button className="w-5 h-5 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: TEAL }}>
              <ChevronRight size={10} />
            </button>
          </div>
        </div>

        {/* Day columns header */}
        <div className="grid grid-cols-8 gap-0.5">
          <div className="text-[7px] text-gray-400 font-bold" />
          {DAYS.map((d, i) => (
            <div
              key={i}
              className="text-center py-0.5 rounded text-[8px] font-bold"
              style={i === today ? { backgroundColor: TEAL, color: 'white' } : { color: '#9CA3AF' }}
            >
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Dept legend */}
      <div className="flex gap-2 px-3 py-2 bg-white border-b border-gray-100">
        {Object.entries(DEPT_COLORS).map(([dept, color]) => (
          <div key={dept} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[7px] text-gray-500 font-semibold">{dept}</span>
          </div>
        ))}
      </div>

      {/* Schedule grid */}
      <div className="flex-1 overflow-hidden px-3 py-2 space-y-1.5">
        {STAFF_ROWS.map((row, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-2">
            <div className="grid grid-cols-8 gap-0.5 items-center">
              <div className="col-span-1">
                <div className="text-[8px] font-black text-gray-800 leading-tight">{row.name.split(' ')[0]}</div>
                <div className="w-2 h-0.5 rounded mt-0.5" style={{ backgroundColor: row.color }} />
              </div>
              {row.shifts.map((on, j) => (
                <div
                  key={j}
                  className="h-6 rounded flex items-center justify-center text-[6px] font-bold transition-all"
                  style={
                    on
                      ? { backgroundColor: `${row.color}20`, color: row.color, border: `1px solid ${row.color}40` }
                      : j === today
                      ? { backgroundColor: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A560', borderRadius: '4px' }
                      : { backgroundColor: '#F9FAFB', color: '#D1D5DB' }
                  }
                >
                  {on ? '●' : j === today ? 'OFF' : '·'}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add shift button */}
        <button
          className="w-full py-2 rounded-xl border border-dashed border-gray-200 text-[9px] font-bold text-gray-400 flex items-center justify-center gap-1"
        >
          + Add shift
        </button>
      </div>

      {/* Coverage summary */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-gray-400 font-semibold">This week: 28 shifts</span>
          <span className="text-[8px] font-bold" style={{ color: TEAL }}>4 depts covered</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   3.  GM / ADMIN DASHBOARD (mobile)
   ════════════════════════════════════════════════════════════════ */

const BAR_DATA = [
  { d: 'M', h: 55 }, { d: 'T', h: 72 }, { d: 'W', h: 48 }, { d: 'T', h: 85 },
  { d: 'F', h: 91 }, { d: 'S', h: 100 }, { d: 'S', h: 78 },
];

export function AdminDashboardMockup() {
  const [animBars, setAnimBars] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimBars(true), 300);
    return () => clearTimeout(t);
  }, []);

  const TABS = [
    { id: 'dailybrief', label: 'Dashboard',  icon: <LayoutDashboard size={9} /> },
    { id: 'kpi',        label: 'KPIs',       icon: <TrendingUp size={9} /> },
    { id: 'revenue',    label: 'Revenue',    icon: <DollarSign size={9} /> },
    { id: 'staff',      label: 'Staff',      icon: <Users size={9} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] overflow-hidden">
      <MobileTopBar name="Alex S." role="GM / Admin" activeTab="dailybrief" tabs={TABS} />

      <div className="flex-1 overflow-hidden px-3 py-2.5 space-y-2.5">

        {/* Greeting */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black text-gray-900">Good morning, Alex 👋</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Tuesday, Jun 17 · 3 alerts need attention</p>
            </div>
            <div className="relative">
              <Bell size={16} className="text-gray-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 flex items-center justify-center text-white text-[6px] font-black">3</span>
            </div>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Occupancy',   value: '87%', trend: '+4%',   color: TEAL,      icon: <Home size={10} /> },
            { label: 'RevPAR',      value: '$142', trend: '+$12', color: '#3B82F6', icon: <DollarSign size={10} /> },
            { label: 'Response',    value: '4.2m', trend: '-1.1m', color: '#8B5CF6', icon: <Clock size={10} /> },
            { label: 'Guest Score', value: '4.7★',  trend: '+0.2', color: '#F59E0B', icon: <Star size={10} /> },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${k.color}15` }}>
                  <span style={{ color: k.color }}>{k.icon}</span>
                </div>
                <span className="text-[7px] font-bold text-green-600 bg-green-50 px-1 rounded">{k.trend}</span>
              </div>
              <div className="text-[16px] font-black text-gray-900 leading-tight">{k.value}</div>
              <div className="text-[7px] text-gray-400 font-semibold uppercase tracking-wide">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-gray-900">Revenue · This week</span>
            <span className="text-[9px] font-bold" style={{ color: TEAL }}>$6,240</span>
          </div>
          <div className="flex items-end gap-1 h-16">
            {BAR_DATA.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-sm transition-all duration-700"
                  style={{
                    height: animBars ? `${b.h}%` : '4%',
                    backgroundColor: i === 5 ? TEAL : `${TEAL}40`,
                  }}
                />
                <span className="text-[6px] font-bold text-gray-400">{b.d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Requests', count: '2', icon: <ClipboardList size={11} />, color: '#D97706' },
            { label: 'Shuttle',  count: '5', icon: <Bus size={11} />,           color: '#3B82F6' },
            { label: 'Staff On', count: '4', icon: <Users size={11} />,         color: TEAL },
          ].map(a => (
            <div key={a.label} className="bg-white rounded-xl border border-gray-100 p-2 text-center shadow-sm">
              <div className="flex justify-center mb-1" style={{ color: a.color }}>{a.icon}</div>
              <div className="text-[13px] font-black text-gray-900">{a.count}</div>
              <div className="text-[7px] text-gray-400 font-semibold">{a.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   4.  SHUTTLE MANAGEMENT (mobile)
   ════════════════════════════════════════════════════════════════ */

const SLOTS = [
  { time: '7:00 AM',  dest: 'MIA Airport',   booked: 3, cap: 6, status: 'active' },
  { time: '9:30 AM',  dest: 'Port Miami',     booked: 6, cap: 6, status: 'full' },
  { time: '12:00 PM', dest: 'Downtown',       booked: 1, cap: 4, status: 'active' },
  { time: '3:30 PM',  dest: 'MIA Airport',   booked: 4, cap: 6, status: 'active' },
  { time: '6:00 PM',  dest: 'Port Miami',     booked: 0, cap: 4, status: 'open' },
];

export function ShuttleScreenMockup() {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const TABS = [
    { id: 'orders',    label: 'Requests',  icon: <ClipboardList size={9} />, badge: 2 },
    { id: 'shuttle',   label: 'Shuttle',   icon: <Bus size={9} /> },
    { id: 'messages',  label: 'Messages',  icon: <MessageSquare size={9} /> },
    { id: 'schedule',  label: 'Schedule',  icon: <Calendar size={9} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] overflow-hidden">
      <MobileTopBar activeTab="shuttle" tabs={TABS} />

      {/* Route selector */}
      <div className="bg-white border-b border-gray-100 px-3 py-2">
        <div className="flex gap-2">
          {['Airport', 'Cruise', 'Custom'].map((r, i) => (
            <button
              key={r}
              className="flex-1 py-1.5 rounded-lg text-[8px] font-bold text-center"
              style={i === 0 ? { backgroundColor: TEAL, color: 'white' } : { backgroundColor: '#F3F4F6', color: '#6B7280' }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Today header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[9px] font-black text-gray-700">Today · Jun 17</span>
        <div className="flex items-center gap-1">
          <PulsingDot />
          <span className="text-[7px] text-gray-400 font-semibold">5 slots</span>
        </div>
      </div>

      {/* Slot list */}
      <div className="flex-1 overflow-hidden px-3 pb-3 space-y-2">
        {SLOTS.map((s, i) => {
          const pct = (s.booked / s.cap) * 100;
          const isFull = s.status === 'full';
          const isSelected = selectedSlot === i;
          return (
            <button
              key={i}
              onClick={() => setSelectedSlot(isSelected ? null : i)}
              className="w-full bg-white rounded-xl border text-left p-2.5 shadow-sm transition-all"
              style={isSelected ? { borderColor: TEAL } : { borderColor: '#F3F4F6' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Bus size={10} style={{ color: isFull ? '#EF4444' : TEAL }} />
                  <span className="text-[10px] font-black text-gray-900">{s.time}</span>
                </div>
                <span
                  className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                  style={
                    isFull
                      ? { backgroundColor: '#FEE2E2', color: '#EF4444' }
                      : s.status === 'open'
                      ? { backgroundColor: '#F3F4F6', color: '#9CA3AF' }
                      : { backgroundColor: '#CCFBF1', color: TEAL }
                  }
                >
                  {isFull ? 'FULL' : s.status === 'open' ? 'Open' : 'Active'}
                </span>
              </div>
              <p className="text-[9px] text-gray-500 mb-1.5">{s.dest}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: isFull ? '#EF4444' : TEAL }}
                  />
                </div>
                <span className="text-[7px] font-bold text-gray-500 shrink-0">{s.booked}/{s.cap}</span>
              </div>
              {isSelected && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex gap-1.5">
                  <button className="flex-1 py-1 rounded-lg text-[8px] font-bold text-white" style={{ backgroundColor: TEAL }}>
                    View bookings
                  </button>
                  <button className="flex-1 py-1 rounded-lg text-[8px] font-bold text-gray-600 border border-gray-200">
                    Add booking
                  </button>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   6.  GUEST REQUESTS MOCKUP (phone screen)
   ════════════════════════════════════════════════════════════════ */

const REQUEST_BUTTONS = [
  { label: 'Towels',       icon: Layers,      bg: '#0D9488', sent: true  },
  { label: 'Housekeeping', icon: Users,        bg: '#7C3AED', sent: false },
  { label: 'Room Service', icon: Utensils,     bg: '#D97706', sent: false },
  { label: 'Amenities',    icon: ShoppingBag,  bg: '#DB2777', sent: false },
  { label: 'Late Check-out',icon: Clock,       bg: '#2563EB', sent: false },
  { label: 'Wake-Up Call', icon: Bell,         bg: '#16A34A', sent: false },
  { label: 'Maintenance',  icon: Wrench,       bg: '#DC2626', sent: false },
  { label: 'Contact Me',   icon: Phone,        bg: '#6B7280', sent: false },
];

export function GuestRequestsMockup() {
  return (
    <div className="flex flex-col h-full bg-white text-left overflow-hidden">
      <PhoneStatusBar />
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-2 pb-3">
        <p className="text-[18px] font-black text-gray-900 leading-tight">Request Now</p>
        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Tap once to send</p>
      </div>

      {/* 2×4 Grid of request buttons */}
      <div className="flex-1 px-3 py-3 grid grid-cols-2 gap-2.5 content-start">
        {REQUEST_BUTTONS.map((btn, i) => {
          const BtnIcon = btn.icon;
          return (
            <div
              key={i}
              className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 px-2"
              style={{
                backgroundColor: btn.sent ? '#F0FDF4' : `${btn.bg}12`,
                border: btn.sent ? '2px solid #16A34A' : `1.5px solid ${btn.bg}30`,
              }}
            >
              {btn.sent && (
                <div className="animate-pop-in absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm" style={{ animationDelay: '0.8s' }}>
                  <span className="text-white text-[8px] font-black">✓</span>
                </div>
              )}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: btn.sent ? '#16A34A' : btn.bg }}
              >
                <BtnIcon size={14} color="white" />
              </div>
              <span className="text-[9px] font-bold text-gray-800 text-center leading-tight">{btn.label}</span>
              {btn.sent && (
                <span className="text-[8px] font-bold text-green-600">Sent! ✓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: live confirmation toast + note */}
      <div className="shrink-0 px-3 pb-3 space-y-1.5">
        <div className="animate-row-in flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 shadow-sm" style={{ animationDelay: '1.4s' }}>
          <PulsingDot />
          <div className="leading-tight">
            <p className="text-[9px] font-black text-green-800">Front desk notified</p>
            <p className="text-[8px] text-green-600 font-medium">Towels on the way · ~4 min</p>
          </div>
        </div>
        <p className="text-[9px] text-gray-400 font-medium text-center">Request saved to your session · No app needed</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   7.  BOUNCIE GPS MOCKUP (phone screen)
   ════════════════════════════════════════════════════════════════ */

export function BouncieGPSMockup() {
  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] overflow-hidden text-left">
      <div className="bg-white shrink-0">
        <PhoneStatusBar />
      </div>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-3 pb-2.5 pt-1 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0D948815' }}>
          <Bus size={14} style={{ color: '#0D9488' }} />
        </div>
        <span className="text-[11px] font-black text-gray-900">Live Shuttle</span>
        <PulsingDot />
        <span className="ml-auto text-[8px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#0D9488' }}>On Trip</span>
      </div>

      <div className="flex-1 overflow-hidden px-3 py-2.5 space-y-2.5">
        {/* Live map */}
        <div className="relative h-[108px] rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-[#EAF3EE]">
          {/* street grid */}
          <div
            className="absolute inset-0 opacity-90"
            style={{
              backgroundImage: 'linear-gradient(#ffffff 2px, transparent 2px), linear-gradient(90deg, #ffffff 2px, transparent 2px)',
              backgroundSize: '26px 26px',
            }}
          />
          {/* park + water blocks */}
          <div className="absolute left-[12%] top-[14%] h-7 w-10 rounded-md bg-[#CBE8D6]" />
          <div className="absolute -bottom-6 -right-5 h-20 w-24 rounded-full bg-[#BFDDEB]" />
          {/* route */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 108" fill="none" preserveAspectRatio="none" aria-hidden>
            <path d="M12 92 C 50 88, 62 60, 100 54 S 168 30, 186 16" stroke="#0D9488" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" />
            <path d="M12 92 C 50 88, 62 60, 100 54 S 168 30, 186 16" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="7 9" className="animate-route-dash" />
          </svg>
          {/* hotel pin */}
          <div className="absolute right-[4%] top-[6%] flex flex-col items-center">
            <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white shadow" style={{ borderColor: '#0D9488' }}>
              <Home size={8} style={{ color: '#0D9488' }} />
            </div>
            <span className="mt-0.5 rounded bg-white/90 px-1 text-[6px] font-black text-gray-700 shadow-sm">HOTEL</span>
          </div>
          {/* shuttle marker driving the route */}
          <div
            className="animate-shuttle-drive absolute flex h-5 w-5 items-center justify-center rounded-full text-white shadow-md ring-2 ring-white"
            style={{ backgroundColor: '#0D9488', offsetPath: "path('M12 92 C 50 88, 62 60, 100 54 S 168 30, 186 16')", offsetRotate: '0deg' }}
          >
            <Bus size={11} color="white" />
          </div>
          {/* live badge */}
          <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 shadow-sm">
            <PulsingDot />
            <span className="text-[7px] font-black tracking-wide text-gray-700">LIVE GPS</span>
          </div>
        </div>

        {/* GPS card */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={10} style={{ color: '#0D9488' }} />
            <span className="text-[9px] font-bold text-gray-700">Current Position</span>
          </div>
          <p className="text-[10px] font-mono text-gray-900 font-bold">27.9506° N, 82.4572° W</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-[7px] text-gray-400 uppercase tracking-wide font-semibold">Speed / Heading</p>
              <p className="text-[9px] font-bold text-gray-800">32 mph · 145°</p>
            </div>
            <div>
              <p className="text-[7px] text-gray-400 uppercase tracking-wide font-semibold">Updated</p>
              <p className="text-[9px] font-bold text-gray-800">1m ago</p>
            </div>
            <div>
              <p className="text-[7px] text-gray-400 uppercase tracking-wide font-semibold">ETA to Hotel</p>
              <p className="text-[9px] font-bold text-gray-800">~8 min · 4.2 mi</p>
            </div>
          </div>
        </div>

        {/* Active trip */}
        <div className="rounded-xl border border-green-200 p-3" style={{ backgroundColor: '#F0FDF4' }}>
          <p className="text-[9px] font-black text-green-700 mb-1.5">Active Trip</p>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Departed', value: '2:15 PM' },
              { label: 'Duration', value: '00:23:14' },
              { label: 'Distance', value: '8.3 mi' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[7px] text-green-600 uppercase tracking-wide font-semibold">{item.label}</p>
                <p className="text-[9px] font-black text-green-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trip log */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <p className="text-[9px] font-black text-gray-700 mb-2">Today&apos;s Trips</p>
          <div className="space-y-1.5">
            {[
              { label: 'Trip 1', time: '7:00 AM', dist: '12.1 mi' },
              { label: 'Trip 2', time: '10:30 AM', dist: '9.4 mi' },
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[8px] font-semibold text-gray-700">{t.label} · {t.time}</span>
                </div>
                <span className="text-[8px] text-gray-400">{t.dist}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Track button */}
        <button
          className="w-full py-2.5 rounded-xl text-[10px] font-bold text-white text-center"
          style={{ backgroundColor: '#0D9488' }}
        >
          Track on Google Maps →
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   8.  UBER DIRECT MOCKUP (phone screen)
   ════════════════════════════════════════════════════════════════ */

export function UberDirectMockup() {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden text-left">
      <PhoneStatusBar />
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-2 pb-3">
        <p className="text-[13px] font-black text-gray-900">Your Order</p>
        <p className="text-[9px] text-gray-400 mt-0.5">2 items · $24.50</p>
      </div>

      <div className="flex-1 px-3 py-3 space-y-3">
        {/* Cart summary */}
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
          {[
            { name: 'Grilled Salmon', price: '$18.00' },
            { name: 'House Salad', price: '$6.50' },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <span className="text-[10px] font-semibold text-gray-800">{item.name}</span>
              <span className="text-[10px] font-bold text-gray-900">{item.price}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 mt-1 pt-1 flex justify-between">
            <span className="text-[10px] font-black text-gray-900">Total</span>
            <span className="text-[10px] font-black text-gray-900">$24.50</span>
          </div>
        </div>

        {/* Delivery method toggle */}
        <div>
          <p className="text-[9px] font-bold text-gray-600 mb-2 uppercase tracking-wide">Delivery Method</p>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-[9px] font-bold text-gray-500 bg-white">
              Bill to Room
            </button>
            <button
              className="flex-1 py-2.5 rounded-xl border-2 text-[9px] font-bold text-white flex flex-col items-center gap-0.5"
              style={{ backgroundColor: '#111827', borderColor: '#111827' }}
            >
              <div className="flex items-center gap-1">
                <Truck size={9} color="white" />
                <span>Pay via Uber</span>
              </div>
              <span className="text-[8px] font-normal opacity-70">$4.99 · ~25 min</span>
            </button>
          </div>
        </div>

        {/* Live courier tracking strip */}
        <div className="rounded-xl bg-gray-900 p-3 shadow-sm">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PulsingDot color="#4ade80" />
              <span className="text-[9px] font-black text-white">Courier en route</span>
            </div>
            <span className="text-[8px] font-bold text-gray-400">~12 min</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
            <div className="animate-fill-x h-full w-[62%] rounded-full bg-[#22c55e]" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="mt-1 flex justify-between text-[7px] font-semibold text-gray-400">
            <span>Marina Grill</span>
            <span>Hotel · Room 214</span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[9px] text-gray-400 leading-relaxed">
          Uber courier delivers from restaurant to your room. You pay Uber directly.
        </p>

        {/* Place order button */}
        <button
          className="w-full py-3 rounded-xl text-[12px] font-black text-white text-center"
          style={{ backgroundColor: '#16A34A' }}
        >
          Place Order
        </button>
      </div>
    </div>
  );
}

export const MessagesScreenMockup = GuestRequestsMockup;
