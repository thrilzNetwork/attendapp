'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, getAllHotels, createHotel, deleteHotel, toggleHotelActive, toggleCloverForPartner } from '@/lib/supabase';
import { Building2, Copy, Check, LogOut, Globe, Eye, EyeOff, Lock, Trash2, RefreshCw, ChevronDown, ChevronUp, Power, PowerOff, Settings } from 'lucide-react';

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
  const [form, setForm] = useState({ slug: '', name: '', adminEmail: '', lookupQuery: '', adminPhone: '', roomCount: 0, address: '', googleReviewUrl: '', tripadvisorUrl: '', yelpUrl: '', websiteUrl: '' });
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState('');
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [syncingHotel, setSyncingHotel] = useState<string | null>(null);
interface HotelHealth {
  id: string;
  slug: string;
  name: string;
  roomCount: number;
  isActive: boolean;
  metrics: {
    requestsToday: number;
    requestsWeek: number;
    foodOrdersToday: number;
    revenueMonth: number;
    revenueLifetime: number;
    staffCount: number;
    partnerCount: number;
    cloverPartnerCount: number;
    cloverPartners: { id: string; name: string; clover_enabled: boolean }[];
    lastActivity: string | null;
  };
}

interface PlatformHealth {
  hotels: HotelHealth[];
  totals: {
    hotels: number;
    activeHotels: number;
    requestsToday: number;
    requestsWeek: number;
    foodOrders: number;
    revenue: number;
    partners: number;
    cloverPartners: number;
    staff: number;
    rooms: number;
  };
}

  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const loadHotels = useCallback(async () => {
    const data = await getAllHotels();
    setHotels(data);
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/hotel-health');
      const data = await res.json();
      if (res.ok) setHealth(data);
    } catch { /* silently fail, data will show 0s */ }
    finally { setHealthLoading(false); }
  }, []);

  const checkSlot = async () => {
    const { data } = await supabase.from('superadmin_config').select('user_id, email').maybeSingle();
    return data as { user_id: string; email: string } | null;
  };

    const goToDashboard = useCallback((userEmail: string) => {
    setUser({ email: userEmail });
    setMode('dashboard');
    loadHotels();
    loadHealth();
  }, [loadHotels, loadHealth]);

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
      setForm({ slug: '', name: '', adminEmail: '', lookupQuery: '', adminPhone: '', roomCount: 0, address: '', googleReviewUrl: '', tripadvisorUrl: '', yelpUrl: '', websiteUrl: '' });
      loadHotels();
      loadHealth();
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
        {/* Platform Health Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {health ? [
            { label: 'Hotels', value: health.totals.hotels, sub: `${health.totals.activeHotels} active`, color: 'text-teal-600' },
            { label: 'Orders Today', value: health.totals.foodOrders, sub: `${health.totals.requestsToday} requests`, color: 'text-amber-600' },
            { label: 'Revenue', value: `$${health.totals.revenue.toFixed(2)}`, sub: 'this month', color: 'text-emerald-600' },
            { label: 'Partners', value: health.totals.partners, sub: `${health.totals.cloverPartners} Clover`, color: 'text-purple-600' },
            { label: 'Staff', value: health.totals.staff, sub: `${health.totals.rooms} rooms`, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{s.label}</p>
              <p className={`text-[22px] font-extrabold mt-0.5 ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400">{s.sub}</p>
            </div>
          )) : (
            <div className="col-span-5 flex items-center justify-center py-8 text-[13px] text-gray-400">
              {healthLoading ? 'Loading platform health...' : 'Failed to load health data'}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-extrabold text-gray-900">All Properties ({health?.totals?.hotels || hotels.length})</h2>
          <div className="flex gap-2">
            <button onClick={() => { loadHealth(); loadHotels(); }} className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-teal-600 transition-colors">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
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
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">
                Hotel Website <span className="normal-case text-gray-300">(auto-fills name, address &amp; contacts)</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={form.websiteUrl}
                  onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
                  placeholder="https://www.bestwestern.com/..."
                  className="flex-1 bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  disabled={scrapeLoading || !form.websiteUrl}
                  onClick={async () => {
                    if (!form.websiteUrl) return;
                    setScrapeLoading(true);
                    try {
                      const res = await fetch('/api/scrape-hotel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: form.websiteUrl }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Scrape failed');
                      setForm(prev => ({
                        ...prev,
                        name: data.name || prev.name,
                        address: data.address || prev.address,
                        adminPhone: data.phone || prev.adminPhone,
                        googleReviewUrl: data.googleReviewUrl || prev.googleReviewUrl,
                        tripadvisorUrl: data.tripadvisorUrl || prev.tripadvisorUrl,
                        yelpUrl: data.yelpUrl || prev.yelpUrl,
                      }));
                      setLookupStatus('✅ Scraped: ' + (data.name || 'website data imported'));
                    } catch (e) {
                      setLookupStatus('⚠️ Scrape failed: ' + (e as Error).message);
                    } finally {
                      setScrapeLoading(false);
                    }
                  }}
                  className="px-4 py-3 rounded-xl text-white font-semibold text-[13px] whitespace-nowrap disabled:opacity-50"
                  style={{ backgroundColor: '#7C3AED' }}
                >
                  {scrapeLoading ? '...' : 'Scrape'}
                </button>
              </div>
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
        <div className="space-y-3">
          {(health?.hotels || []).map((hotel) => {
            const guestUrl = getGuestUrl(hotel.slug);
            const adminUrl = getAdminUrl(hotel.slug);
            const m = hotel.metrics;
            const expanded = expandedHotel === hotel.id;
            return (
              <div key={hotel.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                        <Building2 size={20} className="text-teal-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-[16px] text-gray-900">{hotel.name}</p>
                          {!(hotel as HotelHealth).isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">INACTIVE</span>}
                        </div>
                        <p className="text-[12px] text-gray-400 font-mono">@{hotel.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a href={`/staff?hotel=${hotel.slug}`} target="_blank" rel="noopener"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-500 hover:bg-gray-100">
                        <Settings size={12} /> Staff Panel
                      </a>
                        <button
                        onClick={async () => {
                          setSyncingHotel(hotel.id);
                          try {
                            const { data: row } = await supabase.from('hotels').select('address').eq('id', hotel.id).single();
                            const address = row?.address;
                            if (!address) { alert('Set a hotel address in Hotel Settings first.'); return; }
                            const res = await fetch('/api/places-sync', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ hotelId: hotel.id, address }),
                            });
                            const d = await res.json();
                            if (!res.ok) throw new Error(d.error);
                            alert(`Synced! Added ${d.added} new places (${d.total} found nearby)`);
                          } catch (e) { alert('Sync failed: ' + (e as Error).message); }
                          finally { setSyncingHotel(null); }
                        }}
                        disabled={syncingHotel === hotel.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                        title="Sync nearby places from OpenStreetMap"
                      >
                        {syncingHotel === hotel.id ? <RefreshCw size={11} className="animate-spin" /> : <Globe size={11} />}
                        Sync
                      </button>
                    <button onClick={() => setExpandedHotel(expanded ? null : hotel.id)}
                        className="px-2 py-1.5">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Mini metrics */}
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {[
                      { label: 'Orders', value: m.foodOrdersToday || 0, color: 'text-amber-600' },
                      { label: 'Requests', value: m.requestsToday || 0, color: 'text-blue-600' },
                      { label: 'Revenue', value: `$${(m.revenueMonth || 0).toFixed(0)}`, color: 'text-emerald-600' },
                      { label: 'Partners', value: `${m.cloverPartnerCount || 0}/${m.partnerCount || 0} Clover`, color: 'text-purple-600' },
                      { label: 'Last Active', value: m.lastActivity ? new Date(m.lastActivity).toLocaleDateString() : 'Never', color: 'text-gray-500' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[9px] text-gray-400 uppercase font-bold">{s.label}</p>
                        <p className={`text-[13px] font-extrabold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => handleCopy(guestUrl, hotel.id + '-guest')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">
                      {copied === hotel.id + '-guest' ? <Check size={11} /> : <Copy size={11} />}
                      Copy Guest URL
                    </button>
                    <button onClick={() => handleCopy(adminUrl, hotel.id + '-admin')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">
                      {copied === hotel.id + '-admin' ? <Check size={11} /> : <Copy size={11} />}
                      Copy Admin URL
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={async () => {
                        await toggleHotelActive(hotel.id, !hotel.isActive);
                        loadHealth();
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold ${hotel.isActive ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                    >
                      {hotel.isActive ? <><PowerOff size={11} /> Deactivate</> : <><Power size={11} /> Activate</>}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`PERMANENTLY DELETE "${hotel.name}" and ALL its data?\n\nThis removes: partners, menus, QR codes, requests, messages, staff accounts, and revenue history.\n\nThis CANNOT be undone.`)) return;
                        if (!confirm('Type "DELETE" to confirm:')) return;
                        await deleteHotel(hotel.id);
                        loadHotels();
                        loadHealth();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-4">
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Clover Partners ({m.cloverPartnerCount || 0})
                      </h4>
                      {(m.cloverPartners || []).length === 0 ? (
                        <p className="text-[12px] text-gray-400">No Clover partners yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {(m.cloverPartners || []).map((p) => (
                            <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <span className="text-[12px] font-semibold text-gray-800">{p.name}</span>
                              <button
                                onClick={async () => {
                                  await toggleCloverForPartner(p.id, !p.clover_enabled);
                                  loadHealth();
                                }}
                                className={`text-[10px] font-bold px-2 py-1 rounded ${p.clover_enabled ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                              >
                                {p.clover_enabled ? 'Disable Clover' : 'Enable Clover'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Property Info</h4>
                        <div className="space-y-1 text-[12px] text-gray-700">
                          <p>Rooms: {hotel.roomCount || 'Not set'}</p>
                          <p>Slug: @{hotel.slug}</p>
                          <p>Status: {hotel.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Revenue Detail</h4>
                        <div className="space-y-1 text-[12px] text-gray-700">
                          <p>This month: ${(m.revenueMonth || 0).toFixed(2)}</p>
                          <p>Lifetime: ${(m.revenueLifetime || 0).toFixed(2)}</p>
                          <p>Orders today: {m.foodOrdersToday || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {(!health?.hotels?.length && hotels.length === 0) && (
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
