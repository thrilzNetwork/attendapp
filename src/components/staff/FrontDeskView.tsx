'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import {
  Plus, ClipboardList, CalendarDays, BookOpen, MessageSquare, Bus,
  RefreshCw, Trash2, SendHorizontal,
} from 'lucide-react';
import {
  getDailyRecap,
  getChecklists, createChecklist, deleteChecklist,
  getChecklistInstances, createChecklistInstance, updateChecklistInstance,
  getStaffSchedules, createStaffSchedule, deleteStaffSchedule,
  getAllKnowledgeBase,
  getAllShuttleSlotsForHotel, getShuttleRoutes, createShuttleSlot,
  getAllOpsTools, getHotelOpsTools,
  type HotelConfig,
  type Checklist, type ChecklistInstance,
  type StaffSchedule, type KnowledgeEntry,
  type ShuttleSlot, type ShuttleRoute,
} from '@/lib/supabase';
import type { OpsTool } from '@/lib/supabase';
import CallAroundView from '@/components/ops-tools/CallAroundView';
import DailyLogsView from '@/components/ops-tools/DailyLogsView';
import NoShowsView from '@/components/ops-tools/NoShowsView';
import RoomMovesView from '@/components/ops-tools/RoomMovesView';
import BankCountView from '@/components/ops-tools/BankCountView';

/* ── Constants ─────────────────────────── */
const TEAL = '#0D9488';

/* ── Front Desk View ───────────────────── */
export default function FrontDeskView({ hotelId, isAdmin, staff, hotelName, config }: {
  hotelId: string; isAdmin: boolean;
  staff: { id?: string; name: string; email?: string; role: string; department?: string }[];
  hotelName: string;
  config: HotelConfig;
}) {
  const [enabledTools, setEnabledTools] = useState<{ tool: OpsTool; enabled: boolean }[]>([]);
  const [tab, setTab] = useState<string>('recap');
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const [recap, setRecap] = useState<{ requestsToday: number; completedToday: number; pendingNow: number; messagesToday: number; shuttleBookingsToday: number; avgResponseMin: number; staffOnDuty: number; checklistsCompleted: number; checklistsTotal: number } | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [newCL, setNewCL] = useState({ name: '', items: '' });
  const [addInstanceFor, setAddInstanceFor] = useState<string | null>(null);
  const [instanceStaff, setInstanceStaff] = useState('');
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [newSched, setNewSched] = useState({ staff_name: '', staff_id: '', shift_date: today, start_time: '09:00', end_time: '17:00', role: 'staff', notes: '' });
  const [scheduleDate, setScheduleDate] = useState(today);
  // Chatbot state
  const [kbEntries, setKbEntries] = useState<KnowledgeEntry[]>([]);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResults, setChatResults] = useState<KnowledgeEntry[]>([]);
  // Shuttle overview state
  const [todayShuttleSlots, setTodayShuttleSlots] = useState<ShuttleSlot[]>([]);
  const [todayShuttleRoutes, setTodayShuttleRoutes] = useState<ShuttleRoute[]>([]);
  // Recurring schedule form
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ route_id: '', start_time: '06:00', end_time: '22:00', interval_min: 60, days: [0,1,2,3,4,5,6], capacity: 8 });

  // Load enabled ops tools from DB
  useEffect(() => {
    if (!hotelId) return;
    (async () => {
      try {
        const [tools, toggles] = await Promise.all([getAllOpsTools(), getHotelOpsTools(hotelId)]);
        const toggleMap = new Map(toggles.map(t => [t.tool_key, t.enabled]));
        const enabled = tools.filter(t => toggleMap.get(t.key) !== false).map(t => ({ tool: t, enabled: toggleMap.get(t.key) ?? true }));
        setEnabledTools(enabled);
      } catch {
        // If tables don't exist yet, fall back to default set
        setEnabledTools([
          { tool: { key: 'recap', name: 'Daily Recap', icon: 'BarChart3', category: 'front_desk', description: '', is_built_in: true, id: '' }, enabled: true },
          { tool: { key: 'checklists', name: 'Checklists', icon: 'ClipboardList', category: 'front_desk', description: '', is_built_in: true, id: '' }, enabled: true },
          { tool: { key: 'schedule', name: 'Staff Schedule', icon: 'CalendarDays', category: 'front_desk', description: '', is_built_in: true, id: '' }, enabled: true },
          { tool: { key: 'assistant', name: 'Staff Assistant', icon: 'Bot', category: 'front_desk', description: '', is_built_in: true, id: '' }, enabled: true },
        ]);
      }
    })();
  }, [hotelId]);

  useEffect(() => { loadData(); }, [hotelId, tab, scheduleDate]);
  const loadData = async () => {
    if (!hotelId) return;
    const [r, c, ci, s, kb, slots, routes] = await Promise.all([
      getDailyRecap(hotelId), getChecklists(hotelId),
      getChecklistInstances(hotelId, today), getStaffSchedules(hotelId, scheduleDate),
      getAllKnowledgeBase(hotelId), getAllShuttleSlotsForHotel(hotelId),
      getShuttleRoutes(hotelId),
    ]);
    setRecap(r); setChecklists(c); setInstances(ci); setSchedules(s);
    setKbEntries(kb); setTodayShuttleSlots(slots); setTodayShuttleRoutes(routes);
  };

  const handleCreateChecklist = async () => {
    if (!newCL.name.trim()) return;
    const items = newCL.items.split('\n').filter(Boolean).map((label, i) => ({ id: `item-${i}`, label: label.trim() }));
    await createChecklist(hotelId, newCL.name.trim(), items);
    setNewCL({ name: '', items: '' }); setShowNewChecklist(false);
    setChecklists(await getChecklists(hotelId));
  };

  const handleStartChecklist = async (checklistId: string) => {
    await createChecklistInstance({ checklist_id: checklistId, hotel_id: hotelId, staff_name: instanceStaff || undefined });
    setAddInstanceFor(null); setInstanceStaff('');
    setInstances(await getChecklistInstances(hotelId, today));
  };

  const handleToggleCheckItem = async (instanceId: string, itemId: string, isChecked: boolean) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;
    const checked = isChecked
      ? inst.checked_items.filter(x => x.item_id !== itemId)
      : [...inst.checked_items, { item_id: itemId, checked_at: new Date().toISOString() }];
    const cl = checklists.find(c => c.id === inst.checklist_id);
    const completed = checked.length === (cl?.items.length || 0);
    await updateChecklistInstance(instanceId, { checked_items: checked, completed });
    setInstances(await getChecklistInstances(hotelId, today));
  };

  const sendScheduleEmail = async (sched: StaffSchedule) => {
    const m = staff.find(s => s.name === sched.staff_name);
    if (!m?.email) return;
    await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' }, body: JSON.stringify({ type: 'schedule_posted', data: { staffEmail: m.email, staffName: sched.staff_name, hotelName, shiftDate: sched.shift_date, startTime: sched.start_time, endTime: sched.end_time, role: sched.role } }) }).catch(() => {});
  };

  const handleCreateSchedule = async () => {
    if (!newSched.staff_name.trim()) return;
    const data = await createStaffSchedule({ hotel_id: hotelId, staff_name: newSched.staff_name.trim(), staff_id: newSched.staff_id || undefined, shift_date: newSched.shift_date, start_time: newSched.start_time, end_time: newSched.end_time, role: newSched.role, notes: newSched.notes || undefined });
    if (data) sendScheduleEmail(data);
    setShowNewSchedule(false);
    setNewSched({ staff_name: '', staff_id: '', shift_date: today, start_time: '09:00', end_time: '17:00', role: 'staff', notes: '' });
    setSchedules(await getStaffSchedules(hotelId, scheduleDate));
  };

  const handleDeleteSchedule = async (id: string) => { await deleteStaffSchedule(id); setSchedules(await getStaffSchedules(hotelId, scheduleDate)); };

  const DAYS_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const handleGenerateRecurring = async () => {
    const r = recurringForm;
    if (!r.route_id || !r.start_time || !r.end_time) return;
    const [startH, startM] = r.start_time.split(':').map(Number);
    const [endH, endM] = r.end_time.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    for (let m = startMin; m < endMin; m += r.interval_min) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      await createShuttleSlot({
        route_id: r.route_id,
        hotel_id: hotelId,
        departure_time: `${hh}:${mm}:00`,
        days_of_week: r.days,
        capacity: r.capacity,
        date: undefined,
        event_label: '',
        override_price: undefined,
      });
    }
    setShowRecurringForm(false);
    const updatedSlots = await getAllShuttleSlotsForHotel(hotelId);
    setTodayShuttleSlots(updatedSlots);
  };

  const renderShuttleOverview = () => {
    if (!config.hasFreeShuttle) {
      return (
        <div className="bg-gray-50 rounded-2xl p-5 text-center border border-gray-100">
          <Bus size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500">This property does not offer a free shuttle.</p>
        </div>
      );
    }
    const tD = new Date();
    const todayStr = `${tD.getFullYear()}-${String(tD.getMonth() + 1).padStart(2, '0')}-${String(tD.getDate()).padStart(2, '0')}`;
    const todayDay = new Date().getDay(); // 0=Sun ... 6=Sat (matches stored days_of_week)
    const todaySlots = todayShuttleSlots.filter(s =>
      (s.date === todayStr) || (s.days_of_week?.includes(todayDay) && !s.date)
    );
    const byRoute: Record<string, ShuttleSlot[]> = {};
    todaySlots.forEach(s => {
      const k = s.route_name || 'Shuttle';
      if (!byRoute[k]) byRoute[k] = [];
      byRoute[k].push(s);
    });
    const entries = Object.entries(byRoute);
    if (entries.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm">
          <Bus size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500">No shuttle runs scheduled today.</p>
        </div>
      );
    }
    return (
      <>
        {entries.map(([name, routeSlots]) => (
          <div key={name} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-3">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[13px] font-bold text-gray-700">{name}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {routeSlots.sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || '')).map(slot => (
                <div key={slot.id} className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-gray-900">{slot.departure_time?.slice(0, 5)}</span>
                  <span className="text-[12px] font-semibold text-teal-600">{slot.bookings_count || 0} booked{slot.capacity > 0 ? ` / ${slot.capacity}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6"><h1 className="text-[26px] font-extrabold text-gray-900">Front Desk</h1></div>
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {(() => {
          const tabConfig: Record<string, {label: string}> = {
            'recap': {label:"📊 Daily Recap"},
            'checklists': {label:"📝 Checklists"},
            'schedule': {label:"📅 Staff Schedule"},
            'assistant': {label:"🤖 Staff Assistant"},
            'call-around': {label:"📞 Call Around"},
            'daily-logs': {label:"📋 Daily Logs"},
            'no-shows': {label:"🚫 No Shows"},
            'room-moves': {label:"🔄 Room Moves"},
            'bank-count': {label:"💰 Bank Count"},
          };
          const visible = enabledTools.filter(t => t.enabled).map(t => t.tool.key);
          return visible.map(key => {
            const cfg = tabConfig[key];
            if (!cfg) return null;
            return (
              <button key={key} onClick={() => setTab(key)}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === key ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                style={tab === key ? { backgroundColor: TEAL } : {}}>{cfg.label}</button>
            );
          });
        })()}
      </div>

      {tab === 'recap' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[{label:'Requests Today',count:recap?.requestsToday||0,color:'text-blue-600'},{label:'Completed',count:recap?.completedToday||0,color:'text-emerald-600'},{label:'Pending Now',count:recap?.pendingNow||0,color:'text-amber-600'},{label:'Staff on Duty',count:recap?.staffOnDuty||0,color:'text-teal-600'}].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"><p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p><p className={`text-[28px] font-extrabold ${s.color}`}>{s.count}</p></div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
            {[{label:'Guest Messages',count:recap?.messagesToday||0,icon:'💬',color:'text-violet-600'},{label:'Shuttle Bookings',count:recap?.shuttleBookingsToday||0,icon:'🚗',color:'text-teal-600'},{label:'Staff on Duty',count:recap?.staffOnDuty||0,icon:'👤',color:'text-gray-700'}].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"><p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p><p className={`text-[24px] font-extrabold ${s.color}`}>{s.icon} {s.count}</p></div>
            ))}
          </div>
          {recap && recap.checklistsTotal > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-[11px] text-gray-400 uppercase font-bold">Checklists Today</p>
              <p className="text-[24px] font-extrabold text-gray-800">{recap.checklistsCompleted} / {recap.checklistsTotal} completed</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2"><div className="h-2 rounded-full" style={{width:`${(recap.checklistsCompleted/recap.checklistsTotal)*100}%`,backgroundColor:TEAL}} /></div>
            </div>
          )}
          {!recap && (<div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">{'Loading today\u2019s data...'}</p></div>)}

          {/* Today's Shuttle Overview — only if hotel has free shuttle enabled */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-extrabold text-gray-800">Today&apos;s Shuttle Schedule</h2>
              {config.hasFreeShuttle && config.shuttleStartTime && config.shuttleEndTime && (
                <span className="text-[11px] font-semibold text-gray-500">
                  Runs {config.shuttleStartTime.slice(0,5)}–{config.shuttleEndTime.slice(0,5)}
                </span>
              )}
            </div>
            {renderShuttleOverview()}
          </div>
        </div>
      )}

      {tab === 'checklists' && (
        <div>
          {isAdmin && (
            <div className="mb-6">
              {!showNewChecklist ? (
                <button onClick={() => setShowNewChecklist(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:opacity-90" style={{backgroundColor:TEAL}}><Plus size={14} /> Create Checklist Template</button>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-[15px] font-bold text-gray-900 mb-3">New Checklist Template</h3>
                  <div className="space-y-3">
                    <input value={newCL.name} onChange={e => setNewCL({...newCL,name:e.target.value})} placeholder="Checklist name (e.g. 'AM Walkthrough')" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
                    <div><p className="text-[11px] text-gray-400 mb-1 font-medium">Items (one per line)</p><textarea value={newCL.items} onChange={e => setNewCL({...newCL,items:e.target.value})} placeholder="Verify breakfast setup&#10;Inspect pool area&#10;Restock amenities" rows={4} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none resize-none" /></div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <button onClick={() => {setShowNewChecklist(false);setNewCL({name:'',items:''})}} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Cancel</button>
                    <button onClick={handleCreateChecklist} disabled={!newCL.name.trim()} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{backgroundColor:TEAL}}>Create</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-4">
            {checklists.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><ClipboardList size={32} className="text-gray-300 mx-auto mb-2" /><p className="text-[13px] text-gray-500 mb-1">No checklist templates yet.</p>{isAdmin && <p className="text-[12px] text-gray-400">Create one above to get started.</p>}</div>
            ) : checklists.map(cl => {
              const activeInst = instances.find(i => i.checklist_id === cl.id && !i.completed);
              const completedInst = instances.find(i => i.checklist_id === cl.id && i.completed);
              return (
                <div key={cl.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3"><h3 className="text-[15px] font-bold text-gray-900">{cl.name}</h3><span className="text-[11px] text-gray-400">{cl.items.length} items</span></div>
                  {activeInst ? (
                    <div>
                      <p className="text-[12px] text-gray-500 mb-2">{activeInst.staff_name || 'Staff'} — in progress</p>
                      <div className="space-y-1.5">{cl.items.map(item => {
                        const checked = activeInst.checked_items.some(x => x.item_id === item.id);
                        return (<label key={item.id} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={checked} onChange={() => handleToggleCheckItem(activeInst.id, item.id, checked)} className="accent-teal-500 w-4 h-4" /><span className={`text-[13px] ${checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span></label>);
                      })}</div>
                    </div>
                  ) : completedInst ? (
                    <div>
                      <p className="text-[12px] text-emerald-600 font-semibold mb-2">✅ Completed by {completedInst.staff_name || 'Staff'}</p>
                      <div className="space-y-1">{cl.items.map(item => (<div key={item.id} className="flex items-center gap-2"><span className="text-emerald-500">✓</span><span className="text-[13px] text-gray-400 line-through">{item.label}</span></div>))}</div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[12px] text-gray-400 mb-3">Not started today</p>
                      {addInstanceFor === cl.id ? (
                        <div className="flex gap-2"><input value={instanceStaff} onChange={e => setInstanceStaff(e.target.value)} placeholder="Your name" className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-200 outline-none" /><button onClick={() => handleStartChecklist(cl.id)} disabled={!instanceStaff.trim()} className="px-3 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-40" style={{backgroundColor:TEAL}}>Start</button><button onClick={() => {setAddInstanceFor(null);setInstanceStaff('')}} className="px-3 py-2 rounded-lg text-gray-500 text-[12px] font-semibold bg-gray-100">Cancel</button></div>
                      ) : (<button onClick={() => setAddInstanceFor(cl.id)} className="text-[12px] font-bold px-3 py-1.5 rounded-lg" style={{backgroundColor:`${TEAL}15`,color:TEAL}}>+ Start Checklist</button>)}
                    </div>
                  )}
                  {isAdmin && (<div className="mt-3 pt-3 border-t border-gray-100 flex gap-2"><button onClick={() => deleteChecklist(cl.id).then(() => setChecklists(prev => prev.filter(c => c.id !== cl.id)))} className="text-[11px] text-red-500 hover:text-red-700 font-medium">Delete</button></div>)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <div>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-4 py-2"><CalendarDays size={16} className="text-gray-400" /><input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="text-[14px] border-none outline-none bg-transparent" /></div>
            {isAdmin && (<button onClick={() => setShowNewSchedule(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:opacity-90" style={{backgroundColor:TEAL}}><Plus size={14} /> Post Schedule</button>)}
            <button onClick={async () => setSchedules(await getStaffSchedules(hotelId, scheduleDate))} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
          </div>
          {showNewSchedule && isAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
              <h3 className="text-[15px] font-bold text-gray-900 mb-3">Post New Shift</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-[11px] text-gray-400 mb-1 block font-medium">Staff Member</label><div className="flex gap-2"><input value={newSched.staff_name} onChange={e => {setNewSched({...newSched,staff_name:e.target.value});const match=staff.find(s=>s.name.toLowerCase()===e.target.value.toLowerCase());if(match)setNewSched(prev=>({...prev,staff_id:match.id||''}))}} list="staff-list" placeholder="Type name or pick from list" className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /><datalist id="staff-list">{staff.map(s => <option key={s.id||s.name} value={s.name} />)}</datalist></div></div>
                <div><label className="text-[11px] text-gray-400 mb-1 block font-medium">Date</label><input type="date" value={newSched.shift_date} onChange={e => setNewSched({...newSched,shift_date:e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
                <div><label className="text-[11px] text-gray-400 mb-1 block font-medium">Role</label><input value={newSched.role} onChange={e => setNewSched({...newSched,role:e.target.value})} placeholder="Front Desk / Housekeeping" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
                <div><label className="text-[11px] text-gray-400 mb-1 block font-medium">Start Time</label><input type="time" value={newSched.start_time} onChange={e => setNewSched({...newSched,start_time:e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
                <div><label className="text-[11px] text-gray-400 mb-1 block font-medium">End Time</label><input type="time" value={newSched.end_time} onChange={e => setNewSched({...newSched,end_time:e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
                <div className="col-span-2"><label className="text-[11px] text-gray-400 mb-1 block font-medium">Notes (optional)</label><input value={newSched.notes} onChange={e => setNewSched({...newSched,notes:e.target.value})} placeholder="e.g. Cover front desk + shuttle dispatch" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button onClick={() => {setShowNewSchedule(false)}} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Cancel</button>
                <button onClick={handleCreateSchedule} disabled={!newSched.staff_name.trim()} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40 flex items-center gap-1.5" style={{backgroundColor:TEAL}}><SendHorizontal size={14} /> Post & Send Email</button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 text-center">Staff with an email address will receive a notification.</p>
            </div>
          )}
          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><CalendarDays size={32} className="text-gray-300 mx-auto mb-2" /><p className="text-[13px] text-gray-500">No schedules for this date.</p>{isAdmin && <p className="text-[12px] text-gray-400 mt-1">Click &quot;Post Schedule&quot; to add shifts.</p>}</div>
          ) : (
            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0" style={{backgroundColor:TEAL}}>{s.staff_name.charAt(0).toUpperCase()}</div><div><p className="text-[14px] font-bold text-gray-900">{s.staff_name}</p><p className="text-[12px] text-gray-500">{s.start_time.slice(0,5)} — {s.end_time.slice(0,5)}{s.role ? ` · ${s.role}` : ''}{s.notes ? <span className="ml-2 text-gray-400">· {s.notes}</span> : ''}</p></div></div>
                  <div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">{s.shift_date}</span>{isAdmin && <button onClick={() => handleDeleteSchedule(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recurring Shuttle Schedule Generator */}
      {tab === 'schedule' && isAdmin && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {!showRecurringForm ? (
            <button onClick={() => setShowRecurringForm(true)}
              className="flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-teal-100 transition-colors">
              <Plus size={14} /> Generate Recurring Shuttle Times
            </button>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
              <h3 className="text-[15px] font-bold text-gray-900 mb-3">Generate Recurring Times</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block font-medium">Route</label>
                  <select value={recurringForm.route_id} onChange={e => setRecurringForm({...recurringForm, route_id: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                    <option value="">Select route...</option>
                    {todayShuttleRoutes.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.type}) {r.price > 0 ? `· $${r.price}` : '· Free'}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block font-medium">Start Time</label>
                    <input type="time" value={recurringForm.start_time} onChange={e => setRecurringForm({...recurringForm, start_time: e.target.value})}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block font-medium">End Time</label>
                    <input type="time" value={recurringForm.end_time} onChange={e => setRecurringForm({...recurringForm, end_time: e.target.value})}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block font-medium">Every</label>
                    <select value={recurringForm.interval_min} onChange={e => setRecurringForm({...recurringForm, interval_min: parseInt(e.target.value)})}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>2 hr</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block font-medium">Capacity per slot</label>
                  <input type="number" min={1} max={99} value={recurringForm.capacity} onChange={e => setRecurringForm({...recurringForm, capacity: parseInt(e.target.value) || 8})}
                    className="w-24 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block font-medium">Days of Week</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS_LABELS.map((d, i) => {
                      // DAYS_LABELS is Mon-first; map to getDay() convention (0=Sun..6=Sat)
                      const dayNum = (i + 1) % 7;
                      const active = recurringForm.days.includes(dayNum);
                      return (
                        <button key={d} onClick={() => setRecurringForm({
                          ...recurringForm,
                          days: active ? recurringForm.days.filter(x => x !== dayNum) : [...recurringForm.days, dayNum]
                        })}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button onClick={() => setShowRecurringForm(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button>
                <button onClick={handleGenerateRecurring} disabled={!recurringForm.route_id}
                  className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{backgroundColor: TEAL}}>Generate Times</button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 text-center">Creates timed slots matching the selected schedule, every day of the week selected.</p>
            </div>
          )}
        </div>
      )}

      {/* Staff Assistant / Knowledge Base Chatbot */}
      {tab === 'assistant' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: TEAL }}>
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-white" />
                <span className="text-[15px] font-bold text-white">Staff Assistant</span>
              </div>
            </div>
            <div className="p-4 border-b border-gray-100">
              <input
                value={chatQuery}
                onChange={e => {
                  setChatQuery(e.target.value);
                  if (!e.target.value.trim()) { setChatResults([]); return; }
                  const q = e.target.value.toLowerCase();
                  setChatResults(kbEntries.filter(entry =>
                    entry.active && (entry.question.toLowerCase().includes(q) || entry.answer.toLowerCase().includes(q) || entry.keywords?.some(k => k.toLowerCase().includes(q)))
                  ).slice(0, 10));
                }}
                placeholder="Ask anything about hotel policies..."
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 outline-none placeholder-gray-400"
              />
              <p className="text-[11px] text-gray-400 mt-2">Powered by the Knowledge Base. Admin adds entries in the Knowledge Base tab.</p>
            </div>
            {chatResults.length === 0 && !chatQuery.trim() ? (
              <div className="p-8 text-center">
                <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-gray-500">Ask the Staff Assistant</p>
                <p className="text-[12px] text-gray-400 mt-1">Search the knowledge base for answers about check-in, breakfast, wifi, amenities...</p>
                {kbEntries.length > 0 && (
                  <p className="text-[11px] text-gray-300 mt-2">{kbEntries.filter(e => e.active).length} knowledge entries available</p>
                )}
              </div>
            ) : chatResults.length === 0 && chatQuery.trim() ? (
              <div className="p-8 text-center">
                <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-[13px] text-gray-500">No matching results found.</p>
                <p className="text-[11px] text-gray-400 mt-1">Try different keywords or ask an admin to add this info to the Knowledge Base.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {chatResults.map(entry => (
                  <div key={entry.id} className="px-5 py-4">
                    <p className="text-[13px] font-bold text-gray-900 mb-1">{entry.question}</p>
                    <p className="text-[12px] text-gray-600 leading-relaxed">{entry.answer}</p>
                    {entry.source_url && (
                      <a href={entry.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-bold text-blue-600 hover:underline mt-1 inline-block">
                        Source &rarr;
                      </a>
                    )}
                    {entry.keywords && entry.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.keywords.map((kw, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-[12px] text-amber-800">
              <strong>Tip:</strong> Go to the <span className="font-semibold">Knowledge Base</span> tab to add or manage entries. The staff assistant searches all active entries by question, answer, and keywords.
            </p>
          </div>
        </div>
      )}

      {/* ── New ops tool renderings ─────────────────────── */}
      {tab === 'call-around' && <CallAroundView hotelId={hotelId} />}
      {tab === 'daily-logs' && <DailyLogsView hotelId={hotelId} />}
      {tab === 'no-shows' && <NoShowsView hotelId={hotelId} />}
      {tab === 'room-moves' && <RoomMovesView hotelId={hotelId} />}
      {tab === 'bank-count' && <BankCountView hotelId={hotelId} />}
    </div>
  );
}