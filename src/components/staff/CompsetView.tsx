'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Phone, CheckCircle2, Circle, BarChart3 } from 'lucide-react';
import {
  getCompsetHotels, createCompsetHotel, deleteCompsetHotel,
  getCompsetCallTimes, createCompsetCallTime, deleteCompsetCallTime,
  getCompsetEntries, getCompsetEntriesRange, upsertCompsetEntry,
  CompsetHotel, CompsetCallTime, CompsetEntry,
} from '@/lib/supabase';

const TEAL = '#0D9488';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(t: string) {
  const [hStr, m] = t.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export default function CompsetView({ hotelId, isAdmin, staffId, staffName }: {
  hotelId: string;
  isAdmin: boolean;
  staffId: string;
  staffName: string;
}) {
  const [hotels, setHotels] = useState<CompsetHotel[]>([]);
  const [callTimes, setCallTimes] = useState<CompsetCallTime[]>([]);
  const [entries, setEntries] = useState<CompsetEntry[]>([]);
  const [history, setHistory] = useState<CompsetEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [hotelForm, setHotelForm] = useState({ name: '', phone: '', room_keys: '' });
  const [timeForm, setTimeForm] = useState({ call_time: '08:00', label: '' });
  const [activeSlot, setActiveSlot] = useState<{ hotelId: string; callTime: string } | null>(null);
  const [entryForm, setEntryForm] = useState({ rate: '', rooms_sold: '', occupancy_pct: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const date = todayStr();

  const load = useCallback(async () => {
    const [h, t, e] = await Promise.all([
      getCompsetHotels(hotelId),
      getCompsetCallTimes(hotelId),
      getCompsetEntries(hotelId, date),
    ]);
    setHotels(h);
    setCallTimes(t);
    setEntries(e);
  }, [hotelId, date]);

  useEffect(() => { load(); }, [load]);

  const loadHistory = async () => {
    const start = new Date();
    start.setDate(start.getDate() - 13);
    const rows = await getCompsetEntriesRange(hotelId, start.toISOString().slice(0, 10), date);
    setHistory(rows);
    setShowHistory(true);
  };

  const handleAddHotel = async () => {
    if (!hotelForm.name) return;
    setError('');
    try {
      await createCompsetHotel({ hotel_id: hotelId, name: hotelForm.name, phone: hotelForm.phone, room_keys: hotelForm.room_keys ? parseInt(hotelForm.room_keys, 10) : 0 });
      setHotelForm({ name: '', phone: '', room_keys: '' });
      setShowHotelForm(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save hotel.');
    }
  };

  const handleAddTime = async () => {
    if (!timeForm.call_time) return;
    setError('');
    try {
      await createCompsetCallTime({ hotel_id: hotelId, call_time: timeForm.call_time, label: timeForm.label });
      setTimeForm({ call_time: '08:00', label: '' });
      setShowTimeForm(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save call time.');
    }
  };

  const handleDeleteHotel = async (id: string) => {
    setError('');
    try { await deleteCompsetHotel(id); load(); } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Could not delete hotel.'); }
  };

  const handleDeleteTime = async (id: string) => {
    setError('');
    try { await deleteCompsetCallTime(id); load(); } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Could not delete call time.'); }
  };

  const entryFor = (compsetHotelId: string, callTime: string) =>
    entries.find(e => e.compset_hotel_id === compsetHotelId && e.call_time === callTime);

  const openSlot = (compsetHotelId: string, callTime: string) => {
    const existing = entryFor(compsetHotelId, callTime);
    setEntryForm({
      rate: existing?.rate != null ? String(existing.rate) : '',
      rooms_sold: existing?.rooms_sold != null ? String(existing.rooms_sold) : '',
      occupancy_pct: existing?.occupancy_pct != null ? String(existing.occupancy_pct) : '',
    });
    setActiveSlot({ hotelId: compsetHotelId, callTime });
  };

  const activeRoomKeys = activeSlot ? (hotels.find(h => h.id === activeSlot.hotelId)?.room_keys || 0) : 0;

  // Rooms sold and occupancy % are kept in sync against the competitor's fixed
  // room key count — staff can fill in whichever number they got on the call.
  const handleRoomsSoldChange = (val: string) => {
    const sold = val ? parseInt(val, 10) : null;
    const pct = sold != null && activeRoomKeys ? String(Math.round((sold / activeRoomKeys) * 1000) / 10) : entryForm.occupancy_pct;
    setEntryForm({ ...entryForm, rooms_sold: val, occupancy_pct: sold != null && activeRoomKeys ? pct : entryForm.occupancy_pct });
  };

  const handleOccupancyChange = (val: string) => {
    const pct = val ? parseFloat(val) : null;
    const sold = pct != null && activeRoomKeys ? String(Math.round((pct / 100) * activeRoomKeys)) : entryForm.rooms_sold;
    setEntryForm({ ...entryForm, occupancy_pct: val, rooms_sold: pct != null && activeRoomKeys ? sold : entryForm.rooms_sold });
  };

  const saveEntry = async () => {
    if (!activeSlot) return;
    setError('');
    setSaving(true);
    try {
      const roomsTotal = activeRoomKeys || null;
      const roomsSold = entryForm.rooms_sold ? parseInt(entryForm.rooms_sold, 10) : null;
      const occupancyPct = entryForm.occupancy_pct
        ? parseFloat(entryForm.occupancy_pct)
        : (roomsTotal && roomsSold != null ? Math.round((roomsSold / roomsTotal) * 1000) / 10 : null);
      await upsertCompsetEntry({
        hotel_id: hotelId,
        compset_hotel_id: activeSlot.hotelId,
        call_date: date,
        call_time: activeSlot.callTime,
        rate: entryForm.rate ? parseFloat(entryForm.rate) : null,
        rooms_total: roomsTotal,
        rooms_sold: roomsSold,
        occupancy_pct: occupancyPct,
        entered_by: staffId || null,
        entered_by_name: staffName,
      });
      setActiveSlot(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save call log.');
    } finally {
      setSaving(false);
    }
  };

  if (hotels.length === 0 && callTimes.length === 0 && !isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-[26px] font-extrabold text-gray-900 mb-1">Compset</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm mt-4">
          <Phone size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No compset call list set up yet. Ask your admin to add competitor hotels and call times.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Compset</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Call nearby hotels at each scheduled time and log their rate, rooms, and occupancy.</p>
        </div>
        <button onClick={() => (showHistory ? setShowHistory(false) : loadHistory())}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">
          <BarChart3 size={14} /> {showHistory ? 'Back to Today' : 'History'}
        </button>
      </div>

      {error && <p className="text-red-600 text-[12px] bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4">{error}</p>}

      {isAdmin && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Competitor hotels admin panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[14px] text-gray-900">Competitor Hotels</h3>
              <button onClick={() => setShowHotelForm(!showHotelForm)} className="text-[12px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                <Plus size={13} /> Add
              </button>
            </div>
            {showHotelForm && (
              <div className="flex gap-2 mb-3">
                <input placeholder="Hotel name" value={hotelForm.name} onChange={e => setHotelForm({ ...hotelForm, name: e.target.value })}
                  className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-100 focus:outline-none" />
                <input placeholder="Phone" value={hotelForm.phone} onChange={e => setHotelForm({ ...hotelForm, phone: e.target.value })}
                  className="w-28 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-100 focus:outline-none" />
                <input type="number" placeholder="Room keys" value={hotelForm.room_keys} onChange={e => setHotelForm({ ...hotelForm, room_keys: e.target.value })}
                  className="w-24 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-100 focus:outline-none" />
                <button onClick={handleAddHotel} className="px-3 py-2 rounded-lg text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>Save</button>
              </div>
            )}
            <div className="space-y-1.5">
              {hotels.map(h => (
                <div key={h.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-[12px] font-semibold text-gray-800">{h.name}</p>
                    <p className="text-[11px] text-gray-400">{h.phone && <span>{h.phone} · </span>}{h.room_keys || 0} room keys</p>
                  </div>
                  <button onClick={() => handleDeleteHotel(h.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {hotels.length === 0 && <p className="text-[11px] text-gray-400">No competitor hotels added yet.</p>}
            </div>
          </div>

          {/* Call times admin panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[14px] text-gray-900">Call Times</h3>
              <button onClick={() => setShowTimeForm(!showTimeForm)} className="text-[12px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                <Plus size={13} /> Add
              </button>
            </div>
            {showTimeForm && (
              <div className="flex gap-2 mb-3">
                <input type="time" value={timeForm.call_time} onChange={e => setTimeForm({ ...timeForm, call_time: e.target.value })}
                  className="bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-100 focus:outline-none" />
                <input placeholder="Label (optional)" value={timeForm.label} onChange={e => setTimeForm({ ...timeForm, label: e.target.value })}
                  className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-100 focus:outline-none" />
                <button onClick={handleAddTime} className="px-3 py-2 rounded-lg text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>Save</button>
              </div>
            )}
            <div className="space-y-1.5">
              {callTimes.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[12px] font-semibold text-gray-800">{formatTime(t.call_time)} {t.label && <span className="text-gray-400 font-normal">— {t.label}</span>}</p>
                  <button onClick={() => handleDeleteTime(t.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {callTimes.length === 0 && <p className="text-[11px] text-gray-400">No call times set yet.</p>}
            </div>
          </div>
        </div>
      )}

      {!showHistory && hotels.length > 0 && callTimes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-bold text-gray-500 text-[11px] uppercase tracking-wider">Hotel</th>
                {callTimes.map(t => (
                  <th key={t.id} className="text-center px-3 py-3 font-bold text-gray-500 text-[11px] uppercase tracking-wider">{formatTime(t.call_time)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hotels.map(h => (
                <tr key={h.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-bold text-gray-900">{h.name}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      {h.phone && <span className="flex items-center gap-1"><Phone size={10} />{h.phone}</span>}
                      {h.phone && ' · '}{h.room_keys || 0} room keys
                    </p>
                  </td>
                  {callTimes.map(t => {
                    const e = entryFor(h.id, t.call_time);
                    return (
                      <td key={t.id} className="text-center px-3 py-3">
                        <button onClick={() => openSlot(h.id, t.call_time)}
                          className={`w-full rounded-lg px-2 py-2 text-[11px] font-semibold ${e ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                          {e ? (
                            <span className="flex flex-col items-center gap-0.5">
                              <span className="flex items-center gap-1"><CheckCircle2 size={11} /> ${e.rate}</span>
                              <span className="text-[10px] text-teal-500">
                                {e.occupancy_pct != null ? `${e.occupancy_pct}%` : ''}
                                {e.rooms_sold != null ? ` · ${e.rooms_sold}/${e.rooms_total ?? h.room_keys ?? '—'}` : ''}
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1"><Circle size={11} /> Log call</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-bold text-gray-500 text-[11px] uppercase tracking-wider">Date</th>
                <th className="text-left px-3 py-3 font-bold text-gray-500 text-[11px] uppercase tracking-wider">Time</th>
                <th className="text-left px-3 py-3 font-bold text-gray-500 text-[11px] uppercase tracking-wider">Hotel</th>
                <th className="text-right px-3 py-3 font-bold text-gray-500 text-[11px] uppercase tracking-wider">Rate</th>
                <th className="text-right px-3 py-3 font-bold text-gray-500 text-[11px] uppercase tracking-wider">Rooms Sold / Total</th>
                <th className="text-right px-5 py-3 font-bold text-gray-500 text-[11px] uppercase tracking-wider">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {history.map(e => {
                const h = hotels.find(x => x.id === e.compset_hotel_id);
                return (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-600">{e.call_date}</td>
                    <td className="px-3 py-2.5 text-gray-600">{formatTime(e.call_time)}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{h?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{e.rate != null ? `$${e.rate}` : '—'}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{e.rooms_sold ?? '—'} / {e.rooms_total ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-teal-700">{e.occupancy_pct != null ? `${e.occupancy_pct}%` : '—'}</td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[12px] text-gray-400">No history yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Log call modal */}
      {activeSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setActiveSlot(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[15px] mb-1">
              {hotels.find(h => h.id === activeSlot.hotelId)?.name}
            </h3>
            <p className="text-[12px] text-gray-400 mb-4">
              {formatTime(activeSlot.callTime)} call · {activeRoomKeys || 0} room keys total
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Rate ($)</label>
                <input type="number" step="0.01" value={entryForm.rate} onChange={e => setEntryForm({ ...entryForm, rate: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Rooms Sold</label>
                  <input type="number" max={activeRoomKeys || undefined} value={entryForm.rooms_sold} onChange={e => handleRoomsSoldChange(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Occupancy %</label>
                  <input type="number" step="0.1" max={100} value={entryForm.occupancy_pct} onChange={e => handleOccupancyChange(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none" />
                </div>
              </div>
              {!activeRoomKeys && (
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  No room key count set for this hotel — ask your admin to add it so occupancy can be calculated.
                </p>
              )}
            </div>
            {error && <p className="text-red-600 text-[11px] bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{error}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={saveEntry} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-60" style={{ backgroundColor: TEAL }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setActiveSlot(null)} className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[13px]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
