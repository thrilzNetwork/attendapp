'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, getAllHotels, createHotel } from '@/lib/supabase';
import { Building2, Copy, Check, LogOut, Globe, Eye, EyeOff, Lock } from 'lucide-react';

const TEAL = '#0D9488';

type Mode = 'checking' | 'signup' | 'login' | 'confirm' | 'dashboard' | 'unauthorized';

export default function SuperAdminPage() {
  const [mode, setMode] = useState<Mode>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [hotels, setHotels] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [form, setForm] = useState({ slug: '', name: '', adminEmail: '', lookupQuery: '', adminPhone: '', roomCount: 0, address: '', googleReviewUrl: '', tripadvisorUrl: '', yelpUrl: '' });
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState('');

  const loadHotels = useCallback(async () => {
    const data = await getAllHotels();
    setHotels(data);
  }, []);

  const checkSlot = async () => {
    const { data } = await supabase.from('superadmin_config').select('user_id, email').maybeSingle();
    return data as { user_id: string; email: string } | null;
  };

  const goToDashboard = useCallback((userEmail: string) => {
    setUser({ email: userEmail });
    setMode('dashboard');
    loadHotels();
  }, [loadHotels]);

  const registerAndEnter = useCallback(async (userId: string, userEmail: string) => {
    const { error: insertErr } = await supabase.from('superadmin_config').insert({
      user_id: userId,
      email: userEmail,
    });
    if (!insertErr) {
      goToDashboard(userEmail);
      return;
    }
    // Insert failed — might be a race; check if the slot is now ours
    const slot = await checkSlot();
    if (slot?.user_id === userId) {
      goToDashboard(userEmail);
    } else {
      await supabase.auth.signOut();
      setError('Setup error. Please try again.');
      setMode('signup');
    }
  }, [goToDashboard]);

  useEffect(() => {
    const init = async () => {
      // Use getSession() so the hash fragment (#access_token) is already parsed
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      const slot = await checkSlot();

      if (!slot && !currentUser) { setMode('signup'); return; }

      if (!slot && currentUser) {
        // Confirmed email redirect — register and enter
        await registerAndEnter(currentUser.id, currentUser.email!);
        return;
      }

      if (slot && !currentUser) { setMode('login'); return; }

      if (slot && currentUser) {
        if (currentUser.id === slot.user_id) {
          goToDashboard(currentUser.email!);
        } else {
          await supabase.auth.signOut();
          setMode('unauthorized');
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        const slot = await checkSlot();
        setMode(slot ? 'login' : 'signup');
      }
    });

    return () => subscription.unsubscribe();
  }, [goToDashboard, registerAndEnter]);

  /* ── Signup ─────────────────────────────────────────────── */
  const handleSignup = async () => {
    if (!email || !password) { setError('Email and password are required.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/superadmin` },
      });
      if (authErr) throw authErr;
      if (data.session) {
        // Auto-confirm is ON — register immediately
        await registerAndEnter(data.user!.id, email);
      } else {
        setMode('confirm');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signup failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Login ──────────────────────────────────────────────── */
  const handleLogin = async () => {
    if (!email || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      const slot = await checkSlot();
      if (data.user?.id !== slot?.user_id) {
        await supabase.auth.signOut();
        setError('This account is not the platform superadmin.');
        return;
      }
      goToDashboard(data.user!.email!);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  /* ── Create hotel ───────────────────────────────────────── */
  const handleCreate = async () => {
    if (!form.slug || !form.name) return;
    setCreating(true);
    setCreateError('');
    try {
      const hotel = await createHotel({
        slug: form.slug,
        name: form.name,
        address: form.address || undefined,
        adminPhone: form.adminPhone || undefined,
        roomCount: form.roomCount || undefined,
        adminEmail: form.adminEmail || undefined,
        googleReviewUrl: form.googleReviewUrl || undefined,
        tripadvisorUrl: form.tripadvisorUrl || undefined,
        yelpUrl: form.yelpUrl || undefined,
      });
      if (form.adminEmail && hotel) {
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'tenant_onboarding',
            data: {
              hotelName: form.name,
              slug: form.slug,
              adminEmail: form.adminEmail,
              guestUrl: getGuestUrl(form.slug),
              adminUrl: getAdminUrl(form.slug),
            },
          }),
        }).catch(() => {});
      }
      setForm({ slug: '', name: '', adminEmail: '', lookupQuery: '', adminPhone: '', roomCount: 0, address: '', googleReviewUrl: '', tripadvisorUrl: '', yelpUrl: '' });
      loadHotels();
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : '') || (typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : '') || 'Failed to create property. Please try again.';
      if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already')) {
        setCreateError('That URL slug is already taken. Try a different one (e.g. "miami-airport-2").');
      } else if (msg.includes('violates') || msg.includes('row')) {
        setCreateError('Database error. Check that the slug only uses letters, numbers, and dashes.');
      } else {
        setCreateError(msg);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda-one.vercel.app';
  const getGuestUrl = (slug: string) => `${baseUrl}/?hotel=${slug}`;
  const getAdminUrl = (slug: string) => `${baseUrl}/staff?hotel=${slug}`;

  /* ── Loading ────────────────────────────────────────────── */
  if (mode === 'checking') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  /* ── Email confirm pending ──────────────────────────────── */
  if (mode === 'confirm') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">📧</span>
        </div>
        <h2 className="text-lg font-bold mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 mb-2">A confirmation link was sent to</p>
        <p className="text-sm font-bold text-gray-800 mb-6">{email}</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Click the link in the email to confirm your account. You&apos;ll be automatically redirected to your dashboard.
        </p>
        <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-3 text-left">
          <p className="text-[11px] text-amber-700 font-semibold mb-1">Tip for faster setup</p>
          <p className="text-[11px] text-amber-600">In your Supabase dashboard → Authentication → Providers → Email → disable &quot;Confirm email&quot; to skip this step.</p>
        </div>
        <button onClick={() => { setMode('login'); setError(''); }} className="mt-5 text-sm font-semibold underline" style={{ color: TEAL }}>
          Already confirmed? Sign in →
        </button>
      </div>
    </div>
  );

  /* ── Unauthorized ───────────────────────────────────────── */
  if (mode === 'unauthorized') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⛔</span>
        </div>
        <h2 className="text-lg font-bold mb-2">Access Denied</h2>
        <p className="text-sm text-gray-400 mb-6">This account is not the registered superadmin.</p>
        <button onClick={() => supabase.auth.signOut()} className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-[14px]">
          Sign out
        </button>
      </div>
    </div>
  );

  /* ── Signup / Login form ────────────────────────────────── */
  if (mode === 'signup' || mode === 'login') {
    const isSignup = mode === 'signup';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-teal-50">
            <Globe size={28} className="text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">
            {isSignup ? 'Create Super Admin Account' : 'Super Admin Login'}
          </h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            {isSignup ? 'Set up the platform master account. Only one allowed.' : 'Sign in to manage all properties.'}
          </p>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              autoComplete="email"
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && (isSignup ? handleSignup() : handleLogin())}
              className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
            />
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && (isSignup ? handleSignup() : handleLogin())}
                className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400 pr-11"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {isSignup && (
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
              />
            )}
            {error && <p className="text-red-500 text-[12px] text-center bg-red-50 py-2 rounded-lg">{error}</p>}
            <button
              onClick={isSignup ? handleSignup : handleLogin}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: TEAL }}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Lock size={16} />}
              {loading ? 'Please wait…' : isSignup ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </button>
          </div>

          <p className="text-center mt-5 text-[12px] text-gray-400">
            {isSignup ? (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="font-semibold underline" style={{ color: TEAL }}>Sign in</button>
              </>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <Lock size={11} /> Superadmin slot is locked to one account.
              </span>
            )}
          </p>
          <a href="/staff" className="block text-center mt-3 text-[12px] font-semibold underline" style={{ color: TEAL }}>
            ← Back to Staff Dashboard
          </a>
        </div>
      </div>
    );
  }

  /* ── Dashboard ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEAL }}>
            <span className="text-white font-bold text-[13px]">A</span>
          </div>
          <div>
            <h1 className="font-extrabold text-[16px] text-gray-900">Attenda Platform</h1>
            <p className="text-[11px] text-gray-400">{user?.email} · Super Admin</p>
          </div>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-red-500 transition-colors">
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Properties', value: hotels.length, color: 'text-teal-600' },
            { label: 'Active Tenants', value: hotels.length, color: 'text-emerald-600' },
            { label: 'Platform', value: 'Attenda', color: 'text-gray-900' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">{s.label}</p>
              <p className={`text-[26px] font-extrabold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Create hotel form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
          <h3 className="font-extrabold text-[16px] mb-1">+ Onboard New Property</h3>
          <p className="text-[12px] text-gray-400 mb-4">Paste the hotel website to auto-fill details, then create with one click.</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Hotel Name *</label>
              <input
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); setCreateError(''); }}
                placeholder="Miami Airport Hotel"
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">URL Slug *</label>
              <input
                value={form.slug}
                onChange={e => { setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }); setCreateError(''); }}
                placeholder="miami-airport"
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400 font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">
                Hotel Name + City <span className="normal-case text-gray-300">(auto-fills address & review links)</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={form.lookupQuery}
                  placeholder="Miami Airport Hotel, Miami FL"
                  className="flex-1 bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
                  onChange={e => setForm({ ...form, lookupQuery: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLInputElement).form?.querySelector('[data-action=lookup]')?.dispatchEvent(new Event('click', { bubbles: true }));
                    }
                  }}
                />
                <button
                  type="button"
                  data-action="lookup"
                  disabled={lookupLoading || !form.lookupQuery}
                  onClick={async () => {
                    if (!form.lookupQuery) return;
                    setLookupLoading(true);
                    setLookupStatus('Searching...');
                    try {
                      const res = await fetch('/api/lookup-hotel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: form.lookupQuery }),
                      });
                      const data = await res.json();
                      if (res.ok && data.found) {
                        setForm(prev => ({
                          ...prev,
                          address: data.address || prev.address || '',
                          googleReviewUrl: data.googleReviewUrl || '',
                          tripadvisorUrl: data.tripadvisorUrl || '',
                          yelpUrl: data.yelpUrl || '',
                        }));
                        setLookupStatus(`✅ Found: ${data.address?.split(',')[0]}`);
                      } else {
                        // Even if address not found, generate review links
                        setForm(prev => ({
                          ...prev,
                          googleReviewUrl: data.googleReviewUrl || `https://www.google.com/search?q=${encodeURIComponent(form.lookupQuery + ' reviews')}`,
                          tripadvisorUrl: data.tripadvisorUrl || `https://www.tripadvisor.com/Search?q=${encodeURIComponent(form.lookupQuery)}`,
                          yelpUrl: data.yelpUrl || `https://www.yelp.com/search?find_desc=${encodeURIComponent(form.lookupQuery)}`,
                        }));
                        setLookupStatus('⚠️ Address not found. Fill manually. Review links generated.');
                      }
                    } catch {
                      setLookupStatus('⚠️ Lookup failed. Enter info manually.');
                    } finally {
                      setLookupLoading(false);
                    }
                  }}
                  className="px-4 py-3 rounded-xl text-white font-semibold text-[13px] whitespace-nowrap disabled:opacity-50"
                  style={{ backgroundColor: TEAL }}
                >
                  {lookupLoading ? '...' : 'Look Up'}
                </button>
              </div>
              {lookupStatus && <p className="text-[11px] text-gray-500 mt-1">{lookupStatus}</p>}
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Contact Phone</label>
              <input
                value={form.adminPhone}
                onChange={e => setForm({ ...form, adminPhone: e.target.value })}
                placeholder="305-555-0100"
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">
                Number of Rooms <span className="normal-case text-gray-300">(auto-generates QR codes)</span>
              </label>
              <input
                type="number"
                min="0"
                max="2000"
                value={form.roomCount || ''}
                onChange={e => setForm({ ...form, roomCount: parseInt(e.target.value) || 0 })}
                placeholder="80"
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">
                Admin Email <span className="normal-case text-gray-300">(optional — sends onboarding email)</span>
              </label>
              <input
                value={form.adminEmail}
                onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                placeholder="manager@hotel.com"
                type="email"
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>
          {form.slug && (
            <div className="bg-gray-50 rounded-xl px-4 py-2.5 mb-3 space-y-0.5">
              <p className="text-[11px] text-gray-400 font-mono">Guest: {getGuestUrl(form.slug)}</p>
              <p className="text-[11px] text-gray-400 font-mono">Admin: {getAdminUrl(form.slug)}</p>
            </div>
          )}
          {createError && (
            <div className="mb-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-[12px] text-red-600">{createError}</p>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={creating || !form.slug || !form.name}
            className="px-6 py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-50 transition-all flex items-center gap-2"
            style={{ backgroundColor: TEAL }}
          >
            {creating && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {creating ? 'Creating…' : 'CREATE PROPERTY'}
          </button>
        </div>

        {/* Hotels list */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-extrabold text-gray-900">All Properties ({hotels.length})</h2>
          <button onClick={loadHotels} className="text-[12px] font-semibold text-gray-400 hover:text-teal-600 transition-colors">
            ↻ Refresh
          </button>
        </div>
        <div className="space-y-4">
          {hotels.map(hotel => {
            const guestUrl = getGuestUrl(hotel.slug);
            const adminUrl = getAdminUrl(hotel.slug);
            return (
              <div key={hotel.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="font-extrabold text-[16px] text-gray-900">{hotel.name}</p>
                    <p className="text-[12px] text-gray-400 font-mono">@{hotel.slug}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {([
                    { label: 'Guest App URL', url: guestUrl, id: hotel.id + '-guest', note: 'Share with guests or use in QR codes' },
                    { label: 'Admin / Staff URL', url: adminUrl, id: hotel.id + '-admin', note: 'Send to hotel admin • Default admin PIN: 2025' },
                  ] as const).map(({ label, url, id, note }) => (
                    <div key={id} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                        <p className="text-[12px] text-gray-700 font-mono truncate mt-0.5">{url}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(url, id)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors"
                        style={{ backgroundColor: `${TEAL}18`, color: TEAL }}
                      >
                        {copied === id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {hotels.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
              <Building2 size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-[13px] text-gray-500">No properties yet. Create your first above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
