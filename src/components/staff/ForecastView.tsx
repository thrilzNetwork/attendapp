'use client';

import { useState, useEffect } from 'react';
import { getWeeklyForecasts, upsertWeeklyForecast, type WeeklyForecast } from '@/lib/supabase';
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

interface ForecastViewProps {
  hotelId: string;
  totalRooms: number;
}

export default function ForecastView({ hotelId, totalRooms }: ForecastViewProps) {
  const [weekDays, setWeekDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prevNightOcc, setPrevNightOcc] = useState(0); // previous night's occupied rooms

  const loadWeek = async () => {
    setLoading(true);
    const days = getWeekDates(new Date());
    const monday = getMonday(days[0].date);

    // Try loading saved forecasts
    let savedForecasts: { date: string; occupancy_pct: number; arrivals: number; rooms_occupied: number }[] = [];
    try {
      savedForecasts = await getWeeklyForecasts(hotelId, monday) as WeeklyForecast[];
    } catch { /* ignore */ }

    const dayMap = new Map(savedForecasts.map(f => [f.date, f]));

    const data = days.map(d => {
      const saved = dayMap.get(d.date);
      const occPct = saved?.occupancy_pct ?? 0;
      return {
        date: d.date,
        label: d.label,
        occupancyPct: occPct,
        roomsOccupied: Math.round(totalRooms * occPct / 100),
        arrivals: saved?.arrivals ?? 0,
        departures: 0,
      };
    });

    // Auto-calc departures using previous night
    let prevRooms = prevNightOcc;
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
    if (hotelId) loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const updateDay = (idx: number, field: 'occupancyPct' | 'arrivals', value: number) => {
    setWeekDays(prev => {
      const updated = prev.map(d => ({ ...d }));
      if (field === 'occupancyPct') {
        updated[idx].occupancyPct = value;
        updated[idx].roomsOccupied = Math.round(totalRooms * value / 100);
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
    setSaving(true);
    const monday = getMonday(weekDays[0].date);
    try {
      for (const day of weekDays) {
        await upsertWeeklyForecast({
          hotel_id: hotelId,
          week_start: monday,
          date: day.date,
          occupancy_pct: day.occupancyPct,
          arrivals: day.arrivals,
          rooms_occupied: day.roomsOccupied,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  const weekTotal = weekDays.reduce((s, d) => ({
    arrivals: s.arrivals + d.arrivals,
    departures: s.departures + d.departures,
    rooms: s.rooms + d.roomsOccupied,
  }), { arrivals: 0, departures: 0, rooms: 0 });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900 flex items-center gap-2">
            <TrendingUp size={22} className="text-teal-600" />
            Forecast
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {totalRooms} total rooms · Week of {weekDays[0]?.date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadWeek}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
          >
            <Save size={14} /> {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Forecast'}
          </button>
        </div>
      </div>

      {/* Previous Night Baseline */}
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
          Previous Night Rooms Occupied (Sunday)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={totalRooms}
            value={prevNightOcc}
            onChange={e => {
              const v = Math.min(totalRooms, Math.max(0, Number(e.target.value) || 0));
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
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-[14px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <span className="text-[12px] text-gray-400">/ {totalRooms} rooms</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-[14px]">Loading...</div>
      ) : (
        <>
          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day, idx) => (
              <div
                key={day.date}
                className={`bg-white border-2 rounded-xl p-4 shadow-sm ${
                  day.date === new Date().toISOString().split('T')[0]
                    ? 'border-teal-400 ring-1 ring-teal-200'
                    : 'border-gray-200'
                }`}
              >
                {/* Day header */}
                <div className="text-center mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{day.label}</p>
                  <p className="text-[12px] text-gray-500">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                  {day.date === new Date().toISOString().split('T')[0] && (
                    <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">Today</span>
                  )}
                </div>

                {/* Occupancy */}
                <div className="mb-2">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Occ%</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={day.occupancyPct}
                      onChange={e => updateDay(idx, 'occupancyPct', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-[13px] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <span className="text-[11px] text-gray-400">%</span>
                  </div>
                </div>

                {/* Rooms Occupied (auto) */}
                <div className="mb-2 bg-teal-50 rounded-lg px-2 py-1.5 border border-teal-100">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-teal-600">Occupied</label>
                  <p className="text-[16px] font-extrabold text-teal-800">{day.roomsOccupied}</p>
                </div>

                {/* Arrivals */}
                <div className="mb-2">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-blue-500">Arrivals</label>
                  <input
                    type="number"
                    min={0}
                    max={totalRooms}
                    value={day.arrivals}
                    onChange={e => updateDay(idx, 'arrivals', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2 py-1 border border-blue-200 rounded text-[13px] font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/50"
                  />
                </div>

                {/* Departures (auto) */}
                <div className="bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Departures</label>
                  <p className="text-[16px] font-extrabold text-gray-700">{day.departures}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Week Summary */}
          <div className="mt-6 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-teal-700 mb-3">Week Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Arrivals</p>
                <p className="text-[22px] font-extrabold text-gray-900">{weekTotal.arrivals}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Departures</p>
                <p className="text-[22px] font-extrabold text-gray-900">{weekTotal.departures}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Avg Occupancy</p>
                <p className="text-[22px] font-extrabold text-gray-900">
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
