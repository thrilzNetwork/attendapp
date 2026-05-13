'use client';

import { useState, useEffect } from 'react';
import { supabase, getAllHotels, createHotel } from '@/lib/supabase';
import { Building2, Copy, Check, LogOut, Globe } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'thrilznetwork@gmail.com';
const TEAL = '#0D9488';

export default function SuperAdminPage() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [form, setForm] = useState({ slug: '', name: '' });
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const loadHotels = async () => {
    const data = await getAllHotels();
    setHotels(data);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.email === SUPER_ADMIN_EMAIL) {
          setUser({ email: user.email! });
          loadHotels();
        } else {
          setUnauthorized(true);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (session.user.email === SUPER_ADMIN_EMAIL) {
          setUser({ email: session.user.email! });
          setUnauthorized(false);
          loadHotels();
        } else {
          setUnauthorized(true);
          setUser(null);
        }
      } else {
        setUser(null);
        setUnauthorized(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/superadmin` },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleCreate = async () => {
    if (!form.slug || !form.name) return;
    setCreating(true);
    try {
      await createHotel(form.slug, form.name);
      setForm({ slug: '', name: '' });
      loadHotels();
    } catch {
      alert('Error creating hotel. Slug may already be in use.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda.vercel.app';
  const getGuestUrl = (slug: string) => `${baseUrl}/?hotel=${slug}`;
  const getAdminUrl = (slug: string) => `${baseUrl}/staff?hotel=${slug}`;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (unauthorized) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⛔</span>
        </div>
        <h2 className="text-lg font-bold mb-2">Access Denied</h2>
        <p className="text-sm text-gray-400 mb-6">This account is not authorized as super admin.</p>
        <button onClick={handleSignOut}
          className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-[14px]">
          Sign out and try another account
        </button>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-teal-50">
            <Globe size={28} className="text-teal-600" />
          </div>
          <h1 className="text-xl font-bold mb-1">Super Admin</h1>
          <p className="text-sm text-gray-400 mb-8">Sign in with your authorized Google account to manage all properties.</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3.5 rounded-xl bg-white border-2 border-gray-200 font-semibold text-[14px] text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6A7.8 7.8 0 0 0 17.6 9.1c0-.57-.05-.73-.15-1.1z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Sign in with Google
          </button>
          <p className="text-[11px] text-gray-400 mt-4">Only <span className="font-mono">{SUPER_ADMIN_EMAIL}</span> can access this.</p>
          <a href="/staff" className="block mt-3 text-[12px] font-semibold underline" style={{ color: TEAL }}>
            ← Back to Staff Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEAL }}>
            <span className="text-white font-bold text-[13px]">A</span>
          </div>
          <div>
            <h1 className="font-extrabold text-[16px] text-gray-900">Attenda Platform</h1>
            <p className="text-[11px] text-gray-400">{user.email} · Super Admin</p>
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
          <p className="text-[12px] text-gray-400 mb-4">Creates the hotel account and generates guest + admin links instantly.</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Hotel Name *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Miami Airport Hotel"
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">URL Slug *</label>
              <input
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="miami-airport"
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none font-mono"
              />
            </div>
          </div>
          {form.slug && (
            <div className="bg-gray-50 rounded-xl px-4 py-2 mb-3">
              <p className="text-[11px] text-gray-400 font-mono">Guest URL: {getGuestUrl(form.slug)}</p>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">Admin URL: {getAdminUrl(form.slug)}</p>
            </div>
          )}
          <button onClick={handleCreate} disabled={creating || !form.slug || !form.name}
            className="px-6 py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: TEAL }}>
            {creating ? 'Creating...' : 'CREATE PROPERTY'}
          </button>
        </div>

        {/* Hotels list */}
        <h2 className="text-[18px] font-extrabold text-gray-900 mb-4">All Properties ({hotels.length})</h2>
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
                      <button onClick={() => handleCopy(url, id)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap"
                        style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>
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
