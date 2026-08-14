'use client';

import { useState, useEffect } from 'react';
import { type Hub } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import RoomStatusView from '@/components/hubs/RoomStatusView';
import LinenCountView from '@/components/hubs/LinenCountView';
import BreakfastHubView from '@/components/hubs/BreakfastHubView';
import WorkOrdersView from '@/components/hubs/WorkOrdersView';
import SecurityHubView from '@/components/hubs/SecurityHubView';


const TEAL = '#0D9488';

// Existing tools will be wired in the full build — not needed for preview
// Hub-specific stats only use supabase directly

export default function HubView({
  hotelId, hub, tool, staffName, isAdmin, hotelName, isAssigned,
}: {
  hotelId: string; hub: Hub; tool: string | null; staffName: string;
  isAdmin: boolean; hotelName: string; isAssigned: boolean;
}) {
  const [stats, setStats] = useState<Record<string, number>>({});

  // Load hub-specific stats
  useEffect(() => {
    (async () => {
      const s: Record<string, number> = {};
      try {
        if (hub.slug === 'front_desk') {
          const [{ count: reqCount }, { count: pendingCount }, { count: shuttleCount }] = await Promise.all([
            supabase.from('requests').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId),
            supabase.from('requests').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('status', 'open'),
            supabase.from('shuttle_requests').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId),
          ]);
          s.requests_today = reqCount || 0;
          s.pending_now = pendingCount || 0;
          s.shuttle_today = shuttleCount || 0;
        } else if (hub.slug === 'housekeeping') {
          const [{ count: clean }, { count: dirty }] = await Promise.all([
            supabase.from('room_status').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('status', 'clean'),
            supabase.from('room_status').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('status', 'dirty'),
          ]);
          s.rooms_cleaned = clean || 0;
          s.rooms_pending = dirty || 0;
        } else if (hub.slug === 'breakfast') {
          const today = new Date().toISOString().slice(0, 10);
          const [{ data: covers }, { data: waste }] = await Promise.all([
            supabase.from('meal_covers').select('guest_count').eq('hotel_id', hotelId).eq('service_date', today),
            supabase.from('waste_logs').select('estimated_cost').eq('hotel_id', hotelId).eq('waste_date', today),
          ]);
          s.covers_today = (covers || []).reduce((sum: number, c: Record<string, unknown>) => sum + (c.guest_count as number || 0), 0);
          s.waste_mtd = (waste || []).reduce((sum: number, w: Record<string, unknown>) => sum + (w.estimated_cost as number || 0), 0);
        } else if (hub.slug === 'maintenance') {
          const [{ count: open }, { count: urgent }] = await Promise.all([
            supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('status', 'open'),
            supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('priority', 'urgent').neq('status', 'resolved'),
          ]);
          s.open_tickets = open || 0;
          s.urgent_tickets = urgent || 0;
        } else if (hub.slug === 'security') {
          const today = new Date().toISOString().slice(0, 10);
          const [{ count: incidents }, { count: patrols }] = await Promise.all([
            supabase.from('incident_logs').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('incident_date', today),
            supabase.from('patrol_logs').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('patrol_date', today),
          ]);
          s.incidents_today = incidents || 0;
          s.patrols_completed = patrols || 0;
        }
      } catch { /* ignore stats errors */ }
      setStats(s);
    })();
  }, [hotelId, hub.slug, hub.id]);

  const STAT_LABELS: Record<string, string> = {
    requests_today: 'Requests Today', pending_now: 'Pending Now', shuttle_today: 'Shuttles Today',
    rooms_cleaned: 'Rooms Clean', rooms_pending: 'Rooms Pending',
    covers_today: 'Covers Today', waste_mtd: 'Waste $ Today',
    open_tickets: 'Open Tickets', urgent_tickets: 'Urgent',
    incidents_today: 'Incidents', patrols_completed: 'Patrols Done',
  };

  const renderTool = () => {
    // New hub tools — fully functional
    switch (tool) {
      case 'room_status':
        return <RoomStatusView hotelId={hotelId} staffName={staffName} />;
      case 'linen_counts':
        return <LinenCountView hotelId={hotelId} staffName={staffName} />;
      case 'meal_covers': case 'waste_log': case 'monthly_spend': case 'fnb_inventory':
        return <BreakfastHubView hotelId={hotelId} staffName={staffName} />;
      case 'work_orders':
        return <WorkOrdersView hotelId={hotelId} staffName={staffName} />;
      case 'incident_log': case 'patrol_log':
        return <SecurityHubView hotelId={hotelId} staffName={staffName} />;
      case null:
        return null; // Show dashboard below
      default:
        // Existing tools — show info card in demo mode
        return (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
            <p className="text-[15px] font-semibold text-gray-700 mb-1">{tool}</p>
            <p className="text-[13px] text-gray-400">This tool will be wired into the hub in the full build.</p>
          </div>
        );
    }
  };

  if (tool) return <div className="p-4 md:p-6 max-w-6xl mx-auto">{renderTool()}</div>;

  // Hub dashboard (no tool selected)
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[28px]">{hub.icon}</span>
        <h2 className="text-[20px] font-bold text-gray-900">{hub.name} Hub</h2>
      </div>
      {!isAssigned && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[12px] text-amber-700">
          <span>👁</span>
          <span>View only — you are not assigned to this hub. Contact your manager to get access.</span>
        </div>
      )}
      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-[11px] text-gray-400">{STAT_LABELS[key] || key}</p>
              <p className="text-[24px] font-bold" style={{ color: TEAL }}>{val}</p>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <p className="text-[14px] font-semibold text-gray-700 mb-4">
          {isAssigned ? 'Tools in this hub:' : 'Tools in this hub (view only):'}
        </p>
        <div className="flex flex-wrap gap-2">
          {hub.tools.map((t: string) => (
            <span key={t} className={`px-4 py-2.5 rounded-xl border text-[13px] font-semibold ${isAssigned ? 'border-gray-200 text-gray-600 bg-gray-50' : 'border-gray-100 text-gray-300 bg-gray-50/50'}`}>
              {t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}