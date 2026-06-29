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
  TrendingUp, Wrench, Utensils, ShoppingBag, Phone, Layers, MapPin,
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

  useEffect(() => {
    const id = setInterval(() => setActive(v => (v === null ? 0 : v === 4 ? null : v + 1)), 1800);
    return () => clearInterval(id);
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
          { label: 'Pending', value: '2', color: '#D97706' },
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
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
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
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
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

      {/* Footer note */}
      <div className="shrink-0 px-4 pb-4 text-center">
        <p className="text-[9px] text-gray-400 font-medium">Request saved to your session · No app needed</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   7.  BOUNCIE GPS MOCKUP — two-point tracking (hotel ↔ airport)
   ════════════════════════════════════════════════════════════════ */

export function BouncieGPSMockup() {
  const [dir, setDir] = useState<'to_dest' | 'to_hotel'>('to_dest');

  useEffect(() => {
    const id = setInterval(() => setDir(d => d === 'to_dest' ? 'to_hotel' : 'to_dest'), 3000);
    return () => clearInterval(id);
  }, []);

  const toAirport = dir === 'to_dest';

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] overflow-hidden text-left">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-3 py-2.5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0D948815' }}>
          <Bus size={14} style={{ color: '#0D9488' }} />
        </div>
        <div>
          <span className="text-[11px] font-black text-gray-900 block leading-tight">Live Shuttle</span>
          <span className="text-[8px] text-gray-400">Best Western 10272 · Bouncie GPS</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <PulsingDot />
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#0D9488' }}>On Trip</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
        {/* Direction banner */}
        <div className={`rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1.5 transition-all ${
          toAirport
            ? 'bg-sky-50 text-sky-800 border border-sky-200'
            : 'bg-orange-50 text-orange-800 border border-orange-200'
        }`}>
          {toAirport
            ? <>🏨 → ✈️ Heading to FLL Airport · ~12 min</>
            : <>✈️ → 🏨 Returning to hotel · ~8 min</>
          }
        </div>

        {/* Speed / updated */}
        <div className="bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[7px] text-gray-400 uppercase tracking-wide font-semibold">Speed</p>
              <p className="text-[9px] font-bold text-gray-800">38 mph</p>
            </div>
            <div>
              <p className="text-[7px] text-gray-400 uppercase tracking-wide font-semibold">Heading</p>
              <p className="text-[9px] font-bold text-gray-800">145°</p>
            </div>
            <div>
              <p className="text-[7px] text-gray-400 uppercase tracking-wide font-semibold">Updated</p>
              <p className="text-[9px] font-bold text-gray-800">30s ago</p>
            </div>
          </div>
          {/* Dual ETA */}
          <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-sky-600 font-semibold flex items-center gap-1">✈️ ETA to FLL Airport</span>
              <span className={`font-bold ${toAirport ? 'text-sky-700' : 'text-gray-400'}`}>{toAirport ? '~12 min · 7.1 mi' : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-orange-600 font-semibold flex items-center gap-1">🏨 ETA to hotel</span>
              <span className={`font-bold ${!toAirport ? 'text-orange-700' : 'text-gray-400'}`}>{!toAirport ? '~8 min · 4.2 mi' : '—'}</span>
            </div>
          </div>
        </div>

        {/* Inline map */}
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
          <div className="h-24 relative flex items-center justify-center">
            {/* simplified route line graphic */}
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="w-full flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-[7px] font-black shrink-0">H</div>
                <div className="flex-1 relative h-1 bg-gray-300 rounded">
                  <div className={`absolute top-0 h-full rounded bg-teal-500 transition-all duration-1000 ${toAirport ? 'w-3/5 left-0' : 'w-2/5 right-0'}`} />
                  <div className={`absolute -top-2 w-5 h-5 transition-all duration-1000 ${toAirport ? 'left-[55%]' : 'left-[35%]'}`}>
                    <Bus size={12} className="text-teal-700" />
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-white text-[7px] font-black shrink-0">✈</div>
              </div>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-gray-50 flex items-center justify-between text-[9px]">
            <span className="text-gray-500 flex items-center gap-1"><MapPin size={9} className="text-teal-600" /> Live · 30s ago</span>
            <span className="font-bold text-teal-700">Open map →</span>
          </div>
        </div>

        {/* Active trip */}
        <div className="rounded-xl border border-emerald-200 p-2.5" style={{ backgroundColor: '#F0FDF4' }}>
          <p className="text-[8px] font-black text-emerald-700 mb-1 uppercase tracking-wide">Active Trip</p>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Departed', value: '2:15 PM' },
              { label: 'Duration', value: '23m 14s' },
              { label: 'Distance', value: '8.3 mi' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[7px] text-emerald-600 uppercase tracking-wide font-semibold">{item.label}</p>
                <p className="text-[9px] font-black text-emerald-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trip log */}
        <div className="bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm">
          <p className="text-[8px] font-black text-gray-700 mb-1.5">Today&apos;s Trips</p>
          <div className="space-y-1">
            {[
              { time: '7:00 AM → 7:31 AM', dist: '12.1 mi' },
              { time: '10:30 AM → 11:02 AM', dist: '9.4 mi' },
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[8px] font-semibold text-gray-700">{t.time}</span>
                </div>
                <span className="text-[8px] text-gray-400">{t.dist}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   8.  TRANSPORT BOOKER MOCKUP (guest transport booking)
   ════════════════════════════════════════════════════════════════ */

export function UberDirectMockup() {
  const [step, setStep] = useState(0); // 0=mode, 1=addresses, 2=confirm, 3=done

  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % 4), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden text-left">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 pt-4 pb-3">
        <p className="text-[13px] font-black text-gray-900">Book Transport</p>
        <p className="text-[9px] text-gray-400 mt-0.5">Hotel shuttle or arrange your own</p>
      </div>

      <div className="flex-1 px-3 py-3 space-y-3 overflow-hidden">
        {step === 0 && (
          <>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Choose transport type</p>
            {[
              { label: 'Hotel Shuttle', sub: 'Free · Staff arranged', color: '#0D9488', icon: '🚌' },
              { label: 'Third-Party Taxi', sub: 'External booking', color: '#6B7280', icon: '🚕' },
            ].map((opt, i) => (
              <div key={i} className="rounded-2xl border-2 p-4 flex items-center gap-3 transition-all"
                style={{ borderColor: i === 0 ? opt.color : '#E5E7EB', backgroundColor: i === 0 ? `${opt.color}08` : 'white' }}>
                <span className="text-2xl">{opt.icon}</span>
                <div>
                  <p className="text-[11px] font-black text-gray-900">{opt.label}</p>
                  <p className="text-[9px] text-gray-500">{opt.sub}</p>
                </div>
                {i === 0 && <div className="ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: opt.color }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                </div>}
              </div>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Where to?</p>
            {/* FROM */}
            <div className="rounded-2xl border-2 border-teal-200 bg-teal-50 p-3">
              <p className="text-[8px] text-teal-600 font-bold uppercase mb-1">FROM</p>
              <p className="text-[11px] font-bold text-gray-900">Best Western Fort Lauderdale</p>
              <p className="text-[8px] text-gray-500">4860 W Oakland Park Blvd</p>
            </div>
            {/* TO */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-3">
              <p className="text-[8px] text-gray-400 font-bold uppercase mb-1">TO</p>
              <p className="text-[11px] font-bold text-gray-900">Fort Lauderdale Airport (FLL)</p>
              <p className="text-[8px] text-gray-400">100 Terminal Dr, Fort Lauderdale</p>
            </div>
            <button className="w-full py-2.5 rounded-xl text-[10px] font-black text-white" style={{ backgroundColor: '#0D9488' }}>
              Continue →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3 space-y-2">
              <p className="text-[9px] font-black text-gray-700">Trip Summary</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <p className="text-[9px] text-gray-700">Best Western Fort Lauderdale</p>
              </div>
              <div className="ml-[3px] w-px h-3 bg-gray-300" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                <p className="text-[9px] text-gray-700">FLL Airport</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px]">
                <span className="text-gray-500">Guests</span>
                <span className="font-bold text-gray-900">2 adults</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-gray-500">Type</span>
                <span className="font-bold text-gray-900">Hotel Shuttle</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-gray-500">Cost</span>
                <span className="font-bold text-teal-600">Free</span>
              </div>
            </div>
            <button className="w-full py-2.5 rounded-xl text-[10px] font-black text-white" style={{ backgroundColor: '#0D9488' }}>
              Confirm Booking
            </button>
          </>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0D9488' }}>
              <span className="text-white text-3xl">✓</span>
            </div>
            <p className="text-[13px] font-black text-gray-900">Booking Confirmed!</p>
            <p className="text-[10px] text-gray-500 text-center max-w-[180px]">Our team will confirm your pickup time. Check messages for updates.</p>
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-2 text-center">
              <p className="text-[8px] text-teal-600 font-bold uppercase tracking-wide">Request sent to</p>
              <p className="text-[10px] font-black text-teal-800">Front Desk</p>
            </div>
          </div>
        )}
      </div>

      {/* Step dots */}
      <div className="shrink-0 flex justify-center gap-1.5 pb-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
            style={{ backgroundColor: i === step ? '#0D9488' : '#D1D5DB' }} />
        ))}
      </div>
    </div>
  );
}

export const MessagesScreenMockup = GuestRequestsMockup;
