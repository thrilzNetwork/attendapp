'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, CheckCircle, Store } from 'lucide-react';

function VendorSetup() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/vendor-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'setup', email, password, token }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Setup failed');
      setDone(true);
      setTimeout(() => router.push('/vendor/login'), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    }
    setSaving(false);
  };

  if (!email || !token) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center text-gray-500 font-semibold">
      Invalid setup link. Please use the link from your invitation email.
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-3">
            <Store size={26} className="text-white" />
          </div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Set up your vendor login</h1>
          <p className="text-[13px] text-gray-500 mt-1">{email}</p>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
            <CheckCircle size={36} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-[15px] font-bold text-gray-900">All set!</p>
            <p className="text-[13px] text-gray-500 mt-1">Taking you to login…</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <div>
              <label className="text-[12px] font-bold text-gray-500 block mb-1">Create Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-[14px] outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="text-[12px] font-bold text-gray-500 block mb-1">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Re-enter password"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-[14px] outline-none focus:border-teal-500" />
            </div>
            {error && <p className="text-[12px] text-red-600 font-medium">{error}</p>}
            <button onClick={submit} disabled={saving}
              className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60">
              <Lock size={15} /> {saving ? 'Setting up…' : 'Create Login'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VendorSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-7 h-7 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" /></div>}>
      <VendorSetup />
    </Suspense>
  );
}
