'use client';
/* eslint-disable */

import { useState, useEffect, useMemo } from 'react';
import { Download, Check, ChevronDown, ChevronUp, Search, Zap, ClipboardList, Star, Users } from 'lucide-react';

const TEAL = '#0D9488';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Operations':     { bg: '#FEF3C7', text: '#92400E' },
  'Front Desk':     { bg: '#DBEAFE', text: '#1E40AF' },
  'Housekeeping':   { bg: '#EDE9FE', text: '#5B21B6' },
  'Food & Beverage':{ bg: '#D1FAE5', text: '#065F46' },
  'Security':       { bg: '#FEE2E2', text: '#991B1B' },
};

function categoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] || { bg: '#F3F4F6', text: '#374151' };
}

interface Pack {
  id: string;
  name: string;
  description: string;
  category: string;
  author_name: string;
  install_count: number;
  items: any[];
  department?: string;
  shift?: string;
  estimated_minutes?: number;
}

export default function MarketplaceView({
  hotelId,
  isAdmin,
  staffName,
}: {
  hotelId: string;
  isAdmin: boolean;
  staffName?: string;
}) {
  const [activeTab, setActiveTab] = useState<'kpi' | 'todo'>('kpi');
  const [packs, setPacks] = useState<Pack[]>([]);
  const [installedPackIds, setInstalledPackIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [justInstalled, setJustInstalled] = useState<Set<string>>(new Set());
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  async function load(tab: 'kpi' | 'todo') {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace?type=${tab}&hotelId=${hotelId}`);
      const data = await res.json();
      if (data.ok) {
        setPacks(data.packs || []);
        setInstalledPackIds(new Set(data.installedPackIds || []));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(activeTab); }, [activeTab, hotelId]);

  function switchTab(tab: 'kpi' | 'todo') {
    setActiveTab(tab);
    setSearch('');
    setFilterCategory('All');
    setExpandedPacks(new Set());
  }

  const categories = useMemo(() => {
    const cats = Array.from(new Set(packs.map(p => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [packs]);

  const filtered = useMemo(() => {
    return packs.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === 'All' || p.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [packs, search, filterCategory]);

  async function install(packId: string) {
    if (!isAdmin) return;
    setInstalling(packId);
    try {
      const action = activeTab === 'kpi' ? 'install_kpi_pack' : 'install_todo_pack';
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '',
        },
        body: JSON.stringify({ action, packId, hotelId, installedBy: staffName }),
      });
      const data = await res.json();
      if (data.ok) {
        setInstalledPackIds(prev => new Set([...prev, packId]));
        setJustInstalled(prev => new Set([...prev, packId]));
        setTimeout(() => setJustInstalled(prev => { const s = new Set(prev); s.delete(packId); return s; }), 3000);
      }
    } finally {
      setInstalling(null);
    }
  }

  function toggleExpand(id: string) {
    setExpandedPacks(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  const isInstalled = (id: string) => installedPackIds.has(id);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F9FAFB', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>Marketplace</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>Community best practices — one tap to install</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
          {(['kpi', 'todo'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              style={{
                flex: 1, padding: '10px 0', fontWeight: 600, fontSize: 14, border: 'none',
                background: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? `2px solid ${TEAL}` : '2px solid transparent',
                color: activeTab === tab ? TEAL : '#6B7280', transition: 'all 0.15s',
              }}
            >
              {tab === 'kpi' ? '📊 KPI Packs' : '✅ To-Do Packs'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search packs..."
            style={{
              width: '100%', boxSizing: 'border-box', paddingLeft: 36, paddingRight: 12, height: 40,
              border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, background: '#fff', outline: 'none',
            }}
          />
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                whiteSpace: 'nowrap', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: filterCategory === cat ? TEAL : '#F3F4F6',
                color: filterCategory === cat ? '#fff' : '#374151',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Pack count */}
        {!loading && (
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
            {filtered.length} pack{filtered.length !== 1 ? 's' : ''} available
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB' }}>
                <div style={{ height: 16, background: '#F3F4F6', borderRadius: 8, width: '60%', marginBottom: 8 }} />
                <div style={{ height: 12, background: '#F3F4F6', borderRadius: 6, width: '40%', marginBottom: 12 }} />
                <div style={{ height: 12, background: '#F3F4F6', borderRadius: 6, width: '90%', marginBottom: 6 }} />
                <div style={{ height: 12, background: '#F3F4F6', borderRadius: 6, width: '75%' }} />
              </div>
            ))}
          </div>
        )}

        {/* Pack cards */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 600 }}>No packs found</div>
                <div style={{ fontSize: 13 }}>Try a different search or category</div>
              </div>
            )}
            {filtered.map(pack => {
              const installed = isInstalled(pack.id);
              const expanded = expandedPacks.has(pack.id);
              const catStyle = categoryStyle(pack.category);
              const items: any[] = pack.items || [];
              const previewItems = expanded ? items : items.slice(0, 3);

              return (
                <div
                  key={pack.id}
                  style={{
                    background: '#fff', borderRadius: 16, border: installed ? `1.5px solid ${TEAL}` : '1px solid #E5E7EB',
                    overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <div style={{ padding: '18px 18px 14px' }}>
                    {/* Pack header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{pack.name}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: catStyle.bg, color: catStyle.text }}>
                            {pack.category}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#6B7280' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Star size={11} fill="#F59E0B" color="#F59E0B" />
                            {pack.author_name}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={11} />
                            {pack.install_count || 0} hotel{pack.install_count !== 1 ? 's' : ''}
                          </span>
                          {activeTab === 'todo' && pack.estimated_minutes && (
                            <span>~{pack.estimated_minutes} min</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {pack.description && (
                      <p style={{ fontSize: 13, color: '#4B5563', margin: '0 0 14px', lineHeight: 1.5 }}>
                        {pack.description}
                      </p>
                    )}

                    {/* Items preview */}
                    <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                        {activeTab === 'kpi' ? 'KPIs included' : 'Checklist items'} · {items.length} total
                      </div>
                      {previewItems.map((item: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: idx < previewItems.length - 1 ? 10 : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: TEAL, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                              {activeTab === 'kpi' ? item.name : item.label}
                            </span>
                            {activeTab === 'kpi' && (
                              <span style={{ fontSize: 11, color: '#6B7280', background: '#E5E7EB', padding: '1px 6px', borderRadius: 10 }}>
                                {item.unit} · target {item.target}
                              </span>
                            )}
                          </div>
                          {item.why && (
                            <p style={{ margin: '3px 0 0 14px', fontSize: 12, color: '#0D9488', fontStyle: 'italic', lineHeight: 1.4 }}>
                              {item.why}
                            </p>
                          )}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <button
                          onClick={() => toggleExpand(pack.id)}
                          style={{
                            marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, color: TEAL, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: 0,
                          }}
                        >
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {expanded ? 'Show less' : `Show all ${items.length} items`}
                        </button>
                      )}
                    </div>

                    {/* Install button */}
                    {isAdmin ? (
                      <button
                        onClick={() => !installed && install(pack.id)}
                        disabled={installing === pack.id || installed}
                        style={{
                          width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', cursor: installed ? 'default' : 'pointer',
                          fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          background: installed ? '#D1FAE5' : TEAL,
                          color: installed ? '#065F46' : '#fff',
                          opacity: installing === pack.id ? 0.7 : 1,
                          transition: 'all 0.2s',
                        }}
                      >
                        {installing === pack.id ? (
                          <span>Installing…</span>
                        ) : installed ? (
                          <><Check size={16} /> {justInstalled.has(pack.id) ? 'Installed!' : 'Installed'}</>
                        ) : (
                          <><Download size={16} /> Install Pack</>
                        )}
                      </button>
                    ) : (
                      <div style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', padding: '8px 0' }}>
                        Admin access required to install
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Community callout */}
        {!loading && (
          <div style={{
            marginTop: 24, background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
            borderRadius: 16, padding: '20px', textAlign: 'center', color: '#fff',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🌍</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Built by the community</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              More packs added every week. Install what fits your operation, skip what doesn't.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
