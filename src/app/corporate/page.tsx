'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building2, Mail, Lock } from 'lucide-react';

const TEAL = '#158A7C';

export default function CorporateLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        // Already signed in — check corporate membership server-side.
        const res = await fetch(`/api/corporate/me?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        if (res.ok) {
          const d = await res.json();
          router.replace(d.onboardingCompleted ? '/corporate/my-day' : '/corporate/story');
          return;
        }
      }
      setLoading(false);
    })();
  }, [router]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSigning(true);
    const { supabase } = await import('@/lib/supabase');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setSigning(false); return; }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`/api/corporate/me?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setError('This account is not an Attenda Corporate member.');
      await supabase.auth.signOut();
      setSigning(false);
      return;
    }
    const d = await res.json();
    router.replace(d.onboardingCompleted ? '/corporate/my-day' : '/corporate/story');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0B3B36] via-[#0E4A43] to-[#0B3B36] px-4">
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      ) : (
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <Building2 className="h-7 w-7 text-[#5ECFC0]" />
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
              Attenda Corporate
            </h1>
            <p className="mt-1 text-sm text-white/60">The digital corporate office</p>
          </div>

          <form onSubmit={signIn} className="space-y-3 rounded-3xl bg-white p-5 shadow-2xl">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <Mail className="h-3.5 w-3.5" /> Work email
              </span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                placeholder="you@attenda.com" autoComplete="email" />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <Lock className="h-3.5 w-3.5" /> Password
              </span>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                placeholder="••••••••" autoComplete="current-password" />
            </label>
            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={signing}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, #3BBCAC, ${TEAL})` }}>
              {signing && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>
            <p className="pt-1 text-center text-[11px] leading-snug text-gray-400">
              Access is granted by the super admin. Onboarding must be completed before the workspace unlocks.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}