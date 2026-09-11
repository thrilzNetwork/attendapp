'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Plus, X as XIcon, AlertTriangle, Wrench, CheckCircle2, ChevronDown } from 'lucide-react';
import {
  getChecklists, createChecklistInstance, updateChecklistInstance,
  getInspectionFindings, createInspectionFinding, resolveInspectionFinding,
  assignInspectionFinding, linkFindingToWorkOrder, createInspectionChecklist, createWorkOrder,
  type Checklist, type ChecklistInstance, type InspectionFinding, type StaffAccount,
} from '@/lib/supabase';

const TEAL = '#14b8a6';

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
}

export default function InspectionsView({ hotelId, staffName, isAdmin, staffList = [] }: Props) {
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

  const load = useCallback(async () => {
    try {
      const [cls, fds] = await Promise.all([getChecklists(hotelId), getInspectionFindings(hotelId)]);
      setChecklists(cls || []);
      setFindings(fds || []);
    } catch { /* silent */ }
  }, [hotelId]);

  useEffect(() => { if (hotelId) load(); }, [hotelId, load]);

  const startRun = async (c: Checklist) => {
    setBusy(true);
    try {
      const inst = await createChecklistInstance({ checklist_id: c.id, hotel_id: hotelId, staff_name: staffName });
      setRunning({
        checklist: c,
        instance: inst,
        items: (c.items || []).map((it: { id: string; label: string }) => ({ id: it.id, label: it.label, state: 'pending' as const })),
      });
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
        return { ...it, state: 'pending' as const, severity: undefined };
      }),
    });
  };

  const finishRun = async () => {
    if (!running) return;
    setBusy(true);
    try {
      const checked = running.items.filter(it => it.state !== 'pending').map(it => ({ item_id: it.id, checked_at: new Date().toISOString() }));
      await updateChecklistInstance(running.instance.id, { checked_items: checked, completed: true });
      const fails = running.items.filter(it => it.state === 'fail');
      for (const f of fails) {
        await createInspectionFinding({
          hotel_id: hotelId,
          instance_id: running.instance.id,
          checklist_id: running.checklist.id,
          item_id: f.id,
          item_label: f.label,
          severity: f.severity || 'minor',
          created_by: staffName,
        });
      }
      setRunning(null);
      await load();
    } catch { /* silent */ }
    setBusy(false);
  };

  const cancelRun = async () => {
    if (!running) return;
    setRunning(null);
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
            <p className="text-[14px] font-bold text-gray-900">{running.checklist.name}</p>
            <button onClick={cancelRun}><XIcon size={16} className="text-gray-400" /></button>
          </div>
          <p className="text-[11px] text-gray-400">Tap: pass → fail (minor → major → critical) → reset</p>
          <div className="space-y-2">
            {running.items.map(it => (
              <button key={it.id} onClick={() => cycleState(it.id)}
                className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left border"
                style={{
                  borderColor: it.state === 'fail' ? sevColor(it.severity || 'minor') : it.state === 'pass' ? TEAL : '#e5e7eb',
                  background: it.state === 'fail' ? `${sevColor(it.severity || 'minor')}14` : it.state === 'pass' ? `${TEAL}10` : '#fff',
                }}>
                <span className="text-[13px] font-semibold text-gray-800">{it.label}</span>
                <span className="text-[11px] font-bold uppercase" style={{ color: it.state === 'fail' ? sevColor(it.severity || 'minor') : it.state === 'pass' ? TEAL : '#9ca3af' }}>
                  {it.state === 'fail' ? `FAIL ${it.severity || 'minor'}` : it.state}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={finishRun} disabled={busy} className="flex-1 text-[13px] font-bold text-white rounded-xl py-2.5 disabled:opacity-50" style={{ background: TEAL }}>
              Finish — log {running.items.filter(it => it.state === 'fail').length} finding(s)
            </button>
          </div>
        </div>
      ) : (
        /* Checklist picker */
        <div className="space-y-2">
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