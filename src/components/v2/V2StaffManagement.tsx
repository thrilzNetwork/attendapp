'use client';

/* ═══════════════════════════════════════════ components/v2/V2StaffManagement.tsx
   Attenda V2 — Staff Management. EXACT implementation of mockup
   docs/v2-mockups/04-staff-management.jpg (spec: docs/v2-mockups/specs/
   04-staff-management.md).

   Layout per mockup:
     · 6 KPI cards — Total Staff · On Shift Now · Open Shifts · Training Due ·
       Compliance Rate · Performance Avg.
     · 2-col grid — LEFT: Staff Directory (search/Filters, All/On Shift/
       Inactive pills, table Name+email | Role | Department | Status |
       Performance, pagination)
                    RIGHT: Roles & Permissions, Department Overview
     · bottom 4 panels — Upcoming Training · Staff Performance ·
       Attendance Overview · Quick Actions

   GUARDRAIL: Attendance = Present/Absent counts and operational callout
   events only. No payroll, medical reason codes, or HR document access.

   Data policy: Compliance Rate / Performance / Open Shifts / Training Due
   have no backing data today — they render EXACTLY as designed with '—'
   (never substituted, never dropped).
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Users, UserCheck, CalendarClock, GraduationCap, ShieldCheck, Star, Search,
  SlidersHorizontal, ArrowLeft, UserPlus, CalendarDays, KeyRound, FileClock,
  Megaphone, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { V2KpiCard, V2Panel, V2Pill, V2ScreenHeader, V2Table, V2QuickActions, type V2TableColumn } from './ui';
import { getStaffSchedulesRange, type StaffAccount, type StaffSchedule } from '@/lib/supabase';
import { listOps, listLearningContent, type OpRecord } from '@/lib/opsStore';

const StaffView = dynamic(() => import('@/components/staff/StaffView'), { ssr: false });
const CalloutsView = dynamic(() => import('@/components/staff/CalloutsView'), { ssr: false });

const INK = '#16233B', MUTED = '#5B6B7E', BORDER = '#E5EAF0';

function localDateStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type ManageMode = null | 'staff' | 'callouts';
type DirFilter = 'all' | 'onshift' | 'inactive';

const ACCESS_BY_ROLE: Record<string, string> = {
  admin: 'Full access',
  manager: 'Department access',
  staff: 'Basic access',
  vendor: 'Restricted access',
};

export default function V2StaffManagement({
  hotelId, hotelName, hotelSlug, staff, onRefresh,
}: {
  hotelId: string; hotelName: string; hotelSlug: string; staff: StaffAccount[]; onRefresh: () => void;
}) {
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [callouts, setCallouts] = useState<OpRecord[]>([]);
  const [training, setTraining] = useState<OpRecord[]>([]);
  const [asOf, setAsOf] = useState('');
  const [manage, setManage] = useState<ManageMode>(null);
  const [dirFilter, setDirFilter] = useState<DirFilter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    if (!hotelId) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    const today = localDateStr();
    Promise.all([
      getStaffSchedulesRange(hotelId, today, today).catch(() => []),
      listOps(hotelId, 'staff_callout' as any).catch(() => []),
      listLearningContent(hotelId).catch(() => []),
    ]).then(([sch, co, tr]) => { setSchedules(sch || []); setCallouts(co || []); setTraining(tr || []); });
  }, [hotelId]);

  if (manage) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
        <button onClick={() => setManage(null)}
          className="flex items-center gap-1.5 text-[13px] font-bold mb-4 hover:underline" style={{ color: '#0E7C74' }}>
          <ArrowLeft size={15} /> Back to Staff Management dashboard
        </button>
        {manage === 'staff' && (
          <StaffView hotelId={hotelId} hotelName={hotelName} hotelSlug={hotelSlug} staff={staff} onRefresh={onRefresh} />
        )}
        {manage === 'callouts' && (
          <CalloutsView hotelId={hotelId} isAdmin staffName="" />
        )}
      </div>
    );
  }

  /* ── Derived (real data) ─────────────────────────────────────────────── */
  const active = staff.filter(s => s.active && s.role !== 'vendor');
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const onShiftIds = new Set<string>();
  for (const s of schedules) {
    if (!s.start_time || !s.end_time) continue;
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) continue;
    const a = sh * 60 + sm, b = eh * 60 + em;
    const onShift = b <= a ? (nowMin >= a || nowMin <= b) : (nowMin >= a && nowMin <= b);
    if (onShift && s.staff_id) onShiftIds.add(s.staff_id);
  }
  const onShiftNow = onShiftIds.size;

  const deptOf = (s: StaffAccount) => (Array.isArray(s.positions) && s.positions[0]) || s.department || 'unassigned';
  const departments = new Map<string, number>();
  for (const s of active) departments.set(deptOf(s), (departments.get(deptOf(s)) || 0) + 1);

  const rolesCount = new Map<string, number>();
  for (const s of active) rolesCount.set(s.role, (rolesCount.get(s.role) || 0) + 1);

  const today = localDateStr();
  const approvedCalloutsToday = callouts.filter(c => c.status === 'approved' && (c.details as any)?.shift_date === today);
  const presentToday = Math.max(0, onShiftNow);
  const absentToday = approvedCalloutsToday.length;
  const attendanceTotal = presentToday + absentToday || 1;

  const refresh = () => setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));

  /* ── Directory filtering ─────────────────────────────────────────────── */
  const filtered = active.filter(s => {
    if (dirFilter === 'inactive') return false; // inactive handled below
    if (dirFilter === 'onshift' && !onShiftIds.has(s.id || '')) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || (deptOf(s) || '').toLowerCase().includes(q);
  });
  const inactiveRows = dirFilter === 'inactive'
    ? staff.filter(s => !s.active || s.role === 'vendor')
    : [];
  const rows = dirFilter === 'inactive' ? inactiveRows : filtered;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  const columns: V2TableColumn<StaffAccount>[] = [
    { key: 'name', header: 'Name', render: s => (
      <div>
        <div className="font-semibold" style={{ color: INK }}>{s.name}</div>
        {s.email && <div className="text-[11px]" style={{ color: MUTED }}>{s.email}</div>}
      </div>
    ) },
    { key: 'role', header: 'Role', render: s => <span className="capitalize">{s.role}</span> },
    { key: 'department', header: 'Department', render: s => <span className="capitalize">{deptOf(s).replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: s => (
      <V2Pill label={onShiftIds.has(s.id || '') ? 'On Shift' : s.active ? 'Active' : 'Inactive'}
        tone={onShiftIds.has(s.id || '') ? 'green' : s.active ? 'blue' : 'gray'} />
    ) },
    { key: 'performance', header: 'Performance', render: () => <span style={{ color: MUTED }}>—</span> },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Staff Management"
        subtitle="Manage your team, roles, permissions, and performance."
        banner="Empower your team with the right access and accountability."
        dataAsOf={asOf}
        onRefresh={refresh}
      />

      {/* ── KPI row — 6 cards, exactly as mockup ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <V2KpiCard icon={Users} label="Total Staff" value={active.length} sub="active team members" onClick={() => setManage('staff')} />
        <V2KpiCard icon={UserCheck} label="On Shift Now" value={onShiftNow} sub="Across all departments" subTone="green" />
        <V2KpiCard icon={CalendarClock} label="Open Shifts" value="—" sub="Need coverage" />
        <V2KpiCard icon={GraduationCap} label="Training Due" value="—" sub="Due within 7 days" />
        <V2KpiCard icon={ShieldCheck} label="Compliance Rate" value="—" sub="Team compliance" />
        <V2KpiCard icon={Star} label="Performance Avg." value="—" sub="Team average" />
      </div>

      {/* ── Main grid: directory left · roles + departments right ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <V2Panel
            title="Staff Directory"
            action={
              <div className="flex gap-1.5">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                  <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
                    placeholder="Search staff..."
                    className="text-[12px] pl-7 pr-2.5 py-1.5 rounded-lg border outline-none w-40"
                    style={{ borderColor: BORDER, color: INK }} />
                </div>
                <button className="flex items-center gap-1 text-[12px] font-bold px-2.5 py-1.5 rounded-lg border hover:opacity-80"
                  style={{ borderColor: BORDER, color: INK }}>
                  <SlidersHorizontal size={13} /> Filters
                </button>
              </div>
            }
          >
            <div className="flex gap-1.5 mb-3">
              {([
                { key: 'all', label: 'All' },
                { key: 'onshift', label: 'On Shift' },
                { key: 'inactive', label: 'Inactive' },
              ] as const).map(f => (
                <button key={f.key} onClick={() => { setDirFilter(f.key); setPage(1); }}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={dirFilter === f.key ? { backgroundColor: '#14A8A0', color: 'white' } : { backgroundColor: '#EEF1F4', color: MUTED }}>
                  {f.label}
                </button>
              ))}
            </div>
            <V2Table columns={columns} rows={paged} keyField="id"
              page={page} pageSize={pageSize} totalCount={rows.length} onPageChange={setPage} />
          </V2Panel>
        </div>

        <div className="flex flex-col gap-4">
          <V2Panel title="Roles & Permissions" action={
            <button onClick={() => setManage('staff')} className="text-[11px] font-semibold" style={{ color: MUTED }}>View all</button>
          }>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {Array.from(rolesCount.entries()).map(([role, count]) => (
                <li key={role} className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block font-semibold capitalize truncate" style={{ color: INK }}>{role}</span>
                    <span className="block text-[11px]" style={{ color: MUTED }}>{ACCESS_BY_ROLE[role] || 'Basic access'}</span>
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: '#EEF1F4', color: INK }}>
                    {count} {count === 1 ? 'User' : 'Users'}
                  </span>
                </li>
              ))}
            </ul>
            <button onClick={() => setManage('staff')} className="text-[12px] font-bold mt-3 hover:underline" style={{ color: '#0E7C74' }}>
              Manage Roles →
            </button>
          </V2Panel>

          <V2Panel title="Department Overview" action={
            <span className="text-[11px] font-semibold" style={{ color: MUTED }}>View all</span>
          }>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {Array.from(departments.entries()).map(([dept, count]) => (
                <li key={dept} className="flex items-center justify-between">
                  <span className="capitalize" style={{ color: INK }}>{dept.replace('_', ' ')}</span>
                  <span className="font-bold" style={{ color: INK }}>{count}</span>
                </li>
              ))}
            </ul>
            <p className="text-[12px] font-bold mt-3" style={{ color: '#0E7C74' }}>View All Departments →</p>
          </V2Panel>
        </div>
      </div>

      {/* ── Bottom row — 4 panels, exactly as mockup ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 items-start">
        <V2Panel title="Upcoming Training" action={
          <span className="text-[11px] font-semibold" style={{ color: MUTED }}>View all</span>
        }>
          {training.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>No training content published yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {training.slice(0, 4).map(t => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0">
                    <span className="block font-semibold truncate" style={{ color: INK }}>{(t.details as any)?.title || 'Training module'}</span>
                    <span className="block text-[11px]" style={{ color: MUTED }}>— · —</span>
                  </span>
                  <GraduationCap size={14} className="shrink-0" style={{ color: '#0E7C74' }} />
                </li>
              ))}
            </ul>
          )}
        </V2Panel>

        <V2Panel title="Staff Performance" action={
          <span className="text-[11px] font-semibold" style={{ color: MUTED }}>View all</span>
        }>
          <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>Ratings not tracked yet.</p>
        </V2Panel>

        <V2Panel title="Attendance Overview" action={
          <button onClick={() => setManage('callouts')} className="text-[12px] font-bold hover:underline" style={{ color: '#0E7C74' }}>
            View Attendance Report →
          </button>
        }>
          <div className="flex flex-col items-center py-1">
            <div className="text-[26px] font-bold" style={{ color: INK }}>
              {Math.round((presentToday / attendanceTotal) * 100)}%
            </div>
            <div className="w-full flex flex-col gap-1.5 text-[12px] mt-2">
              <div className="flex justify-between"><span style={{ color: '#16A34A' }}>● Present</span><span className="font-bold" style={{ color: INK }}>{presentToday}</span></div>
              <div className="flex justify-between"><span style={{ color: '#DC2626' }}>● Absent (callout)</span><span className="font-bold" style={{ color: INK }}>{absentToday}</span></div>
            </div>
          </div>
        </V2Panel>

        <V2Panel title="Quick Actions">
          <V2QuickActions actions={[
            { icon: UserPlus, label: 'Add Team Member', caption: 'Create a new team member profile', onClick: () => setManage('staff') },
            { icon: CalendarDays, label: 'Schedule Staff', caption: 'Create or manage staff schedules', onClick: () => setManage('staff') },
            { icon: KeyRound, label: 'Assign Permissions', caption: 'Manage role access and permissions', onClick: () => setManage('staff') },
            { icon: FileClock, label: 'Review Timesheets', caption: 'Callouts and attendance records', onClick: () => setManage('callouts') },
            { icon: Megaphone, label: 'Send Announcement', caption: 'Send a message to your team', onClick: () => setManage('staff') },
          ]} />
          <p className="text-[12px] font-bold mt-3" style={{ color: '#0E7C74' }}>View Performance Reports →</p>
        </V2Panel>
      </div>
    </div>
  );
}