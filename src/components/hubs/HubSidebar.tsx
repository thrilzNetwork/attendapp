'use client';

import { useState, useEffect } from 'react';
import { getMyHubs, type Hub } from '@/lib/supabase';
import { LogOut, Settings, Users, Building2 } from 'lucide-react';

const TEAL = '#0D9488';

const TOOL_LABELS: Record<string, string> = {
  recap: '📊 Daily Recap',
  checklists: '📝 Checklists',
  schedule: '📅 Schedule',
  assistant: '🤖 Assistant',
  call_around: '📞 Call Around',
  daily_logs: '📋 Daily Logs',
  no_shows: '🚫 No Shows',
  room_moves: '🔄 Room Moves',
  bank_count: '💰 Bank Count',
  orders: '📦 Requests',
  shuttle: '🚐 Transportation',
  compset: '📈 Compset',
  forecast: '🔮 Forecast',
  kpis: '📊 KPIs',
  revenue: '💵 Revenue',
  reports: '📋 Reports',
  culture: '❤️ Culture',
  staff_mgmt: '👥 Staff Mgmt',
  callouts: '📋 Callouts',
  hotel: '🏨 Property Settings',
  partners: '🏪 Partners',
  vendors: '🚚 Vendors',
  qrcodes: '📱 QR Codes',
  rooms: '🚪 Room Mgmt',
  knowledge: '📖 Right Answers',
  learning_hr: '🎓 Learning',
  marketplace: '🛒 Marketplace',
  property_info: 'ℹ️ Property Info',
  room_status: '🧹 Room Status',
  linen_counts: '🧺 Linen Count',
  meal_covers: '🍽️ Meal Covers',
  waste_log: '🗑️ Waste Log',
  monthly_spend: '💰 Monthly Spend',
  fnb_inventory: '📦 Inventory',
  work_orders: '🔧 Work Orders',
  incident_log: '🚨 Incidents',
  patrol_log: '🔦 Patrol Log',
  bouncie: '📍 Live Tracker',
  all_hubs: '🌐 All Hubs',
  presence: '👁️ Presence',
};

export default function HubSidebar({
  hotelId, staffId, staffName, isAdmin, currentHub, onSelectHub, currentTool, onSelectTool, onLogout,
  assignedHubSlugs,
}: {
  hotelId: string; staffId?: string; staffName?: string; isAdmin: boolean;
  currentHub: string | null; onSelectHub: (hubSlug: string) => void;
  currentTool: string | null; onSelectTool: (tool: string) => void;
  onLogout: () => void;
  assignedHubSlugs: Set<string>;
}) {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const myHubs = await getMyHubs(hotelId, staffId);
      setHubs(myHubs);
      if (myHubs.length > 0 && !currentHub) onSelectHub(myHubs[0].slug);
      setLoading(false);
    })();
  }, [hotelId, staffId]);

  const activeHub = hubs.find(h => h.slug === currentHub);
  const tools = activeHub?.tools || [];

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-[14px]" style={{ backgroundColor: TEAL }}>A</div>
          <span className="text-[16px] font-bold text-gray-900">Attenda</span>
        </div>
        {staffName && <p className="text-[11px] text-gray-400 mt-1.5 ml-10">Welcome, {staffName.split(' ')[0]}</p>}
      </div>

      {/* Hubs */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">All Hubs</p>
        {loading ? <div className="px-2 py-2 text-[12px] text-gray-400">Loading…</div> : (
          <div className="space-y-0.5">
            {hubs.map(hub => {
              const isAssigned = assignedHubSlugs.has(hub.slug);
              return (
                <button key={hub.id} onClick={() => { onSelectHub(hub.slug); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${currentHub === hub.slug ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  style={currentHub === hub.slug ? { backgroundColor: TEAL } : {}}>
                  <span className="text-[16px]">{hub.icon}</span>
                  <span className="flex-1 text-left">{hub.name}</span>
                  {!isAssigned && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium" title="View only — not assigned to this hub">👁</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Tools in current hub */}
        {activeHub && tools.length > 0 && (
          <>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mt-5 mb-2">
              {activeHub.name} Tools
              {!assignedHubSlugs.has(activeHub.slug) && <span className="ml-1 text-[9px] text-gray-400 font-normal">(view only)</span>}
            </p>
            <div className="space-y-0.5">
              {tools.map(tool => {
                const canInteract = assignedHubSlugs.has(activeHub.slug);
                return (
                  <button key={tool}
                    onClick={() => { if (canInteract) { onSelectTool(tool); setMobileOpen(false); } }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                      !canInteract ? 'text-gray-300 cursor-not-allowed' :
                      currentTool === tool ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'
                    }`}>
                    <span>{TOOL_LABELS[tool]?.split(' ')[0] || '📋'}</span>
                    <span>{TOOL_LABELS[tool]?.split(' ').slice(1).join(' ') || tool}</span>
                    {!canInteract && <span className="ml-auto text-[9px] text-gray-300">🔒</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Admin section */}
        {isAdmin && (
          <>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mt-5 mb-2">Admin</p>
            <div className="space-y-0.5">
              <button onClick={() => { onSelectTool('staff_mgmt'); setMobileOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium ${currentTool === 'staff_mgmt' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Users size={15} /><span>Staff Management</span>
              </button>
              <button onClick={() => { onSelectTool('hotel'); setMobileOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium ${currentTool === 'hotel' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Building2 size={15} /><span>Property Settings</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-gray-100">
        <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600">
          <LogOut size={15} /><span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64 bg-white border-r border-gray-200 h-screen sticky top-0">{sidebar}</div>

      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[12px]" style={{ backgroundColor: TEAL }}>A</div>
          <span className="text-[14px] font-bold text-gray-900">Attenda</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-white h-full shadow-xl">{sidebar}</div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}