'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot, Bus, ConciergeBell, UtensilsCrossed, Settings, PhoneCall,
  ToggleLeft, ToggleRight, RefreshCw, Save, ExternalLink, Webhook,
  MessageSquare, ChevronDown, ChevronUp, Bot as BotIcon, CheckCircle,
} from 'lucide-react';

const TEAL = '#0D9488';

type AgentType = 'transportation' | 'customer_service' | 'room_ordering' | 'general';

interface TenantAgent {
  id: string;
  hotel_id: string;
  agent_type: AgentType;
  elevenlabs_agent_id: string | null;
  name: string;
  is_active: boolean;
  system_prompt: string | null;
  first_message: string | null;
  voice_id: string | null;
  tools_enabled: string[];
  created_at: string;
  updated_at: string;
}

interface AgentCall {
  id: string;
  conversation_id: string | null;
  status: string | null;
  transcript: string | null;
  summary: string | null;
  caller_name: string | null;
  escalated: boolean;
  request_created: boolean;
  started_at: string | null;
}

const AGENT_META: Record<AgentType, { icon: typeof Bot; label: string; desc: string; color: string }> = {
  transportation: { icon: Bus, label: 'Transportation', desc: 'Airport shuttle booking + live GPS tracking', color: '#0ea5e9' },
  customer_service: { icon: ConciergeBell, label: 'Customer Service', desc: 'Front desk questions, service requests, hotel info', color: TEAL },
  room_ordering: { icon: UtensilsCrossed, label: 'Room Ordering', desc: 'Room service, food delivery, amenity orders', color: '#f59e0b' },
  general: { icon: Bot, label: 'General', desc: 'General purpose assistant', color: '#8b5cf6' },
};

export default function AgentDashboard({ hotelId, hotelName }: { hotelId: string; hotelName: string }) {
  const [agents, setAgents] = useState<TenantAgent[]>([]);
  const [calls, setCalls] = useState<AgentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, Partial<TenantAgent>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [view, setView] = useState<'agents' | 'calls'>('agents');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = (await import('@/lib/supabase')).supabase
      const session = await token.auth.getSession();
      const accessToken = session.data.session?.access_token || '';

      const res = await fetch(`/api/tenant-agents?hotel_id=${hotelId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.ok) setAgents(json.agents as TenantAgent[]);

      // Load calls from the existing table
      const { supabase } = await import('@/lib/supabase');
      const { data: callData } = await supabase
        .from('agent_calls')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('started_at', { ascending: false })
        .limit(30);
      setCalls((callData || []) as AgentCall[]);
    } catch (e) {
      console.error('Agent load error:', e);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const toggleAgent = async (agent: TenantAgent) => {
    const newActive = !agent.is_active;
    // Optimistic update
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, is_active: newActive } : a));

    const { supabase } = await import('@/lib/supabase');
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    try {
      await fetch('/api/tenant-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agent_id: agent.id, is_active: newActive }),
      });
    } catch (e) {
      // Revert on error
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, is_active: !newActive } : a));
      console.error('Toggle failed:', e);
    }
  };

  const saveAgent = async (agentId: string) => {
    setSaving(agentId);
    try {
      const form = editForms[agentId];
      if (!form) return;

      const { supabase } = await import('@/lib/supabase');
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';

      const res = await fetch('/api/tenant-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agent_id: agentId, ...form }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setEditingAgent(null);
      await load();
    } catch (e) {
      console.error('Save failed:', e);
      alert('Failed to save: ' + (e instanceof Error ? e.message : 'Unknown'));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TEAL}15` }}>
              <BotIcon size={22} style={{ color: TEAL }} />
            </div>
            <div>
              <h2 className="text-[16px] font-black text-gray-900">AI Agents</h2>
              <p className="text-[12px] text-gray-500">{hotelName} — {agents.filter(a => a.is_active).length} active</p>
            </div>
          </div>
          <div className="flex gap-1.5 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('agents')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold ${view === 'agents' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              Agents
            </button>
            <button onClick={() => setView('calls')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold ${view === 'calls' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              Call History
            </button>
          </div>
        </div>
      </div>

      {/* AGENTS VIEW */}
      {view === 'agents' && (
        <div className="space-y-3">
          {/* Super Agent Banner */}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
              <BotIcon size={20} style={{ color: TEAL }} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-gray-900">Attenda Super Agent</p>
              <p className="text-[11px] text-gray-500">Platform-wide agent on attendaapp.com — answers visitor questions, schedules demos</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700">ALWAYS ON</span>
          </div>

          {/* Sub-Agent Cards */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">Tenant Sub-Agents</p>
          {agents.map(agent => {
            const meta = AGENT_META[agent.agent_type] || AGENT_META.general;
            const Icon = meta.icon;
            const isExpanded = expandedAgent === agent.id;
            const isEditing = editingAgent === agent.id;
            const form = editForms[agent.id] || {};

            return (
              <div key={agent.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Card Header */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}15` }}>
                    <Icon size={20} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-gray-900">{agent.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${agent.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {agent.is_active ? '● ACTIVE' : '○ OFF'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{meta.desc}</p>
                  </div>
                  <button onClick={() => toggleAgent(agent)} className="shrink-0">
                    {agent.is_active
                      ? <ToggleRight size={32} style={{ color: TEAL }} />
                      : <ToggleLeft size={32} className="text-gray-300" />}
                  </button>
                  <button onClick={() => setExpandedAgent(isExpanded ? null : agent.id)} className="shrink-0 p-1 text-gray-400 hover:text-gray-600">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    {/* Agent ID + ElevenLabs link */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-gray-500">Agent ID:</span>
                      <code className="font-mono text-[10px] text-gray-700">{agent.elevenlabs_agent_id || 'Not configured'}</code>
                      {agent.elevenlabs_agent_id && (
                        <a href={`https://elevenlabs.io/app/conversational-ai/agents/${agent.elevenlabs_agent_id}`}
                          target="_blank" rel="noopener" className="ml-auto flex items-center gap-1 text-[10px] font-semibold hover:underline" style={{ color: TEAL }}>
                          Open in ElevenLabs <ExternalLink size={10} />
                        </a>
                      )}
                    </div>

                    {/* Tools */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tools</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {(agent.tools_enabled || []).map(tool => (
                          <span key={tool} className="px-2 py-1 rounded-md bg-teal-50 text-[10px] font-bold" style={{ color: TEAL }}>{tool}</span>
                        ))}
                        {(!agent.tools_enabled || agent.tools_enabled.length === 0) && <span className="text-[11px] text-gray-400">None</span>}
                      </div>
                    </div>

                    {/* First Message + System Prompt */}
                    {!isEditing ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">First Message</span>
                            <button onClick={() => { setEditingAgent(agent.id); setEditForms({ ...editForms, [agent.id]: agent }); }}
                              className="text-[10px] font-bold text-gray-500 hover:text-gray-700">Edit</button>
                          </div>
                          <p className="mt-1 text-[12px] text-gray-700 p-2.5 bg-gray-50 rounded-lg italic">"{agent.first_message || '—'}"</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">System Prompt</span>
                          <p className="mt-1 text-[11px] text-gray-600 p-2.5 bg-gray-50 rounded-lg whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{agent.system_prompt || '—'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">First Message</span>
                          <textarea value={form.first_message || ''} onChange={e => setEditForms({ ...editForms, [agent.id]: { ...form, first_message: e.target.value } })}
                            rows={2} className="mt-1 w-full p-2.5 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-teal-300" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">System Prompt</span>
                          <textarea value={form.system_prompt || ''} onChange={e => setEditForms({ ...editForms, [agent.id]: { ...form, system_prompt: e.target.value } })}
                            rows={6} className="mt-1 w-full p-2.5 border border-gray-200 rounded-lg text-[11px] outline-none focus:border-teal-300 font-mono" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveAgent(agent.id)} disabled={saving === agent.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-[11px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                            <Save size={13} /> {saving === agent.id ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingAgent(null)}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Webhooks info */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Webhook size={14} style={{ color: TEAL }} />
              <span className="text-[12px] font-bold text-gray-900">Webhooks</span>
            </div>
            <code className="block p-2 bg-gray-50 rounded-lg text-[10px] text-gray-600 font-mono">Post-call: https://attendaapp.com/api/agent-webhook/post-call</code>
            <p className="text-[10px] text-gray-400 mt-1">All agent calls (transcripts + analysis) are saved and shown in Call History</p>
          </div>
        </div>
      )}

      {/* CALLS VIEW */}
      {view === 'calls' && (
        <div className="space-y-3">
          {calls.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <PhoneCall size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-[13px] font-semibold text-gray-500">No calls yet</p>
              <p className="text-[11px] text-gray-400 mt-1">Call history will appear here once agents receive conversations.</p>
            </div>
          ) : (
            calls.map(call => (
              <div key={call.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-gray-900">{call.caller_name || 'Unknown'}</span>
                  <span className="text-[10px] text-gray-400">{call.started_at ? new Date(call.started_at).toLocaleString() : '—'}</span>
                </div>
                {call.summary && <p className="text-[12px] text-gray-600 mb-1">{call.summary}</p>}
                {call.transcript && (
                  <details className="mt-2">
                    <summary className="text-[10px] font-bold uppercase text-gray-400 cursor-pointer">Transcript</summary>
                    <pre className="mt-1 p-2 bg-gray-50 rounded text-[10px] text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">{call.transcript}</pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}