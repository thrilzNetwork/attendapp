'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { OpsTool } from '@/lib/supabase';
import { Building2, Copy, Check, LogOut, Globe, Eye, EyeOff, Lock, Trash2, RefreshCw, ChevronDown, ChevronUp, Power, PowerOff, Settings, Plus, Users, UserPlus, KeyRound, Pencil, X } from 'lucide-react';

const TEAL = '#158A7C';

// Helper: call superadmin proxy API (bypasses RLS via service_role)
async function callAdmin(action: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch('/api/superadmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Admin API error');
  return data;
}

type Mode = 'checking' | 'signup' | 'login' | 'confirm' | 'dashboard' | 'unauthorized';
type SuperTab = 'overview' | 'properties' | 'people' | 'ops-tools' | 'corporate';

interface StaffRow {
  id: string;
  hotel_id: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
  created_at: string;
  hotels: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

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
  const [form, setForm] = useState({ slug: '', name: '', adminEmail: '', lookupQuery: '', adminPhone: '', roomCount: 0, address: '', googleReviewUrl: '', tripadvisorUrl: '', yelpUrl: '', websiteUrl: '', propertyType: 'Hotel' });
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState('');
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [syncingHotel, setSyncingHotel] = useState<string | null>(null);
  const [superTab, setSuperTab] = useState<SuperTab>('overview');

  // Command Center state
  const [overview, setOverview] = useState<{ corporateUsers: number; corporateOnboardingIncomplete: number; talentCount: number; partnerCount: number; staffTotal: number; recent: { kind: string; label: string; at: string }[] } | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, { status: string; detail: string }> | null>(null);

  // Ops Tools state
  const [allOpsTools, setAllOpsTools] = useState<OpsTool[]>([]);
  const [showNewTool, setShowNewTool] = useState(false);
  const [newTool, setNewTool] = useState({ name: '', key: '', icon: 'Tool', description: '', category: 'front_desk' });
  // Per-hotel tool management
  const [selectedHotelTools, setSelectedHotelTools] = useState<string | null>(null);
  const [hotelToolToggles, setHotelToolToggles] = useState<Record<string, boolean>>({});

  // People tab state (tenant staff across all properties)
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ hotelId: '', name: '', email: '', role: 'staff', pin: '' });
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [editStaff, setEditStaff] = useState<StaffRow | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({ name: '', email: '', role: 'staff', pin: '', active: true });
  const [resettingPin, setResettingPin] = useState<string | null>(null);

  // Property settings editor
  const [editProp, setEditProp] = useState<HotelHealth | null>(null);
  const [editPropForm, setEditPropForm] = useState({ name: '', address: '', roomCount: 0, adminPhone: '', notificationEmail: '', googleReviewUrl: '', tripadvisorUrl: '', yelpUrl: '', websiteUrl: '', brand: 'Hotel' });
  const [editPropSaving, setEditPropSaving] = useState(false);

  // Corporate member creation (onboard corporate people without leaving the console)
  const [showCorpCreate, setShowCorpCreate] = useState(false);
  const [corpForm, setCorpForm] = useState({ name: '', email: '', password: '', title: '' });
  const [corpSaving, setCorpSaving] = useState(false);
  const [corpError, setCorpError] = useState('');
  const [corpCreds, setCorpCreds] = useState<{ email: string; password: string; name: string } | null>(null);
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
    staff: number;
    rooms: number;
  };
}

  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const loadHotels = useCallback(async () => {
    const { data } = await callAdmin('get_hotels');
    setHotels(data);
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/hotel-health', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setHealth(data);
    } catch { /* silently fail, data will show 0s */ }
    finally { setHealthLoading(false); }
  }, []);

  const checkSlot = async (token?: string) => {
    if (token) {
      // Authenticated check via API (bypasses RLS)
      const res = await fetch('/api/superadmin-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok && data.existing) return { user_id: data.user_id, email: data.email };
      return null;
    }
    // Unauthenticated check — just see if slot exists
    const res = await fetch('/api/superadmin-setup');
    const data = await res.json();
    return data.exists ? { user_id: '__exists__', email: '' } as { user_id: string; email: string } : null;
  };

    const goToDashboard = useCallback((userEmail: string) => {
    setUser({ email: userEmail });
    setMode('dashboard');
    loadHotels();
    loadHealth();
  }, [loadHotels, loadHealth]);

  // Command Center loaders
  const loadOverview = useCallback(async () => {
    try { setOverview((await callAdmin('overview')).data || (await callAdmin('overview'))); } catch { /* silent */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadIntegrations = useCallback(async () => {
    try {
      const r = await fetch('/api/integration-status', { headers: { 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' } });
      if (r.ok) setIntegrations(await r.json());
    } catch { /* silent */ }
  }, []);

  const relTime = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  useEffect(() => {
    if (mode === 'dashboard') { loadOverview(); loadIntegrations(); }
  }, [mode, loadOverview, loadIntegrations]);

  const registerAndEnter = useCallback(async (userId: string, userEmail: string, sessionToken: string) => {
    const res = await fetch('/api/superadmin-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ action: 'register' }),
    });
    const data = await res.json();
    if (data.ok) {
      goToDashboard(userEmail);
      return;
    }
    // Setup failed
    await supabase.auth.signOut();
    setError('Setup error. Please try again.');
    setMode('signup');
  }, [goToDashboard]);

  useEffect(() => {
    const init = async () => {
      // Use getSession() so the hash fragment (#access_token) is already parsed
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      const slot = await checkSlot(session?.access_token);

      if (!slot && !currentUser) { setMode('signup'); return; }

      if (!slot && currentUser) {
        // Confirmed email redirect — register and enter
        await registerAndEnter(currentUser.id, currentUser.email!, session!.access_token);
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
        await registerAndEnter(data.user!.id, email, data.session!.access_token);
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
      const slot = await checkSlot(data.session?.access_token);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMode('login');
    setHotels([]);
    setHealth(null);
  };

  /* ── Create hotel ───────────────────────────────────────── */
  const handleCreate = async () => {
    if (!form.slug || !form.name) return;
    setCreating(true);
    setCreateError('');
    try {
      const hotelData = await callAdmin('create_hotel', {
        slug: form.slug,
        name: form.name,
        address: form.address || undefined,
        adminPhone: form.adminPhone || undefined,
        roomCount: form.roomCount || undefined,
        adminEmail: form.adminEmail || undefined,
        googleReviewUrl: form.googleReviewUrl || undefined,
        tripadvisorUrl: form.tripadvisorUrl || undefined,
        yelpUrl: form.yelpUrl || undefined,
        propertyType: form.propertyType,
      });
      if (form.adminEmail && hotelData.data) {
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
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
      setForm({ slug: '', name: '', adminEmail: '', lookupQuery: '', adminPhone: '', roomCount: 0, address: '', googleReviewUrl: '', tripadvisorUrl: '', yelpUrl: '', websiteUrl: '', propertyType: 'Hotel' });
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
        <div className="flex items-center gap-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setSuperTab('overview')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${superTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Command Center
            </button>
            <button onClick={() => setSuperTab('properties')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${superTab === 'properties' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Properties
            </button>
            <button onClick={async () => {
              setSuperTab('people');
              if (staff.length === 0 && !staffLoading) { setStaffLoading(true); try { setStaff((await callAdmin('list_all_staff')).data || []); } catch { } finally { setStaffLoading(false); } }
            }}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${superTab === 'people' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              People
            </button>
            <button onClick={async () => { setSuperTab('ops-tools'); if (allOpsTools.length === 0) setAllOpsTools((await callAdmin('get_ops_tools')).data); }}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${superTab === 'ops-tools' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Ops Tools
            </button>
            <button onClick={() => setSuperTab('corporate')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${superTab === 'corporate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Corporate
            </button>
            <a href="/superadmin/experiences" target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-md text-[12px] font-bold text-gray-500 hover:text-gray-700">
              Experiences
            </a>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-red-500 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {superTab === 'overview' && (
        <div className="max-w-5xl mx-auto px-8 py-8">
          {/* My Day strip */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mr-1">My Day</span>
            {(overview?.corporateOnboardingIncomplete || 0) > 0 && (
              <button onClick={() => setSuperTab('corporate')} className="rounded-full px-3 py-1.5 text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100">
                {overview!.corporateOnboardingIncomplete} onboarding{overview!.corporateOnboardingIncomplete > 1 ? 's' : ''} incomplete →
              </button>
            )}
            {(health?.totals.hotels || 0) - (health?.totals.activeHotels || 0) > 0 && (
              <button onClick={() => setSuperTab('properties')} className="rounded-full px-3 py-1.5 text-[11px] font-bold bg-red-50 text-red-600 hover:bg-red-100">
                {(health!.totals.hotels - health!.totals.activeHotels)} inactive propert{(health!.totals.hotels - health!.totals.activeHotels) > 1 ? 'ies' : 'y'} →
              </button>
            )}
            {(overview?.talentCount || 0) > 0 && (
              <button onClick={() => setSuperTab('corporate')} className="rounded-full px-3 py-1.5 text-[11px] font-bold bg-teal-50 hover:bg-teal-100" style={{ color: TEAL }}>
                {overview!.talentCount} talent in pipeline →
              </button>
            )}
            {integrations && Object.entries(integrations).filter(([, v]) => v && !['connected', 'ok'].includes(v.status)).length > 0 && (
              <button onClick={() => loadIntegrations()} className="rounded-full px-3 py-1.5 text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100">
                {Object.entries(integrations).filter(([, v]) => v && !['connected', 'ok'].includes(v.status)).length} integration{Object.entries(integrations).filter(([, v]) => v && !['connected', 'ok'].includes(v.status)).length > 1 ? 's' : ''} need attention →
              </button>
            )}
            {!(overview?.corporateOnboardingIncomplete) && !(overview?.talentCount) && (
              <span className="rounded-full px-3 py-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-600">All clear today</span>
            )}
          </div>

          {/* Needs attention + company snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-[13px] font-extrabold text-gray-900 mb-3">Needs attention</h3>
              <div className="space-y-2 text-[12px]">
                {(overview?.corporateOnboardingIncomplete || 0) > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2">
                    <span className="text-amber-700 font-semibold">{overview!.corporateOnboardingIncomplete} corporate member{overview!.corporateOnboardingIncomplete > 1 ? 's' : ''} mid-onboarding</span>
                    <button onClick={() => setSuperTab('corporate')} className="text-amber-700 font-bold underline">Open</button>
                  </div>
                )}
                {(health?.hotels || []).filter((h) => !h.isActive).map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
                    <span className="text-red-600 font-semibold">{h.name} is inactive</span>
                    <button onClick={() => setSuperTab('properties')} className="text-red-600 font-bold underline">Fix</button>
                  </div>
                ))}
                {integrations && Object.entries(integrations).filter(([, v]) => v && !['connected', 'ok'].includes(v.status)).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2">
                    <span className="text-purple-700 font-semibold capitalize">{k.replace('_', ' ')}: {v.status}</span>
                  </div>
                ))}
                {(overview?.corporateOnboardingIncomplete || 0) === 0 && (health?.hotels || []).every((h) => h.isActive) && (!integrations || Object.entries(integrations).every(([, v]) => !v || ['connected', 'ok'].includes(v.status))) && (
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-600 font-semibold">Nothing blocked — company is running clean.</div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-[13px] font-extrabold text-gray-900 mb-3">Company snapshot</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Corporate', value: overview?.corporateUsers ?? '—' },
                  { label: 'Talent', value: overview?.talentCount ?? '—' },
                  { label: 'Partners', value: overview?.partnerCount ?? '—' },
                  { label: 'Properties', value: health ? `${health.totals.activeHotels}/${health.totals.hotels}` : '—' },
                  { label: 'Rooms', value: health?.totals.rooms ?? '—' },
                  { label: 'Prop. staff', value: overview?.staffTotal ?? '—' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-gray-50 px-3 py-2.5">
                    <p className="text-[9px] text-gray-400 uppercase font-bold">{s.label}</p>
                    <p className="text-[18px] font-extrabold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px]">
                <span className="text-gray-400">Revenue this month</span>
                <span className="font-extrabold text-emerald-600">${(health?.totals.revenue || 0).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Implementation snapshot */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-6">
            <h3 className="text-[13px] font-extrabold text-gray-900 mb-3">Implementation status</h3>
            <div className="space-y-1.5">
              {(health?.hotels || []).map((h) => {
                const launched = !!h.metrics.lastActivity;
                return (
                  <div key={h.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                    <span className="text-[12px] font-bold text-gray-700">{h.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{h.metrics.requestsToday || 0} req today · {h.metrics.lastActivity ? relTime(h.metrics.lastActivity) : 'no activity yet'}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${launched ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{launched ? 'Live' : 'Pre-launch'}</span>
                    </div>
                  </div>
                );
              })}
              {!health && <div className="text-[12px] text-gray-400">Loading properties…</div>}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-[13px] font-extrabold text-gray-900 mb-3">Recent activity</h3>
            <div className="space-y-2">
              {(overview?.recent || []).map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
                  <span className={`h-2 w-2 rounded-full ${r.kind === 'corporate' ? 'bg-teal-500' : r.kind === 'talent' ? 'bg-blue-400' : r.kind === 'partner' ? 'bg-purple-400' : 'bg-amber-400'}`} />
                  <span className="text-[12px] font-bold text-gray-700">{r.label}</span>
                  <span className="text-[11px] text-gray-400">{r.kind === 'corporate' ? 'joined Corporate' : r.kind === 'talent' ? 'applied to Talent' : r.kind === 'partner' ? 'partner inquiry' : 'property added'}</span>
                  <span className="ml-auto text-[10px] text-gray-300">{relTime(r.at)}</span>
                </div>
              ))}
              {!(overview?.recent || []).length && <div className="text-[12px] text-gray-400">No activity yet.</div>}
            </div>
          </div>
        </div>
      )}

      {superTab === 'properties' ? (
      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Platform Health Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {health ? [
            { label: 'Hotels', value: health.totals.hotels, sub: `${health.totals.activeHotels} active`, color: 'text-teal-600' },
            { label: 'Orders Today', value: health.totals.foodOrders, sub: `${health.totals.requestsToday} requests`, color: 'text-amber-600' },
            { label: 'Revenue', value: `$${health.totals.revenue.toFixed(2)}`, sub: 'this month', color: 'text-emerald-600' },
            { label: 'Partners', value: health.totals.partners, sub: 'total', color: 'text-purple-600' },
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
          <p className="text-[12px] text-gray-400 mb-4">Paste the property website to auto-fill details, then create with one click.</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Property Name *</label>
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
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Property Type</label>
              <select
                value={form.propertyType}
                onChange={e => setForm({ ...form, propertyType: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
              >
                <option value="Hotel">Hotel</option>
                <option value="Short-Term Rental">Short-Term Rental</option>
                <option value="Motel">Motel</option>
                <option value="Vacation Rental">Vacation Rental</option>
                <option value="Boutique Stay">Boutique Stay</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">
                Property Name + City <span className="normal-case text-gray-300">(auto-fills address & review links)</span>
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
                        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
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
                  placeholder="https://yourhotel.com/..."
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
                        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
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
                              headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
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
                      { label: 'Partners', value: m.partnerCount || 0, color: 'text-purple-600' },
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
                        await callAdmin('toggle_hotel', { hotelId: hotel.id, active: !hotel.isActive });
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
                        await callAdmin('delete_hotel', { id: hotel.id });
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
      ) : superTab === 'people' ? (
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-extrabold text-gray-900">People — all properties</h2>
            <div className="flex gap-2">
              <button onClick={async () => { setStaffLoading(true); try { setStaff((await callAdmin('list_all_staff')).data || []); } catch { } finally { setStaffLoading(false); } }} className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-teal-600">
                <RefreshCw size={12} /> Refresh
              </button>
              <button onClick={() => setShowAddStaff(true)} className="flex items-center gap-1 text-white px-3 py-1.5 rounded-lg text-[12px] font-bold hover:opacity-90" style={{ backgroundColor: TEAL }}>
                <UserPlus size={12} /> Add Staff
              </button>
            </div>
          </div>
          <input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Search name, email, or property…"
            className="w-full mb-4 bg-white rounded-xl px-4 py-2.5 text-[13px] border border-gray-200 focus:outline-none focus:border-teal-400" />
          <div className="space-y-2">
            {staffLoading && <div className="bg-white rounded-2xl border border-gray-200 p-6 text-[12px] text-gray-400 text-center">Loading staff…</div>}
            {staff.filter((s) => {
              const h = Array.isArray(s.hotels) ? s.hotels[0] : s.hotels;
              const hay = `${s.name} ${s.email || ''} ${h?.name || ''}`.toLowerCase();
              return hay.includes(staffSearch.toLowerCase());
            }).map((s) => {
              const h = Array.isArray(s.hotels) ? s.hotels[0] : s.hotels;
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <Users size={15} className="text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-extrabold text-gray-900 truncate">{s.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${s.role === 'admin' ? 'bg-purple-100 text-purple-700' : s.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{s.role}</span>
                      {!s.active && <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase bg-red-100 text-red-600">Inactive</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{s.email || 'No email'} · {h?.name || 'No property'}</p>
                  </div>
                  <button onClick={() => { setEditStaff(s); setEditStaffForm({ name: s.name, email: s.email || '', role: s.role, pin: '', active: s.active }); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-500 hover:bg-gray-100">
                    <Pencil size={11} /> Edit
                  </button>
                  <button onClick={async () => {
                    const pin = prompt('New PIN (4-6 digits):');
                    if (!pin || !/^\d{4,6}$/.test(pin)) { if (pin !== null) alert('PIN must be 4-6 digits.'); return; }
                    setResettingPin(s.id);
                    try { await callAdmin('update_staff', { id: s.id, updates: { pin_code: pin } }); alert('PIN updated.'); }
                    catch (e) { alert('Failed: ' + (e as Error).message); }
                    finally { setResettingPin(null); }
                  }} disabled={resettingPin === s.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-600 hover:bg-amber-50 disabled:opacity-50">
                    <KeyRound size={11} /> Reset PIN
                  </button>
                </div>
              );
            })}
            {!staffLoading && !staff.length && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                <Users size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-[13px] text-gray-500">No staff yet. Add the first team member.</p>
              </div>
            )}
          </div>

          {/* Add staff modal */}
          {showAddStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-extrabold text-gray-900">Add staff member</div>
                  <button onClick={() => setShowAddStaff(false)}><X size={18} className="text-gray-400" /></button>
                </div>
                <div className="space-y-2.5">
                  <select value={staffForm.hotelId} onChange={(e) => setStaffForm({ ...staffForm, hotelId: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm border border-gray-100 focus:outline-none focus:border-teal-400">
                    <option value="">Select property…</option>
                    {(health?.hotels || []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  <input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="Full name"
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm border border-gray-100 focus:outline-none focus:border-teal-400" />
                  <input value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="Email (for login)"
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm border border-gray-100 focus:outline-none focus:border-teal-400" />
                  <div className="flex gap-2">
                    <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                      className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm border border-gray-100 focus:outline-none focus:border-teal-400">
                      <option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option>
                    </select>
                    <input value={staffForm.pin} onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="PIN (4-6 digits)"
                      className="w-36 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm border border-gray-100 focus:outline-none focus:border-teal-400" />
                  </div>
                  {staffError && <p className="text-red-500 text-[12px] bg-red-50 py-2 px-3 rounded-lg">{staffError}</p>}
                  <button onClick={async () => {
                    if (!staffForm.hotelId || !staffForm.name || !staffForm.pin || !/^\d{4,6}$/.test(staffForm.pin)) { setStaffError('Property, name and a 4-6 digit PIN are required.'); return; }
                    setStaffSaving(true); setStaffError('');
                    try {
                      await callAdmin('create_staff', { data: { hotel_id: staffForm.hotelId, name: staffForm.name, email: staffForm.email || null, role: staffForm.role, pin_code: staffForm.pin } });
                      setShowAddStaff(false);
                      setStaffForm({ hotelId: '', name: '', email: '', role: 'staff', pin: '' });
                      setStaff((await callAdmin('list_all_staff')).data || []);
                    } catch (e) { setStaffError((e as Error).message); }
                    finally { setStaffSaving(false); }
                  }} disabled={staffSaving}
                    className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                    {staffSaving ? 'Creating…' : 'Create staff account'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit staff modal */}
          {editStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-extrabold text-gray-900">Edit {editStaff.name}</div>
                  <button onClick={() => setEditStaff(null)}><X size={18} className="text-gray-400" /></button>
                </div>
                <div className="space-y-2.5">
                  <input value={editStaffForm.name} onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })} placeholder="Name"
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm border border-gray-100 focus:outline-none focus:border-teal-400" />
                  <input value={editStaffForm.email} onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })} placeholder="Email"
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm border border-gray-100 focus:outline-none focus:border-teal-400" />
                  <div className="flex gap-2">
                    <select value={editStaffForm.role} onChange={(e) => setEditStaffForm({ ...editStaffForm, role: e.target.value })}
                      className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm border border-gray-100 focus:outline-none focus:border-teal-400">
                      <option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option>
                    </select>
                    <label className="flex items-center gap-2 px-3 rounded-xl bg-gray-50 border border-gray-100 text-[12px] font-bold text-gray-600">
                      <input type="checkbox" checked={editStaffForm.active} onChange={(e) => setEditStaffForm({ ...editStaffForm, active: e.target.checked })} /> Active
                    </label>
                  </div>
                  <button onClick={async () => {
                    setStaffSaving(true);
                    try {
                      await callAdmin('update_staff', { id: editStaff.id, updates: { name: editStaffForm.name, email: editStaffForm.email || null, role: editStaffForm.role, active: editStaffForm.active } });
                      setEditStaff(null);
                      setStaff((await callAdmin('list_all_staff')).data || []);
                    } catch (e) { setStaffError((e as Error).message); }
                    finally { setStaffSaving(false); }
                  }} disabled={staffSaving}
                    className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ backgroundColor: TEAL }}>
                    {staffSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : superTab === 'ops-tools' ? (
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[18px] font-extrabold text-gray-900">Ops Tools Catalog ({allOpsTools.length})</h2>
             <div className="flex gap-2">
               <button onClick={async () => setAllOpsTools((await callAdmin('get_ops_tools')).data)} className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-teal-600 transition-colors">
                 <RefreshCw size={12} /> Refresh
              </button>
              <button onClick={() => setShowNewTool(true)} className="flex items-center gap-1 text-white px-3 py-1.5 rounded-lg text-[12px] font-bold hover:opacity-90" style={{backgroundColor:TEAL}}>
                <Plus size={12} /> New Tool
              </button>
            </div>
          </div>

          {/* Create custom tool */}
          {showNewTool && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
              <h3 className="font-extrabold text-[15px] mb-1">+ Create Custom Ops Tool</h3>
              <p className="text-[12px] text-gray-400 mb-4">Create a new ops tool that can be enabled per hotel.</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Name *</label>
                  <input value={newTool.name} onChange={e => setNewTool({...newTool, name: e.target.value})}
                    placeholder="e.g. Parking Collection" className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Key *</label>
                  <input value={newTool.key} onChange={e => setNewTool({...newTool, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                    placeholder="parking-collection" className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Icon (Lucide)</label>
                  <input value={newTool.icon} onChange={e => setNewTool({...newTool, icon: e.target.value})}
                    placeholder="DollarSign" className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Category</label>
                  <select value={newTool.category} onChange={e => setNewTool({...newTool, category: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 outline-none">
                    <option value="front_desk">Front Desk</option>
                    <option value="guest_ops">Guest Ops</option>
                    <option value="shuttle">Shuttle</option>
                    <option value="admin_ops">Admin Ops</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Description</label>
                  <textarea value={newTool.description} onChange={e => setNewTool({...newTool, description: e.target.value})}
                    rows={2} className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 outline-none resize-none" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowNewTool(false); setNewTool({ name: '', key: '', icon: 'Tool', description: '', category: 'front_desk' }); }}
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-gray-100 text-gray-600">Cancel</button>
                <button onClick={async () => {
                  if (!newTool.name || !newTool.key) return;
                  await callAdmin('create_ops_tool', newTool);
                  setShowNewTool(false);
                  setNewTool({ name: '', key: '', icon: 'Tool', description: '', category: 'front_desk' });
                  setAllOpsTools((await callAdmin('get_ops_tools')).data);
                }} disabled={!newTool.name || !newTool.key}
                  className="px-5 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-40" style={{backgroundColor:TEAL}}>Create Tool</button>
              </div>
            </div>
          )}

          {/* Tools grouped by category */}
          {(() => {
            const groups: Record<string, OpsTool[]> = {};
            allOpsTools.forEach(t => {
              if (!groups[t.category]) groups[t.category] = [];
              groups[t.category].push(t);
            });
            const CATEGORY_LABELS: Record<string, string> = { front_desk: 'Front Desk', guest_ops: 'Guest Ops', shuttle: 'Shuttle', admin_ops: 'Admin Ops' };
            return Object.entries(groups).map(([cat, tools]) => (
              <div key={cat} className="mb-6">
                <h3 className="text-[14px] font-extrabold text-gray-800 mb-3 uppercase tracking-wider">{CATEGORY_LABELS[cat] || cat}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tools.sort((a, b) => a.name.localeCompare(b.name)).map(tool => (
                    <div key={tool.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-[14px] font-bold text-gray-900">{tool.name}</h4>
                          <p className="text-[11px] text-gray-400 font-mono">@{tool.key}</p>
                        </div>
                        {tool.is_built_in ? (
                          <span className="bg-teal-50 text-teal-600 text-[9px] font-bold px-2 py-0.5 rounded-full">Built-in</span>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={async () => {
                              await callAdmin('delete_ops_tool', { id: tool.id, key: tool.key });
                              setAllOpsTools((await callAdmin('get_ops_tools')).data);
                            }} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                      {tool.description && <p className="text-[11px] text-gray-500 mb-2">{tool.description}</p>}
                      {/* Per-hotel toggles */}
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          {selectedHotelTools === tool.id ? (
                            <div className="w-full">
                              <p className="text-[10px] text-gray-400 mb-1 font-medium">Enable for:</p>
                              <div className="max-h-[200px] overflow-y-auto space-y-1">
                                {(health?.hotels || hotels).map(h => {
                                  const hotelId = typeof h === 'string' ? h : (h as {id: string; name: string}).id;
                                  const hotelName = typeof h === 'string' ? h : (h as {id: string; name: string}).name;
                                  const isOn = hotelToolToggles[`${hotelId}:${tool.key}`] ?? true;
                                  return (
                                    <label key={hotelId} className="flex items-center gap-2 cursor-pointer text-[12px]">
                                      <input type="checkbox" checked={isOn} onChange={() => {
                                        setHotelToolToggles(prev => ({...prev, [`${hotelId}:${tool.key}`]: !isOn}));
                                      }} className="accent-teal-500 w-3.5 h-3.5" />
                                      {hotelName}
                                    </label>
                                  );
                                })}
                              </div>
                              <div className="flex gap-1 mt-2">
                                <button onClick={async () => {
                                  // Apply toggles
                                  for (const [key, enabled] of Object.entries(hotelToolToggles)) {
                                    if (key.endsWith(`:${tool.key}`)) {
                                      const hid = key.split(':')[0];
                                      await callAdmin('set_hotel_ops_tool', { hotelId: hid, toolKey: tool.key, enabled });
                                    }
                                  }
                                  setSelectedHotelTools(null);
                                }} className="text-[10px] px-2 py-1 rounded bg-teal-50 text-teal-700 font-bold">Save</button>
                                <button onClick={() => setSelectedHotelTools(null)} className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600">Close</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={async () => {
                              // Load current toggles for this tool across all hotels
                              const toggles: Record<string, boolean> = {};
                              const allHotels = health?.hotels || hotels;
                              for (const h of allHotels) {
                                const hid = (h as {id: string}).id;
                                try {
                                  const toolsData = await callAdmin('get_hotel_ops_tools', { hotelId: hid });
                                  const t = toolsData.data.find((t: { tool_key: string }) => t.tool_key === tool.key);
                                  toggles[`${hid}:${tool.key}`] = t ? t.enabled : true;
                                } catch { toggles[`${hid}:${tool.key}`] = true; }
                              }
                              setHotelToolToggles(toggles);
                              setSelectedHotelTools(tool.id);
                            }} className="text-[10px] font-bold text-gray-500 hover:text-teal-600">
                              <Settings size={11} className="inline mr-1" /> Per-Hotel Settings
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      ) : null}
      {superTab === 'corporate' && (
        <div className="h-[calc(100vh-140px)] w-full overflow-y-auto" style={{ background: '#07231F' }}>
          {/* Corporate console — own brand look, dark teal */}
          <div className="mx-auto max-w-6xl px-4 py-6" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            <div className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#5ECFC0' }}>Attenda Corporate</div>
              <h2 className="mt-1 text-2xl font-extrabold text-white">
                Tenant Manager
                <span className="ml-3 rounded-full px-2.5 py-1 align-middle text-[9px] font-bold uppercase tracking-wider" style={{ background: 'rgba(94,207,192,0.15)', color: '#5ECFC0' }}>Team · Tenants · Pitches</span>
              </h2>
              <p className="mt-1 text-[12px]" style={{ color: '#8FBCB5' }}>Onboard people and hotels, assign teams, share pitch links, walk the snapshot with every member.</p>
            </div>
            <div className="overflow-hidden rounded-3xl" style={{ background: '#0B3B36', boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
              <iframe src="/corporate/admin" title="Attenda Corporate Console" className="h-[72vh] w-full border-0" allow="clipboard-write" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
