'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Wrench, ClipboardList, CalendarDays, BedDouble, DollarSign, Star,
  Plus, Trash2, RefreshCw, AlertTriangle, ChevronRight, Save, TrendingUp, BarChart3,
} from 'lucide-react';
import {
  getStaffSchedulesRange, getRoomStatuses, getWorkOrders, getLinenCounts,
  getHotelEvents, createHotelEvent, deleteHotelEvent,
  getOpenTickets, updateStaffSchedule,
  getCompsetEntries, getCompsetEntriesRange, getCompsetHotels, upsertCompsetEntry,
  type CompsetEntry,
  type StaffSchedule,
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
  hotelId, hotelName, isAdmin, onNavigate,
}: {
  hotelId: string; hotelName: string; staffName: string; isAdmin: boolean;
  onNavigate: (tab: 'schedules' | 'todos' | 'orders' | 'housekeeping' | 'maintenance' | 'compset') => void;
}) {
  const today = localDateStr();
  const [loading, setLoading] = useState(true);
  const [onDuty, setOnDuty] = useState<StaffSchedule[]>([]);
  const [rooms, setRooms] = useState<{ room_number: string; status: string }[]>([]);
  const [openWo, setOpenWo] = useState(0);
  const [tickets, setTickets] = useState<{ total: number; byType: Record<string, number> }>({ total: 0, byType: {} });
  const [events, setEvents] = useState<{ id: string; title: string; event_date: string; emoji?: string }[]>([]);
  const [kpis, setKpis] = useState<KpiTile[]>([]);
  const [linenLow, setLinenLow] = useState(0);
  const [todayFc, setTodayFc] = useState<{ occupancy_pct: number; adr: number | null; arrivals: number } | null>(null);
  const [comp, setComp] = useState<{ avg: number | null; count: number; min: number | null; max: number | null }>({ avg: null, count: 0, min: null, max: null });
  // OWN-property numbers sourced from Compset (special compset_hotels row, name = 'OWN')
  const [own, setOwn] = useState<{ occ: number | null; adr: number | null; roomsSold: number | null; count: number }>({ occ: null, adr: null, roomsSold: null, count: 0 });
  const [compHotels, setCompHotels] = useState<{ id: string; name: string }[]>([]);

  // event form
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(today);
  const [evEmoji, setEvEmoji] = useState('📅');

  // admin adjust form (OWN row → compset_entries)
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjOcc, setAdjOcc] = useState('');
  const [adjAdr, setAdjAdr] = useState('');
  const [adjArr, setAdjArr] = useState('');
  const [savingAdj, setSavingAdj] = useState(false);
  const [adjFlash, setAdjFlash] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const [scheds, roomsData, wos, tk, evs, defs, logs, linen, compEntries, compHotelsData] = await Promise.all([
        getStaffSchedulesRange(hotelId, today, today),
        getRoomStatuses(hotelId),
        getWorkOrders(hotelId),
        getOpenTickets(hotelId),
        getHotelEvents(hotelId, addDaysStr(today, -7), addDaysStr(today, 30)),
        listKpiDefinitions(hotelId),
        listKpiSubmissions(hotelId),
        getLinenCounts(hotelId, today).catch(() => []),
        getCompsetEntries(hotelId, today).catch(() => []),
        getCompsetHotels(hotelId).catch(() => []),
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

      // Compset: today's competitor rate snapshot for the dashboard KPI
      const cRows = (compEntries || []) as CompsetEntry[];
      const cRates = cRows.map(e => e.rate).filter((r): r is number => r != null);
      setComp({
        avg: cRates.length ? Math.round(cRates.reduce((a, b) => a + b, 0) / cRates.length) : null,
        count: cRows.length,
        min: cRates.length ? Math.min(...cRates) : null,
        max: cRates.length ? Math.max(...cRates) : null,
      });

      // OWN property = special compset_hotels row (name 'OWN'); dashboard KPIs read
      // exclusively from its compset_entries for today — NOT from forecasts.
      const hotels = (compHotelsData || []).filter(h => h.name.trim().toUpperCase() === 'OWN');
      setCompHotels(hotels.map(h => ({ id: h.id, name: h.name })));
      const ownId = hotels[0]?.id;
      if (ownId) {
        const ownRows = cRows.filter(e => e.compset_hotel_id === ownId);
        const withOcc = ownRows.filter(e => e.occupancy_pct != null || e.rooms_sold != null);
        const latest = ownRows
          .slice()
          .sort((a, b) => (b.call_time || '').localeCompare(a.call_time || ''))[0] || null;
        setOwn({
          occ: latest?.occupancy_pct ?? null,
          adr: latest?.rate ?? null,
          roomsSold: latest?.rooms_sold ?? null,
          count: withOcc.length,
        });
        setTodayFc(latest ? { occupancy_pct: latest.occupancy_pct ?? 0, adr: latest.rate, arrivals: latest.rooms_sold ?? 0 } : null);
        if (latest) {
          setAdjOcc(latest.occupancy_pct != null ? String(latest.occupancy_pct) : '');
          setAdjAdr(latest.rate != null ? String(latest.rate) : '');
          setAdjArr(latest.rooms_sold != null ? String(latest.rooms_sold) : '');
        }
      } else {
        setOwn({ occ: null, adr: null, roomsSold: null, count: 0 });
        setTodayFc(null);
      }
    } finally {
      setLoading(false);
    }
  }, [hotelId, today]);

  useEffect(() => { load(); }, [load]);

  // Admin-only: write OWN property numbers into compset_entries so the dashboard
  // KPI cards are fed from Compset like every competitor.
  const saveAdjust = async () => {
    if (!hotelId || savingAdj) return;
    const ownId = compHotels[0]?.id;
    if (!ownId) return;
    const occ = Number(adjOcc);
    if (isNaN(occ) || occ < 0 || occ > 100) return;
    setSavingAdj(true);
    const adr = adjAdr.trim() === '' ? null : Number(adjAdr);
    const roomsSold = adjArr.trim() === '' ? null : Number(adjArr);
    try {
      await upsertCompsetEntry({
        hotel_id: hotelId,
        compset_hotel_id: ownId,
        call_date: today,
        call_time: '12:00',
        rate: adr,
        rooms_total: null,
        rooms_sold: roomsSold,
        occupancy_pct: occ,
        entered_by: null,
        entered_by_name: 'Dashboard adjustment',
      });
      setAdjFlash(true);
      setTimeout(() => setAdjFlash(false), 1800);
      setShowAdjust(false);
      load();
    } finally {
      setSavingAdj(false);
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

  // Editable In/End time on On Duty rows — persists via updateStaffSchedule
  const saveShiftTime = async (
    s: StaffSchedule,
    field: 'start_time' | 'end_time',
    value: string,
  ) => {
    if (!value) return;
    setOnDuty(prev => prev.map(row => (row.staff_name === s.staff_name && row.start_time === s.start_time ? { ...row, [field]: value } : row)));
    await updateStaffSchedule(s.id, { [field]: value });
  };

  const ooo = rooms.filter(r => r.status === 'out_of_order');
  const occPct = own.occ != null ? own.occ : (todayFc ? todayFc.occupancy_pct : null);
  const adr = own.adr != null ? own.adr : (todayFc ? todayFc.adr : null);
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
              <div className="text-[11px] text-gray-400 mt-1">{own.roomsSold != null ? `${own.roomsSold} rooms · ` : ''}from Compset</div>
            </>
          ) : (
            <div className="text-[13px] text-gray-400 font-medium">No Compset entry today</div>
          )}
        </div>
        <div className={sec}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1"><DollarSign size={13} /> ADR (Rate)</div>
          {adr != null ? (
            <>
              <div className="text-[26px] font-extrabold text-gray-900 leading-none">{money(adr)}</div>
              {revpar != null && <div className="text-[11px] text-gray-400 mt-1">RevPAR {money(revpar)}</div>}
              {comp.avg != null && adr != null && (
                <div className={`text-[11px] font-bold mt-1 ${adr >= comp.avg ? 'text-teal-700' : 'text-orange-600'}`}>
                  Comp avg {money(comp.avg)} · {adr >= comp.avg ? '+' : '−'}{money(Math.abs(adr - comp.avg))} vs comp
                </div>
              )}
            </>
          ) : (
            <div className="text-[13px] text-gray-400 font-medium">No Compset entry today</div>
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

      {/* ── Today's numbers (Compset-sourced) ── */}
      <div className={sec + ' mb-4'}>
        <div className={secH}>
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><TrendingUp size={14} style={{ color: TEAL }} /> Today&apos;s Numbers <span className="text-[11px] font-medium text-gray-400">— from Compset</span></div>
          <div className="flex items-center gap-2">
            {adjFlash && <span className="text-[11px] font-bold text-teal-700">✓ Saved</span>}
            {isAdmin && (
              <button onClick={() => setShowAdjust(v => !v)}
                className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
                <Save size={13} /> Adjust
              </button>
            )}
          </div>
        </div>
        {isAdmin && showAdjust && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            {!compHotels.length ? (
              <p className="text-[12px] text-gray-500 font-medium">No &quot;OWN&quot; property row in Compset yet — add a compset hotel named <span className="font-bold">OWN</span> (Compset → Add) to enable dashboard adjustments.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-[12px] font-medium text-gray-600">
                  Occupancy %
                  <input value={adjOcc} onChange={e => setAdjOcc(e.target.value)} inputMode="decimal" placeholder="e.g. 85"
                    className="block w-24 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </label>
                <label className="text-[12px] font-medium text-gray-600">
                  ADR ($)
                  <input value={adjAdr} onChange={e => setAdjAdr(e.target.value)} inputMode="decimal" placeholder="e.g. 129"
                    className="block w-24 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-900 focus:ring-teal-500" />
                </label>
                <label className="text-[12px] font-medium text-gray-600">
                  Rooms sold
                  <input value={adjArr} onChange={e => setAdjArr(e.target.value)} inputMode="numeric" placeholder="e.g. 46"
                    className="block w-24 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-900 focus:ring-teal-500" />
                </label>
                <button onClick={saveAdjust} disabled={savingAdj}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
                  style={{ background: TEAL }}>
                  <Save size={14} /> {savingAdj ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <div><span className="text-gray-400 font-medium">Occupancy: </span><span className="font-extrabold text-gray-900">{occPct != null ? `${occPct}%` : '—'}</span></div>
          <div><span className="text-gray-400 font-medium">ADR: </span><span className="font-extrabold text-gray-900">{adr != null ? money(adr) : '—'}</span></div>
          <div><span className="text-gray-400 font-medium">Rooms sold: </span><span className="font-extrabold text-gray-900">{own.roomsSold != null ? own.roomsSold : '—'}</span></div>
          {comp.avg != null && (
            <div><span className="text-gray-400 font-medium">Comp avg: </span><span className="font-extrabold text-gray-900">{money(comp.avg)}</span></div>
          )}
          <div className="text-[11px] text-gray-400">Admin adjustments write to Compset (OWN row) — the dashboard reads Compset only.</div>
        </div>
      </div>

      {/* ── On duty today ── */}
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
                <div key={i} className="flex items-center justify-between text-[13px] bg-gray-50 rounded-xl px-3 py-2 gap-2">
                  <span className="font-bold text-gray-800 truncate max-w-[140px]">{s.staff_name}</span>
                  <span className="text-[11px] text-gray-400 font-medium truncate max-w-[90px] hidden sm:block">{(s.role || '').trim()}</span>
                  <span className="flex items-center gap-1">
                    <input
                      type="time"
                      value={(s.start_time || '').slice(0, 5)}
                      onChange={e => saveShiftTime(s, 'start_time', e.target.value)}
                      className="w-[76px] px-1.5 py-1 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                      title="In time"
                    />
                    <span className="text-gray-300 font-bold">–</span>
                    <input
                      type="time"
                      value={(s.end_time || '').slice(0, 5)}
                      onChange={e => saveShiftTime(s, 'end_time', e.target.value)}
                      className="w-[76px] py-1 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                      title="End time"
                    />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={sec}>
          <div className={secH}>
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><BarChart3 size={14} style={{ color: TEAL }} /> Competitive Rates <span className="text-[11px] font-medium text-gray-400">({comp.count} logged)</span></div>
            <button onClick={() => onNavigate('compset')} className="flex items-center text-[11px] font-bold text-teal-700 hover:underline">Compset <ChevronRight size={12} /></button>
          </div>
          {comp.avg != null ? (
            <div className="flex items-center gap-5">
              <div>
                <div className="text-[26px] font-extrabold text-gray-900 leading-none">{money(comp.avg)}</div>
                <div className="text-[11px] text-gray-400 mt-1">Comp average rate</div>
              </div>
              <div className="text-[12px] space-y-0.5">
                <div className="text-gray-500">Low {money(comp.min ?? 0)} · High {money(comp.max ?? 0)}</div>
                {adr != null && (
                  <div className={`font-bold ${adr >= comp.avg ? 'text-teal-700' : 'text-orange-600'}`}>
                    {adr >= comp.avg ? '+' : '−'}{money(Math.abs(adr - comp.avg))} vs our ADR
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 font-medium py-2">No comp calls logged today{isAdmin ? ' — open Compset to log rates' : ''}</p>
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
