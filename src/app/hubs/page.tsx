'use client';

import { useState, useEffect } from 'react';
import { getMyHubs, getHubs, supabase, type Hub } from '@/lib/supabase';
import HubSidebar from '@/components/hubs/HubSidebar';
import HubView from '@/components/hubs/HubView';

export default function HubDemoPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [assignedHubSlugs, setAssignedHubSlugs] = useState<Set<string>>(new Set());
  const [currentHub, setCurrentHub] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [session, setSession] = useState<{ user: { id: string; email: string } } | null>(null);
  const [staffInfo, setStaffInfo] = useState<{ id: string; name: string; role: string; hotel_id: string; department: string } | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession(data.session as never);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const email = (session as { user: { email: string } }).user.email;
      const { data: staff } = await supabase.from('staff_accounts').select('id, name, role, hotel_id, department').ilike('email', email).single();
      if (staff) {
        setStaffInfo(staff as never);
        // Fetch ALL hubs (for view-only sidebar) + assigned hubs (for interaction)
        const [allHubs, myHubs] = await Promise.all([
          getHubs(staff.hotel_id),
          getMyHubs(staff.hotel_id, staff.id),
        ]);
        setHubs(allHubs);
        setAssignedHubSlugs(new Set(myHubs.map(h => h.slug)));
        if (allHubs.length > 0) setCurrentHub(allHubs[0].slug);
      }
    })();
  }, [session]);

  const login = async () => {
    setLoginError('');
    const { data, error } = await supabase.auth.signInWithPassword(loginForm);
    if (error) { setLoginError(error.message); return; }
    setSession(data.session as never);
  };

  const logout = () => { supabase.auth.signOut(); setSession(null); setStaffInfo(null); setHubs([]); };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[18px]" style={{ backgroundColor: '#0D9488' }}>A</div>
            <span className="text-[20px] font-bold text-gray-900">Attenda</span>
          </div>
          <p className="text-[13px] text-gray-500 mb-4">Sign in to access your hubs</p>
          <input value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} placeholder="Email" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 mb-3" />
          <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Password" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 mb-3" />
          {loginError && <p className="text-[12px] text-red-600 mb-3">{loginError}</p>}
          <button onClick={login} className="w-full text-white py-3 rounded-xl text-[14px] font-bold" style={{ backgroundColor: '#0D9488' }}>Sign In</button>
          <p className="text-[11px] text-gray-400 mt-3 text-center">Use your Attenda staff credentials</p>
        </div>
      </div>
    );
  }

  if (!staffInfo) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading your hubs…</div>;

  const activeHub = hubs.find(h => h.slug === currentHub);
  const isAdmin = staffInfo.role === 'admin' || staffInfo.role === 'superadmin' || staffInfo.role === 'manager';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <HubSidebar
        hotelId={staffInfo.hotel_id}
        staffId={staffInfo.id}
        staffName={staffInfo.name}
        isAdmin={isAdmin}
        currentHub={currentHub}
        onSelectHub={(slug) => { setCurrentHub(slug); setCurrentTool(null); }}
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        onLogout={logout}
        assignedHubSlugs={assignedHubSlugs}
      />
      <div className="flex-1 pt-16 md:pt-0">
        {activeHub ? (
          <HubView
            hotelId={staffInfo.hotel_id}
            hub={activeHub}
            tool={currentTool}
            staffName={staffInfo.name}
            isAdmin={isAdmin}
            hotelName="Your Hotel"
            isAssigned={assignedHubSlugs.has(activeHub.slug)}
          />
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p className="text-[15px] mb-2">You haven&apos;t been assigned to any hubs yet.</p>
            <p className="text-[13px]">Ask your manager to assign you to a department hub.</p>
          </div>
        )}
      </div>
    </div>
  );
}