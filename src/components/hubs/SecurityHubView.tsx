'use client';
import { useState, useEffect } from 'react';
import { getIncidentLogs, createIncidentLog, resolveIncidentLog, getPatrolLogs, createPatrolLog, type IncidentLog, type PatrolLog } from '@/lib/supabase';
const TEAL = '#0D9488';

export default function SecurityHubView({ hotelId, staffName }: { hotelId: string; staffName?: string }) {
  const [tab, setTab] = useState<'incidents'|'patrols'>('incidents');
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);
  const [patrols, setPatrols] = useState<PatrolLog[]>([]);

  useEffect(() => { getIncidentLogs(hotelId).then(setIncidents); getPatrolLogs(hotelId).then(setPatrols); }, [hotelId]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('incidents')} className={`px-4 py-2 rounded-full text-[13px] font-semibold ${tab === 'incidents' ? 'text-white' : 'bg-gray-100 text-gray-500'}`} style={tab === 'incidents' ? { backgroundColor: TEAL } : {}}>🚨 Incidents</button>
        <button onClick={() => setTab('patrols')} className={`px-4 py-2 rounded-full text-[13px] font-semibold ${tab === 'patrols' ? 'text-white' : 'bg-gray-100 text-gray-500'}`} style={tab === 'patrols' ? { backgroundColor: TEAL } : {}}>🔦 Patrol Log</button>
      </div>
      {tab === 'incidents' && <IncidentsView incidents={incidents} hotelId={hotelId} staffName={staffName} reload={() => getIncidentLogs(hotelId).then(setIncidents)} />}
      {tab === 'patrols' && <PatrolView patrols={patrols} hotelId={hotelId} staffName={staffName} reload={() => getPatrolLogs(hotelId).then(setPatrols)} />}
    </div>
  );
}

function IncidentsView({ incidents, hotelId, staffName, reload }: { incidents: IncidentLog[]; hotelId: string; staffName?: string; reload: () => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ type: '', location: '', description: '', action_taken: '' });
  const open = incidents.filter(i => !i.resolved).length;

  const save = async () => {
    if (!form.type || !form.description) return;
    await createIncidentLog({ hotel_id: hotelId, ...form, incident_date: new Date().toISOString().slice(0,10), reported_by: staffName || 'Staff', resolved: false });
    setForm({ type: '', location: '', description: '', action_taken: '' }); setShow(false); reload();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {open > 0 && <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-700">⚠️ {open} open</span>}
        <button onClick={() => setShow(!show)} className="text-white px-4 py-2 rounded-xl text-[13px] font-bold ml-auto" style={{ backgroundColor: TEAL }}>+ Log Incident</button>
      </div>
      {show && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-[11px] text-gray-400 mb-1 block">Type *</label><input value={form.type} onChange={e => setForm({...form, type: e.target.value})} placeholder="Noise, Theft, etc" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Location</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Lobby, Parking, etc" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div className="col-span-2 md:col-span-3"><label className="text-[11px] text-gray-400 mb-1 block">Description *</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div className="col-span-2 md:col-span-3"><label className="text-[11px] text-gray-400 mb-1 block">Action Taken</label><input value={form.action_taken} onChange={e => setForm({...form, action_taken: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
          </div>
          <div className="flex gap-2 mt-4 justify-end"><button onClick={() => setShow(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button><button onClick={save} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold" style={{ backgroundColor: TEAL }}>Save</button></div>
        </div>
      )}
      {incidents.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">No incidents logged.</p></div> : (
        <div className="space-y-2">
          {incidents.map(i => (
            <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><span className="text-[13px] font-semibold">{i.type}</span>{i.location && <span className="text-[11px] text-gray-400">{i.location}</span>}</div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${i.resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{i.resolved ? 'RESOLVED' : 'OPEN'}</span>
              </div>
              <p className="text-[12px] text-gray-600">{i.description}</p>
              {i.action_taken && <p className="text-[10px] text-gray-400 mt-1">Action: {i.action_taken}</p>}
              {!i.resolved && <button onClick={() => { resolveIncidentLog(i.id); reload(); }} className="text-[10px] mt-2 py-1 px-3 rounded-lg bg-emerald-50 text-emerald-600 font-semibold">Mark Resolved</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatrolView({ patrols, hotelId, staffName, reload }: { patrols: PatrolLog[]; hotelId: string; staffName?: string; reload: () => void }) {
  const [form, setForm] = useState({ checkpoint: '', status: 'checked', notes: '' });

  const log = async () => {
    if (!form.checkpoint) return;
    await createPatrolLog({ hotel_id: hotelId, ...form, patrol_date: new Date().toISOString().slice(0,10), officer_name: staffName || 'Staff' });
    setForm({ checkpoint: '', status: 'checked', notes: '' }); reload();
  };

  const checkpoints = ['Lobby', 'Parking Lot', 'Pool Area', 'Emergency Exits', 'Back Office', 'Elevator Shaft'];

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
        <h3 className="text-[14px] font-bold text-gray-900 mb-3">Log Patrol Checkpoint</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><label className="text-[11px] text-gray-400 mb-1 block">Checkpoint</label><input list="patrol-cp" value={form.checkpoint} onChange={e => setForm({...form, checkpoint: e.target.value})} placeholder="Select or type" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" />
            <datalist id="patrol-cp">{checkpoints.map(cp => <option key={cp} value={cp} />)}</datalist></div>
          <div><label className="text-[11px] text-gray-400 mb-1 block">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200"><option value="checked">Checked</option><option value="skipped">Skipped</option><option value="issue_found">Issue Found</option></select></div>
          <div><label className="text-[11px] text-gray-400 mb-1 block">Notes</label><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
        </div>
        <div className="flex justify-end mt-3"><button onClick={log} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold" style={{ backgroundColor: TEAL }}>Log Checkpoint</button></div>
      </div>
      {patrols.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">No patrols logged today.</p></div> : (
        <div className="space-y-2">
          {patrols.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center justify-between">
              <div><span className="text-[13px] font-semibold">{p.checkpoint}</span>{p.officer_name && <span className="text-[11px] text-gray-400 ml-2">{p.officer_name}</span>}</div>
              <div className="flex items-center gap-2">
                {p.check_time && <span className="text-[10px] text-gray-400">{new Date(p.check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.status === 'checked' ? 'bg-emerald-100 text-emerald-700' : p.status === 'issue_found' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{p.status.toUpperCase().replace('_',' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}