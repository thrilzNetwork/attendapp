'use client';

/* ═══════════════════════════════════════════ components/v2/V2ScheduleForecast.tsx
   Attenda V2 — Schedule & Forecast (module 10). Merges the two legacy tabs
   (`schedules` + `forecast`) into one screen matching 10-schedule-forecast.jpg
   structurally. Per Phase 6 of the build plan, this is a presentation-layer
   merge only — SchedulesView/ForecastView stay as the CRUD surfaces, opened
   here via "Manage Schedule" / "Manage Forecast".

   The mockup's "Labor Cost % of Revenue" has no backing wage-rate data in
   this codebase (no pay-rate field anywhere, by design — see Staff
   Management guardrail) — rather than fabricate a finance figure, this
   screen reports "Scheduled shifts" and "Departments staffed" instead,
   both derived directly from real schedule rows.
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  BedDouble, TrendingUp, Clock3, Layers, CalendarPlus, RefreshCcw,
  CheckSquare, UserCog, LineChart, ArrowLeft, Users,
} from 'lucide-react';
import { V2KpiCard, V2Panel, V2ScreenHeader, V2QuickActions } from './ui';
import { getStaffSchedulesRange, getWeeklyForecasts, type StaffSchedule, type WeeklyForecast } from '@/lib/supabase';

const SchedulesView = dynamic(() => import('@/components/staff/SchedulesView'), { ssr: false });
const ForecastView = dynamic(() => import('@/components/staff/ForecastView'), { ssr: false });

const DEPARTMENTS = ['front_desk', 'housekeeping', 'maintenance', 'security', 'drivers', 'management'] as const;
const DEPT_LABELS: Record<string, string> = {
  front_desk: 'Front Office', housekeeping: 'Housekeeping', maintenance: 'Maintenance',
  security: 'Security', drivers: 'Transportation', management: 'Management',
};

function localDateStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function hoursOf(s: StaffSchedule): number {
  if (!s.start_time || !s.end_time) return 0;
  const [sh, sm] = s.start_time.split(':').map(Number);
  const [eh, em] = s.end_time.split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return 0;
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

type ManageMode = null | 'schedule' | 'forecast';

export default function V2ScheduleForecast({
  hotelId, totalRooms, timezone, isAdmin, staffList,
}: {
  hotelId: string; totalRooms: number; timezone?: string; isAdmin: boolean;
  staffList: { id: string; name: string; role: string; department?: string; hire_date?: string; min_hours: number; employment_type?: string; email: string }[];
}) {
  const [weekSchedules, setWeekSchedules] = useState<StaffSchedule[]>([]);
  const [forecasts, setForecasts] = useState<WeeklyForecast[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [manage, setManage] = useState<ManageMode>(null);
  const [asOf, setAsOf] = useState('');

  useEffect(() => {
    if (!hotelId) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }));
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today); monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    Promise.all([
      getStaffSchedulesRange(hotelId, localDateStr(monday), localDateStr(sunday)).catch(() => []),
      getWeeklyForecasts(hotelId, localDateStr(monday)).catch(() => []),
    ]).then(([sch, fc]) => { setWeekSchedules(sch || []); setForecasts(fc || []); });
  }, [hotelId, timezone]);

  if (manage) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
        <button onClick={() => setManage(null)}
          className="flex items-center gap-1.5 text-[13px] font-bold mb-4 hover:underline" style={{ color: '#0E7C74' }}>
          <ArrowLeft size={15} /> Back to Schedule & Forecast dashboard
        </button>
        {manage === 'schedule' && (
          <SchedulesView hotelId={hotelId} isAdmin={isAdmin} weekStartsOn="Sunday" staffName="" hotelName="" staffList={staffList} />
        )}
        {manage === 'forecast' && <ForecastView hotelId={hotelId} totalRooms={totalRooms} timezone={timezone} />}
      </div>
    );
  }

  const todayStr = localDateStr();
  const todaySchedules = weekSchedules.filter(s => s.shift_date === todayStr);
  const todayForecast = forecasts.find(f => f.date === todayStr) || forecasts[0];

  const deptOf = (s: StaffSchedule) => s.department || 'other';
  const visibleToday = deptFilter === 'all' ? todaySchedules : todaySchedules.filter(s => deptOf(s) === deptFilter);

  const byDept = new Map<string, { staffed: number; hours: number }>();
  for (const s of todaySchedules) {
    const key = deptOf(s);
    const row = byDept.get(key) || { staffed: 0, hours: 0 };
    row.staffed += 1;
    row.hours += hoursOf(s);
    byDept.set(key, row);
  }
  const totalHours = todaySchedules.reduce((sum, s) => sum + hoursOf(s), 0);

  const weekLabor = new Map<string, number>();
  for (const s of weekSchedules) weekLabor.set(s.shift_date, (weekLabor.get(s.shift_date) || 0) + hoursOf(s));

  const laborColors = ['#14A8A0', '#7C5CE0', '#D97706', '#2F6FEB', '#DC2626', '#5B6B7E'];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Schedule & Forecast"
        subtitle="Labor schedules, demand forecast & staffing plans"
        banner="Build the right schedule for today and plan ahead with confidence."
        dataAsOf={asOf}
        onRefresh={() => setManage(null)}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <V2KpiCard icon={BedDouble} label="Today's occupancy" value={todayForecast ? `${Math.round(todayForecast.occupancy_pct)}%` : '—'}
          sub={todayForecast ? `${todayForecast.rooms_occupied} / ${todayForecast.total_rooms} rooms` : 'No forecast yet'} />
        <V2KpiCard icon={TrendingUp} label="Forecasted occupancy" value={forecasts.length ? `${Math.round(forecasts.reduce((a, f) => a + f.occupancy_pct, 0) / forecasts.length)}%` : '—'} sub="This week avg" />
        <V2KpiCard icon={Clock3} label="Total labor hours" value={totalHours.toFixed(1)} sub="Scheduled today" />
        <V2KpiCard icon={Users} label="Scheduled shifts" value={todaySchedules.length} sub="Today, all departments" />
        <V2KpiCard icon={Layers} label="Departments staffed" value={byDept.size} sub="Covered today" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <V2Panel title="Today's Schedule"
            action={<button onClick={() => setManage('schedule')} className="text-[12px] font-bold hover:underline" style={{ color: '#0E7C74' }}>Manage schedule</button>}>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {(['all', ...DEPARTMENTS] as const).map(d => (
                <button key={d} onClick={() => setDeptFilter(d)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full capitalize"
                  style={deptFilter === d ? { backgroundColor: '#14A8A0', color: 'white' } : { backgroundColor: '#EEF1F4', color: '#5B6B7E' }}>
                  {d === 'all' ? 'All Departments' : DEPT_LABELS[d]}
                </button>
              ))}
            </div>
            {visibleToday.length === 0 ? (
              <p className="text-[13px] py-6 text-center" style={{ color: '#5B6B7E' }}>No shifts scheduled for this filter today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left" style={{ color: '#5B6B7E' }}>
                      <th className="font-semibold pb-2 pr-3">Staff</th>
                      <th className="font-semibold pb-2 pr-3">Department</th>
                      <th className="font-semibold pb-2 pr-3">Shift</th>
                      <th className="font-semibold pb-2 text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleToday.map(s => (
                      <tr key={s.id} className="border-t" style={{ borderColor: '#E5EAF0' }}>
                        <td className="py-2.5 pr-3 font-semibold" style={{ color: '#16233B' }}>{s.staff_name}</td>
                        <td className="py-2.5 pr-3 capitalize" style={{ color: '#5B6B7E' }}>{DEPT_LABELS[deptOf(s)] || deptOf(s)}</td>
                        <td className="py-2.5 pr-3" style={{ color: '#5B6B7E' }}>{s.start_time}–{s.end_time}</td>
                        <td className="py-2.5 text-right" style={{ color: '#16233B' }}>{hoursOf(s).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </V2Panel>
        </div>

        <V2Panel title="Weekly Forecast"
          action={<button onClick={() => setManage('forecast')} className="text-[12px] font-bold hover:underline" style={{ color: '#0E7C74' }}>Manage forecast</button>}>
          {forecasts.length === 0 ? (
            <p className="text-[13px] py-6 text-center" style={{ color: '#5B6B7E' }}>No forecast data for this week yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {forecasts.map(f => (
                <li key={f.id} className="flex items-center justify-between text-[13px]">
                  <div>
                    <div className="font-semibold" style={{ color: '#16233B' }}>{new Date(f.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="text-[11px]" style={{ color: '#5B6B7E' }}>{weekLabor.get(f.date)?.toFixed(1) || '0.0'} labor hrs</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold" style={{ color: '#16233B' }}>{Math.round(f.occupancy_pct)}%</div>
                    <div className="text-[11px]" style={{ color: '#5B6B7E' }}>{f.rooms_occupied} rooms</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </V2Panel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <V2Panel title="Labor Mix Today">
          {byDept.size === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: '#5B6B7E' }}>No shifts scheduled today.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {Array.from(byDept.entries()).sort((a, b) => b[1].hours - a[1].hours).map(([dept, row], i) => (
                <li key={dept} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 capitalize" style={{ color: '#16233B' }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: laborColors[i % laborColors.length] }} />
                    {DEPT_LABELS[dept] || dept}
                  </span>
                  <span className="font-semibold" style={{ color: '#16233B' }}>{row.hours.toFixed(1)}h ({totalHours ? Math.round((row.hours / totalHours) * 100) : 0}%)</span>
                </li>
              ))}
            </ul>
          )}
        </V2Panel>

        <V2Panel title="Open Shifts">
          <p className="text-[13px] py-6 text-center" style={{ color: '#5B6B7E' }}>
            Open-shift tracking isn't wired to a data source yet — manage gaps directly in the schedule.
          </p>
        </V2Panel>

        <V2Panel title="Quick Actions">
          <V2QuickActions actions={[
            { icon: CalendarPlus, label: 'Create New Schedule', caption: 'Build schedule for selected day', onClick: () => setManage('schedule') },
            { icon: RefreshCcw, label: 'Adjust for Pickup', caption: 'Update schedule based on forecast', onClick: () => setManage('schedule') },
            { icon: CheckSquare, label: 'Approve Schedule', caption: 'Review and publish schedule', onClick: () => setManage('schedule') },
            { icon: UserCog, label: 'Manage Time Off', caption: 'Review staff time-off requests', onClick: () => setManage('schedule') },
            { icon: LineChart, label: 'Manage Forecast', caption: 'Update occupancy & demand forecast', onClick: () => setManage('forecast') },
          ]} />
        </V2Panel>
      </div>
    </div>
  );
}
