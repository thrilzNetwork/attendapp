'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import { Store, Download, Check, ChevronRight, Tag, Users, Sparkles } from 'lucide-react';
import { authedApiHeaders } from '@/lib/supabase';

interface PackItem {
  name?: string;
  label?: string;
  unit?: string;
  target?: number;
  frequency?: string;
  why?: string;
  category?: string;
  item_type?: string;
  required?: boolean;
}

interface Pack {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author_name: string;
  items: PackItem[];
  install_count: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  parking:       'bg-blue-100 text-blue-700',
  front_desk:    'bg-teal-100 text-teal-700',
  housekeeping:  'bg-purple-100 text-purple-700',
  'f&b':         'bg-orange-100 text-orange-700',
  revenue:       'bg-emerald-100 text-emerald-700',
  management:    'bg-gray-100 text-gray-700',
};

const CATEGORY_ICONS: Record<string, string> = {
  parking:       '🅿️',
  front_desk:    '🛎️',
  housekeeping:  '🧹',
  'f&b':         '🍽️',
  revenue:       '💰',
  management:    '📊',
};

export default function MarketplaceView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'kpi' | 'todo'>('kpi');
  const [kpiPacks, setKpiPacks] = useState<Pack[]>([]);
  const [todoPacks, setTodoPacks] = useState<Pack[]>([]);
  const [installedKpi, setInstalledKpi] = useState<Set<string>>(new Set());
  const [installedTodo, setInstalledTodo] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);

  const load = async (type: 'kpi' | 'todo') => {
    if (!hotelId) return;
    const res = await fetch(`/api/marketplace?type=${type}&hotelId=${hotelId}`);
    const data = await res.json();
    if (type === 'kpi') {
      setKpiPacks(data.packs || []);
      setInstalledKpi(new Set(data.installedPackIds || []));
    } else {
      setTodoPacks(data.packs || []);
      setInstalledTodo(new Set(data.installedPackIds || []));
    }
  };

  useEffect(() => {
    if (!hotelId) return;
    setLoading(true);
    Promise.all([load('kpi'), load('todo')]).finally(() => setLoading(false));
  }, [hotelId]);

  const install = async (packId: string) => {
    if (!isAdmin) return;
    setInstalling(packId);
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: await authedApiHeaders(),
        body: JSON.stringify({
          action: activeTab === 'kpi' ? 'install_kpi_pack' : 'install_todo_pack',
          packId,
          hotelId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (activeTab === 'kpi') setInstalledKpi(s => new Set([...s, packId]));
        else setInstalledTodo(s => new Set([...s, packId]));
      }
    } finally {
      setInstalling(null);
    }
  };

  const packs = activeTab === 'kpi' ? kpiPacks : todoPacks;
  const installed = activeTab === 'kpi' ? installedKpi : installedTodo;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} className="text-teal-600 shrink-0" />
        <h1 className="text-[18px] font-extrabold text-gray-900">Marketplace</h1>
      </div>
      <p className="text-[12px] text-gray-400 mb-5">Install KPI packs and To-Do checklists from the Attenda community</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {(['kpi', 'todo'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              activeTab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'kpi' ? '📊 KPI Packs' : '✅ To-Do Packs'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">Loading marketplace…</div>
      ) : packs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Store size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-[13px]">No packs available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packs.map(pack => {
            const isInstalled = installed.has(pack.id);
            const isExpanded = expandedPack === pack.id;
            const catColor = CATEGORY_COLORS[pack.category] || 'bg-gray-100 text-gray-600';
            const catIcon = CATEGORY_ICONS[pack.category] || '📦';

            return (
              <div key={pack.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Card header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[15px]">{catIcon}</span>
                        <h3 className="text-[14px] font-bold text-gray-900">{pack.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor}`}>
                          {pack.category}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 leading-relaxed">{pack.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Users size={11} /> {pack.install_count || 0} hotels
                        </span>
                        <span className="text-[11px] text-gray-400">{pack.items?.length || 0} items</span>
                        {pack.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="flex items-center gap-0.5 text-[10px] text-gray-400">
                            <Tag size={9} /> {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && (
                        <button
                          onClick={e => { e.stopPropagation(); if (!isInstalled) install(pack.id); }}
                          disabled={isInstalled || installing === pack.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                            isInstalled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-teal-600 hover:bg-teal-700 text-white'
                          } disabled:opacity-60`}
                        >
                          {isInstalled ? (
                            <><Check size={12} /> Installed</>
                          ) : installing === pack.id ? (
                            '…'
                          ) : (
                            <><Download size={12} /> Install</>
                          )}
                        </button>
                      )}
                      {!isAdmin && isInstalled && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                          <Check size={11} /> Installed
                        </span>
                      )}
                      <ChevronRight
                        size={14}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                      {activeTab === 'kpi' ? 'Included KPIs' : 'Checklist Items'}
                    </p>
                    <div className="space-y-2">
                      {(pack.items || []).map((item, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-lg px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-semibold text-gray-800">
                              {item.name || item.label}
                            </span>
                            {activeTab === 'kpi' && item.unit && (
                              <span className="text-[10px] text-gray-400 shrink-0">
                                Target: <strong>{item.unit === '$' ? `$${item.target}` : `${item.target}${item.unit}`}</strong> / {item.frequency}
                              </span>
                            )}
                            {activeTab === 'todo' && item.item_type && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                                {item.item_type}
                              </span>
                            )}
                          </div>
                          {item.why && (
                            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed italic">{item.why}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isAdmin && (
        <p className="text-center text-[11px] text-gray-400 mt-6">Ask your admin to install packs for your property</p>
      )}
    </div>
  );
}
