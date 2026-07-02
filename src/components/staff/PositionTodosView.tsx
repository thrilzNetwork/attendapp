'use client';

import { useState, useEffect } from 'react';
import {
  getPositionTodoTemplates, createPositionTodoTemplate, updatePositionTodoTemplate, deletePositionTodoTemplate,
  getTemplateItems, createTemplateItem, deleteTemplateItem,
  getInstancesByDate, createInstance, completeInstance, deleteInstance,
  getInstanceResponses, upsertResponse,
  createRoomMove, createNoShow, createBankCount,
  getStaffPositions, createStaffPosition,
  type PositionTodoTemplate, type PositionTodoItem,
  type PositionTodoInstance, type PositionTodoResponse,
  type StaffPosition,
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
  { key: 'bank_count',  label: 'Cash Drawer Count',   icon: <DollarSign size={14} /> },
];

interface CommunityItem { label: string; item_type: string; config?: Record<string, unknown>; }

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

// POSITIONS are now dynamic — managed by admin via staff_positions table

type ViewMode = 'staff' | 'builder';
type BuilderTab = 'my-templates' | 'library';

interface Props {
  hotelId: string;
  isAdmin: boolean;
  canManage?: boolean;
  staffName?: string;
  staffId?: string;
  department?: string;
}

export default function PositionTodosView({ hotelId, isAdmin, canManage, staffName, staffId, department }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('staff');
  const [builderTab, setBuilderTab] = useState<BuilderTab>('my-templates');
  const [templates, setTemplates] = useState<PositionTodoTemplate[]>([]);
  const [itemsByTemplate, setItemsByTemplate] = useState<Record<string, PositionTodoItem[]>>({});
  const [instances, setInstances] = useState<PositionTodoInstance[]>([]);
  const [responsesByInstance, setResponsesByInstance] = useState<Record<string, PositionTodoResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [openDept, setOpenDept] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [installedId, setInstalledId] = useState<string | null>(null);
  const [renamingTemplate, setRenamingTemplate] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [previewInstance, setPreviewInstance] = useState<PositionTodoInstance | null>(null);
  const [shiftPicker, setShiftPicker] = useState<{ tplId: string; tplName: string } | null>(null);

  // Position management state
  const [positions, setPositions] = useState<StaffPosition[]>([]);
  const [showNewPos, setShowNewPos] = useState(false);
  const [newPosName, setNewPosName] = useState('');
  const [newPosDept, setNewPosDept] = useState('front_desk');
  const [newPosShift, setNewPosShift] = useState('');

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(localDateStr());
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplDept, setNewTplDept] = useState('front_desk');
  const [newTplPosition, setNewTplPosition] = useState('');

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
      const [tpls, pos] = await Promise.all([
        getPositionTodoTemplates(hotelId),
        getStaffPositions(hotelId),
      ]);
      setTemplates(tpls);
      setPositions(pos);

      const itemsMap: Record<string, PositionTodoItem[]> = {};
      for (const t of tpls) {
        itemsMap[t.id] = await getTemplateItems(t.id);
      }
      setItemsByTemplate(itemsMap);

      // Admin loads all staff instances; staff loads only their own
      const insts = await getInstancesByDate(hotelId, selectedDate, isAdmin ? undefined : staffId);
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

  useEffect(() => { loadAll(); }, [hotelId, staffId, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const templatesByDept: Record<string, PositionTodoTemplate[]> = {};
  templates.forEach(t => {
    if (!isAdmin && department) {
      if (t.department !== department) return;
    }
    const k = t.department || 'front_desk';
    (templatesByDept[k] = templatesByDept[k] || []).push(t);
  });

  const installCommunityTemplate = async (ct: CommunityTemplate) => {
    setSubmitting(true); setError(null);
    try {
      const tpl = await createPositionTodoTemplate({
        hotel_id: hotelId, name: ct.name, description: ct.description,
        department: ct.department, assigned_position: ct.assigned_position || '',
      });
      for (let i = 0; i < ct.items.length; i++) {
        const item = ct.items[i];
        await createTemplateItem({
          template_id: tpl.id, label: item.label,
          item_type: item.item_type, sort_order: i,
          config: item.config || {},
        });
      }
      setInstalledId(ct.id);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to install template');
    }
    setSubmitting(false);
  };

  const startRenameTpl = (tpl: PositionTodoTemplate) => {
    setRenamingTemplate(tpl.id);
    setRenameValue(tpl.name);
  };

  const handleCreatePosition = async () => {
    if (!newPosName.trim()) return;
    setSubmitting(true); setError(null);
    try {
      await createStaffPosition({
        hotel_id: hotelId,
        name: newPosName.trim(),
        department: newPosDept,
        shift: newPosShift,
      });
      setNewPosName(''); setNewPosShift('');
      setShowNewPos(false);
      await loadAll();
      // After creating the position, switch to staff view to see active templates
      setViewMode('staff');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create position');
    }
    setSubmitting(false);
  };

  const handleCreateTemplate = async () => {
    if (!newTplName.trim()) return;
    setSubmitting(true); setError(null);
    try {
      await createPositionTodoTemplate({
        hotel_id: hotelId,
        name: newTplName.trim(),
        department: newTplDept,
        assigned_position: newTplPosition || undefined,
      });
      setNewTplName(''); setNewTplPosition('');
      setShowNewTpl(false);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create template');
    }
    setSubmitting(false);
  };

  const confirmRenameTpl = async (tplId: string) => {
    if (!renameValue.trim()) return;
    setSubmitting(true);
    try {
      await updatePositionTodoTemplate(tplId, { name: renameValue.trim() });
      setRenamingTemplate(null);
      await loadAll();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to rename'); }
    setSubmitting(false);
  };

  const deleteTpl = async (tplId: string) => {
    if (!confirm('Delete this checklist? This cannot be undone.')) return;
    await deletePositionTodoTemplate(tplId);
    await loadAll();
  };

  const addItem = async (templateId: string) => {
    if (!newItemLabel.trim()) return;
    setSubmitting(true); setError(null);
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

  const isCashDrawerTemplate = (tplId: string) =>
    (itemsByTemplate[tplId] || []).some(i => i.item_type === 'bank_count');

  const startInstance = async (tplId: string, shift: string) => {
    setSubmitting(true);
    setError(null);
    try {
      // Block only if this shift already has an in-progress instance for this template
      const existing = instances.find(i =>
        i.template_id === tplId &&
        i.shift === shift &&
        (i.staff_id === staffId || i.staff_name === staffName) &&
        i.status !== 'completed'
      );
      if (existing) {
        setError(`You already have a ${shift} shift checklist in progress.`);
        setSubmitting(false);
        return;
      }
      const inst = await createInstance({
        hotel_id: hotelId, template_id: tplId,
        staff_id: staffId, staff_name: staffName || 'Staff', shift,
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

  const myInstances = instances.filter(i => i.staff_id === staffId || i.staff_name === staffName);
  const completedCount = myInstances.filter(i => i.status === 'completed').length;
  const totalCount = myInstances.length;
  // Admin-only: all staff instances count
  const allCompleted = instances.filter(i => i.status === 'completed').length;
  const allTotal = instances.length;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">To-Dos</h1>
          <p className="text-[13px] text-gray-500">
            {isAdmin
              ? allTotal > 0 ? `${allCompleted}/${allTotal} checklists completed today across all staff` : 'No checklists started yet today'
              : totalCount > 0 ? `${completedCount}/${totalCount} done today` : 'Start your shift tasks'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date navigation */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-2 py-1.5">
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(localDateStr(d));
              }}
              className="p-1 rounded-lg hover:bg-gray-200 text-gray-500"
            >‹</button>
            <span className="text-[11px] font-bold text-gray-600 min-w-[80px] text-center">
              {selectedDate === localDateStr() ? 'Today' : selectedDate}
            </span>
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(localDateStr(d));
              }}
              disabled={selectedDate >= localDateStr()}
              className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >›</button>
          </div>
          {canManage && (
            <>
              <button
                onClick={() => setViewMode(viewMode === 'builder' ? 'staff' : 'builder')}
                className={`text-[11px] font-bold px-3 py-2 rounded-xl border transition-colors ${viewMode === 'builder' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                {viewMode === 'builder' ? '👁️ Staff View' : '⚙️ Builder'}
              </button>
              {viewMode === 'builder' && builderTab === 'my-templates' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowNewTpl(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
                    <Plus size={14} /> New To-Do
                  </button>
                  <button onClick={() => setShowNewPos(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: '#6366F1' }}>
                    <Plus size={14} /> New Position
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4">{error}<button onClick={() => setError(null)} className="ml-2 font-bold">✕</button></div>}

      {/* Cash shift status banner — visible to everyone */}
      {(() => {
        const cashTpls = templates.filter(t => (itemsByTemplate[t.id] || []).some(i => i.item_type === 'bank_count'));
        if (cashTpls.length === 0) return null;
        const shifts = ['AM', 'PM', 'Night'];
        const missing = shifts.filter(shift => {
          const cashInsts = instances.filter(i => cashTpls.some(t => t.id === i.template_id) && i.shift === shift);
          return cashInsts.length === 0 || cashInsts.some(i => i.status !== 'completed');
        });
        if (missing.length === 0) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
            <span className="text-amber-500 text-[16px] mt-0.5">⚠️</span>
            <div>
              <p className="text-[12px] font-bold text-amber-800">Cash Count Incomplete</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {missing.map(s => `${s} shift`).join(', ')} — cash drawer not yet counted
              </p>
            </div>
          </div>
        );
      })()}

      {/* Builder tab bar */}
      {canManage && viewMode === 'builder' && (
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
          {canManage && viewMode === 'builder' && builderTab === 'library' && (
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
          {canManage && viewMode === 'builder' && builderTab === 'my-templates' && (
            <>
              {templates.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-[15px] font-semibold text-gray-700 mb-1">No templates yet</p>
                  <p className="text-[12px] text-gray-500 mb-4">Create your own or install one from the Template Library.</p>
                  <div className="flex items-center justify-center gap-2">
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

                  {/* New Position button */}
                  <button onClick={() => setShowNewPos(true)} className="w-full flex items-center gap-3 px-4 py-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-teal-300 hover:bg-teal-50/30 transition-colors text-left">
                    <Plus size={18} className="text-teal-500 shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-teal-700">New Position</p>
                      <p className="text-[11px] text-gray-500">Create a staff position like &ldquo;Front Desk AM&rdquo; to group checklists by role</p>
                    </div>
                  </button>

                  {(() => {
                    // Group templates by assigned_position first, then fall back to department
                    const groups: { key: string; label: string; icon: string; templates: PositionTodoTemplate[] }[] = [];

                    // For each position, create a group (show all positions, even with 0 templates)
                    for (const pos of positions) {
                      const posTpls = templates.filter(t => t.assigned_position === pos.name);
                      const dept = DEPARTMENTS.find(d => d.key === pos.department);
                      groups.push({
                        key: `pos:${pos.name}`,
                        label: pos.name,
                        icon: dept?.icon || '👤',
                        templates: posTpls,
                      });
                    }

                    // For templates without an assigned_position, group by department
                    const unassigned = templates.filter(t => !t.assigned_position);
                    for (const dept of DEPARTMENTS) {
                      const deptTpls = unassigned.filter(t => t.department === dept.key);
                      if (deptTpls.length === 0) continue;
                      groups.push({
                        key: `dept:${dept.key}`,
                        label: dept.label,
                        icon: dept.icon,
                        templates: deptTpls,
                      });
                    }

                    return <>{groups.map(group => {
                    const deptTpls = group.templates;
                    const groupKey = group.key;
                    const open = openDept === groupKey || (!!editingTemplate && deptTpls.some(t => t.id === editingTemplate));
                    return (
                      <div key={group.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <button onClick={() => setOpenDept(open ? null : group.key)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-[20px]">{group.icon}</span>
                            <div className="text-left">
                              <p className="text-[14px] font-bold text-gray-900">{group.label}</p>
                              <p className="text-[11px] text-gray-500">{deptTpls.length} checklist{deptTpls.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>

                        {open && (
                          <div className="border-t border-gray-100 divide-y divide-gray-100">
                            {deptTpls.map(tpl => {
                              const items = itemsByTemplate[tpl.id] || [];
                              return (
                                <div key={tpl.id} className="px-4 py-3">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                      {renamingTemplate === tpl.id ? (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            autoFocus
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') confirmRenameTpl(tpl.id); if (e.key === 'Escape') setRenamingTemplate(null); }}
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-semibold"
                                          />
                                          <button onClick={() => confirmRenameTpl(tpl.id)} disabled={submitting} className="p-1.5 rounded-lg text-white text-[11px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}><Save size={13} /></button>
                                          <button onClick={() => setRenamingTemplate(null)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><XIcon size={13} /></button>
                                        </div>
                                      ) : (
                                        <p className="text-[13px] font-semibold text-gray-900">{tpl.name}</p>
                                      )}
                                      <p className="text-[11px] text-gray-500 mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button onClick={() => startRenameTpl(tpl)} title="Rename" className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100"><Edit3 size={13} /></button>
                                      <button onClick={() => deleteTpl(tpl.id)} title="Delete" className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"><Trash2 size={13} /></button>
                                      <button
                                        onClick={() => setEditingTemplate(editingTemplate === tpl.id ? null : tpl.id)}
                                        className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100"
                                        title="Edit items"
                                      >
                                        <ChevronDown size={13} className={editingTemplate === tpl.id ? 'rotate-180' : ''} />
                                      </button>
                                    </div>
                                  </div>

                                  {editingTemplate === tpl.id && (
                                    <div className="mt-2 space-y-1.5">
                                      {items.sort((a, b) => a.sort_order - b.sort_order).map(item => (
                                        <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                                          <GripVertical size={14} className="text-gray-300 shrink-0" />
                                          <span className="flex-1 text-[12px] text-gray-700">{item.label}</span>
                                          <span className="text-[10px] text-gray-400 bg-white border border-gray-100 rounded-lg px-1.5 py-0.5">{ITEM_TYPES.find(t => t.key === item.item_type)?.label || item.item_type}</span>
                                          <button onClick={() => removeItem(item.id, tpl.id)} className="p-1 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={12} /></button>
                                        </div>
                                      ))}
                                      <div className="pt-2 border-t border-gray-100 space-y-1.5">
                                        <input
                                          value={newItemLabel}
                                          onChange={e => setNewItemLabel(e.target.value)}
                                          placeholder="New item label..."
                                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px]"
                                        />
                                        <div className="flex gap-1.5">
                                          <select
                                            value={newItemType}
                                            onChange={e => setNewItemType(e.target.value)}
                                            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px]"
                                          >
                                            {ITEM_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                                          </select>
                                          <button
                                            onClick={() => addItem(tpl.id)}
                                            disabled={submitting || !newItemLabel.trim()}
                                            className="px-3 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-50"
                                            style={{ backgroundColor: TEAL }}
                                          >
                                            <Plus size={14} />
                                          </button>
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
                    })}</>
                  })()}
                </div>
              )}

              {/* New template form */}
            </>
          )}

          {/* New position modal */}
          {showNewPos && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold text-gray-900">New Position</p>
                  <button onClick={() => setShowNewPos(false)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><XIcon size={14} /></button>
                </div>
                <input value={newPosName} onChange={e => setNewPosName(e.target.value)} placeholder="Position name (e.g. Front Desk AM)" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px]" />
                <select value={newPosDept} onChange={e => setNewPosDept(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px]">
                  {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
                </select>
                <select value={newPosShift} onChange={e => setNewPosShift(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px]">
                  <option value="">No specific shift</option>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                  <option value="Night">Night</option>
                </select>
                <button onClick={handleCreatePosition} disabled={submitting || !newPosName.trim()} className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                  Create Position
                </button>
              </div>
            </div>
          )}

          {/* New To-Do modal */}
          {showNewTpl && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold text-gray-900">New To-Do Checklist</p>
                  <button onClick={() => setShowNewTpl(false)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><XIcon size={14} /></button>
                </div>
                <input value={newTplName} onChange={e => setNewTplName(e.target.value)} placeholder="Checklist name (e.g. Morning Opening)" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px]" />
                <select value={newTplDept} onChange={e => setNewTplDept(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px]">
                  {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
                </select>
                <select value={newTplPosition} onChange={e => setNewTplPosition(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px]">
                  <option value="">No specific position</option>
                  {positions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <button onClick={handleCreateTemplate} disabled={submitting || !newTplName.trim()} className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                  Create Checklist
                </button>
              </div>
            </div>
          )}

          {/* ── STAFF VIEW ── */}
          {(!canManage || viewMode === 'staff') && (
            <>
              {/* Admin preview instance modal */}
              {isAdmin && previewInstance && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">{previewInstance.staff_name}</p>
                        <p className="text-[12px] text-gray-500">{previewInstance.shift} shift · {previewInstance.status}</p>
                      </div>
                      <button onClick={() => setPreviewInstance(null)} className="p-1.5 rounded-lg bg-gray-100"><XIcon size={14} /></button>
                    </div>
                    {(responsesByInstance[previewInstance.id] || []).map(r => {
                      const allItems = Object.values(itemsByTemplate).flat();
                      const item = allItems.find(i => i.id === r.item_id);
                      return (
                        <div key={r.id} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                          <span className={`w-4 h-4 rounded-full mt-0.5 shrink-0 ${r.checked ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                          <div>
                            <p className="text-[13px] text-gray-700">{item?.label || 'Item'}</p>
                            {r.text_value && <p className="text-[11px] text-gray-500 mt-0.5">{r.text_value}</p>}
                            {r.number_value !== undefined && r.number_value !== null && <p className="text-[11px] text-gray-500 mt-0.5">{r.number_value}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Admin: all instances today */}
              {isAdmin && instances.length > 0 && (
                <div className="mb-6">
                  <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-3">All Staff Today</p>
                  <div className="space-y-2">
                    {instances.map(inst => {
                      const tpl = templates.find(t => t.id === inst.template_id);
                      const items = itemsByTemplate[inst.template_id] || [];
                      const resps = responsesByInstance[inst.id] || [];
                      const done = resps.filter(r => r.checked).length;
                      const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                      return (
                        <div
                          key={inst.id}
                          className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 cursor-pointer hover:border-gray-200"
                          onClick={() => setPreviewInstance(inst)}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-900 truncate">{inst.staff_name}</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">{inst.shift}</span>
                              {tpl && <p className="text-[11px] text-gray-400 truncate">{tpl.name}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inst.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {inst.status === 'completed' ? '✅ Done' : `${pct}%`}
                              </span>
                              <button
                                onClick={async (e) => { e.stopPropagation(); if (!confirm(`Delete ${inst.staff_name}'s checklist instance?`)) return; await deleteInstance(inst.id); await loadAll(); }}
                                disabled={submitting}
                                title="Delete"
                                className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          {items.length > 0 && (
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: inst.status === 'completed' ? '#10b981' : TEAL }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  {(() => {
                    // Group templates by assigned_position first, then fall back to department
                    const groups: { key: string; label: string; icon: string; templates: PositionTodoTemplate[] }[] = [];

                    // For each position, create a group (show all positions, even with 0 templates)
                    for (const pos of positions) {
                      const posTpls = templates.filter(t => t.assigned_position === pos.name);
                      if (!isAdmin && department) {
                        if (!posTpls.some(t => t.department === department)) continue;
                      }
                      const dept = DEPARTMENTS.find(d => d.key === pos.department);
                      groups.push({
                        key: `pos:${pos.name}`,
                        label: pos.name,
                        icon: dept?.icon || '👤',
                        templates: posTpls,
                      });
                    }

                    // For templates without an assigned_position, group by department
                    const unassigned = templates.filter(t => !t.assigned_position);
                    for (const dept of DEPARTMENTS) {
                      const deptTpls = unassigned.filter(t => t.department === dept.key);
                      if (!isAdmin && department && dept.key !== department) continue;
                      if (deptTpls.length === 0) continue;
                      groups.push({
                        key: `dept:${dept.key}`,
                        label: dept.label,
                        icon: dept.icon,
                        templates: deptTpls,
                      });
                    }

                    return <>{groups.map(group => {
                    const deptTpls = group.templates;
                    const groupKey = group.key;
                    const open = openDept === groupKey;
                    return (
                      <div key={group.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center px-4 py-3 hover:bg-gray-50">
                          <button onClick={() => setOpenDept(open ? null : group.key)} className="flex-1 flex items-center gap-2 text-left">
                            <span className="text-[20px]">{group.icon}</span>
                            <div>
                              <p className="text-[14px] font-bold text-gray-900">{group.label}</p>
                              <p className="text-[11px] text-gray-500">{deptTpls.length} checklist{deptTpls.length !== 1 ? 's' : ''}</p>
                            </div>
                          </button>
                          <ChevronDown size={18} className={`text-gray-400 transition-transform ml-2 ${open ? 'rotate-180' : ''}`} onClick={() => setOpenDept(open ? null : group.key)} />
                        </div>

                        {open && (
                          <div className="border-t border-gray-100 divide-y divide-gray-100">
                            {deptTpls.map(tpl => {
                              const items = itemsByTemplate[tpl.id] || [];
                              const myInst = instances.find(i => i.template_id === tpl.id && (i.staff_id === staffId || i.staff_name === staffName) && i.status !== 'completed');
                              const completedInst = instances.find(i => i.template_id === tpl.id && i.status === 'completed' && (i.staff_id === staffId || i.staff_name === staffName));
                              // All instances for this template (admin view)
                              const allInsts = isAdmin ? instances.filter(i => i.template_id === tpl.id) : [];
                              // For cash drawer: show all my instances (one per shift); otherwise just the active one
                              const myInsts = isCashDrawerTemplate(tpl.id)
                                ? instances.filter(i => i.template_id === tpl.id && (i.staff_id === staffId || i.staff_name === staffName))
                                : myInst ? [myInst] : [];

                              return (
                                <div key={tpl.id} className="px-4 py-3">
                                  <div className="flex items-center justify-between mb-2 gap-2">
                                    <div className="flex-1 min-w-0">
                                      {renamingTemplate === tpl.id ? (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            autoFocus
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') confirmRenameTpl(tpl.id); if (e.key === 'Escape') setRenamingTemplate(null); }}
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-semibold"
                                          />
                                          <button onClick={() => confirmRenameTpl(tpl.id)} disabled={submitting} className="p-1.5 rounded-lg text-white text-[11px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}><Save size={13} /></button>
                                          <button onClick={() => setRenamingTemplate(null)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><XIcon size={13} /></button>
                                        </div>
                                      ) : (
                                        <>
                                          <p className="text-[14px] font-semibold text-gray-900">{tpl.name}</p>
                                          <p className="text-[11px] text-gray-500">
                                            {tpl.description && `${tpl.description} · `}
                                            {items.length} item{items.length !== 1 ? 's' : ''}
                                            {tpl.assigned_position && ` · ${tpl.assigned_position}`}
                                            {isAdmin && allInsts.length > 0 && ` · ${allInsts.filter(i => i.status === 'completed').length}/${allInsts.length} staff done`}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isAdmin && renamingTemplate !== tpl.id && (
                                        <>
                                          <button
                                            onClick={() => startRenameTpl(tpl)}
                                            title="Rename"
                                            className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
                                          ><Edit3 size={13} /></button>
                                          <button
                                            onClick={() => deleteTpl(tpl.id)}
                                            title="Delete checklist"
                                            className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                                          ><Trash2 size={13} /></button>
                                        </>
                                      )}
                                      {renamingTemplate !== tpl.id && (completedInst && !isCashDrawerTemplate(tpl.id) ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✅ Done</span>
                                      ) : myInst && !isCashDrawerTemplate(tpl.id) ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⏳ In Progress</span>
                                      ) : staffName ? (
                                        isCashDrawerTemplate(tpl.id) ? (
                                          shiftPicker?.tplId === tpl.id ? (
                                            <div className="flex items-center gap-1">
                                              {['AM', 'PM', 'Night'].map(s => (
                                                <button key={s} onClick={() => { setShiftPicker(null); startInstance(tpl.id, s); }} disabled={submitting} className="text-[10px] font-bold px-2 py-1 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>{s}</button>
                                              ))}
                                              <button onClick={() => setShiftPicker(null)} className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 text-gray-500">✕</button>
                                            </div>
                                          ) : (
                                            <button onClick={() => setShiftPicker({ tplId: tpl.id, tplName: tpl.name })} disabled={submitting} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                                              + New Count
                                            </button>
                                          )
                                        ) : (
                                          <button onClick={() => startInstance(tpl.id, 'AM')} disabled={submitting} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                                            Start
                                          </button>
                                        )
                                      ) : null)}
                                    </div>
                                  </div>

                                  {myInsts.length > 0 && items.length > 0 && myInsts.map(inst => {
                                    const resps = responsesByInstance[inst.id] || [];
                                    const done = resps.filter(r => r.checked).length;
                                    const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                                    return (
                                      <div key={inst.id} className="space-y-2 mt-3 border-t border-gray-100 pt-3">
                                        {myInsts.length > 1 && (
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{inst.shift} Shift</span>
                                            {inst.status === 'completed' && <span className="text-[10px] font-bold text-emerald-600">✅ Completed</span>}
                                          </div>
                                        )}
                                        {items.length > 0 && (
                                          <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden mb-2">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: inst.status === 'completed' ? '#10b981' : TEAL }} />
                                          </div>
                                        )}
                                        {items.sort((a, b) => a.sort_order - b.sort_order).map(item => {
                                          const resp = getResp(inst.id, item.id);
                                          return (
                                            <div key={item.id} className="flex items-start gap-2.5 py-1">
                                              {item.item_type === 'checkbox' && (
                                                <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                                                  <input type="checkbox" checked={resp?.checked || false} onChange={() => handleCheck(inst.id, item.id, !resp?.checked)} className="w-4 h-4 rounded border-gray-300 cursor-pointer" style={{ accentColor: TEAL }} />
                                                  <span className={`text-[13px] ${resp?.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span>
                                                </label>
                                              )}
                                              {item.item_type === 'number' && (
                                                <div className="flex-1">
                                                  <p className="text-[13px] text-gray-700 mb-1">{item.label}{item.config?.unit ? ` (${item.config.unit})` : ''}</p>
                                                  <input type="number" value={resp?.number_value ?? ''} onChange={e => handleNumber(inst.id, item.id, parseFloat(e.target.value) || 0)} placeholder={item.config?.placeholder || 'Enter value...'} min={item.config?.min} max={item.config?.max} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
                                                </div>
                                              )}
                                              {item.item_type === 'text' && (
                                                <div className="flex-1">
                                                  <p className="text-[13px] text-gray-700 mb-1">{item.label}</p>
                                                  <input type="text" value={resp?.text_value || ''} onChange={e => handleText(inst.id, item.id, e.target.value)} placeholder={item.config?.placeholder || 'Type answer...'} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
                                                </div>
                                              )}
                                              {item.item_type === 'time' && (
                                                <div className="flex-1">
                                                  <p className="text-[13px] text-gray-700 mb-1">{item.label}</p>
                                                  <input type="time" value={resp?.text_value || ''} onChange={e => handleText(inst.id, item.id, e.target.value)} className="w-40 bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
                                                </div>
                                              )}
                                              {item.item_type === 'kpi_field' && (
                                                <div className="flex-1">
                                                  <p className="text-[13px] text-gray-700 mb-1">📊 {item.label}{item.config?.unit ? ` (${item.config.unit})` : ''}</p>
                                                  <input type="number" value={resp?.number_value ?? ''} onChange={e => handleNumber(inst.id, item.id, parseFloat(e.target.value) || 0)} placeholder={item.config?.placeholder || 'Enter KPI value...'} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] border border-gray-100" />
                                                </div>
                                              )}
                                              {item.item_type === 'action_link' && (
                                                <div className="flex-1">
                                                  <p className="text-[13px] text-gray-700 mb-1">{item.label}</p>
                                                  <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={resp?.checked || false} onChange={() => handleCheck(inst.id, item.id, !resp?.checked)} className="w-4 h-4 rounded border-gray-300 cursor-pointer" style={{ accentColor: TEAL }} />
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
                                                  {resp?.checked ? (
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                                                      <p className="text-[12px] font-bold text-emerald-700">✓ Room Move Logged</p>
                                                      {resp.text_value && <p className="text-[11px] text-emerald-600 mt-0.5">{resp.text_value}</p>}
                                                    </div>
                                                  ) : (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                                                      <p className="text-[12px] font-bold text-gray-700">🔄 {item.label}</p>
                                                      <input value={opsForm[item.id]?.guest_name || ''} onChange={e => setOpsField(item.id, 'guest_name', e.target.value)} placeholder="Guest Name" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                      <div className="flex gap-2">
                                                        <input value={opsForm[item.id]?.from_room || ''} onChange={e => setOpsField(item.id, 'from_room', e.target.value)} placeholder="From Room" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                        <input value={opsForm[item.id]?.to_room || ''} onChange={e => setOpsField(item.id, 'to_room', e.target.value)} placeholder="To Room" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                      </div>
                                                      <input value={opsForm[item.id]?.reason || ''} onChange={e => setOpsField(item.id, 'reason', e.target.value)} placeholder="Reason (optional)" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                      <button onClick={() => handleRoomMove(inst.id, item.id)} disabled={submitting} className="w-full py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>Log Room Move</button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              {item.item_type === 'no_show' && (
                                                <div className="flex-1">
                                                  {resp?.checked ? (
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                                                      <p className="text-[12px] font-bold text-emerald-700">✓ No-Show Logged</p>
                                                      {resp.text_value && <p className="text-[11px] text-emerald-600 mt-0.5">{resp.text_value}</p>}
                                                    </div>
                                                  ) : (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                                                      <p className="text-[12px] font-bold text-gray-700">🚫 {item.label}</p>
                                                      <input value={opsForm[item.id]?.guest_name || ''} onChange={e => setOpsField(item.id, 'guest_name', e.target.value)} placeholder="Guest Name" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                      <input value={opsForm[item.id]?.room || ''} onChange={e => setOpsField(item.id, 'room', e.target.value)} placeholder="Room Number" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                      <input value={opsForm[item.id]?.reservation_ref || ''} onChange={e => setOpsField(item.id, 'reservation_ref', e.target.value)} placeholder="Reservation # (optional)" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                      <input value={opsForm[item.id]?.reason || ''} onChange={e => setOpsField(item.id, 'reason', e.target.value)} placeholder="Reason (optional)" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                      <button onClick={() => handleNoShow(inst.id, item.id)} disabled={submitting} className="w-full py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>Log No-Show</button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              {item.item_type === 'bank_count' && (
                                                <div className="flex-1">
                                                  {resp?.checked ? (
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                                                      <p className="text-[12px] font-bold text-emerald-700">✓ Cash Counted</p>
                                                      {resp.text_value && <p className="text-[11px] text-emerald-600 mt-0.5">{resp.text_value}</p>}
                                                    </div>
                                                  ) : (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                                                      <div className="flex items-center justify-between">
                                                        <p className="text-[12px] font-bold text-gray-700">💵 {item.label}</p>
                                                        <select value={opsForm[item.id]?.shift || inst.shift || 'AM'} onChange={e => setOpsField(item.id, 'shift', e.target.value)} className="text-[11px] bg-white border border-gray-200 rounded-lg px-2 py-1">
                                                          <option value="AM">AM</option>
                                                          <option value="PM">PM</option>
                                                          <option value="Night">Night</option>
                                                        </select>
                                                      </div>
                                                      <div className="grid grid-cols-2 gap-1.5">
                                                        {DENOMS.map(d => (
                                                          <div key={d.key} className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-2 py-1.5">
                                                            <span className="text-[10px] text-gray-500 flex-1">{d.label}</span>
                                                            <input
                                                              type="number" min="0" step="any"
                                                              value={opsForm[item.id]?.[d.key] || ''}
                                                              onChange={e => setOpsField(item.id, d.key, e.target.value)}
                                                              placeholder="0"
                                                              className="w-16 text-right bg-transparent text-[12px] font-mono outline-none"
                                                            />
                                                          </div>
                                                        ))}
                                                      </div>
                                                      <div className="flex gap-2">
                                                        <div className="flex-1 bg-white border border-gray-100 rounded-lg px-2 py-1.5">
                                                          <p className="text-[9px] text-gray-400 uppercase">Paid Out</p>
                                                          <input type="number" min="0" step="any" value={opsForm[item.id]?.paid_out || ''} onChange={e => setOpsField(item.id, 'paid_out', e.target.value)} placeholder="0" className="w-full text-[12px] font-mono bg-transparent outline-none" />
                                                        </div>
                                                        <div className="flex-1 bg-white border border-gray-100 rounded-lg px-2 py-1.5">
                                                          <p className="text-[9px] text-gray-400 uppercase">Petty Cash</p>
                                                          <input type="number" min="0" step="any" value={opsForm[item.id]?.petty_cash || ''} onChange={e => setOpsField(item.id, 'petty_cash', e.target.value)} placeholder="0" className="w-full text-[12px] font-mono bg-transparent outline-none" />
                                                        </div>
                                                      </div>
                                                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between">
                                                        <span className="text-[12px] font-bold text-gray-700">Total</span>
                                                        <span className="text-[16px] font-black text-gray-900">${calcDrawerTotal(opsForm[item.id] || {}).toFixed(2)}</span>
                                                      </div>
                                                      <input value={opsForm[item.id]?.discrepancies || ''} onChange={e => setOpsField(item.id, 'discrepancies', e.target.value)} placeholder="Discrepancies (optional)" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                      <input value={opsForm[item.id]?.notes || ''} onChange={e => setOpsField(item.id, 'notes', e.target.value)} placeholder="Notes (optional)" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]" />
                                                      <button onClick={() => handleBankCount(inst.id, item.id)} disabled={submitting} className="w-full py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>Submit Cash Count</button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {inst.status !== 'completed' && (
                                          <button
                                            onClick={() => handleComplete(inst.id)}
                                            disabled={submitting}
                                            className="w-full mt-2 py-2.5 rounded-xl text-white text-[13px] font-bold disabled:opacity-50"
                                            style={{ backgroundColor: TEAL }}
                                          >
                                            Mark All Complete
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                    })}</>
                })() }
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
