'use client';

import { useState, useEffect } from 'react';
import {
  getPositionTodoTemplates, createPositionTodoTemplate, deletePositionTodoTemplate,
  getTemplateItems, createTemplateItem, deleteTemplateItem,
  getTodayInstances, createInstance, completeInstance,
  getInstanceResponses, upsertResponse,
  createRoomMove, createNoShow, createBankCount,
  type PositionTodoTemplate, type PositionTodoItem,
  type PositionTodoInstance, type PositionTodoResponse,
} from '@/lib/supabase';
import { CheckSquare, Plus, X as XIcon, ChevronDown, Trash2, GripVertical, Edit3, Clock, Hash, Type, Link, Save, ClipboardList, Move, UserX, DollarSign, BookOpen, Download } from 'lucide-react';

const TEAL = '#0D9488';

// Local calendar date (YYYY-MM-DD). Avoids the UTC rollover bug where
// toISOString() returns tomorrow's date after ~7pm in US timezones.
function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEPARTMENTS: { key: string; label: string; icon: string }[] = [
  { key: 'management',   label: 'Management',   icon: '👔' },
  { key: 'front_desk',   label: 'Front Desk',   icon: '🛎️' },
  { key: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
  { key: 'maintenance',  label: 'Maintenance',  icon: '🔧' },
  { key: 'security',     label: 'Security',     icon: '🛡️' },
  { key: 'drivers',      label: 'Drivers',      icon: '🚐' },
];

const ITEM_TYPES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'checkbox',    label: 'Checkbox',           icon: <CheckSquare size={14} /> },
  { key: 'number',      label: 'Number Input',        icon: <Hash size={14} /> },
  { key: 'text',        label: 'Text Input',          icon: <Type size={14} /> },
  { key: 'time',        label: 'Time',                icon: <Clock size={14} /> },
  { key: 'kpi_field',   label: 'KPI Field',           icon: <ClipboardList size={14} /> },
  { key: 'action_link', label: 'Action Link',         icon: <Link size={14} /> },
  { key: 'room_move',   label: 'Room Move',           icon: <Move size={14} /> },
  { key: 'no_show',     label: 'No Show',             icon: <UserX size={14} /> },
  { key: 'bank_count',  label: 'Bank/Drawer Count',   icon: <DollarSign size={14} /> },
];

interface CommunityItem {
  label: string;
  item_type: string;
  config?: Record<string, unknown>;
}

interface CommunityTemplate {
  id: string;
  name: string;
  description: string;
  department: string;
  assigned_position?: string;
  emoji: string;
  tag: string;
  items: CommunityItem[];
}

// Built-in community templates — ready-to-use operational checklists hotels can install.
// Future: pull these from a shared global DB table where properties share what works.
const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
  {
    id: 'cash-drawer-count',
    name: 'Cash Drawer Count Sheet',
    description: 'Track your cash drawer balance at the start and end of every shift.',
    department: 'front_desk',
    emoji: '💵',
    tag: 'Accounting',
    items: [
      { label: 'Opening Drawer Count', item_type: 'bank_count' },
      { label: 'Closing Drawer Count', item_type: 'bank_count' },
    ],
  },
  {
    id: 'no-shows-log',
    name: 'No Shows Log',
    description: 'Log every guest who had a reservation but did not arrive.',
    department: 'front_desk',
    emoji: '🚫',
    tag: 'Front Desk',
    items: [
      { label: 'Log No-Show Guest', item_type: 'no_show' },
    ],
  },
  {
    id: 'room-moves-log',
    name: 'Room Moves Log',
    description: 'Track every guest room change with reason and who authorized it.',
    department: 'front_desk',
    emoji: '🔄',
    tag: 'Front Desk',
    items: [
      { label: 'Log Room Move', item_type: 'room_move' },
    ],
  },
  {
    id: 'morning-opening',
    name: 'Morning Opening Checklist',
    description: 'Standard front desk opening tasks to start the AM shift right.',
    department: 'front_desk',
    assigned_position: 'front_desk_agent',
    emoji: '☀️',
    tag: 'Daily Ops',
    items: [
      { label: 'Check lobby cleanliness', item_type: 'checkbox' },
      { label: 'Review arrivals & departures report', item_type: 'checkbox' },
      { label: 'Count opening cash drawer', item_type: 'bank_count' },
      { label: 'Check maintenance work orders', item_type: 'checkbox' },
      { label: 'Confirm housekeeping assignments', item_type: 'checkbox' },
      { label: 'Current occupancy (%)', item_type: 'number', config: { unit: '%', placeholder: 'Enter occupancy' } },
    ],
  },
  {
    id: 'night-audit',
    name: 'Night Audit Checklist',
    description: 'End-of-day audit tasks for the overnight shift auditor.',
    department: 'front_desk',
    assigned_position: 'night_auditor',
    emoji: '🌙',
    tag: 'Night Audit',
    items: [
      { label: 'Check in all remaining arrivals', item_type: 'checkbox' },
      { label: 'Run end-of-day audit report', item_type: 'checkbox' },
      { label: 'Balance accounts receivable', item_type: 'checkbox' },
      { label: 'Post room & tax charges', item_type: 'checkbox' },
      { label: 'Final occupied room count', item_type: 'number', config: { unit: 'rooms', placeholder: 'Enter count' } },
      { label: 'End-of-day drawer count', item_type: 'bank_count' },
      { label: 'No shows for tonight', item_type: 'no_show' },
    ],
  },
  {
    id: 'housekeeping-daily',
    name: 'Housekeeping Daily Report',
    description: 'Track rooms cleaned, rooms remaining, and any issues found on the floor.',
    department: 'housekeeping',
    assigned_position: 'housekeeper',
    emoji: '🧹',
    tag: 'Housekeeping',
    items: [
      { label: 'Rooms cleaned today', item_type: 'number', config: { unit: 'rooms', placeholder: 'Enter count' } },
      { label: 'Rooms still pending', item_type: 'number', config: { unit: 'rooms', placeholder: 'Enter count' } },
      { label: 'Restock linen & amenities', item_type: 'checkbox' },
      { label: 'Report any maintenance issues found', item_type: 'checkbox' },
      { label: 'Lost & found items logged', item_type: 'checkbox' },
    ],
  },
  {
    id: 'pm-closing',
    name: 'PM Closing Checklist',
    description: 'End-of-PM-shift wrap-up for the front desk agent.',
    department: 'front_desk',
    assigned_position: 'front_desk_agent',
    emoji: '🌆',
    tag: 'Daily Ops',
    items: [
      { label: 'Count closing cash drawer', item_type: 'bank_count' },
      { label: 'Log any no shows for tonight', item_type: 'no_show' },
      { label: 'Complete handover notes', item_type: 'text', config: { placeholder: 'Write anything the next shift needs to know...' } },
      { label: 'Confirm all check-ins processed', item_type: 'checkbox' },
      { label: 'Safe drop completed', item_type: 'checkbox' },
    ],
  },
];

const POSITIONS: { key: string; label: string }[] = [
  { key: '', label: 'All positions in department' },
  { key: 'front_desk_agent', label: 'Front Desk Agent' },
  { key: 'night_auditor', label: 'Night Auditor' },
  { key: 'housekeeper', label: 'Housekeeper' },
  { key: 'maintenance_tech', label: 'Maintenance Tech' },
  { key: 'security_guard', label: 'Security Guard' },
  { key: 'shuttle_driver', label: 'Shuttle Driver' },
  { key: 'manager', label: 'Manager on Duty' },
];

type ViewMode = 'staff' | 'builder';
type BuilderTab = 'my-templates' | 'library';

interface Props {
  hotelId: string;
  isAdmin: boolean;
  staffName?: string;
  staffId?: string;
  department?: string;
}

export default function PositionTodosView({ hotelId, isAdmin, staffName, staffId, department }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('staff');
  const [builderTab, setBuilderTab] = useState<BuilderTab>('my-templates');
  const [templates, setTemplates] = useState<PositionTodoTemplate[]>([]);
  const [itemsByTemplate, setItemsByTemplate] = useState<Record<string, PositionTodoItem[]>>({});
  const [instances, setInstances] = useState<PositionTodoInstance[]>([]);
  const [responsesByInstance, setResponsesByInstance] = useState<Record<string, PositionTodoResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [openDept, setOpenDept] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [installedId, setInstalledId] = useState<string | null>(null);

  // New template form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDept, setNewDept] = useState('front_desk');
  const [newPos, setNewPos] = useState('');

  // Item editing
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemType, setNewItemType] = useState('checkbox');
  const [newItemConfig, setNewItemConfig] = useState('');

  // Inline form state for operational input types
  const [opsForm, setOpsForm] = useState<Record<string, Record<string, string>>>({});
  const setOpsField = (itemId: string, field: string, value: string) =>
    setOpsForm(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));

  const loadAll = async () => {
    setLoading(true);
    try {
      const tpls = await getPositionTodoTemplates(hotelId);
      setTemplates(tpls);

      const itemsMap: Record<string, PositionTodoItem[]> = {};
      for (const t of tpls) {
        itemsMap[t.id] = await getTemplateItems(t.id);
      }
      setItemsByTemplate(itemsMap);

      const insts = await getTodayInstances(hotelId, staffId);
      setInstances(insts);

      const respMap: Record<string, PositionTodoResponse[]> = {};
      for (const inst of insts) {
        respMap[inst.id] = await getInstanceResponses(inst.id);
      }
      setResponsesByInstance(respMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [hotelId, staffId]); // eslint-disable-line react-hooks/exhaustive-deps

  const templatesByDept: Record<string, PositionTodoTemplate[]> = {};
  templates.forEach(t => {
    if (!isAdmin && department) {
      if (t.department !== department) return;
    }
    const k = t.department || 'front_desk';
    (templatesByDept[k] = templatesByDept[k] || []).push(t);
  });

  const createTemplate = async () => {
    if (!newName.trim()) return;
    setSubmitting(true); setError(null);
    try {
      await createPositionTodoTemplate({
        hotel_id: hotelId, name: newName.trim(), description: newDesc.trim(),
        department: newDept, assigned_position: newPos,
      });
      setNewName(''); setNewDesc(''); setNewDept('front_desk'); setNewPos('');
      setShowNew(false);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    }
    setSubmitting(false);
  };

  const installCommunityTemplate = async (ct: CommunityTemplate) => {
    setSubmitting(true); setError(null);
    try {
      const tpl = await createPositionTodoTemplate({
        hotel_id: hotelId, name: ct.name, description: ct.description,
        department: ct.department, assigned_position: ct.assigned_position || '',
      });
      for (let i = 0; i < ct.items.length; i++) {
        await createTemplateItem({
          template_id: tpl.id, label: ct.items[i].label,
          item_type: ct.items[i].item_type, sort_order: i,
          config: ct.items[i].config || {},
        });
      }
      setInstalledId(ct.id);
      await loadAll();
      setBuilderTab('my-templates');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to install template');
    }
    setSubmitting(false);
  };

  const deleteTpl = async (id: string) => {
    if (!confirm('Delete this To-Do template? All items will be removed.')) return;
    await deletePositionTodoTemplate(id);
    await loadAll();
  };

  const addItem = async (templateId: string) => {
    if (!newItemLabel.trim()) return;
    setSubmitting(true);
    const items = itemsByTemplate[templateId] || [];
    let config: Record<string, unknown> = {};
    try { if (newItemConfig.trim()) config = JSON.parse(newItemConfig); } catch {}
    try {
      await createTemplateItem({
        template_id: templateId, label: newItemLabel.trim(),
        item_type: newItemType, sort_order: items.length, config,
      });
      setNewItemLabel(''); setNewItemType('checkbox'); setNewItemConfig('');
      const updated = await getTemplateItems(templateId);
      setItemsByTemplate(prev => ({ ...prev, [templateId]: updated }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add item');
    }
    setSubmitting(false);
  };

  const removeItem = async (itemId: string, templateId: string) => {
    await deleteTemplateItem(itemId);
    const updated = await getTemplateItems(templateId);
    setItemsByTemplate(prev => ({ ...prev, [templateId]: updated }));
  };

  const startInstance = async (tplId: string) => {
    setSubmitting(true);
    try {
      const existing = instances.find(i => i.template_id === tplId && i.status !== 'completed');
      if (existing) {
        setError('You already have this To-Do in progress today.');
        setSubmitting(false);
        return;
      }
      const inst = await createInstance({
        hotel_id: hotelId, template_id: tplId,
        staff_id: staffId, staff_name: staffName || 'Staff',
      });
      const items = itemsByTemplate[tplId] || [];
      for (const item of items) {
        await upsertResponse({ instance_id: inst.id, item_id: item.id });
      }
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    }
    setSubmitting(false);
  };

  const handleCheck = async (instId: string, itemId: string, checked: boolean) => {
    await upsertResponse({ instance_id: instId, item_id: itemId, checked });
    const updated = await getInstanceResponses(instId);
    setResponsesByInstance(prev => ({ ...prev, [instId]: updated }));
  };

  const handleNumber = async (instId: string, itemId: string, value: number) => {
    await upsertResponse({ instance_id: instId, item_id: itemId, checked: true, number_value: value });
    const updated = await getInstanceResponses(instId);
    setResponsesByInstance(prev => ({ ...prev, [instId]: updated }));
  };

  const handleText = async (instId: string, itemId: string, value: string) => {
    await upsertResponse({ instance_id: instId, item_id: itemId, checked: !!value, text_value: value });
    const updated = await getInstanceResponses(instId);
    setResponsesByInstance(prev => ({ ...prev, [instId]: updated }));
  };

  const handleRoomMove = async (instId: string, itemId: string) => {
    const f = opsForm[itemId] || {};
    if (!f.guest_name?.trim() || !f.from_room?.trim() || !f.to_room?.trim()) {
      setError('Guest name, from room, and to room are required.'); return;
    }
    setSubmitting(true); setError(null);
    try {
      await createRoomMove({
        hotel_id: hotelId, move_date: localDateStr(),
        guest_name: f.guest_name.trim(), from_room: f.from_room.trim(), to_room: f.to_room.trim(),
        reason: f.reason?.trim() || '', initiated_by: staffName || '', notes: '',
      });
      await upsertResponse({ instance_id: instId, item_id: itemId, checked: true, text_value: `${f.guest_name.trim()}: Room ${f.from_room.trim()} → ${f.to_room.trim()}` });
      const updated = await getInstanceResponses(instId);
      setResponsesByInstance(prev => ({ ...prev, [instId]: updated }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to log room move'); }
    setSubmitting(false);
  };

  const handleNoShow = async (instId: string, itemId: string) => {
    const f = opsForm[itemId] || {};
    if (!f.guest_name?.trim() || !f.room?.trim()) {
      setError('Guest name and room are required.'); return;
    }
    setSubmitting(true); setError(null);
    try {
      await createNoShow({
        hotel_id: hotelId, no_show_date: localDateStr(),
        guest_name: f.guest_name.trim(), room: f.room.trim(),
        reservation_ref: f.reservation_ref?.trim() || '', reason: f.reason?.trim() || '', notes: '',
      });
      await upsertResponse({ instance_id: instId, item_id: itemId, checked: true, text_value: `${f.guest_name.trim()} · Room ${f.room.trim()}` });
      const updated = await getInstanceResponses(instId);
      setResponsesByInstance(prev => ({ ...prev, [instId]: updated }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to log no-show'); }
    setSubmitting(false);
  };

  const DENOMS = [
    { key: 'd100',    label: '$100 bills' },
    { key: 'd50',     label: '$50 bills'  },
    { key: 'd20',     label: '$20 bills'  },
    { key: 'd10',     label: '$10 bills'  },
    { key: 'd5',      label: '$5 bills'   },
    { key: 'd1',      label: '$1 bills'   },
    { key: 'c100',    label: '$1 coins'   },
    { key: 'c50',     label: '50¢ coins'  },
    { key: 'c25',     label: '25¢ coins'  },
    { key: 'c10',     label: '10¢ coins'  },
    { key: 'c5',      label: '5¢ coins'   },
    { key: 'c1',      label: '1¢ coins'   },
  ];

  const calcDrawerTotal = (f: Record<string, string>) => {
    const bills = DENOMS.reduce((sum, d) => sum + (parseFloat(f[d.key] || '0') || 0), 0);
    const paidOut = parseFloat(f.paid_out || '0') || 0;
    const petty   = parseFloat(f.petty_cash || '0') || 0;
    return bills - paidOut - petty;
  };

  const handleBankCount = async (instId: string, itemId: string) => {
    const f = opsForm[itemId] || {};
    const total = calcDrawerTotal(f);
    setSubmitting(true); setError(null);
    try {
      const billsBreakdown = DENOMS.map(d => `${d.label}: $${f[d.key] || '0'}`).join(' | ');
      await createBankCount({
        hotel_id: hotelId, count_date: localDateStr(), shift: f.shift || 'AM',
        counted_by: staffName || '', cash_total: total,
        card_total: 0, room_charges: 0,
        discrepancies: f.discrepancies?.trim() || '',
        notes: `Bills: ${billsBreakdown} | Paid Out: $${f.paid_out || '0'} | Petty Cash: $${f.petty_cash || '0'}${f.notes ? ' | Notes: ' + f.notes : ''}`,
      });
      await upsertResponse({ instance_id: instId, item_id: itemId, checked: true, text_value: `Cash $${total.toFixed(2)}` });
      const updated = await getInstanceResponses(instId);
      setResponsesByInstance(prev => ({ ...prev, [instId]: updated }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to log bank count'); }
    setSubmitting(false);
  };

  const handleComplete = async (instId: string) => {
    await completeInstance(instId);
    await loadAll();
  };

  const getResp = (instId: string, itemId: string): PositionTodoResponse | undefined =>
    (responsesByInstance[instId] || []).find(r => r.item_id === itemId);

  const myInstances = instances.filter(i => i.staff_name === staffName);
  const completedCount = myInstances.filter(i => i.status === 'completed').length;
  const totalCount = myInstances.length;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">To-Dos</h1>
          <p className="text-[13px] text-gray-500">
            {isAdmin ? staffName || 'Admin' : staffName || 'Staff'} · {totalCount > 0 ? `${completedCount}/${totalCount} done today` : 'Start your shift tasks'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'builder' ? 'staff' : 'builder')}
              className={`text-[11px] font-bold px-3 py-2 rounded-xl border transition-colors ${viewMode === 'builder' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              {viewMode === 'builder' ? '👁️ Staff View' : '⚙️ Builder'}
            </button>
            {viewMode === 'builder' && builderTab === 'my-templates' && (
              <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
                <Plus size={14} /> New
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4">{error}<button onClick={() => setError(null)} className="ml-2 font-bold">✕</button></div>}

      {/* Builder tab bar */}
      {isAdmin && viewMode === 'builder' && (
        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setBuilderTab('my-templates')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-colors ${builderTab === 'my-templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ClipboardList size={13} /> My Templates
          </button>
          <button
            onClick={() => setBuilderTab('library')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-colors ${builderTab === 'library' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BookOpen size={13} /> Template Library
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-[14px]">Loading...</div>
      ) : (
        <>
          {/* ── BUILDER: Template Library ── */}
          {isAdmin && viewMode === 'builder' && builderTab === 'library' && (
            <div>
              <div className="mb-4">
                <p className="text-[13px] text-gray-500">Ready-to-use To-Do templates from the community. Install any to your hotel in one click — you can customize them after.</p>
              </div>
              <div className="space-y-3">
                {COMMUNITY_TEMPLATES.map(ct => {
                  const alreadyInstalled = installedId === ct.id;
                  const dept = DEPARTMENTS.find(d => d.key === ct.department);
                  return (
                    <div key={ct.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-[28px] leading-none mt-0.5">{ct.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="text-[14px] font-bold text-gray-900">{ct.name}</p>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 uppercase tracking-wide">{ct.tag}</span>
                              {dept && <span className="text-[9px] text-gray-400">{dept.icon} {dept.label}</span>}
                            </div>
                            <p className="text-[12px] text-gray-500 mb-2">{ct.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {ct.items.map((item, i) => {
                                const typeInfo = ITEM_TYPES.find(t => t.key === item.item_type);
                                return (
                                  <span key={i} className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5">
                                    {typeInfo?.icon} {item.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => installCommunityTemplate(ct)}
                          disabled={submitting}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold disabled:opacity-50 transition-colors ${alreadyInstalled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-white'}`}
                          style={alreadyInstalled ? {} : { backgroundColor: TEAL }}
                        >
                          {alreadyInstalled ? '✓ Installed' : <><Download size={12} /> Install</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-[11px] text-gray-400 mt-6">More templates coming as the community grows. Build your own and share it with other properties.</p>
            </div>
          )}

          {/* ── BUILDER: My Templates ── */}
          {isAdmin && viewMode === 'builder' && builderTab === 'my-templates' && (
            <>
              {templates.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-[15px] font-semibold text-gray-700 mb-1">No templates yet</p>
                  <p className="text-[12px] text-gray-500 mb-4">Create your own or install one from the Template Library.</p>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}><Plus size={14} /> Create Custom</button>
                    <button onClick={() => setBuilderTab('library')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-[12px] font-bold"><BookOpen size={14} /> Browse Library</button>
                  </div>
                </div>
              )}

              {templates.length > 0 && (
                <div className="space-y-4">
                  {/* Library shortcut banner */}
                  <button onClick={() => setBuilderTab('library')} className="w-full flex items-center gap-3 px-4 py-3 bg-teal-50 border border-teal-100 rounded-2xl hover:bg-teal-100 transition-colors text-left">
                    <BookOpen size={18} className="text-teal-600 shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-teal-800">Browse Template Library</p>
                      <p className="text-[11px] text-teal-600">Install community-made To-Do templates for cash drawer, no shows, night audit &amp; more</p>
                    </div>
                  </button>

                  {DEPARTMENTS.map(dept => {
                    const deptTpls = templatesByDept[dept.key] || [];
                    if (deptTpls.length === 0) return null;
                    const open = openDept === dept.key || (!!editingTemplate && deptTpls.some(t => t.id === editingTemplate));
                    return (
                      <div key={dept.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <button onClick={() => setOpenDept(open ? null : dept.key)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-[20px]">{dept.icon}</span>
                            <div className="text-left">
                              <p className="text-[14px] font-bold text-gray-900">{dept.label}</p>
                              <p className="text-[11px] text-gray-500">{deptTpls.length} template{deptTpls.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>

                        {open && (
                          <div className="border-t border-gray-100 divide-y divide-gray-100">
                            {deptTpls.map(tpl => {
                              const editing = editingTemplate === tpl.id;
                              const items = itemsByTemplate[tpl.id] || [];
                              return (
                                <div key={tpl.id} className="px-4 py-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[14px] font-semibold text-gray-900">{tpl.name}
                                        {tpl.assigned_position && <span className="ml-2 text-[10px] text-gray-500 font-normal">· {POSITIONS.find(p => p.key === tpl.assigned_position)?.label}</span>}
                                      </p>
                                      <p className="text-[11px] text-gray-500">{tpl.description || 'No description'} · {items.length} items</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => setEditingTemplate(editing ? null : tpl.id)} className={`p-2 rounded-lg transition-colors ${editing ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                                        <Edit3 size={14} />
                                      </button>
                                      <button onClick={() => deleteTpl(tpl.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {editing && (
                                    <div className="border-t border-gray-100 pt-3 mt-2 space-y-3">
                                      {items.length === 0 && (
                                        <p className="text-[12px] text-gray-400 italic">No items yet. Add tasks below.</p>
                                      )}
                                      {items.sort((a, b) => a.sort_order - b.sort_order).map(item => (
                                        <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <GripVertical size={14} className="text-gray-300" />
                                            <span className="text-[11px] text-gray-400 uppercase font-bold w-20 shrink-0">{ITEM_TYPES.find(t => t.key === item.item_type)?.label || item.item_type}</span>
                                            <span className="text-[13px] text-gray-700">{item.label}</span>
                                            {item.config?.unit && <span className="text-[11px] text-gray-400">({item.config.unit})</span>}
                                          </div>
                                          <button onClick={() => removeItem(item.id, tpl.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      ))}

                                      <div className="bg-gray-50 rounded-xl p-3 border border-dashed border-gray-200">
                                        <p className="text-[11px] font-bold text-gray-500 mb-2">Add Item</p>
                                        <div className="space-y-2">
                                          <input value={newItemLabel} onChange={e => setNewItemLabel(e.target.value)} placeholder="e.g. Check lobby cleanliness" className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                          <div className="flex gap-2">
                                            <select value={newItemType} onChange={e => setNewItemType(e.target.value)} className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200">
                                              {ITEM_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                                            </select>
                                            <button onClick={() => addItem(tpl.id)} disabled={submitting || !newItemLabel.trim()} className="px-3 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                                              <Plus size={14} />
                                            </button>
                                          </div>
                                          {(newItemType === 'number' || newItemType === 'kpi_field') && (
                                            <input value={newItemConfig} onChange={e => setNewItemConfig(e.target.value)} placeholder='e.g. {"unit":"rooms","placeholder":"Enter count"}' className="w-full bg-white rounded-lg px-3 py-2 text-[11px] border border-gray-200 font-mono" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── STAFF VIEW ── */}
          {viewMode === 'staff' && (
            <>
              {templates.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-[15px] font-semibold text-gray-700 mb-1">No To-Dos yet</p>
                  {isAdmin ? (
                    <p className="text-[12px] text-gray-500 mb-4">Go to Builder to create or install checklists.</p>
                  ) : (
                    <p className="text-[12px] text-gray-500">Ask your manager to set up To-Dos for your position.</p>
                  )}
                </div>
              )}

              {templates.length > 0 && (
                <div className="space-y-4">
                  {DEPARTMENTS.filter(d => {
                    if (!isAdmin && department) return d.key === department;
                    return true;
                  }).map(dept => {
                    const deptTpls = templates.filter(t => t.department === dept.key);
                    if (deptTpls.length === 0) return null;
                    const open = openDept === dept.key;
                    return (
                      <div key={dept.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <button onClick={() => setOpenDept(open ? null : dept.key)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-[20px]">{dept.icon}</span>
                            <div className="text-left">
                              <p className="text-[14px] font-bold text-gray-900">{dept.label}</p>
                              <p className="text-[11px] text-gray-500">{deptTpls.length} checklist{deptTpls.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>

                        {open && (
                          <div className="border-t border-gray-100 divide-y divide-gray-100">
                            {deptTpls.map(tpl => {
                              const items = itemsByTemplate[tpl.id] || [];
                              const myInst = instances.find(i => i.template_id === tpl.id && i.staff_name === staffName && i.status !== 'completed');
                              const completedInst = instances.find(i => i.template_id === tpl.id && i.status === 'completed' && i.staff_name === staffName);

                              return (
                                <div key={tpl.id} className="px-4 py-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[14px] font-semibold text-gray-900">{tpl.name}</p>
                                      <p className="text-[11px] text-gray-500">
                                        {tpl.description && `${tpl.description} · `}
                                        {items.length} item{items.length !== 1 ? 's' : ''}
                                        {tpl.assigned_position && ` · ${POSITIONS.find(p => p.key === tpl.assigned_position)?.label || tpl.assigned_position}`}
                                      </p>
                                    </div>
                                    {completedInst ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✅ Done</span>
                                    ) : myInst ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⏳ In Progress</span>
                                    ) : staffName ? (
                                      <button onClick={() => startInstance(tpl.id)} disabled={submitting} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                                        Start
                                      </button>
                                    ) : null}
                                  </div>

                                  {myInst && items.length > 0 && (
                                    <div className="space-y-2 mt-3 border-t border-gray-100 pt-3">
                                      {items.sort((a, b) => a.sort_order - b.sort_order).map(item => {
                                        const resp = getResp(myInst.id, item.id);
                                        return (
                                          <div key={item.id} className="flex items-start gap-2.5 py-1">
                                            {item.item_type === 'checkbox' && (
                                              <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                                                <input type="checkbox" checked={resp?.checked || false} onChange={() => handleCheck(myInst.id, item.id, !resp?.checked)} className="w-4 h-4 rounded border-gray-300 cursor-pointer" style={{ accentColor: TEAL }} />
                                                <span className={`text-[13px] ${resp?.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span>
                                              </label>
                                            )}
                                            {item.item_type === 'number' && (
                                              <div className="flex-1">
                                                <p className="text-[13px] text-gray-700 mb-1">{item.label}{item.config?.unit ? ` (${item.config.unit})` : ''}</p>
                                                <input type="number" value={resp?.number_value ?? ''} onChange={e => handleNumber(myInst.id, item.id, parseFloat(e.target.value) || 0)} placeholder={item.config?.placeholder || 'Enter value...'} min={item.config?.min} max={item.config?.max} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
                                              </div>
                                            )}
                                            {item.item_type === 'text' && (
                                              <div className="flex-1">
                                                <p className="text-[13px] text-gray-700 mb-1">{item.label}</p>
                                                <input type="text" value={resp?.text_value || ''} onChange={e => handleText(myInst.id, item.id, e.target.value)} placeholder={item.config?.placeholder || 'Type answer...'} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
                                              </div>
                                            )}
                                            {item.item_type === 'time' && (
                                              <div className="flex-1">
                                                <p className="text-[13px] text-gray-700 mb-1">{item.label}</p>
                                                <input type="time" value={resp?.text_value || ''} onChange={e => handleText(myInst.id, item.id, e.target.value)} className="w-40 bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
                                              </div>
                                            )}
                                            {item.item_type === 'kpi_field' && (
                                              <div className="flex-1">
                                                <p className="text-[13px] text-gray-700 mb-1">📊 {item.label}{item.config?.unit ? ` (${item.config.unit})` : ''}</p>
                                                <input type="number" value={resp?.number_value ?? ''} onChange={e => handleNumber(myInst.id, item.id, parseFloat(e.target.value) || 0)} placeholder={item.config?.placeholder || 'Enter KPI value...'} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
                                              </div>
                                            )}
                                            {item.item_type === 'action_link' && (
                                              <div className="flex-1">
                                                <p className="text-[13px] text-gray-700 mb-1">{item.label}</p>
                                                <div className="flex items-center gap-2">
                                                  <input type="checkbox" checked={resp?.checked || false} onChange={() => handleCheck(myInst.id, item.id, !resp?.checked)} className="w-4 h-4 rounded border-gray-300 cursor-pointer" style={{ accentColor: TEAL }} />
                                                  {item.config?.link_path ? (
                                                    <button onClick={() => window.location.href = item.config.link_path!} className="text-[12px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: TEAL }}>Open</button>
                                                  ) : (
                                                    <span className="text-[12px] text-gray-400">Mark as done</span>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                            {item.item_type === 'room_move' && (
                                              <div className="flex-1">
                                                <p className="text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Move size={13} /> {item.label}</p>
                                                {resp?.checked ? (
                                                  <p className="text-[12px] text-emerald-600">✓ {resp.text_value}</p>
                                                ) : (
                                                  <div className="space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                    <input value={opsForm[item.id]?.guest_name || ''} onChange={e => setOpsField(item.id, 'guest_name', e.target.value)} placeholder="Guest name" className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                    <div className="flex gap-1.5">
                                                      <input value={opsForm[item.id]?.from_room || ''} onChange={e => setOpsField(item.id, 'from_room', e.target.value)} placeholder="From room" className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                      <input value={opsForm[item.id]?.to_room || ''} onChange={e => setOpsField(item.id, 'to_room', e.target.value)} placeholder="To room" className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                    </div>
                                                    <input value={opsForm[item.id]?.reason || ''} onChange={e => setOpsField(item.id, 'reason', e.target.value)} placeholder="Reason (optional)" className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                    <button onClick={() => handleRoomMove(myInst.id, item.id)} disabled={submitting} className="w-full py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>Log Room Move</button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {item.item_type === 'no_show' && (
                                              <div className="flex-1">
                                                <p className="text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><UserX size={13} /> {item.label}</p>
                                                {resp?.checked ? (
                                                  <p className="text-[12px] text-emerald-600">✓ {resp.text_value}</p>
                                                ) : (
                                                  <div className="space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                    <input value={opsForm[item.id]?.guest_name || ''} onChange={e => setOpsField(item.id, 'guest_name', e.target.value)} placeholder="Guest name" className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                    <div className="flex gap-1.5">
                                                      <input value={opsForm[item.id]?.room || ''} onChange={e => setOpsField(item.id, 'room', e.target.value)} placeholder="Room" className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                      <input value={opsForm[item.id]?.reservation_ref || ''} onChange={e => setOpsField(item.id, 'reservation_ref', e.target.value)} placeholder="Reservation # (opt.)" className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                    </div>
                                                    <input value={opsForm[item.id]?.reason || ''} onChange={e => setOpsField(item.id, 'reason', e.target.value)} placeholder="Reason (optional)" className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                    <button onClick={() => handleNoShow(myInst.id, item.id)} disabled={submitting} className="w-full py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>Log No Show</button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {item.item_type === 'bank_count' && (
                                              <div className="flex-1">
                                                <p className="text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><DollarSign size={13} /> {item.label}</p>
                                                {resp?.checked ? (
                                                  <p className="text-[12px] text-emerald-600">✓ {resp.text_value}</p>
                                                ) : (
                                                  <div className="space-y-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                    <select value={opsForm[item.id]?.shift || 'AM'} onChange={e => setOpsField(item.id, 'shift', e.target.value)} className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200">
                                                      <option value="AM">AM Shift</option>
                                                      <option value="PM">PM Shift</option>
                                                      <option value="Overnight">Overnight</option>
                                                    </select>

                                                    {/* Bills */}
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-1">Bills — enter total $ per denomination</p>
                                                    <div className="grid grid-cols-3 gap-1.5">
                                                      {DENOMS.filter(d => d.key.startsWith('d')).map(d => (
                                                        <div key={d.key}>
                                                          <label className="text-[10px] text-gray-500 font-bold block mb-0.5">{d.label}</label>
                                                          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                            <span className="text-[11px] text-gray-400 px-2">$</span>
                                                            <input
                                                              type="number" min="0" step="0.01"
                                                              value={opsForm[item.id]?.[d.key] || ''}
                                                              onChange={e => setOpsField(item.id, d.key, e.target.value)}
                                                              placeholder="0"
                                                              className="flex-1 py-2 pr-2 text-[13px] font-bold text-gray-900 w-0 min-w-0 outline-none bg-transparent"
                                                            />
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>

                                                    {/* Coins */}
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-1">Coins — enter total $ per denomination</p>
                                                    <div className="grid grid-cols-3 gap-1.5">
                                                      {DENOMS.filter(d => d.key.startsWith('c')).map(d => (
                                                        <div key={d.key}>
                                                          <label className="text-[10px] text-gray-500 font-bold block mb-0.5">{d.label}</label>
                                                          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                            <span className="text-[11px] text-gray-400 px-2">$</span>
                                                            <input
                                                              type="number" min="0" step="0.01"
                                                              value={opsForm[item.id]?.[d.key] || ''}
                                                              onChange={e => setOpsField(item.id, d.key, e.target.value)}
                                                              placeholder="0"
                                                              className="flex-1 py-2 pr-2 text-[13px] font-bold text-gray-900 w-0 min-w-0 outline-none bg-transparent"
                                                            />
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>

                                                    {/* Paid Out + Petty Cash */}
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-1">Deductions</p>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                      <div>
                                                        <label className="text-[10px] text-gray-500 font-bold block mb-0.5">Paid Out ($)</label>
                                                        <input type="number" min="0" step="0.01"
                                                          value={opsForm[item.id]?.paid_out || ''}
                                                          onChange={e => setOpsField(item.id, 'paid_out', e.target.value)}
                                                          placeholder="0.00"
                                                          className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                      </div>
                                                      <div>
                                                        <label className="text-[10px] text-gray-500 font-bold block mb-0.5">Petty Cash ($)</label>
                                                        <input type="number" min="0" step="0.01"
                                                          value={opsForm[item.id]?.petty_cash || ''}
                                                          onChange={e => setOpsField(item.id, 'petty_cash', e.target.value)}
                                                          placeholder="0.00"
                                                          className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                      </div>
                                                    </div>

                                                    {/* Running total */}
                                                    <div className="bg-white rounded-xl px-4 py-3 border border-gray-200 flex items-center justify-between">
                                                      <span className="text-[12px] font-bold text-gray-600">Drawer Total</span>
                                                      <span className="text-[20px] font-extrabold" style={{ color: TEAL }}>
                                                        ${calcDrawerTotal(opsForm[item.id] || {}).toFixed(2)}
                                                      </span>
                                                    </div>

                                                    <input value={opsForm[item.id]?.discrepancies || ''} onChange={e => setOpsField(item.id, 'discrepancies', e.target.value)} placeholder="Discrepancies (optional)" className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                    <input value={opsForm[item.id]?.notes || ''} onChange={e => setOpsField(item.id, 'notes', e.target.value)} placeholder="Notes (optional)" className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200" />
                                                    <button onClick={() => handleBankCount(myInst.id, item.id)} disabled={submitting} className="w-full py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>Log Drawer Count</button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}

                                      <button onClick={() => handleComplete(myInst.id)} disabled={submitting} className="w-full mt-3 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: TEAL }}>
                                        <Save size={16} /> Mark All Complete
                                      </button>
                                    </div>
                                  )}

                                  {completedInst && (
                                    <p className="text-[11px] text-emerald-600 mt-1">✓ Completed {completedInst.completed_at ? new Date(completedInst.completed_at).toLocaleTimeString() : ''}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* New template modal */}
      {showNew && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowNew(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">New To-Do Template</h2>
              <button onClick={() => setShowNew(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">Create a custom checklist for a position. Add items after creating — or install a ready-made template from the Library.</p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Morning Shift Checklist" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" autoFocus />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Description (optional)</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Tasks for front desk morning shift" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Department</label>
                <select value={newDept} onChange={e => setNewDept(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100">
                  {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Assigned Position</label>
                <select value={newPos} onChange={e => setNewPos(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100">
                  {POSITIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={createTemplate} disabled={submitting || !newName.trim()} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>{submitting ? 'Saving…' : 'Create'}</button>
                <button onClick={() => setShowNew(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
