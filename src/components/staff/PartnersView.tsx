'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, Pencil, ChevronUp, ChevronDown, X as XIcon, Upload, Store,
  Phone, Clock, MapPin, Star,
} from 'lucide-react';
import {
  getPartners, createPartner, updatePartner, deletePartner,
  getPartnerMenuItems, createPartnerMenuItem, deletePartnerMenuItem,
  authedApiHeaders,
} from '@/lib/supabase';

/* ── Inline types ────────────────────────────────────── */

interface Partner {
  id: string;
  hotel_id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  phone: string;
  address: string;
  hours: string;
  distance: string;
  rating: number;
  has_ordering: boolean;
  is_active: boolean;
  email: string;
  google_place_id?: string;
  delivery_providers?: { name: string; url: string }[];
  attenda_fee_percent?: number;
  hotel_revenue_share_percent?: number;
}

interface PartnerMenuItem {
  id: string;
  partner_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  is_active: boolean;
}

const TEAL = '#0D9488';

const CATEGORY_TABS = [
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'attraction', label: 'Attraction' },
  { key: 'service', label: 'Service' },
] as const;

const catColor: Record<string, string> = {
  restaurant: 'bg-orange-100 text-orange-700',
  attraction: 'bg-blue-100 text-blue-700',
  service: 'bg-purple-100 text-purple-700',
};

const DELIVERY_APPS = ['Uber Eats', 'DoorDash', 'Grubhub', 'Order Inn', 'Instacart', 'Other'];

const BLANK_FORM = {
  name: '', category: 'restaurant', description: '', image_url: '',
  phone: '', address: '', hours: '', distance: '', rating: '0', has_ordering: false, email: '',
  attenda_fee_percent: '15', hotel_revenue_share_percent: '5',
};

/* ── Small reusable field ──────────────────────────────── */

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-300"
      />
    </div>
  );
}

/* ── Skeleton card ─────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 animate-pulse">
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */

export default function PartnersView({ hotelId }: { hotelId: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'restaurant' | 'attraction' | 'service'>('restaurant');

  /* Add partner form */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [formImageFile, setFormImageFile] = useState<{ base64: string; filename: string } | null>(null);
  const [deliveryProviders, setDeliveryProviders] = useState<{ name: string; url: string }[]>([]);
  const [deliveryProviderForm, setDeliveryProviderForm] = useState({ name: '', url: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* Per-partner state */
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<Record<string, PartnerMenuItem[]>>({});
  const [menuLoading, setMenuLoading] = useState<Record<string, boolean>>({});
  const [menuError, setMenuError] = useState<Record<string, string | null>>({});
  const [menuForm, setMenuForm] = useState<Record<string, { name: string; description: string; price: string; image_url?: string; imagePreview?: string }>>({});
  const [menuImageUploading, setMenuImageUploading] = useState<Record<string, boolean>>({});
  const [menuSaving, setMenuSaving] = useState<Record<string, boolean>>({});
  const [dpForm, setDpForm] = useState<Record<string, { name: string; url: string }>>({});
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getPartners(hotelId);
      setPartners(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  const loadMenu = async (partnerId: string) => {
    setMenuLoading(prev => ({ ...prev, [partnerId]: true }));
    setMenuError(prev => ({ ...prev, [partnerId]: null }));
    try {
      const items = await getPartnerMenuItems(partnerId);
      setMenuItems(prev => ({ ...prev, [partnerId]: items }));
    } catch (e) {
      setMenuError(prev => ({ ...prev, [partnerId]: e instanceof Error ? e.message : 'Failed to load menu' }));
    } finally {
      setMenuLoading(prev => ({ ...prev, [partnerId]: false }));
    }
  };

  const toggle = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadMenu(id);
  };

  /* ── Add Partner ── */
  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      let imageUrl = form.image_url;
      if (formImageFile) {
        imageUrl = await uploadImage(formImageFile.base64, formImageFile.filename, 'partners');
      }
      await createPartner({
        hotel_id: hotelId,
        name: form.name,
        category: form.category,
        description: form.description,
        image_url: imageUrl,
        phone: form.phone,
        address: form.address,
        hours: form.hours,
        distance: form.distance,
        rating: parseFloat(form.rating) || 0,
        has_ordering: form.has_ordering,
        email: form.email,
        delivery_providers: deliveryProviders,
        attenda_fee_percent: parseFloat(form.attenda_fee_percent) || 15,
        hotel_revenue_share_percent: parseFloat(form.hotel_revenue_share_percent) || 5,
      });
      setForm(BLANK_FORM);
      setFormImageFile(null);
      setDeliveryProviders([]);
      setDeliveryProviderForm({ name: '', url: '' });
      setShowForm(false);
      loadPartners();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save partner');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete Partner ── */
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this partner and all their menu items?')) return;
    try {
      await deletePartner(id);
      loadPartners();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete partner');
    }
  };

  /* ── Save Edit ── */
  const handleSaveEdit = async () => {
    if (!editingPartner) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updatePartner(editingPartner.id, {
        name: editingPartner.name,
        description: editingPartner.description,
        phone: editingPartner.phone,
        hours: editingPartner.hours,
        image_url: editingPartner.image_url,
        email: editingPartner.email,
        address: editingPartner.address,
        distance: editingPartner.distance,
        rating: editingPartner.rating,
        attenda_fee_percent: editingPartner.attenda_fee_percent,
        hotel_revenue_share_percent: editingPartner.hotel_revenue_share_percent,
      });
      setEditingPartner(null);
      loadPartners();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  };

  /* ── Menu Item Add ── */
  const handleAddMenuItem = async (partnerId: string) => {
    const mf = menuForm[partnerId];
    if (!mf?.name?.trim() || !mf?.price) return;
    setMenuSaving(prev => ({ ...prev, [partnerId]: true }));
    setMenuError(prev => ({ ...prev, [partnerId]: null }));
    try {
      await createPartnerMenuItem({
        partner_id: partnerId,
        name: mf.name,
        description: mf.description || '',
        price: parseFloat(mf.price),
        image_url: mf.image_url,
      });
      setMenuForm(prev => ({ ...prev, [partnerId]: { name: '', description: '', price: '' } }));
      loadMenu(partnerId);
    } catch (e) {
      setMenuError(prev => ({ ...prev, [partnerId]: e instanceof Error ? e.message : 'Failed to add item' }));
    } finally {
      setMenuSaving(prev => ({ ...prev, [partnerId]: false }));
    }
  };

  /* ── Menu Item Delete ── */
  const handleDeleteMenuItem = async (itemId: string, partnerId: string) => {
    try {
      await deletePartnerMenuItem(itemId);
      loadMenu(partnerId);
    } catch (e) {
      setMenuError(prev => ({ ...prev, [partnerId]: e instanceof Error ? e.message : 'Failed to delete item' }));
    }
  };

  /* ── Delivery provider helpers ── */
  const handleAddDp = async (p: Partner) => {
    const name = dpForm[p.id]?.name;
    const url = dpForm[p.id]?.url;
    if (!name || !url) return;
    try {
      await updatePartner(p.id, {
        delivery_providers: [...(p.delivery_providers || []), { name, url }],
      });
      setDpForm(prev => ({ ...prev, [p.id]: { name: '', url: '' } }));
      loadPartners();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add delivery provider');
    }
  };

  const handleRemoveDp = async (p: Partner, i: number) => {
    try {
      await updatePartner(p.id, {
        delivery_providers: (p.delivery_providers || []).filter((_, j) => j !== i),
      });
      loadPartners();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove delivery provider');
    }
  };

  const uploadImage = async (base64: string, filename: string, folder: string): Promise<string> => {
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: await authedApiHeaders(),
      body: JSON.stringify({ action: 'upload_image', data: { base64, filename, folder } }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Image upload failed');
    return json.url as string;
  };

  // Vendor login enrollment — creates a role='vendor' account linked to this partner
  // and returns a one-time setup link to share with the restaurant.
  const [enrollInfo, setEnrollInfo] = useState<{ partnerId: string; url: string; email: string } | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleEnrollVendor = async (p: Partner) => {
    const email = p.email || window.prompt(`Vendor login email for ${p.name}:`, '') || '';
    if (!email.trim()) return;
    setEnrolling(p.id);
    try {
      const res = await fetch('/api/superadmin-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({
          action: 'create_staff',
          data: {
            hotel_id: hotelId,
            name: `${p.name} (Vendor)`,
            role: 'vendor',
            email: email.trim(),
            partner_id: p.id,
            permissions: [],
          },
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Enrollment failed');
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://attendaapp.com';
      const url = `${origin}/vendor/setup?email=${encodeURIComponent(email.trim())}&token=${encodeURIComponent(json.setupToken)}`;
      setEnrollInfo({ partnerId: p.id, url, email: email.trim() });
      setCopied(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Enrollment failed');
    }
    setEnrolling(null);
  };

  // Vendor self-onboarding applications awaiting approval
  interface VendorApp { id: string; restaurant_name: string; contact_name: string; contact_email: string; contact_phone: string; message: string; created_at: string; }
  const [applications, setApplications] = useState<VendorApp[]>([]);
  const [appBusy, setAppBusy] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'list_applications', data: { hotel_id: hotelId } }),
      });
      const json = await res.json();
      if (json.ok) setApplications(json.data || []);
    } catch { /* non-fatal */ }
  }, [hotelId]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  const approveApplication = async (app: VendorApp) => {
    setAppBusy(app.id);
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'approve_application', data: { applicationId: app.id, hotel_id: hotelId } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Approval failed');
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://attendaapp.com';
      const url = `${origin}/vendor/setup?email=${encodeURIComponent(json.vendorEmail || '')}&token=${encodeURIComponent(json.setupToken)}`;
      setEnrollInfo({ partnerId: json.partnerId, url, email: json.vendorEmail || '' });
      await Promise.all([loadApplications(), loadPartners()]);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Approval failed');
    }
    setAppBusy(null);
  };

  const rejectApplication = async (app: VendorApp) => {
    setAppBusy(app.id);
    try {
      await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'reject_application', data: { applicationId: app.id } }),
      });
      await loadApplications();
    } catch { /* non-fatal */ }
    setAppBusy(null);
  };

  const visiblePartners = partners.filter(p => p.category === activeTab);

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Partners &amp; Menu</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage nearby partners, restaurants, and their menus.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSaveError(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: TEAL }}
        >
          <Plus size={14} /> Add Partner
        </button>
      </div>

      {/* Vendor self-onboarding applications */}
      {applications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="text-[13px] font-bold text-amber-800 mb-2">
            {applications.length} restaurant {applications.length === 1 ? 'application' : 'applications'} awaiting review
          </p>
          <div className="space-y-2">
            {applications.map(app => (
              <div key={app.id} className="bg-white rounded-xl border border-amber-100 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 truncate">{app.restaurant_name}</p>
                  <p className="text-[12px] text-gray-500 truncate">{app.contact_name} · {app.contact_email} · {app.contact_phone}</p>
                  {app.message && <p className="text-[11px] text-gray-400 italic truncate">{app.message}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => approveApplication(app)} disabled={appBusy === app.id}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                    {appBusy === app.id ? '…' : 'Approve + Enroll'}
                  </button>
                  <button onClick={() => rejectApplication(app)} disabled={appBusy === app.id}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-amber-600 mt-2">Approving creates the restaurant + their vendor login in one step.</p>
        </div>
      )}

      {/* Add Partner slide-down form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[16px] text-gray-900">New Partner</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <XIcon size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
              >
                <option value="restaurant">Restaurant</option>
                <option value="attraction">Attraction</option>
                <option value="service">Service</option>
              </select>
            </div>
            <Field label="Distance (e.g. 0.3 mi)" value={form.distance} onChange={v => setForm(f => ({ ...f, distance: v }))} />
            <div className="col-span-2">
              <Field label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
            </div>
            <Field label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
            <Field label="Email (order notifications)" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="orders@restaurant.com" />
            <Field label="Hours" value={form.hours} onChange={v => setForm(f => ({ ...f, hours: v }))} placeholder="Mon–Sun 8am–10pm" />
            <Field label="Rating (0–5)" value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} type="number" />
            <div className="col-span-2">
              <Field label="Address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
            </div>

            {/* Image upload */}
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Image</label>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => document.getElementById('partner-image-upload')?.click()}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600"
                >
                  <Upload size={14} className="inline mr-1.5" />Upload Image
                </button>
                <input
                  id="partner-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const base64 = ev.target?.result as string;
                      setFormImageFile({ base64, filename: file.name });
                      setForm(f => ({ ...f, image_url: base64 }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {form.image_url && (
                  <>
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <button type="button" onClick={() => { setForm(f => ({ ...f, image_url: '' })); setFormImageFile(null); }} className="text-red-400 hover:text-red-600 text-[11px] font-medium">Clear</button>
                  </>
                )}
              </div>
            </div>

            {/* Delivery setup (restaurants only) */}
            {form.category === 'restaurant' && (
              <div className="col-span-2 mt-2 space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-1">Delivery Setup</p>

                {/* Tier A */}
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <p className="text-[13px] font-bold text-gray-800 mb-0.5">A · Restaurant manages their own delivery</p>
                  <p className="text-[11px] text-gray-500 mb-3">Guests see tap-to-order buttons. Attenda just displays the links — zero extra cost.</p>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={deliveryProviderForm.name}
                      onChange={e => setDeliveryProviderForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                    >
                      <option value="">Choose app…</option>
                      {DELIVERY_APPS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <input
                      placeholder="Paste their store link…"
                      value={deliveryProviderForm.url}
                      onChange={e => setDeliveryProviderForm(f => ({ ...f, url: e.target.value }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!deliveryProviderForm.name || !deliveryProviderForm.url) return;
                        setDeliveryProviders(prev => [...prev, { name: deliveryProviderForm.name, url: deliveryProviderForm.url }]);
                        setDeliveryProviderForm({ name: '', url: '' });
                      }}
                      className="px-3 py-2 rounded-lg text-white text-[12px] font-bold shrink-0"
                      style={{ backgroundColor: TEAL }}
                    >
                      + Add
                    </button>
                  </div>
                  {deliveryProviders.length > 0 && (
                    <div className="space-y-1">
                      {deliveryProviders.map((dp, i) => (
                        <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <span className="text-[12px] font-semibold text-gray-800">{dp.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 max-w-[150px] truncate">{dp.url}</span>
                            <button type="button" onClick={() => setDeliveryProviders(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><XIcon size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tier B */}
                <div className={`rounded-xl border-2 p-4 transition-colors ${form.has_ordering ? 'border-[#0D9488] bg-teal-50/40' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-2.5 mb-2">
                    <input
                      type="checkbox"
                      id="has_ordering"
                      checked={form.has_ordering}
                      onChange={e => setForm(f => ({ ...f, has_ordering: e.target.checked }))}
                      className="w-4 h-4 rounded mt-0.5 shrink-0"
                    />
                    <div>
                      <label htmlFor="has_ordering" className="text-[13px] font-bold text-gray-800 cursor-pointer">B · Attenda-powered delivery</label>
                      <p className="text-[11px] text-gray-500 mt-0.5">Restaurant saves vs. Uber Eats rates. Hotel earns revenue on every order.</p>
                    </div>
                  </div>
                  {form.has_ordering && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-teal-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Attenda charges restaurant</label>
                          <div className="relative">
                            <input
                              type="number" min="1" max="50" step="0.5"
                              value={form.attenda_fee_percent}
                              onChange={e => setForm(f => ({ ...f, attenda_fee_percent: e.target.value }))}
                              className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] border border-gray-200 focus:outline-none pr-7"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hotel earns per order</label>
                          <div className="relative">
                            <input
                              type="number" min="0" max="50" step="0.5"
                              value={form.hotel_revenue_share_percent}
                              onChange={e => setForm(f => ({ ...f, hotel_revenue_share_percent: e.target.value }))}
                              className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] border border-gray-200 focus:outline-none pr-7"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-teal-100 text-[11px] text-teal-700">
                        On a $100 order: restaurant pays ${(parseFloat(form.attenda_fee_percent) || 15).toFixed(0)}, hotel earns ${(parseFloat(form.hotel_revenue_share_percent) || 5).toFixed(0)}, Attenda keeps ${Math.max(0, (parseFloat(form.attenda_fee_percent) || 15) - (parseFloat(form.hotel_revenue_share_percent) || 5)).toFixed(0)}.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Save/Cancel */}
          <div className="mt-5 space-y-2">
            {saveError && <p className="text-[12px] text-red-500">{saveError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-60 transition-opacity"
                style={{ backgroundColor: TEAL }}
              >
                {saving ? 'Saving…' : 'Save Partner'}
              </button>
              <button
                onClick={() => { setShowForm(false); setSaveError(null); }}
                className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[13px] hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 mb-5">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              activeTab === tab.key
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={activeTab === tab.key ? { backgroundColor: TEAL } : undefined}
          >
            {tab.label}
            <span className={`ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {partners.filter(p => p.category === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px] mb-4">
          {loadError} —{' '}
          <button onClick={loadPartners} className="underline font-semibold">Retry</button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadError && visiblePartners.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
          <Store size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-600 mb-1">No {activeTab}s yet</p>
          <p className="text-[13px] text-gray-400">Click &quot;Add Partner&quot; to add your first {activeTab}.</p>
        </div>
      )}

      {/* Partner cards */}
      {!loading && visiblePartners.length > 0 && (
        <div className="space-y-3">
          {visiblePartners.map(p => {
            const isEditing = editingPartner?.id === p.id;
            const isExpanded = expanded === p.id;

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Card body */}
                <div className="p-5">
                  <div className="flex gap-4">

                    {/* Image */}
                    {p.image_url && !isEditing && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        /* Edit mode */
                        <div className="space-y-2">
                          <input
                            value={editingPartner!.name}
                            onChange={e => setEditingPartner({ ...editingPartner!, name: e.target.value })}
                            className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[14px] border border-gray-200 focus:outline-none font-bold"
                            placeholder="Name"
                          />
                          <input
                            value={editingPartner!.description}
                            onChange={e => setEditingPartner({ ...editingPartner!, description: e.target.value })}
                            className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                            placeholder="Description"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={editingPartner!.phone}
                              onChange={e => setEditingPartner({ ...editingPartner!, phone: e.target.value })}
                              className="bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                              placeholder="Phone"
                            />
                            <input
                              value={editingPartner!.hours}
                              onChange={e => setEditingPartner({ ...editingPartner!, hours: e.target.value })}
                              className="bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                              placeholder="Hours"
                            />
                            <input
                              value={editingPartner!.email}
                              onChange={e => setEditingPartner({ ...editingPartner!, email: e.target.value })}
                              className="bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                              placeholder="Email"
                            />
                            <input
                              value={editingPartner!.address}
                              onChange={e => setEditingPartner({ ...editingPartner!, address: e.target.value })}
                              className="bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                              placeholder="Address"
                            />
                            <input
                              value={editingPartner!.distance}
                              onChange={e => setEditingPartner({ ...editingPartner!, distance: e.target.value })}
                              className="bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                              placeholder="Distance"
                            />
                            <input
                              type="number"
                              value={editingPartner!.rating}
                              onChange={e => setEditingPartner({ ...editingPartner!, rating: parseFloat(e.target.value) || 0 })}
                              className="bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                              placeholder="Rating"
                              min="0" max="5" step="0.1"
                            />
                          </div>
                          {/* Image upload in edit mode */}
                          <div className="flex gap-2 items-center">
                            <button
                              type="button"
                              onClick={() => document.getElementById(`partner-edit-upload-${p.id}`)?.click()}
                              className="text-[11px] font-semibold px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600"
                            >
                              <Upload size={12} className="inline mr-1" />Upload Image
                            </button>
                            <input
                              id={`partner-edit-upload-${p.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = ev => setEditingPartner({ ...editingPartner!, image_url: ev.target?.result as string });
                                reader.readAsDataURL(file);
                              }}
                            />
                            {editingPartner!.image_url && (
                              <span className="text-[10px] text-gray-400 truncate max-w-[100px]">image set</span>
                            )}
                          </div>
                          {editError && <p className="text-[12px] text-red-500">{editError}</p>}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={handleSaveEdit}
                              disabled={editSaving}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                            >
                              <Save size={12} />{editSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setEditingPartner(null); setEditError(null); }}
                              className="px-4 py-2 rounded-lg text-[12px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor[p.category] || 'bg-gray-100 text-gray-600'}`}>
                              {p.category}
                            </span>
                            {p.delivery_providers && p.delivery_providers.length > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                {p.delivery_providers.length} app{p.delivery_providers.length > 1 ? 's' : ''} linked
                              </span>
                            )}
                            {p.has_ordering && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                                Attenda-powered
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-[15px] text-gray-900">{p.name}</p>
                          {p.description && <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                          <div className="flex flex-wrap gap-3 mt-2">
                            {p.phone && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                <Phone size={11} className="text-gray-400" />{p.phone}
                              </span>
                            )}
                            {p.hours && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                <Clock size={11} className="text-gray-400" />{p.hours}
                              </span>
                            )}
                            {p.distance && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                <MapPin size={11} className="text-gray-400" />{p.distance}
                              </span>
                            )}
                            {p.rating > 0 && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                <Star size={11} className="text-yellow-400 fill-yellow-400" />{p.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="flex items-start gap-1.5 ml-2 shrink-0">
                        <button
                          onClick={() => { setEditingPartner({ ...p }); setEditError(null); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => toggle(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                          style={{ backgroundColor: `${TEAL}15`, color: TEAL }}
                        >
                          Menu {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        <a
                          href={`/nearby/detail?id=${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                          title="Preview guest ordering page"
                        >
                          Test Order
                        </a>
                        <button
                          onClick={() => handleEnrollVendor(p)}
                          disabled={enrolling === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
                          title="Create a login for this vendor"
                        >
                          {enrolling === p.id ? 'Enrolling…' : 'Enroll Login'}
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Vendor setup link banner */}
                  {enrollInfo?.partnerId === p.id && (
                    <div className="mt-3 bg-teal-50 border border-teal-200 rounded-xl p-3">
                      <p className="text-[12px] font-bold text-teal-800 mb-1">Vendor login created for {enrollInfo.email}</p>
                      <p className="text-[11px] text-teal-700 mb-2">Send this one-time setup link to the vendor so they can pick a password:</p>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={enrollInfo.url}
                          onFocus={e => e.currentTarget.select()}
                          className="flex-1 bg-white border border-teal-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 font-mono"
                        />
                        <button
                          onClick={() => { navigator.clipboard?.writeText(enrollInfo.url); setCopied(true); }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-600 text-white hover:bg-teal-700 shrink-0"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={() => setEnrollInfo(null)}
                          className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-teal-700 hover:bg-teal-100 shrink-0"
                        >
                          Done
                        </button>
                      </div>
                      <p className="text-[10px] text-teal-600 mt-2">After setup they log in at <span className="font-mono">/vendor/login</span> · link expires in 14 days</p>
                    </div>
                  )}
                </div>

                {/* Expanded panel */}
                {!isEditing && isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-5">

                    {/* Tier A: own delivery apps */}
                    {p.category === 'restaurant' && (
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">A · Restaurant&apos;s own delivery apps</h4>
                        <div className="flex gap-2 mb-2">
                          <select
                            value={dpForm[p.id]?.name || ''}
                            onChange={e => setDpForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))}
                            className="bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                          >
                            <option value="">App…</option>
                            {DELIVERY_APPS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                          <input
                            placeholder="Paste store link…"
                            value={dpForm[p.id]?.url || ''}
                            onChange={e => setDpForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], url: e.target.value } }))}
                            className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddDp(p)}
                            className="px-3 py-2 rounded-lg text-white text-[12px] font-bold shrink-0"
                            style={{ backgroundColor: TEAL }}
                          >
                            + Add
                          </button>
                        </div>
                        {(p.delivery_providers || []).length > 0 ? (
                          <div className="space-y-1">
                            {(p.delivery_providers || []).map((dp, i) => (
                              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                                <span className="text-[12px] font-semibold text-gray-800">{dp.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400 max-w-[180px] truncate">{dp.url}</span>
                                  <button onClick={() => handleRemoveDp(p, i)} className="text-red-400 hover:text-red-600"><XIcon size={12} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400">No apps linked.</p>
                        )}
                      </div>
                    )}

                    {/* Tier B: Attenda-powered toggle */}
                    {p.category === 'restaurant' && (
                      <div className={`rounded-xl border-2 p-4 ${p.has_ordering ? 'border-teal-200 bg-white' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-[12px] font-bold text-gray-800">B · Attenda-powered delivery</p>
                            <p className="text-[11px] text-gray-500">Restaurant saves, hotel earns.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={p.has_ordering}
                            onChange={async e => {
                              try {
                                await updatePartner(p.id, { has_ordering: e.target.checked });
                                loadPartners();
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to update');
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                        </div>
                        {p.has_ordering && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-teal-100">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Attenda charges</label>
                                <div className="relative">
                                  <input
                                    type="number" min="1" max="50" step="0.5"
                                    defaultValue={p.attenda_fee_percent ?? 15}
                                    onBlur={async e => {
                                      try {
                                        await updatePartner(p.id, { attenda_fee_percent: parseFloat(e.target.value) || 15 });
                                        loadPartners();
                                      } catch (err) {
                                        alert(err instanceof Error ? err.message : 'Failed to update');
                                      }
                                    }}
                                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none pr-6"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">%</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hotel earns</label>
                                <div className="relative">
                                  <input
                                    type="number" min="0" max="50" step="0.5"
                                    defaultValue={p.hotel_revenue_share_percent ?? 5}
                                    onBlur={async e => {
                                      try {
                                        await updatePartner(p.id, { hotel_revenue_share_percent: parseFloat(e.target.value) || 5 });
                                        loadPartners();
                                      } catch (err) {
                                        alert(err instanceof Error ? err.message : 'Failed to update');
                                      }
                                    }}
                                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none pr-6"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Menu items */}
                    {p.has_ordering && (
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu Items</h4>

                        {/* Add item form */}
                        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3 space-y-2">
                          <div className="flex gap-2">
                            <input
                              placeholder="Item name *"
                              value={menuForm[p.id]?.name || ''}
                              onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))}
                              className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100 focus:outline-none"
                            />
                            <input
                              placeholder="$0.00"
                              type="number"
                              step="0.01"
                              value={menuForm[p.id]?.price || ''}
                              onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                              className="w-24 bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100 focus:outline-none"
                            />
                          </div>
                          <input
                            placeholder="Description (optional)"
                            value={menuForm[p.id]?.description || ''}
                            onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: e.target.value } }))}
                            className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={menuImageUploading[p.id]}
                              onClick={() => document.getElementById(`menu-img-${p.id}`)?.click()}
                              className="text-[11px] font-semibold px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                            >
                              <Upload size={11} className="inline mr-1" />
                              {menuImageUploading[p.id] ? 'Uploading…' : 'Add Photo'}
                            </button>
                            <input
                              id={`menu-img-${p.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setMenuImageUploading(prev => ({ ...prev, [p.id]: true }));
                                try {
                                  const base64 = await new Promise<string>((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = ev => resolve(ev.target?.result as string);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(file);
                                  });
                                  const url = await uploadImage(base64, file.name, 'menu-items');
                                  setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], image_url: url, imagePreview: url } }));
                                } catch (err) {
                                  setMenuError(prev => ({ ...prev, [p.id]: err instanceof Error ? err.message : 'Image upload failed' }));
                                } finally {
                                  setMenuImageUploading(prev => ({ ...prev, [p.id]: false }));
                                  e.target.value = '';
                                }
                              }}
                            />
                            {menuForm[p.id]?.imagePreview && (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={menuForm[p.id].imagePreview} alt="preview" className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                                <button type="button" onClick={() => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], image_url: undefined, imagePreview: undefined } }))} className="text-red-400 text-[11px]">Remove</button>
                              </>
                            )}
                            <button
                              onClick={() => handleAddMenuItem(p.id)}
                              disabled={menuSaving[p.id] || menuImageUploading[p.id]}
                              className="ml-auto px-4 py-2 rounded-lg text-white text-[12px] font-bold shrink-0 disabled:opacity-60"
                              style={{ backgroundColor: TEAL }}
                            >
                              {menuSaving[p.id] ? 'Saving…' : '+ Add Item'}
                            </button>
                          </div>
                        </div>

                        {menuError[p.id] && (
                          <p className="text-[12px] text-red-500 mb-2">{menuError[p.id]}</p>
                        )}

                        {menuLoading[p.id] ? (
                          <div className="space-y-2">
                            <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                          </div>
                        ) : (menuItems[p.id] || []).length === 0 ? (
                          <p className="text-[12px] text-gray-400">No menu items yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {(menuItems[p.id] || []).map(item => (
                              <div key={item.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                                {item.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 text-[18px]">🍽</div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="text-[13px] font-semibold text-gray-900 block truncate">{item.name}</span>
                                  {item.description && <span className="text-[11px] text-gray-400 truncate block">{item.description}</span>}
                                </div>
                                <span className="text-[13px] font-bold text-gray-700 shrink-0">${Number(item.price).toFixed(2)}</span>
                                <button
                                  onClick={() => handleDeleteMenuItem(item.id, p.id)}
                                  className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
