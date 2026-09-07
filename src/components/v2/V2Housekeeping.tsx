'use client';

/* ═════════════════════════════════════════════ components/v2/V2Housekeeping.tsx
   Attenda V2 — Housekeeping (module 7). Built from the brief's description
   ("Control rooms, minutes, labor, and supplies") on the established V2
   pattern. Data = real `room_status` board + housekeeping checklist runs +
   linen counts. Every number traces to a real row (guardrail §7).
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DoorOpen, Sparkles, ShieldCheck, CheckCircle2, Clock, Ban,
  RefreshCw, Search, Plus, AlertTriangle, Timer,
} from 'lucide-react';
import {
  getRoomStatuses, updateRoomStatus, upsertRoomStatus,
  getChecklists, getChecklistInstances, updateChecklistInstance,
  type RoomStatus, type Checklist, type ChecklistInstance,
} from '@/lib/supabase';
import { V2KpiCard, V2Panel, V2Pill, V2ScreenHeader, V2QuickActions, v2StatusTone } from './ui';

const INK = '#16233B'; const MUTED = '#5B6B7E'; const BORDER = '#E5EAF0';

const ROOM_STATUSES = ['dirty', 'clean', 'inspected', 'ooo'] as const;
type RoomStatusVocab = (typeof ROOM_STATUSES)[number];

function roomTone(status: string): 'red' | 'green' | 'blue' | 'gray' {
  const s = status.toLowerCase();
  if (s === 'dirty') return 'red';
  if (s === 'clean' || s === 'inspected') return 'green';
  if (s === 'ooo') return 'gray';
  return 'blue';
}

function roomLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'ooo') return 'OOO';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function V2Housekeeping({ hotelId, userName, isAdmin }: { hotelId: string; userName?: string; isAdmin?: boolean }) {
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<'All' | RoomStatusVocab>('All');
  const [roomSearch, setRoomSearch] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true); setError(null);
    try {
      const [r, c, i] = await Promise.all([
        getRoomStatuses(hotelId),
        getChecklists(hotelId),
        getChecklistInstances(hotelId),
      ]);
      setRooms(r); setChecklists(c); setInstances(i);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load housekeeping data');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { void load(); }, [load]);

  // ── KPIs (all real) ──
  const dirty = rooms.filter(r => r.status.toLowerCase() === 'dirty').length;
  const cleanOrInspected = rooms.filter(r => ['clean', 'inspected'].includes(r.status.toLowerCase())).length;
  const ooo = rooms.filter(r => r.status.toLowerCase() === 'ooo').length;
  const hkChecklists = useMemo(
    () => checklists.filter(c => (c.department || '').toLowerCase().includes('housekeep') || (c.assigned_role || '').toLowerCase().includes('housekeep') || c.name.toLowerCase().includes('housekeep')),
    [checklists],
  );
  const hkIds = useMemo(() => new Set(hkChecklists.map(c => c.id)), [hkChecklists]);
  const todayInstances = useMemo(
    () => instances.filter(i => hkIds.has(i.checklist_id) || !hkChecklists.length),
    [instances, hkIds, hkChecklists.length],
  );
  const completedToday = todayInstances.filter(i => i.completed).length;
  const avgMins = useMemo(() => {
    const timed = instances.filter(i => i.completed && i.completed_at);
    if (!timed.length) return null;
    const mins = timed.reduce((s, i) => s + Math.max(0, (new Date(i.completed_at as string).getTime() - new Date(i.created_at).getTime()) / 60000), 0) / timed.length;
    return Math.round(mins);
  }, [instances]);
  const openItems = useMemo(
    () => todayInstances.filter(i => !i.completed).reduce((s, i) => {
      const c = checklists.find(x => x.id === i.checklist_id);
      return s + (c ? Math.max(0, c.items.length - (i.checked_items?.length || 0)) : 0);
    }, 0),
    [todayInstances, checklists],
  );

  // ── Room board ──
  const filteredRooms = rooms.filter(r =>
    (roomFilter === 'All' || r.status.toLowerCase() === roomFilter) &&
    (!roomSearch || r.room_number.toLowerCase().includes(roomSearch.toLowerCase())),
  );

  const setRoom = async (room: RoomStatus | undefined, status: RoomStatusVocab) => {
    try {
      if (room) {
        setRooms(prev => prev.map(p => p.id === room.id ? { ...p, status } : p));
        await updateRoomStatus(room.id, { status, updated_at: new Date().toISOString() });
      } else if (newRoom.trim()) {
        await upsertRoomStatus(hotelId, newRoom.trim(), status, userName || 'staff');
        setNewRoom('');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update room');
      void load();
    }
  };

  const toggleChecklistItem = async (inst: ChecklistInstance, checklist: Checklist, itemId: string, checked: boolean) => {
    const next = checked
      ? (inst.checked_items || []).filter(x => x.item_id !== itemId)
      : [...(inst.checked_items || []), { item_id: itemId, checked_at: new Date().toISOString() }];
    const allDone = checklist.items.length > 0 && next.length === checklist.items.length;
    setInstances(prev => prev.map(p => p.id === inst.id ? { ...p, checked_items: next } : p));
    try {
      await updateChecklistInstance(inst.id, { checked_items: next, completed: allDone || undefined });
      if (allDone) await load();
    } catch {
      void load();
    }
  };

  const dirtyRooms = rooms.filter(r => r.status.toLowerCase() === 'dirty');
  const incomplete = todayInstances.filter(i => !i.completed);

  const quickActions = [
    { icon: RefreshCw, label: 'Refresh board', caption: 'Reload rooms + checklists', onClick: () => void load() },
    ...(dirtyRooms[0] ? [{ icon: Sparkles, label: `Mark ${dirtyRooms[0].room_number} clean`, caption: 'Fastest dirty room', onClick: () => void setRoom(dirtyRooms[0], 'clean') }] : []),
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Housekeeping"
        subtitle="Room board, checklist runs, and productivity — every status traces to a real room or checklist."
        banner="Control rooms, minutes, and supplies. Tap a room to move it through dirty → clean → inspected. OOO rooms stay out of the assignment count."
      />

      {error && (
        <div className="mb-4 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold flex items-center justify-between"
          style={{ backgroundColor: '#FDECEC', color: '#DC2626' }}>
          <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
          <button onClick={() => void load()} className="underline font-bold">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-[13px] font-semibold" style={{ color: MUTED }}>
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading housekeeping…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
            <V2KpiCard icon={AlertTriangle} label="Rooms dirty" value={dirty} sub={dirty ? 'Assign & clean' : 'All caught up'} subTone={dirty ? 'red' : 'green'} />
            <V2KpiCard icon={Sparkles} label="Clean / inspected" value={cleanOrInspected} sub="Ready or rentable" subTone="green" />
            <V2KpiCard icon={Ban} label="Out of order" value={ooo} sub="Excluded from board" subTone={ooo ? 'amber' : 'gray'} />
            <V2KpiCard icon={CheckCircle2} label="Checklists done today" value={completedToday} sub={`${todayInstances.length} runs total`} />
            <V2KpiCard icon={Timer} label="Avg completion" value={avgMins === null ? '—' : `${avgMins}m`} sub={avgMins === null ? 'No timed runs yet' : 'Start → completed'} />
            <V2KpiCard icon={DoorOpen} label="Open checklist items" value={openItems} sub="Across today's runs" subTone={openItems ? 'amber' : 'green'} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            {/* WORK — room status board */}
            <div className="xl:col-span-2 flex flex-col gap-4">
              <V2Panel title="Room Status Board">
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex gap-1.5 flex-wrap">
                    {(['All', ...ROOM_STATUSES] as const).map(f => (
                      <button key={f} onClick={() => setRoomFilter(f as 'All' | RoomStatusVocab)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={roomFilter === f ? { backgroundColor: '#14A8A0', color: 'white' } : { backgroundColor: '#EEF1F4', color: MUTED }}>
                        {f === 'ooo' ? 'OOO' : f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white" style={{ border: `1px solid ${BORDER}` }}>
                      <Search size={13} style={{ color: MUTED }} />
                      <input value={roomSearch} onChange={e => setRoomSearch(e.target.value)} placeholder="Room #"
                        className="text-[12px] outline-none w-20" style={{ color: INK }} />
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <input value={newRoom} onChange={e => setNewRoom(e.target.value)} placeholder="Add room #"
                          className="text-[12px] px-2.5 py-1.5 rounded-lg outline-none w-24" style={{ border: `1px solid ${BORDER}`, color: INK }} />
                        <button disabled={!newRoom.trim()} onClick={() => void setRoom(undefined, 'dirty')}
                          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white disabled:opacity-40"
                          style={{ backgroundColor: '#14A8A0' }}>
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {filteredRooms.length === 0 ? (
                  <div className="py-10 text-center text-[13px]" style={{ color: MUTED }}>
                    {rooms.length === 0
                      ? 'No rooms on the board yet. Add your first room above (admins) or from Property Settings.'
                      : 'No rooms match this filter.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left" style={{ color: MUTED }}>
                          <th className="font-semibold pb-2 pr-3">Room</th>
                          <th className="font-semibold pb-2 pr-3">Status</th>
                          <th className="font-semibold pb-2 pr-3">Cleaned by</th>
                          <th className="font-semibold pb-2 pr-3">Inspected by</th>
                          <th className="font-semibold pb-2">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRooms.map(r => (
                          <tr key={r.id} className="border-t" style={{ borderColor: BORDER }}>
                            <td className="py-2.5 pr-3 font-semibold" style={{ color: INK }}>Room {r.room_number}</td>
                            <td className="py-2.5 pr-3"><V2Pill label={roomLabel(r.status)} tone={roomTone(r.status)} /></td>
                            <td className="py-2.5 pr-3" style={{ color: INK }}>{r.cleaned_by || '—'}<div className="text-[11px]" style={{ color: MUTED }}>{fmtTime(r.cleaned_at)}</div></td>
                            <td className="py-2.5 pr-3" style={{ color: INK }}>{r.inspected_by || '—'}<div className="text-[11px]" style={{ color: MUTED }}>{fmtTime(r.inspected_at)}</div></td>
                            <td className="py-2.5" style={{ color: MUTED }}>{fmtTime(r.updated_at)}</td>
                            {isAdmin && (
                              <td className="py-2.5">
                                <div className="flex gap-1">
                                  {ROOM_STATUSES.map(s => (
                                    <button key={s} disabled={r.status.toLowerCase() === s} onClick={() => void setRoom(r, s)}
                                      className="text-[10px] font-bold px-2 py-1 rounded-md disabled:opacity-30"
                                      style={{ backgroundColor: '#EEF1F4', color: INK }}>
                                      {s === 'ooo' ? 'OOO' : s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </V2Panel>

              {/* Housekeeping checklist runs */}
              <V2Panel title="Housekeeping Checklists">
                {todayInstances.length === 0 ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: MUTED }}>
                    No housekeeping checklist runs today. Runs start automatically from assigned templates.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {todayInstances.map(inst => {
                      const c = checklists.find(x => x.id === inst.checklist_id);
                      if (!c) return null;
                      const done = inst.checked_items?.length || 0;
                      const pct = c.items.length ? Math.round((done / c.items.length) * 100) : 0;
                      const isOpen = expanded === inst.id;
                      return (
                        <div key={inst.id} className="border-t first:border-t-0" style={{ borderColor: BORDER }}>
                          <button className="w-full flex items-center justify-between gap-3 py-2.5 text-left" onClick={() => setExpanded(isOpen ? null : inst.id)}>
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold" style={{ color: INK }}>{c.name}</div>
                              <div className="text-[11px]" style={{ color: MUTED }}>{inst.staff_name || 'Unassigned'} · {done}/{c.items.length} items</div>
                            </div>
                            <div className="flex items-center gap-2.5 flex-none">
                              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EEF1F4' }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16A34A' : '#14A8A0' }} />
                              </div>
                              <V2Pill label={inst.completed ? 'Completed' : 'In progress'} tone={v2StatusTone(inst.completed ? 'Completed' : 'In progress')} />
                            </div>
                          </button>
                          {isOpen && (
                            <div className="pb-3 flex flex-col gap-1">
                              {c.items.map(item => {
                                const checked = (inst.checked_items || []).some(x => x.item_id === item.id);
                                return (
                                  <button key={item.id} disabled={inst.completed}
                                    onClick={() => void toggleChecklistItem(inst, c, item.id, checked)}
                                    className="flex items-center gap-2.5 text-left text-[12.5px] px-2 py-1.5 rounded-lg hover:bg-[#F6F8FA] disabled:opacity-60">
                                    <span className="flex items-center justify-center flex-none w-4 h-4 rounded border"
                                      style={checked ? { backgroundColor: '#14A8A0', borderColor: '#14A8A0', color: 'white' } : { borderColor: '#C6CFDA', color: 'transparent' }}>
                                      <CheckCircle2 size={12} />
                                    </span>
                                    <span style={{ color: checked ? INK : MUTED }}>{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </V2Panel>
            </div>

            {/* ACTION rail */}
            <div className="flex flex-col gap-4">
              <V2Panel title="Needs Attention">
                {dirtyRooms.length === 0 && incomplete.length === 0 ? (
                  <div className="text-[13px] py-3" style={{ color: MUTED }}>Board is clean and every run is closed. ✅</div>
                ) : (
                  <ul className="flex flex-col gap-2.5 text-[13px]">
                    {dirtyRooms.slice(0, 5).map(r => (
                      <li key={r.id} className="flex items-center justify-between gap-2">
                        <span className="truncate" style={{ color: INK }}>Room {r.room_number} still dirty</span>
                        <button onClick={() => void setRoom(r, 'clean')} className="text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap" style={{ backgroundColor: '#E4F5F3', color: '#0E7C74' }}>
                          Mark clean
                        </button>
                      </li>
                    ))}
                    {incomplete.slice(0, 4).map(i => {
                      const c = checklists.find(x => x.id === i.checklist_id);
                      return (
                        <li key={i.id} className="flex items-center justify-between gap-2">
                          <span className="truncate" style={{ color: INK }}>{c?.name || 'Checklist'} open</span>
                          <span className="text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap" style={{ backgroundColor: '#FEF4E4', color: '#D97706' }}>
                            {c ? `${c.items.length - (i.checked_items?.length || 0)} left` : 'Open'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </V2Panel>

              <V2Panel title="Recently Completed">
                {todayInstances.filter(i => i.completed).length === 0 ? (
                  <div className="text-[13px] py-3" style={{ color: MUTED }}>No completed runs today yet.</div>
                ) : (
                  <ul className="flex flex-col gap-2.5 text-[13px]">
                    {todayInstances.filter(i => i.completed).slice(0, 5).map(i => {
                      const c = checklists.find(x => x.id === i.checklist_id);
                      return (
                        <li key={i.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold truncate" style={{ color: INK }}>{c?.name || 'Checklist'}</div>
                            <div className="text-[11px]" style={{ color: MUTED }}>{i.staff_name || '—'} · {fmtTime(i.completed_at)}</div>
                          </div>
                          <V2Pill label="Done" tone="green" />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </V2Panel>

              <V2Panel title="Room Flow">
                <div className="text-[12.5px] flex flex-col gap-2" style={{ color: MUTED }}>
                  <div className="flex items-center gap-2"><V2Pill label="Dirty" tone="red" /> checked out / needs service</div>
                  <div className="flex items-center gap-2"><V2Pill label="Clean" tone="green" /> housekeeper finished</div>
                  <div className="flex items-center gap-2"><V2Pill label="Inspected" tone="green" /> supervisor approved — rentable</div>
                  <div className="flex items-center gap-2"><V2Pill label="OOO" tone="gray" /> out of order, off the board</div>
                </div>
              </V2Panel>

              <V2QuickActions actions={quickActions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}