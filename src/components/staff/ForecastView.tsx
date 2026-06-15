'use client';

import { useState, useEffect } from 'react';
import { supabase, getWeeklyForecasts, authedApiHeaders, type WeeklyForecast } from '@/lib/supabase';
import { TrendingUp, Save, RefreshCw } from 'lucide-react';

interface DayData {
  date: string;          // YYYY-MM-DD
  label: string;         // Mon, Tue, etc
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
    return { date: d.toISOString().split('T')[0], label };
  });
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().split('T')[0];
}

/** Get today's YYYY-MM-DD in the hotel's timezone */
function getTodayInTimezone(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value || '';
    const m = parts.find(p => p.type === 'month')?.value || '';
    const d = parts.find(p => p.type === 'day')?.value || '';
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

interface ForecastViewProps {
  hotelId: string;
  totalRooms: number;
  timezone?: string; // IANA timezone, e.g. 'America/New_York'
}

export default function ForecastView({ hotelId, totalRooms, timezone }: ForecastViewProps) {
  const [weekDays, setWeekDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [prevNightOcc, setPrevNightOcc] = useState(0); // previous night's occupied rooms
  const [weekOffset, setWeekOffset] = useState(0); // 0=current, 1=next, -1=last, etc
  const [resolvedHotelId, setResolvedHotelId] = useState(hotelId);
  const [resolvedTotalRooms, setResolvedTotalRooms] = useState(totalRooms);
  const [resolvedTimezone, setResolvedTimezone] = useState(timezone || 'America/New_York');

  // Always fetch room_count from DB — the DB is the source of truth.
  // Props are used as initial state only; the DB fetch overwrites them.
  useEffect(() => {
    // Set initial values from props immediately (no flash of 0)
    if (hotelId) setResolvedHotelId(hotelId);
    if (totalRooms > 0) setResolvedTotalRooms(totalRooms);

    const fetchSelf = async () => {
      const slug = localStorage.getItem('attenda_hotel_slug');
      if (slug) {
        const { data } = await supabase
          .from('hotels')
          .select('id, room_count, timezone')
          .eq('slug', slug)
          .single();
        if (data) {
          setResolvedHotelId(data.id);
          setResolvedTotalRooms(data.room_count || 0);
          if (data.timezone) setResolvedTimezone(data.timezone);
        }
      }
    };
    fetchSelf();
  }, [hotelId, totalRooms]);

  const loadWeek = async (offset: number = weekOffset) => {
    setLoading(true);
    const todayLocal = getTodayInTimezone(resolvedTimezone);
    const ref = new Date(todayLocal + 'T12:00:00');
    ref.setDate(ref.getDate() + offset * 7);
    const days = getWeekDates(ref);
    const monday = getMonday(days[0].date);

    // Try loading saved forecasts
    let savedForecasts: WeeklyForecast[] = [];
    try {
      savedForecasts = await getWeeklyForecasts(resolvedHotelId, monday) as WeeklyForecast[];
    } catch { /* ignore */ }

    const dayMap = new Map(savedForecasts.map(f => [f.date, f]));

    // Load prev_night_occ from the first saved day (all days share the same value)
    const savedPrevNight = savedForecasts.length > 0 ? (savedForecasts[0].prev_night_occ ?? prevNightOcc) : prevNightOcc;
    if (savedPrevNight !== prevNightOcc) {
      setPrevNightOcc(savedPrevNight);
    }

    const data = days.map(d => {
      const saved = dayMap.get(d.date);
      const occPct = saved?.occupancy_pct ?? 0;
      return {
        date: d.date,
        label: d.label,
        occupancyPct: occPct,
        roomsOccupied: saved?.rooms_occupied ?? Math.round(resolvedTotalRooms * occPct / 100),
        arrivals: saved?.arrivals ?? 0,
        departures: saved?.departures ?? 0,
      };
    });

    // Auto-calc departures using previous night
    let prevRooms = savedPrevNight;
    for (const day of data) {
      // departure = previous night's rooms + arrivals - tonight's rooms
      // clamped to 0
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
      // Recalc departures from current day onward
      let prevRooms = idx > 0 ? updated[idx - 1].roomsOccupied : prevNightOcc;
      for (let j = idx; j < updated.length; j++) {
        updated[j].departures = Math.max(0, prevRooms + updated[j].arrivals - updated[j].roomsOccupied);
        prevRooms = updated[j].roomsOccupied;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true); setSaveError('');
    const monday = getMonday(weekDays[0].date);
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
      const msg = e instanceof Error ? e.message : 'Save failed';
      setSaveError(msg);
    }
    setSaving(false);
  };

  const weekTotal = weekDays.reduce((s, d) => ({
    arrivals: s.arrivals + d.arrivals,
    departures: s.departures + d.departures,
    rooms: s.rooms + d.roomsOccupied,
  }), { arrivals: 0, departures: 0, rooms: 0 });

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-teal-600 shrink-0" />
            Forecast
          </h1>
          <p className="text-[12px] md:text-[13px] text-gray-500 mt-0.5">
            {resolvedTotalRooms} total rooms · Week of {weekDays[0]?.date}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week Navigation */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="px-2.5 md:px-3 py-1.5 text-[12px] md:text-[13px] font-semibold text-gray-600 hover:bg-gray-50 border-r border-gray-200"
            >
              ←
            </button>
            <span className="px-2 md:px-3 py-1.5 text-[11px] md:text-[12px] font-bold text-gray-700 bg-gray-50 whitespace-nowrap">
              {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset > 0 ? `+${weekOffset}` : `${weekOffset}`}
            </span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="px-2.5 md:px-3 py-1.5 text-[12px] md:text-[13px] font-semibold text-gray-600 hover:bg-gray-50 border-l border-gray-200"
            >
              →
            </button>
          </div>
          <button
            onClick={() => { loadWeek(weekOffset); }}
            className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 md:px-3 py-1.5 rounded-lg text-[12px] md:text-[13px] font-semibold text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          {saveError && (
            <p className="text-[11px] text-red-500 bg-red-50 px-3 py-1.5 rounded-lg w-full md:w-auto order-last md:order-none">{saveError}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-3 md:px-4 py-1.5 rounded-lg text-[12px] md:text-[13px] font-semibold transition-colors"
          >
            <Save size={13} /> {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>

      {/* Previous Night Baseline */}
      <div className="mb-4 md:mb-6 bg-white border border-gray-200 rounded-xl p-3 md:p-4 shadow-sm">
        <label className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
          Previous Night Rooms Occupied (Sunday)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={resolvedTotalRooms}
            value={prevNightOcc}
            onChange={e => {
              const v = Math.min(resolvedTotalRooms, Math.max(0, Number(e.target.value) || 0));
              setPrevNightOcc(v);
              // Recalc all departures
              setWeekDays(prev => {
                const updated = prev.map(d => ({ ...d }));
                let prevR = v;
                for (const day of updated) {
                  day.departures = Math.max(0, prevR + day.arrivals - day.roomsOccupied);
                  prevR = day.roomsOccupied;
                }
                return updated;
              });
            }}
            className="w-20 md:w-24 px-2 md:px-3 py-1.5 border border-gray-300 rounded-lg text-[14px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <span className="text-[11px] md:text-[12px] text-gray-400">/ {resolvedTotalRooms} rooms</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-[14px]">Loading...</div>
      ) : (
        <>
          {/* Week Grid — scrollable on mobile, 7-col on desktop */}
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 pb-2">
            <div className="flex md:grid md:grid-cols-7 gap-2 md:gap-3 min-w-[700px] md:min-w-0">
              {weekDays.map((day, idx) => (
                <div
                  key={day.date}
                  className={`bg-white border-2 rounded-xl p-3 md:p-4 shadow-sm shrink-0 w-[160px] md:w-auto ${
                    day.date === getTodayInTimezone(resolvedTimezone)
                      ? 'border-teal-400 ring-1 ring-teal-200'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Day header */}
                  <div className="text-center mb-2 md:mb-3">
                    <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-gray-400">{day.label}</p>
                    <p className="text-[11px] md:text-[12px] text-gray-500">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                    {day.date === getTodayInTimezone(resolvedTimezone) && (
                      <span className="inline-block mt-1 text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">Today</span>
                    )}
                  </div>

                  {/* Occupancy */}
                  <div className="mb-1.5 md:mb-2">
                    <label className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-gray-400">Occ%</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={day.occupancyPct}
                        onChange={e => updateDay(idx, 'occupancyPct', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        className="w-full px-1.5 md:px-2 py-1 border border-gray-200 rounded text-[12px] md:text-[13px] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                      <span className="text-[10px] md:text-[11px] text-gray-400">%</span>
                    </div>
                  </div>

                  {/* Rooms Occupied (auto) */}
                  <div className="mb-1.5 md:mb-2 bg-teal-50 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 border border-teal-100">
                    <label className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-teal-600">Occupied</label>
                    <p className="text-[14px] md:text-[16px] font-extrabold text-teal-800">{day.roomsOccupied}</p>
                  </div>

                  {/* Arrivals */}
                  <div className="mb-1.5 md:mb-2">
                    <label className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-blue-500">Arrivals</label>
                    <input
                      type="number"
                      min={0}
                      max={resolvedTotalRooms}
                      value={day.arrivals}
                      onChange={e => updateDay(idx, 'arrivals', Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-1.5 md:px-2 py-1 border border-blue-200 rounded text-[12px] md:text-[13px] font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/50"
                    />
                  </div>

                  {/* Departures (auto) */}
                  <div className="bg-gray-50 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 border border-gray-200">
                    <label className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-gray-500">Departures</label>
                    <p className="text-[14px] md:text-[16px] font-extrabold text-gray-700">{day.departures}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Week Summary */}
          <div className="mt-4 md:mt-6 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-4 md:p-5 shadow-sm">
            <h2 className="text-[11px] md:text-[12px] font-bold uppercase tracking-wider text-teal-700 mb-2 md:mb-3">Week Summary</h2>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div>
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Arrivals</p>
                <p className="text-[18px] md:text-[22px] font-extrabold text-gray-900">{weekTotal.arrivals}</p>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Departures</p>
                <p className="text-[18px] md:text-[22px] font-extrabold text-gray-900">{weekTotal.departures}</p>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-gray-500">Avg Occupancy</p>
                <p className="text-[18px] md:text-[22px] font-extrabold text-gray-900">
                  {weekDays.length > 0 ? Math.round(weekDays.reduce((s, d) => s + d.occupancyPct, 0) / weekDays.length) : 0}%
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
