'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AgentDashboard from '@/components/agent/AgentDashboard';

export default function AgentDashboardPage() {
  const [session, setSession] = useState<{ user: { email: string } } | null>(null);
  const [staffInfo, setStaffInfo] = useState<{ hotel_id: string; name: string } | null>(null);
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
      const { data: staff } = await supabase.from('staff_accounts').select('hotel_id, name').ilike('email', email).single();
      if (staff) setStaffInfo(staff as never);
    })();
  }, [session]);

  const login = async () => {
    setLoginError('');
    const { data, error } = await supabase.auth.signInWithPassword(loginForm);
    if (error) { setLoginError(error.message); return; }
    setSession(data.session as never);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm w-full max-w-sm">
          <h1 className="text-[18px] font-bold text-gray-900 mb-1">🤖 AI Agent Dashboard</h1>
          <p className="text-[13px] text-gray-500 mb-4">Sign in to view agent activity</p>
          <input value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} placeholder="Email" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 mb-3" />
          <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Password" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 mb-3" />
          {loginError && <p className="text-[12px] text-red-600 mb-3">{loginError}</p>}
          <button onClick={login} className="w-full text-white py-3 rounded-xl text-[14px] font-bold" style={{ backgroundColor: '#0D9488' }}>Sign In</button>
        </div>
      </div>
    );
  }

  if (!staffInfo) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[28px]">🤖</span>
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">AI Agent Dashboard</h1>
            <p className="text-[12px] text-gray-400">Live agent calls and requests for {staffInfo.name}</p>
          </div>
        </div>
        <AgentDashboard hotelId={staffInfo.hotel_id} hotelName={staffInfo.name || 'Hotel'} />
      </div>
    </div>
  );
}