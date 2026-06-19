'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, getHotelConfig } from '@/lib/supabase';
import { Eye, EyeOff, Check, Lock, Mail } from 'lucide-react';

const TEAL = '#0D9488';

function SetupContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const hotel = params.get('hotel') || '';

  const [showPass, setShowPass] = useState(false);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hotelName, setHotelName] = useState('');

  useEffect(() => {
    if (hotel) getHotelConfig(hotel).then(c => { if (c?.name) setHotelName(c.name); });
  }, [hotel]);

  const handleSetup = async () => {
    if (!password || !name) { setError('All fields required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    setError('');
    try {
      // Create the auth user server-side (pre-confirmed) and link it to the existing
      // invited staff_accounts row — avoids the client signUp() email-confirmation
      // trap that previously locked staff out of their accounts.
      const res = await fetch('/api/staff-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'setup', email, password, name, hotelSlug: hotel }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Setup failed.');

      // Sign in immediately so the dashboard has a session
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      router.push(`/staff?hotel=${hotel}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Setup failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
          <Lock size={24} style={{ color: TEAL }} />
        </div>
        <h1 className="text-xl font-bold text-center mb-1">Complete Your Account</h1>
        <p className="text-sm text-gray-400 text-center mb-6">
          {hotelName ? `${hotelName}` : 'Your property'} has invited you to join Attenda.
        </p>

        <div className="flex items-center gap-3 mb-6 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <Mail size={16} className="text-gray-400" />
          <span className="text-[13px] font-semibold text-gray-700">{email}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Full Name</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Your full name"
              className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="At least 6 characters"
                className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400 pr-11"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-[12px] text-center bg-red-50 py-2 rounded-lg">{error}</p>}
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: TEAL }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {loading ? 'Creating Account...' : 'Complete Setup'}
          </button>
        </div>

        <p className="text-center mt-5 text-[12px] text-gray-400">
          Already have an account?{' '}
          <button onClick={() => router.push(`/staff?hotel=${hotel}`)} className="font-semibold underline" style={{ color: TEAL }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default function StaffSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
