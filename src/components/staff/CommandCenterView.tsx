'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Users, Wrench, ClipboardList, CalendarDays, BedDouble, DollarSign, Star,
  Plus, Trash2, RefreshCw, AlertTriangle, ChevronRight, Save, TrendingUp,
} from 'lucide-react';
import {
  getStaffSchedulesRange, getRoomStatuses, getWorkOrders, getLinenCounts,
  getHotelEvents, createHotelEvent, deleteHotelEvent, getForecastsRange, upsertForecastDay,
  getOpenTickets,
  type WeeklyForecast,
} from '@/lib/supabase';
import { listKpiDefinitions, listKpiSubmissions, type OpRecord } from '@/lib/opsStore';

const TEAL = '#158A7C';

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0 Sun
  d.setDate(d.getDate() - ((dow + 6) % 7));
  return localDateStr(d);
}
function fmtTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const H = parseInt(h, 10);
  const ampm = H >= 12 ? 'PM' : 'AM';
  const h12 = H % 12 === 0 ? 12 : H % 12;
  return `${h12}:${m} ${ampm}`;
}
function money(n: number): string {
  return `$${n.toFixed(0)}`;
}

interface KpiTile { name: string; value: number | null; target: number; unit: string }

export default function CommandCenterView({
  hotelId, hotelName, staffName, isAdmin, onNavigate,
}: {
  hotelId: string; hotelName: string; staffName: string; isAdmin: boolean;
  onNavigate: (tab: 'schedules' | 'todos' | 'orders' | 'housekeeping' | 'maintenance' | 'compset') => void;
}) {
  const today = localDateStr();
  const [loading, setLoading] = useState(true);
  const [onDuty, setOnDuty] = useState<{ staff_name: string; start_time: string | null; end_time: string | null; role: string }[]>([]);
  const [rooms, setRooms] = useState<{ room_number: string; status: string }[]>([]);
  const [openWo, setOpenWo] = useState(0);
  const [tickets, setTickets] = useState<{ total: number; byType: Record<string, number> }>({ total: 0, byType: {} });
  const [events, setEvents] = useState<{ id: string; title: string; event_date: string; emoji?: string }[]>([]);
  const [kpis, setKpis] = useState<KpiTile[]>([]);
  const [linenLow, setLinenLow] = useState(0);
  const [todayFc, setTodayFc] = useState<WeeklyForecast | null>(null);
  const [weekAdr, setWeekAdr] = useState<{ date: string; adr: number | null; occupancy_pct: number }[]>([]);

  // input state
  const [inpOcc, setInpOcc] = useState('');
  const [inpAdr, setInpAdr] = useState('');
  const [inpArr, setInpArr] = useState('');
  const [savingOcc, setSavingOcc] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // event form
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(today);
  const [evEmoji, setEvEmoji] = useState('📅');

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const weekStart = mondayOf(today);
      const [scheds, roomsData, wos, tk, evs, defs, logs, fcs, linen] = await Promise.all([
        getStaffSchedulesRange(hotelId, today, today),
        getRoomStatuses(hotelId),
        getWorkOrders(hotelId),
        getOpenTickets(hotelId),
        getHotelEvents(hotelId, addDaysStr(today, -7), addDaysStr(today, 30)),
        listKpiDefinitions(hotelId),
        listKpiSubmissions(hotelId),
        getForecastsRange(hotelId, weekStart, addDaysStr(today, 13)),
        getLinenCounts(hotelId, today).catch(() => []),
      ]);
      setOnDuty((scheds || []).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')));
      setRooms((roomsData || []) as { room_number: string; status: string }[]);
      setOpenWo((wos || []).filter(w => w.status !== 'resolved').length);
      setTickets(tk);

      const upcoming = (evs || []).filter(e => e.event_date >= today).slice(0, 8);
      setEvents(upcoming as { id: string; title: string; event_date: string; emoji?: string }[]);

      // KPI tiles: latest value today per definition
      const tiles: KpiTile[] = (defs || []).slice(0, 6).map((def: OpRecord) => {
        const d = def.details as Record<string, unknown>;
        const todayLogs = (logs || []).filter((l: OpRecord) => {
          const ld = l.details as Record<string, unknown>;
          return ld.definition_id === def.id && ld.shift_date === today;
        }).sort((a: OpRecord, b: OpRecord) =>
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        const latest = todayLogs[0];
        const ld = latest ? (latest.details as Record<string, unknown>) : null;
        return {
          name: (d.kpi_name as string) || 'KPI',
          value: ld ? Number(ld.value) : null,
          target: Number(d.target) || 0,
          unit: (d.unit as string) || '',
        };
      });
      setKpis(tiles);

      // linen below par (today's counts; if none, latest date)
      let below = 0;
      if (linen && linen.length > 0) {
        below = linen.filter(l => l.count < l.par_level).length;
      } else {
        const all = await getLinenCounts(hotelId).catch(() => []);
        if (all.length > 0) {
          const latestDate = all[0]?.count_date;
          below = all.filter(l => l.count_date === latestDate && l.count < l.par_level).length;
        }
      }
      setLinenLow(below);

      const t = (fcs || []).find((f: WeeklyForecast) => f.date === today) || null;
      setTodayFc(t);
      if (t) {
        setInpOcc(String(t.occupancy_pct ?? ''));
        setInpAdr(t.adr != null ? String(t.adr) : '');
        setInpArr(String(t.arrivals ?? ''));
      }
      setWeekAdr((fcs || []).map((f: WeeklyForecast) => ({ date: f.date, adr: f.adr ?? null, occupancy_pct: f.occupancy_pct })));
    } finally {
      setLoading(false);
    }
  }, [hotelId, today]);

  useEffect(() => { load(); }, [load]);

  const saveToday = async () => {
    if (!hotelId) return;
    const occ = Number(inpOcc);
    if (isNaN(occ) || occ < 0 || occ > 100) return;
    setSavingOcc(true);
    const adr = inpAdr.trim() === '' ? null : Number(inpAdr);
    const rooms_occupied = Math.round((Number(occ) / 100) * (todayFc?.total_rooms || rooms.length || 54));
    const arr = Number(inpArr) || 0;
    const prev = todayFc?.prev_night_occ ?? rooms_occupied;
    const err = await upsertForecastDay(hotelId, mondayOf(today), {
      date: today,
      occupancy_pct: occ,
      adr,
      arrivals: arr,
      rooms_occupied,
      departures: Math.max(0, prev + arr - rooms_occupied),
      total_rooms: todayFc?.total_rooms || rooms.length || 54,
      prev_night_occ: prev,
    });
    setSavingOcc(false);
    if (!err.error) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
      load();
    }
  };

  const addEvent = async () => {
    if (!evTitle.trim() || !hotelId) return;
    const ok = await createHotelEvent(hotelId, evTitle.trim(), evDate, undefined, evEmoji);
    if (ok) {
      setEvTitle('');
      load();
    }
  };
  const removeEvent = async (id: string) => {
    await deleteHotelEvent(id);
    load();
  };

  const dirty = rooms.filter(r => r.status === 'dirty');
  const ooo = rooms.filter(r => r.status === 'out_of_order');
  const clean = rooms.filter(r => r.status === 'clean');
  const inspected = rooms.filter(r => r.status === 'inspected');
  const occPct = todayFc ? todayFc.occupancy_pct : null;
  const adr = todayFc?.adr ?? null;
  const revpar = occPct != null && adr != null ? (occPct / 100) * adr : null;

  const sec = 'bg-white border border-gray-200 rounded-2xl p-4';
  const secH = 'flex items-center justify-between mb-3';

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Command Center</h1>
          <p className="text-[13px] text-gray-500">{hotelName} · {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Business health row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className={sec}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1"><BedDouble size={13} /> Occupancy</div>
          {occPct != null ? (
            <>
              <div className="text-[26px] font-extrabold text-gray-900 leading-none">{occPct}<span className="text-[14px] text-gray-400">%</span></div>
              <div className="text-[11px] text-gray-400 mt-1">{todayFc?.rooms_occupied ?? '—'} rooms · staff input</div>
            </>
          ) : (
            <div className="text-[13px] text-gray-400 font-medium">Enter below ↓</div>
          )}
        </div>
        <div className={sec}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1"><DollarSign size={13} /> ADR (Rate)</div>
          {adr != null ? (
            <>
              <div className="text-[26px] font-extrabold text-gray-900 leading-none">{money(adr)}</div>
              {revpar != null && <div className="text-[11px] text-gray-400 mt-1">RevPAR {money(revpar)}</div>}
            </>
          ) : (
            <div className="text-[13px] text-gray-400 font-medium">Enter below ↓</div>
          )}
        </div>
        <div className={sec}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1"><Star size={13} /> Guest Scores</div>
          {kpis.filter(k => k.value != null).length > 0 ? (
            <div className="space-y-0.5">
              {kpis.filter(k => k.value != null).slice(0, 3).map(k => (
                <div key={k.name} className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-500 font-medium truncate max-w-[110px]">{k.name}</span>
                  <span className={`font-extrabold ${k.target > 0 && k.value! < k.target ? 'text-orange-600' : 'text-teal-700'}`}>{k.value}{k.unit === '%' ? '%' : ''}</span>
                </div>
              ))}
              {kpis.filter(k => k.value == null).length > 0 && (
                <div className="text-[10px] text-gray-400">{kpis.filter(k => k.value == null).length} KPI(s) not logged today</div>
              )}
            </div>
          ) : (
            <div className="text-[13px] text-gray-400 font-medium">No scores logged today</div>
          )}
        </div>
        <div className={sec}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1"><AlertTriangle size={13} /> Needs Attention</div>
          <div className="space-y-0.5">
            <button onClick={() => onNavigate('orders')} className="flex items-center justify-between w-full text-[12px] hover:bg-gray-50 rounded-lg px-1 py-0.5">
              <span className="text-gray-500 font-medium">Open tickets</span>
              <span className={`font-extrabold ${tickets.total > 0 ? 'text-orange-600' : 'text-teal-700'}`}>{tickets.total}</span>
            </button>
            <button onClick={() => onNavigate('housekeeping')} className="flex items-center justify-between w-full text-[12px] hover:bg-gray-50 rounded-lg px-1 py-0.5">
              <span className="text-gray-500 font-medium">Dirty rooms</span>
              <span className={`font-extrabold ${dirty.length > 0 ? 'text-orange-600' : 'text-teal-700'}`}>{dirty.length}</span>
            </button>
            <button onClick={() => onNavigate('maintenance')} className="flex items-center justify-between w-full text-[12px] hover:bg-gray-50 rounded-lg px-1 py-0.5">
              <span className="text-gray-500 font-medium">Open work orders</span>
              <span className={`font-extrabold ${openWo > 0 ? 'text-orange-600' : 'text-teal-700'}`}>{openWo}</span>
            </button>
            {linenLow > 0 && (
              <button onClick={() => onNavigate('housekeeping')} className="flex items-center justify-between w-full text-[12px] hover:bg-gray-50 rounded-lg px-1 py-0.5">
                <span className="text-gray-500 font-medium">Linen below par</span>
                <span className="font-extrabold text-orange-600">{linenLow}</span>
              </button>
            )}
            {ooo.length > 0 && (
              <div className="flex items-center justify-between text-[12px] px-1 py-0.5">
                <span className="text-gray-500 font-medium">Out of order</span>
                <span className="font-extrabold text-red-600">{ooo.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Today's numbers input ── */}
      <div className={sec + ' mb-4'}>
        <div className={secH}>
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><TrendingUp size={14} style={{ color: TEAL }} /> Today&apos;s Numbers <span className="text-[11px] font-medium text-gray-400">— staff input</span></div>
          {savedFlash && <span className="text-[11px] font-bold text-teal-700">✓ Saved</span>}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[12px] font-medium text-gray-600">
            Occupancy %
            <input value={inpOcc} onChange={e => setInpOcc(e.target.value)} inputMode="decimal" placeholder="e.g. 85"
              className="block w-24 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </label>
          <label className="text-[12px] font-medium text-gray-600">
            ADR ($)
            <input value={inpAdr} onChange={e => setInpAdr(e.target.value)} inputMode="decimal" placeholder="e.g. 129"
              className="block w-24 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-900 focus:outline-none focus:ring-teal-500" />
          </label>
          <label className="text-[12px] font-medium text-gray-600">
            Arrivals
            <input value={inpArr} onChange={e => setInpArr(e.target.value)} inputMode="numeric" placeholder="e.g. 18"
              className="block w-24 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-900 focus:outline-none focus:ring-teal-500" />
          </label>
          <button onClick={saveToday} disabled={savingOcc}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
            style={{ background: TEAL }}>
            <Save size={14} /> {savingOcc ? 'Saving…' : 'Save'}
          </button>
          {weekAdr.some(w => w.adr != null) && (
            <div className="text-[11px] text-gray-400 ml-1">
              Week ADR: {weekAdr.filter(w => w.adr != null).map(w => `$${w.adr!.toFixed(0)}`).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* ── On duty + rooms ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className={sec}>
          <div className={secH}>
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Users size={14} style={{ color: TEAL }} /> On Duty Today <span className="text-[11px] font-medium text-gray-400">({onDuty.length})</span></div>
            <button onClick={() => onNavigate('schedules')} className="flex items-center text-[11px] font-bold text-teal-700 hover:underline">Full schedule <ChevronRight size={12} /></button>
          </div>
          {onDuty.length === 0 ? (
            <p className="text-[13px] text-gray-400 font-medium py-2">No one scheduled today</p>
          ) : (
            <div className="space-y-1">
              {onDuty.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-[13px] bg-gray-50 rounded-xl px-3 py-2">
                  <span className="font-bold text-gray-800 truncate max-w-[170px]">{s.staff_name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium truncate max-w-[110px]">{(s.role || '').trim()}</span>
                    <span className="font-extrabold text-gray-700 text-[12px]">{fmtTime(s.start_time)}{s.end_time ? ` – ${fmtTime(s.end_time)}` : ''}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={sec}>
          <div className={secH}>
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><BedDouble size={14} style={{ color: TEAL }} /> Rooms ({rooms.length})</div>
            <button onClick={() => onNavigate('housekeeping')} className="flex items-center text-[11px] font-bold text-teal-700 hover:underline">Housekeeping <ChevronRight size={12} /></button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="bg-teal-50 rounded-xl p-2 text-center"><div className="text-[18px] font-extrabold text-teal-800">{inspected.length + clean.length}</div><div className="text-[10px] font-bold text-teal-700">READY</div></div>
            <div className="bg-orange-50 rounded-xl p-2 text-center"><div className="text-[18px] font-extrabold text-orange-700">{dirty.length}</div><div className="text-[10px] font-bold text-orange-600">DIRTY</div></div>
            <div className="bg-blue-50 rounded-xl p-2 text-center"><div className="text-[18px] font-extrabold text-blue-700">{clean.length}</div><div className="text-[10px] font-bold text-blue-600">CLEAN</div></div>
            <div className="bg-red-50 rounded-xl p-2 text-center"><div className="text-[18px] font-extrabold text-red-700">{ooo.length}</div><div className="text-[10px] font-bold text-red-600">OOO</div></div>
          </div>
          {dirty.length > 0 && (
            <div className="text-[12px] text-gray-500">
              <span className="font-bold text-gray-700">Dirty:</span> {dirty.map(r => r.room_number).slice(0, 12).join(', ')}{dirty.length > 12 ? ` +${dirty.length - 12} more` : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Property calendar + quick links ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={sec}>
          <div className={secH}>
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><CalendarDays size={14} style={{ color: TEAL }} /> Property Calendar</div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5 mb-3">
              <input value={evEmoji} onChange={e => setEvEmoji(e.target.value)} className="w-10 text-center px-1 py-2 border border-gray-200 rounded-xl text-[14px]" maxLength={2} />
              <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Add event…" onKeyDown={e => { if (e.key === 'Enter') addEvent(); }}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-teal-500" />
              <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-xl text-[12px] text-gray-600" />
              <button onClick={addEvent} className="p-2 rounded-xl text-white" style={{ background: TEAL }}><Plus size={15} /></button>
            </div>
          )}
          {events.length === 0 ? (
            <p className="text-[13px] text-gray-400 font-medium py-1">No upcoming events</p>
          ) : (
            <div className="space-y-1">
              {events.map(ev => (
                <div key={ev.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-[13px]">
                  <span className="flex items-center gap-2 min-w-0">
                    <span>{ev.emoji || '📅'}</span>
                    <span className="font-bold text-gray-800 truncate">{ev.title}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray-400 font-medium">{new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    {isAdmin && <button onClick={() => removeEvent(ev.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={sec}>
          <div className={secH}>
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><ClipboardList size={14} style={{ color: TEAL }} /> Jump To</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onNavigate('todos')} className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-3 text-[13px] font-bold text-gray-800"><ClipboardList size={15} style={{ color: TEAL }} /> To-Dos</button>
            <button onClick={() => onNavigate('housekeeping')} className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-3 text-[13px] font-bold text-gray-800"><BedDouble size={15} style={{ color: TEAL }} /> Housekeeping</button>
            <button onClick={() => onNavigate('maintenance')} className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-3 text-[13px] font-bold text-gray-800"><Wrench size={15} style={{ color: TEAL }} /> Maintenance</button>
            <button onClick={() => onNavigate('schedules')} className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-3 text-[13px] font-bold text-gray-800"><CalendarDays size={15} style={{ color: TEAL }} /> Sched & Forecast</button>
          </div>
          <div className="mt-3 text-[11px] text-gray-400 font-medium">
            {tickets.total > 0 ? `${tickets.total} open ticket(s): ${Object.entries(tickets.byType).map(([t, n]) => `${t} (${n})`).join(', ')}` : 'No open tickets'}
          </div>
        </div>
      </div>
    </div>
  );
}
