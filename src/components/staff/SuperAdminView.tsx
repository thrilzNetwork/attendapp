'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, ArrowRight, Building2, Check, ChevronRight,
  Copy, ExternalLink, Globe, Mail, Plus, Power,
  RefreshCw, Shield, Users, Zap,
  ClipboardList, Circle,
} from 'lucide-react';

const TEAL = '#0D9488';
const API_KEY = process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '';

/* ── types ───────────────────────────────────────────────── */
interface Hotel {
  id: string;
  slug: string;
  name: string;
  brand: string;
  room_count: number | null;
  brand_color: string | null;
  is_active: boolean;
  notification_email: string | null;
  address: string | null;
  created_at: string;
}

interface HotelMetrics {
  staff: number;
  requests_today: number;
  pending: number;
  last_activity: string | null;
  is_active: boolean;
}

/* ── API helper ──────────────────────────────────────────── */
async function adminFetch(action: string, body: Record<string, unknown> = {}) {
  const res = await fetch('/api/superadmin-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-superadmin-key': API_KEY },
    body: JSON.stringify({ action, data: body }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json;
}

/* ── helpers ─────────────────────────────────────────────── */
function timeAgo(iso: string | null): string {
  if (!iso) return 'No activity';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING WIZARD
═══════════════════════════════════════════════════════════ */
function OnboardingWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const [property, setProperty] = useState({
    name: '',
    slug: '',
    type: 'Hotel',
    rooms: '',
    brandColor: '#0D9488',
    address: '',
    email: '',
    phone: '',
    website: '',
    googleReview: '',
  });

  const [admin, setAdmin] = useState({
    name: '',
    email: '',
  });

  const slugify = (v: string) => v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handlePropertyChange = (k: keyof typeof property, v: string) => {
    setProperty(p => {
      const updated = { ...p, [k]: v };
      if (k === 'name' && !p.slug) updated.slug = slugify(v);
      return updated;
    });
  };

  const handleLaunch = async () => {
    setBusy(true);
    setError('');
    try {
      const hotelRes = await adminFetch('create_hotel', {
        slug: property.slug,
        name: property.name,
        propertyType: property.type,
        roomCount: property.rooms ? parseInt(property.rooms) : undefined,
        brandColor: property.brandColor,
        address: property.address || undefined,
        adminEmail: property.email || admin.email || undefined,
        adminPhone: property.phone || undefined,
        websiteUrl: property.website || undefined,
        googleReviewUrl: property.googleReview || undefined,
        notificationEmail: property.email || undefined,
      });

      // Create admin staff account if email provided
      if (admin.email && hotelRes.hotel?.id) {
        await adminFetch('create_staff', {
          hotel_id: hotelRes.hotel.id,
          name: admin.name || 'Hotel Admin',
          role: 'admin',
          email: admin.email,
          permissions: ['orders', 'messages', 'shuttle', 'settings', 'staff', 'schedules', 'kpi', 'dailybrief'],
        });
      }

      // Send onboarding email
      const emailTarget = admin.email || property.email;
      if (emailTarget) {
        const origin = window.location.origin;
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-superadmin-key': API_KEY },
          body: JSON.stringify({
            type: 'tenant_onboarding',
            data: {
              hotelName: property.name,
              slug: property.slug,
              adminEmail: emailTarget,
              guestUrl: `${origin}/?hotel=${property.slug}`,
              adminUrl: `${origin}/staff?hotel=${property.slug}`,
            },
          }),
        });
      }

      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg.includes('unique') || msg.includes('duplicate') ? 'That slug is already taken — try a different one.' : msg);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-teal-600" />
          </div>
          <h3 className="text-[20px] font-black text-gray-900 mb-2">{property.name} is live!</h3>
          <p className="text-[13px] text-gray-600 mb-6">
            Property created and onboarding email sent
            {admin.email ? ` to ${admin.email}` : ''}.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Quick links</div>
            {[
              { label: 'Guest App', url: `${window.location.origin}/?hotel=${property.slug}` },
              { label: 'Staff Login', url: `${window.location.origin}/staff?hotel=${property.slug}` },
            ].map(l => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] font-semibold text-teal-700 hover:underline">
                <ExternalLink size={11} /> {l.label}: {l.url}
              </a>
            ))}
          </div>
          <button
            onClick={() => { onCreated(); onClose(); }}
            className="w-full py-3 rounded-xl text-white font-bold text-[14px]"
            style={{ backgroundColor: TEAL }}
          >
            Back to Command Center
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { n: 1, label: 'Property' },
    { n: 2, label: 'Admin' },
    { n: 3, label: 'Launch' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-black text-gray-900">New Property</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-[18px] font-light">✕</button>
          </div>
          {/* Step progress */}
          <div className="flex items-center gap-0">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={
                      s.n < step
                        ? { backgroundColor: TEAL, color: 'white' }
                        : s.n === step
                        ? { backgroundColor: TEAL, color: 'white' }
                        : { backgroundColor: '#F3F4F6', color: '#9CA3AF' }
                    }
                  >
                    {s.n < step ? <Check size={10} /> : s.n}
                  </div>
                  <span className={`text-[11px] font-bold ${s.n === step ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className="w-8 h-px bg-gray-200 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Property */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <WField label="Property Name *" value={property.name} onChange={v => handlePropertyChange('name', v)} placeholder="Sandor Hotel Miami" />
                </div>
                <WField label="URL Slug *" value={property.slug} onChange={v => handlePropertyChange('slug', slugify(v))} placeholder="sandor-miami" />
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Type</label>
                  <select
                    value={property.type}
                    onChange={e => handlePropertyChange('type', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-teal-400"
                  >
                    {['Hotel', 'Motel', 'Boutique Stay', 'Short-Term Rental', 'Vacation Rental', 'Other'].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <WField label="Room Count" value={property.rooms} onChange={v => handlePropertyChange('rooms', v)} placeholder="121" type="number" />
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={property.brandColor}
                      onChange={e => handlePropertyChange('brandColor', e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                    />
                    <span className="text-[11px] font-mono text-gray-500">{property.brandColor}</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <WField label="Address" value={property.address} onChange={v => handlePropertyChange('address', v)} placeholder="1000 Brickell Ave, Miami FL" />
                </div>
                <WField label="Notification Email" value={property.email} onChange={v => handlePropertyChange('email', v)} placeholder="gm@hotel.com" />
                <WField label="Phone" value={property.phone} onChange={v => handlePropertyChange('phone', v)} placeholder="+1 305 000 0000" />
              </div>
              {property.slug && (
                <p className="text-[10px] text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2">
                  Guest URL: {window.location.origin}/?hotel={property.slug}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Admin */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[13px] text-gray-600">Create the hotel admin account. They&apos;ll use this to manage the property.</p>
              <WField label="Admin Name *" value={admin.name} onChange={v => setAdmin(a => ({ ...a, name: v }))} placeholder="Maria González" />
              <WField label="Admin Email *" value={admin.email} onChange={v => setAdmin(a => ({ ...a, email: v }))} placeholder="maria@sandorhotel.com" />
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[11px] text-amber-800 font-semibold">
                  📧 An onboarding email with login instructions will be sent to this address. They&apos;ll set their own password via Supabase Auth.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Modules enabled by default</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: '🛎️ Guest Requests', on: true },
                    { label: '🚌 Shuttle', on: true },
                    { label: '📋 Staff Tasks', on: true },
                    { label: '📊 KPI Dashboard', on: true },
                    { label: '🛒 Ordering', on: true },
                    { label: '📆 Schedules', on: true },
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                      <Check size={10} className="text-teal-500" /> {m.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Launch */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Review before launching</div>
                {[
                  { label: 'Property', value: property.name },
                  { label: 'Slug', value: `@${property.slug}` },
                  { label: 'Type', value: property.type },
                  { label: 'Rooms', value: property.rooms || '—' },
                  { label: 'Address', value: property.address || '—' },
                  { label: 'Admin', value: admin.email ? `${admin.name} <${admin.email}>` : '—' },
                  { label: 'Notification email', value: property.email || '—' },
                ].map(r => (
                  <div key={r.label} className="flex items-start justify-between gap-4">
                    <span className="text-[11px] text-gray-500 font-semibold shrink-0">{r.label}</span>
                    <span className="text-[11px] text-gray-900 font-bold text-right">{r.value}</span>
                  </div>
                ))}
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[12px] text-red-700 font-semibold">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
              className="px-4 py-2 rounded-xl text-[13px] font-bold text-gray-500 border border-gray-200 hover:border-gray-300"
            >
              {step === 1 ? 'Cancel' : '← Back'}
            </button>
            <button
              onClick={step < 3 ? () => setStep(s => s + 1) : handleLaunch}
              disabled={busy || (step === 1 && (!property.name || !property.slug)) || (step === 2 && !admin.name)}
              className="px-6 py-2 rounded-xl text-[13px] font-bold text-white disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: TEAL }}
            >
              {busy ? (
                <><RefreshCw size={13} className="animate-spin" /> Creating…</>
              ) : step < 3 ? (
                <>Continue <ChevronRight size={13} /></>
              ) : (
                <><Zap size={13} /> Launch Property</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WField({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-teal-400 transition-colors"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HOTEL CARD
═══════════════════════════════════════════════════════════ */
function HotelCard({
  hotel,
  metrics,
  onManage,
  onToggleActive,
}: {
  hotel: Hotel;
  metrics: HotelMetrics | undefined;
  onManage: () => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const isActive = metrics?.is_active ?? hotel.is_active ?? true;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const accentColor = hotel.brand_color || TEAL;
  const age = Math.floor((Date.now() - new Date(hotel.created_at).getTime()) / 86400000);

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm transition-all hover:shadow-md ${isActive ? 'border-gray-100' : 'border-gray-200 opacity-75'}`}>
      {/* Card header with accent */}
      <div className="h-1.5 rounded-t-2xl" style={{ backgroundColor: accentColor }} />

      <div className="p-5">
        {/* Hotel identity */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[15px]"
              style={{ backgroundColor: accentColor }}>
              {hotel.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-black text-gray-900">{hotel.name}</h3>
                <StatusDot active={isActive} />
              </div>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">@{hotel.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500">
              {hotel.brand || 'Hotel'}
            </span>
            {age <= 7 && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">New</span>
            )}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: <Building2 size={11} />, label: 'Rooms', value: hotel.room_count ?? '—' },
            { icon: <Users size={11} />, label: 'Staff', value: metrics?.staff ?? '…' },
            { icon: <ClipboardList size={11} />, label: 'Today', value: metrics?.requests_today ?? '…' },
            { icon: <Circle size={11} className={metrics?.pending ? 'text-amber-500' : 'text-gray-300'} />, label: 'Pending', value: metrics?.pending ?? '…' },
          ].map(m => (
            <div key={m.label} className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="flex justify-center mb-0.5 text-gray-400">{m.icon}</div>
              <div className="text-[13px] font-black text-gray-900">{m.value}</div>
              <div className="text-[8px] text-gray-400 font-semibold uppercase tracking-wide">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Last activity */}
        <div className="flex items-center gap-1.5 mb-4">
          <Activity size={10} className="text-gray-300" />
          <span className="text-[10px] text-gray-400">
            Last activity: <span className="font-semibold text-gray-600">{timeAgo(metrics?.last_activity ?? null)}</span>
          </span>
          {hotel.notification_email && (
            <>
              <span className="text-gray-200">·</span>
              <Mail size={10} className="text-gray-300" />
              <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{hotel.notification_email}</span>
            </>
          )}
        </div>

        {/* URL copy row */}
        <div className="space-y-1.5 mb-4">
          {[
            { label: 'Guest App', url: `${origin}/?hotel=${hotel.slug}`, key: 'guest' },
            { label: 'Staff Login', url: `${origin}/staff?hotel=${hotel.slug}`, key: 'admin' },
          ].map(l => (
            <div key={l.key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
              <Globe size={10} className="text-gray-400 shrink-0" />
              <span className="text-[10px] text-gray-500 truncate flex-1 font-mono">{l.url}</span>
              <button
                onClick={() => copy(l.url, l.key)}
                className="shrink-0 flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-md"
                style={{ color: TEAL, backgroundColor: `${TEAL}12` }}
              >
                {copied === l.key ? <Check size={9} /> : <Copy size={9} />}
                {copied === l.key ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onManage}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-[12px] font-bold transition-all hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Manage <ArrowRight size={12} />
          </button>
          <button
            onClick={() => onToggleActive(hotel.id, !isActive)}
            title={isActive ? 'Pause property' : 'Activate property'}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${
              isActive
                ? 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50'
                : 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100'
            }`}
          >
            <Power size={11} />
            {isActive ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUPER ADMIN COMMAND CENTER — main export
═══════════════════════════════════════════════════════════ */
export default function SuperAdminView({ onSwitchHotel }: { onSwitchHotel: (slug: string) => void }) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [metrics, setMetrics] = useState<Record<string, HotelMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [hotelsRes, metricsRes] = await Promise.all([
        adminFetch('list_hotels'),
        adminFetch('hotel_metrics'),
      ]);
      setHotels(hotelsRes.hotels || []);
      setMetrics(metricsRes.metrics || {});
    } catch (e) {
      console.error('SuperAdmin load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const handleToggleActive = async (hotelId: string, active: boolean) => {
    try {
      await adminFetch('toggle_hotel_active', { hotel_id: hotelId, active });
      setMetrics(m => ({ ...m, [hotelId]: { ...m[hotelId], is_active: active } }));
    } catch {
      alert('Failed to update property status');
    }
  };

  // Global stats
  const totalStaff = Object.values(metrics).reduce((s, m) => s + m.staff, 0);
  const totalRequests = Object.values(metrics).reduce((s, m) => s + m.requests_today, 0);
  const totalPending = Object.values(metrics).reduce((s, m) => s + m.pending, 0);
  const activeHotels = hotels.filter(h => (metrics[h.id]?.is_active ?? true)).length;

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Command bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-black text-white">Attenda Platform</h1>
              <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">Super Admin · Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-all"
            >
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-bold text-white"
              style={{ backgroundColor: TEAL }}
            >
              <Plus size={12} /> New Property
            </button>
          </div>
        </div>
      </div>

      {/* Global stats strip */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Properties', value: hotels.length, sub: `${activeHotels} active`, icon: <Building2 size={14} className="text-teal-400" /> },
            { label: 'Active Staff', value: totalStaff, sub: 'across all hotels', icon: <Users size={14} className="text-blue-400" /> },
            { label: 'Requests Today', value: totalRequests, sub: `${totalPending} pending`, icon: <ClipboardList size={14} className="text-amber-400" /> },
            { label: 'Platform Status', value: 'Live', sub: 'all systems go', icon: <Activity size={14} className="text-green-400" /> },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              {s.icon}
              <div>
                <div className="text-[16px] font-black text-white leading-tight">{s.value}</div>
                <div className="text-[9px] text-gray-400 font-semibold">{s.label} · {s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hotel cards grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
            ))}
          </div>
        ) : hotels.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={44} className="text-gray-300 mx-auto mb-4" />
            <p className="text-[16px] font-bold text-gray-600 mb-2">No properties yet</p>
            <p className="text-[13px] text-gray-400 mb-6">Add your first property to get started.</p>
            <button onClick={() => setShowWizard(true)} className="px-6 py-3 rounded-xl text-white font-bold" style={{ backgroundColor: TEAL }}>
              <Plus size={14} className="inline mr-1.5" /> Add First Property
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] font-semibold text-gray-500">
                {hotels.length} propert{hotels.length !== 1 ? 'ies' : 'y'} on this platform
              </p>
              <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white" style={{ backgroundColor: TEAL }}>
                <Plus size={12} /> Add Property
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hotels.map(hotel => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  metrics={metrics[hotel.id]}
                  onManage={() => onSwitchHotel(hotel.slug)}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showWizard && (
        <OnboardingWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => { loadData(); setShowWizard(false); }}
        />
      )}
    </div>
  );
}
