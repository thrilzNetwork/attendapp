'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Check, Lock, Mail } from 'lucide-react';

const TEAL = '#0D9488';

function ResetPasswordContent() {
  const router = useRouter();

  // 'request' = ask for email and send the reset link.
  // 'update'  = the recovery link landed here and Supabase already opened a session.
  const [mode, setMode] = useState<'loading' | 'request' | 'update'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('update');
    });
    supabase.auth.getSession().then(({ data }) => {
      setMode(prev => (prev === 'loading' ? (data.session ? 'update' : 'request') : prev));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleRequestReset = async () => {
    if (!email) { setError('Enter your email address.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/staff/reset-password`,
      });
      if (err) throw err;
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <Check size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold mb-2">Password Updated</h2>
          <p className="text-sm text-gray-500 mb-6">You can now sign in with your new password.</p>
          <button
            onClick={() => router.push('/staff')}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px]"
            style={{ backgroundColor: TEAL }}
          >
            Go to Sign In →
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'update') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
            <Lock size={24} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">Set a New Password</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Choose a new password for your account.</p>
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleUpdatePassword()}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400 pr-11"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {error && <p className="text-red-500 text-[12px] text-center bg-red-50 py-2 rounded-lg">{error}</p>}
            <button
              onClick={handleUpdatePassword}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: TEAL }}
            >
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
              {loading ? 'Saving...' : 'Save New Password'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // mode === 'request'
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
          <Mail size={24} style={{ color: TEAL }} />
        </div>
        <h1 className="text-xl font-bold text-center mb-1">Reset Your Password</h1>
        <p className="text-sm text-gray-400 text-center mb-6">Enter your email and we&apos;ll send you a reset link.</p>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <Check size={28} className="text-emerald-500" />
            </div>
            <p className="text-sm text-gray-600 mb-2 font-semibold">Check your email</p>
            <p className="text-[13px] text-gray-400">We sent a password reset link to {email}. Click it to set a new password.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleRequestReset()}
              placeholder="Email address"
              autoComplete="email"
              className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
            />
            {error && <p className="text-red-500 text-[12px] text-center bg-red-50 py-2 rounded-lg">{error}</p>}
            <button
              onClick={handleRequestReset}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: TEAL }}
            >
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Mail size={16} />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        )}

        <p className="text-center mt-5 text-[12px] text-gray-400">
          <button onClick={() => router.push('/staff')} className="font-semibold underline" style={{ color: TEAL }}>
            Back to Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
