'use client';

import { useState, useEffect } from 'react';
import { supabase, getWeeklyForecasts, authedApiHeaders, type WeeklyForecast } from '@/lib/supabase';
import { TrendingUp, Save, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface DayData {
  date: string;
  label: string;
  occupancyPct: number;
  roomsOccupied: number;
  arrivals: number;
  departures: number;
}

function getWeekDates(ref: Date): { date: string; label: string }[] {
  const monday = new Date(ref);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, label };
  });
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayInTimezone(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value || '';
    const m = parts.find(p => p.type === 'month')?.value || '';
    const d = parts.find(p => p.type === 'day')?.value || '';
    return `${y}-${m}-${d}`;
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

function formatWeekLabel(monday: string, offset: number): string {
  if (offset === 0) return 'This Week';
  if (offset === 1) return 'Next Week';
  if (offset === -1) return 'Last Week';
  const d = new Date(monday + 'T12:00:00');
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface ForecastViewProps {
  hotelId: string;
  totalRooms: number;
  timezone?: string;
}

export default function ForecastView({ hotelId, totalRooms, timezone }: ForecastViewProps) {
  const [weekDays, setWeekDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [prevNightOcc, setPrevNightOcc] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [resolvedHotelId, setResolvedHotelId] = useState(hotelId);
  const [resolvedTotalRooms, setResolvedTotalRooms] = useState(totalRooms);
  const [resolvedTimezone, setResolvedTimezone] = useState(timezone || 'America/New_York');
  const [mondayStr, setMondayStr] = useState('');

  useEffect(() => {
    if (hotelId) setResolvedHotelId(hotelId);
    if (totalRooms > 0) setResolvedTotalRooms(totalRooms);
    const fetchSelf = async () => {
      const slug = localStorage.getItem('attenda_hotel_slug');
      if (slug) {
        const { data } = await supabase.from('hotels').select('id,room_count,timezone').eq('slug', slug).single();
        if (data) {
          setResolvedHotelId(data.id);
          setResolvedTotalRooms(data.room_count || 0);
          if (data.timezone) setResolvedTimezone(data.timezone);
        }
      }
    };
    fetchSelf();
  }, [hotelId, totalRooms]);

  const loadWeek = async (offset: number) => {
    setLoading(true);
    setWeekDays([]);
    setSaveError('');
    const todayLocal = getTodayInTimezone(resolvedTimezone);
    const ref = new Date(todayLocal + 'T12:00:00');
    ref.setDate(ref.getDate() + offset * 7);
    const days = getWeekDates(ref);
    const monday = getMonday(days[0].date);
    setMondayStr(monday);

    let savedForecasts: WeeklyForecast[] = [];
    try { savedForecasts = await getWeeklyForecasts(resolvedHotelId, monday) as WeeklyForecast[]; } catch { /* ignore */ }

    const dayMap = new Map(savedForecasts.map(f => [f.date, f]));
    const savedPrevNight = savedForecasts.length > 0 ? (savedForecasts[0].prev_night_occ ?? prevNightOcc) : prevNightOcc;
    setPrevNightOcc(savedPrevNight);

    const data = days.map(d => {
      const sv = dayMap.get(d.date);
      const occPct = sv?.occupancy_pct ?? 0;
      return {
        date: d.date,
        label: d.label,
        occupancyPct: occPct,
        roomsOccupied: sv?.rooms_occupied ?? Math.round(resolvedTotalRooms * occPct / 100),
        arrivals: sv?.arrivals ?? 0,
        departures: sv?.departures ?? 0,
      };
    });

    let prevRooms = savedPrevNight;
    for (const day of data) {
      day.departures = Math.max(0, prevRooms + day.arrivals - day.roomsOccupied);
      prevRooms = day.roomsOccupied;
    }

    setWeekDays(data);
    setLoading(false);
  };

  useEffect(() => {
    if (resolvedHotelId) loadWeek(weekOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedHotelId, weekOffset]);

  const updateDay = (idx: number, field: 'occupancyPct' | 'arrivals', value: number) => {
    setWeekDays(prev => {
      const updated = prev.map(d => ({ ...d }));
      if (field === 'occupancyPct') {
        updated[idx].occupancyPct = value;
        updated[idx].roomsOccupied = Math.round(resolvedTotalRooms * value / 100);
      } else {
        updated[idx].arrivals = value;
      }
      let prevRooms = idx > 0 ? updated[idx - 1].roomsOccupied : prevNightOcc;
      for (let j = idx; j < updated.length; j++) {
        updated[j].departures = Math.max(0, prevRooms + updated[j].arrivals - updated[j].roomsOccupied);
        prevRooms = updated[j].roomsOccupied;
      }
      return updated;
    });
  };

  const updatePrevNight = (v: number) => {
    const clamped = Math.min(resolvedTotalRooms, Math.max(0, v));
    setPrevNightOcc(clamped);
    setWeekDays(prev => {
      const updated = prev.map(d => ({ ...d }));
      let prevR = clamped;
      for (const day of updated) {
        day.departures = Math.max(0, prevR + day.arrivals - day.roomsOccupied);
        prevR = day.roomsOccupied;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!resolvedHotelId) { setSaveError('Hotel not loaded yet — please wait.'); return; }
    if (!mondayStr) { setSaveError('Week not loaded yet — please wait.'); return; }
    if (weekDays.length === 0) { setSaveError('No data to save.'); return; }
    setSaving(true); setSaveError('');
    const monday = mondayStr;
    try {
      const forecasts = weekDays.map(day => ({
        hotel_id: resolvedHotelId,
        week_start: monday,
        date: day.date,
        occupancy_pct: day.occupancyPct,
        arrivals: day.arrivals,
        rooms_occupied: day.roomsOccupied,
        departures: day.departures,
        total_rooms: resolvedTotalRooms,
        prev_night_occ: prevNightOcc,
      }));
      const res = await fetch('/api/upsert-forecast', {
        method: 'POST',
        headers: await authedApiHeaders(),
        body: JSON.stringify({ forecasts }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    }
    setSaving(false);
  };

  const todayLocal = getTodayInTimezone(resolvedTimezone);
  const avgOcc = weekDays.length > 0 ? Math.round(weekDays.reduce((s, d) => s + d.occupancyPct, 0) / weekDays.length) : 0;
  const totalArrivals = weekDays.reduce((s, d) => s + d.arrivals, 0);
  const totalDepartures = weekDays.reduce((s, d) => s + d.departures, 0);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-teal-600 shrink-0" />
          <h1 className="text-[18px] font-extrabold text-gray-900">Forecast</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadWeek(weekOffset)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
          >
            <Save size={12} /> {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      <p className="text-[12px] text-gray-400 mb-4">{resolvedTotalRooms} total rooms · weekly occupancy planner</p>

      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="flex-1 text-center text-[13px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg py-1.5">
          {formatWeekLabel(mondayStr, weekOffset)}
          {mondayStr && (
            <span className="text-[11px] font-normal text-gray-400 ml-1.5">
              {new Date(mondayStr + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
        </span>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        >
          <ChevronRight size={15} />
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-[11px] font-semibold text-teal-600 hover:text-teal-800 px-2 py-1.5 rounded-lg border border-teal-200 bg-teal-50"
          >
            Today
          </button>
        )}
      </div>

      {saveError && (
        <p className="mb-3 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">Loading…</div>
      ) : (
        <>
          {/* Main table — horizontal scroll on mobile */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-28 sticky left-0 bg-gray-50 z-10">
                      Metric
                    </th>
                    {weekDays.map(day => (
                      <th
                        key={day.date}
                        className={`px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider ${
                          day.date === todayLocal ? 'text-teal-700' : 'text-gray-400'
                        }`}
                      >
                        <span className="block">{day.label}</span>
                        <span className={`block text-[9px] font-normal mt-0.5 ${day.date === todayLocal ? 'text-teal-500' : 'text-gray-300'}`}>
                          {new Date(day.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        {day.date === todayLocal && (
                          <span className="inline-block mt-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full bg-teal-100 text-teal-700">Today</span>
                        )}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-300 w-14">
                      Avg
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Occupancy % row */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-3 py-3 sticky left-0 bg-white hover:bg-gray-50/50 z-10">
                      <span className="text-[11px] font-semibold text-gray-600">Occ %</span>
                    </td>
                    {weekDays.map((day, idx) => (
                      <td key={day.date} className={`px-2 py-2 text-center ${day.date === todayLocal ? 'bg-teal-50/40' : ''}`}>
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={day.occupancyPct}
                            onChange={e => updateDay(idx, 'occupancyPct', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                            className="w-12 text-center px-1 py-1 border border-gray-200 rounded text-[12px] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                          />
                          <span className="text-[10px] text-gray-400">%</span>
                        </div>
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center text-[12px] font-bold text-gray-500">{avgOcc}%</td>
                  </tr>

                  {/* Rooms Occupied row */}
                  <tr className="bg-teal-50/30 hover:bg-teal-50/50">
                    <td className="px-3 py-3 sticky left-0 bg-teal-50/30 z-10">
                      <span className="text-[11px] font-semibold text-teal-700">Occupied</span>
                    </td>
                    {weekDays.map(day => (
                      <td key={day.date} className={`px-2 py-2 text-center ${day.date === todayLocal ? 'bg-teal-50/60' : ''}`}>
                        <span className="text-[14px] font-extrabold text-teal-800">{day.roomsOccupied}</span>
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center text-[12px] font-bold text-teal-600">
                      {weekDays.length > 0 ? Math.round(weekDays.reduce((s, d) => s + d.roomsOccupied, 0) / weekDays.length) : 0}
                    </td>
                  </tr>

                  {/* Arrivals row */}
                  <tr className="hover:bg-blue-50/20">
                    <td className="px-3 py-3 sticky left-0 bg-white hover:bg-blue-50/20 z-10">
                      <span className="text-[11px] font-semibold text-blue-600">Arrivals</span>
                    </td>
                    {weekDays.map((day, idx) => (
                      <td key={day.date} className={`px-2 py-2 text-center ${day.date === todayLocal ? 'bg-teal-50/40' : ''}`}>
                        <input
                          type="number"
                          min={0}
                          max={resolvedTotalRooms}
                          value={day.arrivals}
                          onChange={e => updateDay(idx, 'arrivals', Math.max(0, Number(e.target.value) || 0))}
                          className="w-12 text-center px-1 py-1 border border-blue-200 rounded text-[12px] font-bold text-blue-800 bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center text-[12px] font-bold text-blue-500">{totalArrivals}</td>
                  </tr>

                  {/* Departures row */}
                  <tr className="bg-gray-50/50 hover:bg-gray-50">
                    <td className="px-3 py-3 sticky left-0 bg-gray-50/50 z-10">
                      <span className="text-[11px] font-semibold text-gray-500">Departures</span>
                    </td>
                    {weekDays.map(day => (
                      <td key={day.date} className={`px-2 py-2 text-center ${day.date === todayLocal ? 'bg-teal-50/40' : ''}`}>
                        <span className="text-[14px] font-bold text-gray-600">{day.departures}</span>
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center text-[12px] font-bold text-gray-400">{totalDepartures}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Previous night baseline */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prev Night Baseline</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Rooms occupied the night before Monday — used to calc departures</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={resolvedTotalRooms}
                  value={prevNightOcc}
                  onChange={e => updatePrevNight(Number(e.target.value) || 0)}
                  className="w-16 text-center px-2 py-1.5 border border-gray-300 rounded-lg text-[13px] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <span className="text-[11px] text-gray-400">/ {resolvedTotalRooms}</span>
              </div>
            </div>
          </div>

          {/* Week summary chips */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Avg Occ', value: `${avgOcc}%`, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
              { label: 'Arrivals', value: totalArrivals, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
              { label: 'Departures', value: totalDepartures, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border px-3 py-2.5 ${s.bg}`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
                <p className={`text-[20px] font-extrabold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
