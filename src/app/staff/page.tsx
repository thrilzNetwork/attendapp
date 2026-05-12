'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Bell, LayoutGrid, Wifi, ImageIcon, MessageSquare, Settings, Shield, Users, Sun, Zap, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { supabase, subscribeToRequests, updateRequestStatus, deleteRequest } from '@/lib/supabase';

interface RequestItem {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
}

type Tab = 'active' | 'completed';

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  active?: boolean;
};

export default function StaffDashboard() {
  const [tab, setTab] = useState<Tab>('active');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [lightMode, setLightMode] = useState(true);
  const [loading, setLoading] = useState(true);

  // Initial load from Supabase
  useEffect(() => {
    loadRequests();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = subscribeToRequests((payload) => {
      console.log('Realtime event:', payload);
      loadRequests();
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  }

  const refresh = () => loadRequests();

  const active = requests.filter(r => r.status !== 'completed');
  const completed = requests.filter(r => r.status === 'completed');
  const visible = tab === 'active' ? active : completed;

  const dashboardNav: NavItem[] = [
    { label: 'Live Orders', icon: Bell, href: '/staff', active: true },
  ];

  const managementNav: NavItem[] = [
    { label: 'Hotel Settings', icon: Settings, href: '/admin' },
    { label: 'Guest Messages', icon: MessageSquare, href: '#' },
    { label: 'Guest Reviews', icon: Shield, href: '#' },
    { label: 'WiFi Settings', icon: Wifi, href: '#' },
    { label: 'Facilities', icon: LayoutGrid, href: '#' },
    { label: 'Team Photo', icon: ImageIcon, href: '#' },
    { label: 'Staff Access', icon: Users, href: '#' },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-[230px] bg-[#F3F4F6] flex flex-col shrink-0 h-screen overflow-y-auto">
        <div className="px-5 pt-5 pb-4">
          <div className="inline-flex items-center justify-center w-10 h-6 rounded bg-[#E5E7EB] mb-2">
            <span className="text-[10px] font-bold text-gray-600 tracking-wide">A</span>
          </div>
          <h2 className="text-[15px] font-bold text-gray-900 leading-tight">Attenda Hotel</h2>
          <p className="text-[12px] text-gray-500 leading-tight">Best Western - Miami</p>
          <p className="text-[12px] text-gray-500 leading-tight">Miami, FL</p>
        </div>

        <div className="px-5 py-4 border-t border-gray-200/60">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Logged in as:</p>
          <p className="text-[14px] font-semibold text-gray-900">Thrilz Network</p>
          <p className="text-[12px] text-gray-500">Admin Access</p>
        </div>

        <div className="px-3 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold px-2 mb-1">Dashboard</p>
          {dashboardNav.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                item.active
                  ? 'bg-[#0D9488] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200/50'
              }`}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="px-3 py-2 flex-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold px-2 mb-1">Management</p>
          {managementNav.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-600 hover:bg-gray-200/50 transition-colors"
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun size={14} className="text-amber-500" />
              <span className="text-[12px] font-semibold text-gray-700">Light Mode</span>
            </div>
            <button
              onClick={() => setLightMode(!lightMode)}
              className={`w-8 h-4.5 rounded-full transition-colors relative ${lightMode ? 'bg-amber-400' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${lightMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-emerald-500" />
              <span className="text-[12px] font-semibold text-gray-700">Low-Data Mode</span>
            </div>
            <button className="w-8 h-4.5 rounded-full bg-gray-300 relative">
              <span className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[26px] font-extrabold text-gray-900">Live Orders Dashboard</h1>
          <button
            onClick={refresh}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-transform"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase font-bold">Pending</p>
            <p className="text-[28px] font-extrabold text-gray-900">{requests.filter(r => r.status === 'pending').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase font-bold">In Progress</p>
            <p className="text-[28px] font-extrabold text-gray-900">{requests.filter(r => r.status === 'in-progress').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase font-bold">Completed</p>
            <p className="text-[28px] font-extrabold text-gray-900">{requests.filter(r => r.status === 'completed').length}</p>
          </div>
        </div>

        {/* Contact requests */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h3 className="text-[14px] font-bold text-gray-900 mb-3">Guest Contact Requests</h3>
          {requests.filter(r => r.type === 'Message').length === 0 ? (
            <p className="text-[13px] text-gray-500">No contact requests.</p>
          ) : (
            <div className="space-y-2">
              {requests.filter(r => r.type === 'Message').map(msg => (
                <div key={msg.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{msg.guest_name} — Room {msg.room}</p>
                    <p className="text-[12px] text-gray-500">{msg.details}</p>
                  </div>
                  <span className="text-[11px] text-gray-400">{new Date(msg.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pill tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              tab === 'active'
                ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Active Orders ({active.length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              tab === 'completed'
                ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Completed Orders ({completed.length})
          </button>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[13px] text-gray-500">Loading orders...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
                <p className="text-[13px] text-gray-500">
                  {tab === 'active' ? 'No active orders.' : 'No completed orders.'}
                </p>
              </div>
            ) : (
              visible.map(req => (
                <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${
                        req.status === 'pending' ? 'bg-amber-400' :
                        req.status === 'in-progress' ? 'bg-blue-400' : 'bg-emerald-400'
                      }`} />
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{req.type}</span>
                      <span className="text-[11px] text-gray-400">• {new Date(req.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-[14px] font-bold text-gray-900 mb-0.5">
                      {req.guest_name} — Room {req.room}
                    </p>
                    <p className="text-[13px] text-gray-600 truncate">{req.details}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={async () => { await updateRequestStatus(req.id, 'in-progress'); refresh(); }}
                          className="px-3 py-1.5 rounded-lg bg-[#0D9488]/10 text-[#0D9488] text-[11px] font-bold hover:bg-[#0D9488]/20 active:scale-95 transition-transform"
                        >
                          Start
                        </button>
                        <button
                          onClick={async () => { await deleteRequest(req.id); refresh(); }}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-100 active:scale-95 transition-transform"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {req.status === 'in-progress' && (
                      <button
                        onClick={async () => { await updateRequestStatus(req.id, 'completed'); refresh(); }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold hover:bg-emerald-100 active:scale-95 transition-transform"
                      >
                        Done
                      </button>
                    )}
                    {req.status === 'completed' && (
                      <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-bold">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
