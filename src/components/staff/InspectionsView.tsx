'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Plus, X as XIcon, AlertTriangle, Wrench, CheckCircle2, ChevronDown, ClipboardList, Download } from 'lucide-react';
import {
  getChecklists, createChecklistInstance, updateChecklistInstance, getRecentChecklistInstances, getHotelRooms,
  getInspectionFindings, createInspectionFinding, resolveInspectionFinding,
  assignInspectionFinding, linkFindingToWorkOrder, createInspectionChecklist, createWorkOrder,
  type Checklist, type ChecklistInstance, type InspectionFinding, type StaffAccount, type HotelRoom,
} from '@/lib/supabase';
import RoomGridFloors from './RoomGridFloors';

const TEAL = '#14b8a6';

const SAFETY_CHECKLIST_NAME = 'Room Safety';
const SAFETY_ITEMS = [
  { id: 'rs1', label: 'Smoke detector — chirp test + LED status' },
  { id: 'rs2', label: 'CO detector — chirp test + LED status' },
  { id: 'rs3', label: 'Fire extinguisher — pressure in green zone, seal intact' },
  { id: 'rs4', label: 'Emergency exits / corridors — clear of obstructions' },
  { id: 'rs5', label: 'Guest room door — self-closer + deadbolt secure' },
];
const ROOM_RE = /^Room\s+([A-Za-z0-9-]+)/i;

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));

interface Props {
  hotelId: string;
  hotelName: string;
  staffName: string;
  isAdmin: boolean;
  staffList?: StaffAccount[];
}

interface RunItem {
  id: string;
  label: string;
  state: 'pending' | 'pass' | 'fail';
  severity?: string;
  comment?: string;
}

export default function InspectionsView({ hotelId, hotelName, staffName, isAdmin, staffList = [] }: Props) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [findings, setFindings] = useState<InspectionFinding[]>([]);
  const [running, setRunning] = useState<{ checklist: Checklist; instance: ChecklistInstance; items: RunItem[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Housekeeping');
  const [newItems, setNewItems] = useState('');
  const [busy, setBusy] = useState(false);
  const [showFindings, setShowFindings] = useState(true);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [woLocation, setWoLocation] = useState('');
  const [woPriority, setWoPriority] = useState('normal');
  const [roomNum, setRoomNum] = useState('');
  const [runNotes, setRunNotes] = useState('');
  const [recentInstances, setRecentInstances] = useState<ChecklistInstance[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [runRoom, setRunRoom] = useState('');

  const load = useCallback(async () => {
    try {
      const [cls, fds, insts, rms] = await Promise.all([
        getChecklists(hotelId), getInspectionFindings(hotelId), getRecentChecklistInstances(hotelId, 300), getHotelRooms(hotelId),
      ]);
      setChecklists(cls || []);
      setFindings(fds || []);
      setRecentInstances(insts || []);
      setRooms(rms || []);
      // Seed the standard Room Safety checklist once per property (idempotent —
      // only when a checklist with that name doesn't exist yet).
      if (!(cls || []).some(c => c.name === SAFETY_CHECKLIST_NAME)) {
        try {
          await createInspectionChecklist(hotelId, SAFETY_CHECKLIST_NAME, 'Housekeeping', SAFETY_ITEMS);
          const refreshed = await getChecklists(hotelId);
          setChecklists(refreshed || []);
        } catch { /* RLS-degraded: non-admin staff fall back to generic checklists */ }
      }
    } catch { /* silent */ }
  }, [hotelId]);

  useEffect(() => { if (hotelId) load(); }, [hotelId, load]);

  const startRun = async (c: Checklist, roomOverride?: string) => {
    setBusy(true);
    try {
      const rn = (roomOverride !== undefined ? roomOverride : roomNum).trim();
      const isSafety = c.name === SAFETY_CHECKLIST_NAME;
      if (isSafety && !rn) { setBusy(false); return; }
      const inst = await createChecklistInstance({
        checklist_id: c.id, hotel_id: hotelId, staff_name: staffName,
        notes: isSafety ? `Room ${rn}` : undefined,
      });
      setRunning({
        checklist: c,
        instance: inst,
        items: (c.items || []).map((it: { id: string; label: string }) => ({ id: it.id, label: it.label, state: 'pending' as const })),
      });
      if (isSafety) setRunRoom(rn); else setRunRoom('');
      setRunNotes('');
    } catch { /* silent */ }
    setBusy(false);
  };

  const cycleState = (itemId: string) => {
    if (!running) return;
    setRunning({
      ...running,
      items: running.items.map(it => {
        if (it.id !== itemId) return it;
        if (it.state === 'pending') return { ...it, state: 'pass' as const };
        if (it.state === 'pass') return { ...it, state: 'fail' as const, severity: 'minor' };
        if (it.severity === 'minor') return { ...it, severity: 'major' };
        if (it.severity === 'major') return { ...it, severity: 'critical' };
        return { ...it, state: 'pending' as const, severity: undefined, comment: undefined };
      }),
    });
  };

  const finishRun = async () => {
    if (!running) return;
    setBusy(true);
    try {
      const checked = running.items.filter(it => it.state !== 'pending').map(it => ({ item_id: it.id, checked_at: new Date().toISOString() }));
      const notes = runNotes.trim();
      // Room Safety instances carry "Room <n>" in notes from startRun — merge the
      // general comment instead of overwriting so per-room history keeps parsing.
      const mergedNotes = running.instance.notes && /Room\s+/i.test(running.instance.notes)
        ? `${running.instance.notes}${notes ? ` · ${notes}` : ''}`
        : (notes || undefined);
      await updateChecklistInstance(running.instance.id, { checked_items: checked, completed: true, notes: mergedNotes });
      const fails = running.items.filter(it => it.state === 'fail');
      for (const f of fails) {
        await createInspectionFinding({
          hotel_id: hotelId,
          instance_id: running.instance.id,
          checklist_id: running.checklist.id,
          item_id: f.id,
          item_label: f.comment?.trim() ? `${f.label} — ${f.comment.trim()}` : f.label,
          severity: f.severity || 'minor',
          created_by: staffName,
        });
      }
      setRunning(null);
      setRunNotes('');
      setRoomNum('');
      await load();
    } catch { /* silent */ }
    setBusy(false);
  };

  const cancelRun = async () => {
    if (!running) return;
    setRunning(null);
    setRunNotes('');
    await load();
  };

  const createChecklist = async () => {
    if (!newName.trim() || !newItems.trim()) return;
    setBusy(true);
    try {
      const items = newItems.split('\n').map((l, i) => ({ id: String(i + 1), label: l.trim() })).filter(it => it.label);
      await createInspectionChecklist(hotelId, newName.trim(), newDept, items);
      setNewName(''); setNewItems(''); setCreating(false);
      await load();
    } catch { /* silent */ }
    setBusy(false);
  };

  const resolveFinding = async (id: string) => {
    setBusy(true);
    try { await resolveInspectionFinding(id); await load(); } catch { /* silent */ }
    setBusy(false);
  };

  const makeWorkOrder = async (f: InspectionFinding) => {
    if (!woLocation.trim()) return;
    setBusy(true);
    try {
      const wo = await createWorkOrder({
        hotel_id: hotelId,
        location: woLocation.trim(),
        issue: `[Inspection] ${f.item_label}`,
        priority: woPriority,
        status: 'open',
        created_by: staffName,
      });
      if (wo && wo.id) await linkFindingToWorkOrder(f.id, wo.id);
      setExpandedFinding(null); setWoLocation(''); setWoPriority('normal');
      await load();
    } catch { /* silent */ }
    setBusy(false);
  };

  const assignFinding = async (id: string, assignedTo: string) => {
    setFindings(prev => prev.map(f => (f.id === id ? { ...f, assigned_to: assignedTo || undefined } : f)));
    try { await assignInspectionFinding(id, assignedTo || null); } catch { load(); }
  };

  const mineCount = findings.filter(f => f.status !== 'resolved' && f.assigned_to === staffName).length;
  const openFindings = findings
    .filter(f => f.status !== 'resolved')
    .filter(f => (mineOnly ? f.assigned_to === staffName : true));
  const sevColor = (s: string) => s === 'critical' ? '#dc2626' : s === 'major' ? '#ea580c' : '#ca8a04';
  const fmtDT = (iso?: string) => iso
    ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

  // Per-room life-safety history from completed Room Safety runs (notes = "Room <n>")
  const roomHistory = useMemo(() => {
    const cById = new Map(checklists.map(c => [c.id, c]));
    const perRoom = new Map<string, { room: string; at: string; by: string; openFails: number; runs: { at: string; by: string; fails: { label: string; severity: string; status: string }[] }[] }>();
    const fByInstance = new Map<string, InspectionFinding[]>();
    for (const f of findings) {
      if (!f.instance_id) continue;
      (fByInstance.get(f.instance_id) || fByInstance.set(f.instance_id, []).get(f.instance_id)!).push(f);
    }
    for (const inst of recentInstances) {
      if (!inst.completed || !inst.notes) continue;
      const m = inst.notes.match(ROOM_RE);
      if (!m) continue;
      const c = cById.get(inst.checklist_id);
      if (!c || c.name !== SAFETY_CHECKLIST_NAME) continue;
      const room = m[1];
      const fails = (fByInstance.get(inst.id) || []).map(f => ({ label: f.item_label, severity: f.severity, status: f.status }));
      const entry = perRoom.get(room) || { room, at: inst.created_at, by: inst.staff_name || '—', openFails: 0, runs: [] };
      if (inst.created_at > entry.at) { entry.at = inst.created_at; entry.by = inst.staff_name || '—'; }
      entry.openFails += fails.filter(f => f.status === 'open').length;
      entry.runs.push({ at: inst.created_at, by: inst.staff_name || '—', fails });
      perRoom.set(room, entry);
    }
    return [...perRoom.values()].sort((a, b) => b.at.localeCompare(a.at));
  }, [recentInstances, findings, checklists]);
  // Whole-property Room Safety grid (like HK/Maint): every active room, grouped by floor,
  // with this month's life-safety status on each tile — done / open findings / due.
  const roomGrid = useMemo(() => {
    const hist = new Map(roomHistory.map(h => [h.room, h]));
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}`;
    const floorsMap = new Map<string, { room: string; state: 'done' | 'open' | 'due' }[]>();
    let done = 0;
    for (const r of rooms) {
      const h = hist.get(r.room_number);
      let state: 'done' | 'open' | 'due' = 'due';
      if (h) {
        if (h.openFails > 0) state = 'open';
        else {
          const d = new Date(h.at);
          if (`${d.getUTCFullYear()}-${d.getUTCMonth()}` === monthKey) state = 'done';
        }
      }
      if (state === 'done') done++;
      const floor = r.room_number.length > 2 ? r.room_number.slice(0, -2) : '1';
      if (!floorsMap.has(floor)) floorsMap.set(floor, []);
      floorsMap.get(floor)!.push({ room: r.room_number, state });
    }
    const floors = [...floorsMap.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([floor, list]) => ({ floor, rooms: list.sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true })) }));
    return { floors, done };
  }, [rooms, roomHistory]);


  const downloadReport = () => {
    const now = new Date();
    const rows = roomHistory.map(r => `
      <tr>
        <td class="room">Room ${escapeHtml(r.room)}</td>
        <td>${escapeHtml(fmtDT(r.at))}</td>
        <td>${escapeHtml(r.by)}</td>
        <td>${r.openFails > 0 ? `<span class="open">${r.openFails} open</span>` : '<span class="clear">all clear</span>'}</td>
      </tr>`).join('');
    const detail = roomHistory.map(r => `
      <h3>Room ${escapeHtml(r.room)}</h3>
      <table>
        <tr><th>Inspected</th><th>By</th><th>Findings</th></tr>
        ${r.runs.map(run => `
        <tr>
          <td>${escapeHtml(fmtDT(run.at))}</td>
          <td>${escapeHtml(run.by)}</td>
          <td>${run.fails.length === 0 ? '<span class="clear">No findings — all items passed</span>' :
            run.fails.map(f => `<div>${escapeHtml(f.label)} — <b style="color:${sevColor(f.severity)}">${escapeHtml(f.severity)}</b> · ${escapeHtml(f.status)}</div>`).join('')}</td>
        </tr>`).join('')}
      </table>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Life-Safety Inspection Report — ${escapeHtml(hotelName)}</title>
<style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:32px;color:#111827}
  h1{font-size:22px;margin:0 0 2px}
  h3{margin:18px 0 4px;font-size:15px}
  .sub{color:#6b7280;font-size:13px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px}
  th{text-align:left;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb;padding:6px 8px}
  td{border-bottom:1px solid #f3f4f6;padding:6px 8px}
  td.room{font-weight:800}
  .open{color:#ea580c;font-weight:700}
  .clear{color:#0d9488;font-weight:700}
  .stamp{margin-top:28px;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:10px}
  @media print{ .noprint{display:none} }
</style></head><body>
<h1>Life-Safety Inspection Report</h1>
<p class="sub">${escapeHtml(hotelName)} — generated ${escapeHtml(now.toLocaleString())}</p>
<table><tr><th>Room</th><th>Last inspected</th><th>By</th><th>Status</th></tr>${rows}</table>
${detail}
<p class="stamp">Report covers the most recent ${recentInstances.length} recorded inspection runs · Generated by Attenda · Timestamp verify: ${now.toISOString()}</p>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safety-report-${hotelName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${now.toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-black text-gray-900">Inspections</h2>
          <p className="text-[12px] text-gray-500">Run checklists, log what fails, turn failures into work orders.</p>
        </div>
        {isAdmin && !running && (
          <button onClick={() => setCreating(!creating)} className="flex items-center gap-1.5 text-[12px] font-bold text-white rounded-xl px-3 py-2" style={{ background: TEAL }}>
            <Plus size={14} /> New Checklist
          </button>
        )}
      </div>

      {/* Create checklist */}
      {creating && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-gray-700">New Inspection Checklist</p>
            <button onClick={() => setCreating(false)}><XIcon size={16} className="text-gray-400" /></button>
          </div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Checklist name (e.g. Lobby Inspection)" className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
          <select value={newDept} onChange={e => setNewDept(e.target.value)} className="bg-gray-50 rounded-xl px-4 py-2.5 text-[13px] border border-gray-100">
            {['Housekeeping', 'Maintenance', 'Front Desk', 'Food & Beverage', 'Security', 'Management'].map(d => <option key={d}>{d}</option>)}
          </select>
          <textarea value={newItems} onChange={e => setNewItems(e.target.value)} rows={5} placeholder={'One item per line:\nCheck lobby floor\nTest elevator phone\nInspect pool gate'} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[13px] border border-gray-100" />
          <button onClick={createChecklist} disabled={busy || !newName.trim() || !newItems.trim()} className="w-full text-[13px] font-bold text-white rounded-xl py-2.5 disabled:opacity-50" style={{ background: TEAL }}>
            Create Checklist
          </button>
        </div>
      )}

      {/* Active run */}
      {running ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-gray-900">{running.checklist.name}{runRoom ? ` — Room ${runRoom}` : ''}</p>
            <button onClick={cancelRun}><XIcon size={16} className="text-gray-400" /></button>
          </div>
          <p className="text-[11px] text-gray-400">Tap: pass → fail (minor → major → critical) → reset</p>
          <div className="space-y-2">
            {running.items.map(it => (
              <div key={it.id} className="rounded-xl border overflow-hidden" style={{ borderColor: it.state === 'fail' ? sevColor(it.severity || 'minor') : it.state === 'pass' ? TEAL : '#e5e7eb' }}>
                <button onClick={() => cycleState(it.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{
                    background: it.state === 'fail' ? `${sevColor(it.severity || 'minor')}14` : it.state === 'pass' ? `${TEAL}10` : '#fff',
                  }}>
                  <span className="text-[13px] font-semibold text-gray-800">{it.label}</span>
                  <span className="text-[11px] font-bold uppercase" style={{ color: it.state === 'fail' ? sevColor(it.severity || 'minor') : it.state === 'pass' ? TEAL : '#9ca3af' }}>
                    {it.state === 'fail' ? `FAIL ${it.severity || 'minor'}` : it.state}
                  </span>
                </button>
                {it.state === 'fail' && (
                  <div className="px-3 pb-2.5">
                    <input
                      value={it.comment || ''}
                      onChange={e => setRunning({
                        ...running,
                        items: running.items.map(x => x.id === it.id ? { ...x, comment: e.target.value } : x),
                      })}
                      placeholder="What's wrong? (goes on the work finding)"
                      className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-100"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <textarea
            value={runNotes}
            onChange={e => setRunNotes(e.target.value)}
            rows={2}
            placeholder="General comment for this run (optional) — saved with the record"
            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[12px] border border-gray-100"
          />
          <div className="flex gap-2">
            <button onClick={finishRun} disabled={busy} className="flex-1 text-[13px] font-bold text-white rounded-xl py-2.5 disabled:opacity-50" style={{ background: TEAL }}>
              Finish — log {running.items.filter(it => it.state === 'fail').length} finding(s)
            </button>
          </div>
        </div>
      ) : (
        /* Checklist picker */
        <div className="space-y-2">
          {/* Room Safety — whole-property grid: engineer taps any room to run its monthly check */}
          {checklists.some(c => c.name === SAFETY_CHECKLIST_NAME) && (
            <div className="bg-white rounded-2xl border px-4 py-3.5" style={{ borderColor: `${TEAL}55` }}>
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold text-gray-900">Room Safety Inspection</p>
                <p className="text-[11px] font-bold" style={{ color: TEAL }}>{rooms.length > 0 ? `${roomGrid.done}/${rooms.length} done this month` : null}</p>
              </div>
              <p className="text-[11px] text-gray-400 mb-2">Smoke · CO · extinguisher · exits · door security — tap a room to run it</p>
              {roomGrid.floors.length > 0 ? (
                (() => {
                  // Official shared grid (same component as Maint + HK) fed from the Room Safety memo
                  const safetyTiles: Record<string, { state?: 'done' | 'due' | 'open' | 'idle'; label?: string; title?: string }> = {};
                  for (const g of roomGrid.floors) for (const r of g.rooms) {
                    safetyTiles[r.room] = { state: r.state === 'open' ? 'open' : r.state === 'done' ? 'done' : 'due', label: r.state, title: `Room ${r.room} — ${r.state === 'done' ? 'done this month' : r.state === 'open' ? 'open findings' : 'due this month'}` };
                  }
                  return <RoomGridFloors rooms={rooms} onPick={rm => { const sc = checklists.find(c => c.name === SAFETY_CHECKLIST_NAME); if (sc) startRun(sc, rm); }} disabled={busy} tileStates={safetyTiles} />;
                })()
              ) : (
                <div className="flex gap-2">
                  <input value={roomNum} onChange={e => setRoomNum(e.target.value)} inputMode="numeric" placeholder="Room #"
                    className="w-28 bg-gray-50 rounded-xl px-3 py-2 text-[14px] font-bold border border-gray-100" />
                  <button disabled={busy || !roomNum.trim()}
                    onClick={() => { const sc = checklists.find(c => c.name === SAFETY_CHECKLIST_NAME); if (sc) startRun(sc); }}
                    className="flex-1 text-[13px] font-bold text-white rounded-xl px-4 py-2 disabled:opacity-40" style={{ background: TEAL }}>
                    Start Room Inspection →
                  </button>
                </div>
              )}
            </div>
          )}
          {checklists.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <ClipboardCheck size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-[13px] font-bold text-gray-700">No inspection checklists yet</p>
              <p className="text-[12px] text-gray-400 mt-1">{isAdmin ? 'Create your first checklist to start inspecting.' : 'Ask your manager to create one.'}</p>
            </div>
          ) : checklists.map(c => (
            <button key={c.id} onClick={() => startRun(c)} disabled={busy}
              className="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center justify-between text-left disabled:opacity-50">
              <div>
                <p className="text-[14px] font-bold text-gray-900">{c.name}</p>
                <p className="text-[11px] text-gray-400">{c.department || 'General'} · {(c.items || []).length} items</p>
              </div>
              <span className="text-[11px] font-bold" style={{ color: TEAL }}>Start →</span>
            </button>
          ))}
        </div>
      )}

      {/* Room Safety history + report download */}
      {roomHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <ClipboardList size={14} style={{ color: TEAL }} /> Room Safety History ({roomHistory.length} rooms)
            </p>
            <button onClick={downloadReport} className="flex items-center gap-1.5 text-[11px] font-bold text-white rounded-lg px-2.5 py-1.5" style={{ background: TEAL }}>
              <Download size={12} /> Download Report
            </button>
          </div>
          <div className="divide-y divide-gray-50 border-t border-gray-100">
            {roomHistory.slice(0, 12).map(r => (
              <div key={r.room} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-[13px] font-bold text-gray-900">Room {r.room}</p>
                  <p className="text-[11px] text-gray-400">{fmtDT(r.at)} · by {r.by} · {r.runs.length} run{r.runs.length > 1 ? 's' : ''}</p>
                </div>
                {r.openFails > 0 ? (
                  <span className="text-[11px] font-bold" style={{ color: '#ea580c' }}>{r.openFails} open finding{r.openFails > 1 ? 's' : ''}</span>
                ) : (
                  <span className="text-[11px] font-bold" style={{ color: TEAL }}>All clear</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open findings */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button onClick={() => setShowFindings(!showFindings)} className="w-full flex items-center justify-between px-4 py-3">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <AlertTriangle size={14} style={{ color: '#ea580c' }} /> Open Findings ({openFindings.length})
            {mineCount > 0 && (
              <span
                onClick={e => { e.stopPropagation(); setMineOnly(!mineOnly); }}
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full cursor-pointer select-none ${mineOnly ? 'text-white' : 'text-gray-500 bg-gray-100'}`}
                style={mineOnly ? { background: TEAL } : undefined}
              >
                Mine ({mineCount})
              </span>
            )}
          </p>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showFindings ? '' : '-rotate-90'}`} />
        </button>
        {showFindings && (
          <div className="divide-y divide-gray-50">
            {openFindings.length === 0 ? (
              <p className="px-4 py-4 text-[12px] text-gray-400">Nothing open. All clear.</p>
            ) : openFindings.map(f => (
              <div key={f.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 truncate">{f.item_label}</p>
                    <p className="text-[10px] text-gray-400">{f.created_by || 'Staff'} · {new Date(f.created_at).toLocaleDateString()}{f.work_order_id ? ' · work order created' : ''}{f.assigned_to ? ` · → ${f.assigned_to}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ color: sevColor(f.severity), background: `${sevColor(f.severity)}14` }}>{f.severity}</span>
                    <button onClick={() => setExpandedFinding(expandedFinding === f.id ? null : f.id)} className="text-[11px] font-bold flex items-center gap-1" style={{ color: TEAL }}>
                      <Wrench size={12} /> Fix
                    </button>
                    <button onClick={() => resolveFinding(f.id)} disabled={busy} className="text-gray-400 hover:text-gray-600 disabled:opacity-50"><CheckCircle2 size={16} /></button>
                  </div>
                </div>
                {isAdmin && (
                  <select
                    value={f.assigned_to || ''}
                    onChange={e => assignFinding(f.id, e.target.value)}
                    disabled={busy}
                    className="mt-2 bg-gray-50 rounded-lg px-2 py-1.5 text-[11px] font-semibold border border-gray-100 text-gray-700 disabled:opacity-50"
                  >
                    <option value="">— Unassigned —</option>
                    {staffList.filter(s => s.active).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                )}
                {expandedFinding === f.id && (
                  <div className="mt-2 flex gap-2 items-center bg-gray-50 rounded-xl p-2">
                    <input value={woLocation} onChange={e => setWoLocation(e.target.value)} placeholder="Location (e.g. Room 204)" className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-100" />
                    <select value={woPriority} onChange={e => setWoPriority(e.target.value)} className="bg-white rounded-lg px-2 py-2 text-[12px] border border-gray-100">
                      <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                    <button onClick={() => makeWorkOrder(f)} disabled={busy || !woLocation.trim()} className="text-[11px] font-bold text-white rounded-lg px-3 py-2 disabled:opacity-50" style={{ background: '#ea580c' }}>
                      <Wrench size={12} className="inline mr-1" />Work Order
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}