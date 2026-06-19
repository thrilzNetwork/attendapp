'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogIn, Store } from 'lucide-react';

function VendorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/vendor-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Login failed');

      // Persist the session in the supabase client so /vendor sees it
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      router.push('/vendor');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-3">
            <Store size={26} className="text-white" />
          </div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Vendor Login</h1>
          <p className="text-[13px] text-gray-500 mt-1">Sign in to see your orders</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <div>
            <label className="text-[12px] font-bold text-gray-500 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-[14px] outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="text-[12px] font-bold text-gray-500 block mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Your password"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-[14px] outline-none focus:border-teal-500" />
          </div>
          {error && <p className="text-[12px] text-red-600 font-medium">{error}</p>}
          <button onClick={submit} disabled={loading || !email || !password}
            className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60">
            <LogIn size={15} /> {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-7 h-7 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" /></div>}>
      <VendorLogin />
    </Suspense>
  );
}
