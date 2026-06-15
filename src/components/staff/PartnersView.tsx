'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, Pencil, ChevronUp, ChevronDown, X as XIcon, Upload, Store,
} from 'lucide-react';
import {
  getPartners, createPartner, updatePartner, deletePartner,
  getPartnerMenuItems, createPartnerMenuItem, deletePartnerMenuItem,
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
  is_active: boolean;
}

/* ── Constants ─────────────────────────────────────────── */

const TEAL = '#0D9488';

/* ── Field component (used only within this view) ─────── */

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
      />
    </div>
  );
}

/* ── Partners View ────────────────────────────────────── */

export default function PartnersView({ hotelId }: { hotelId: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<Record<string, PartnerMenuItem[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'restaurant', description: '', image_url: '',
    phone: '', address: '', hours: '', distance: '', rating: '0', has_ordering: false, email: '',
    attenda_fee_percent: '15', hotel_revenue_share_percent: '5',
  });
  const [deliveryProviders, setDeliveryProviders] = useState<{ name: string; url: string }[]>([]);
  const [deliveryProviderForm, setDeliveryProviderForm] = useState({ name: '', url: '' });
  const [menuForm, setMenuForm] = useState<Record<string, { name: string; description: string; price: string }>>({});
  const [dpForm, setDpForm] = useState<Record<string, { name: string; url: string }>>({});
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  const loadPartners = useCallback(async () => {
    const data = await getPartners(hotelId);
    setPartners(data);
  }, [hotelId]);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  const loadMenu = async (partnerId: string) => {
    const items = await getPartnerMenuItems(partnerId);
    setMenuItems(prev => ({ ...prev, [partnerId]: items }));
  };

  const toggle = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadMenu(id);
  };

  const handleAdd = async () => {
    if (!form.name) return;
    await createPartner({
      hotel_id: hotelId,
      name: form.name,
      category: form.category,
      description: form.description,
      image_url: form.image_url,
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
    setForm({ name: '', category: 'restaurant', description: '', image_url: '', phone: '', address: '', hours: '', distance: '', rating: '0', has_ordering: false, email: '', attenda_fee_percent: '15', hotel_revenue_share_percent: '5' });
    setDeliveryProviders([]);
    setDeliveryProviderForm({ name: '', url: '' });
    setShowForm(false);
    loadPartners();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this partner and all their menu items?')) return;
    await deletePartner(id);
    loadPartners();
  };

  const handleAddMenuItem = async (partnerId: string) => {
    const mf = menuForm[partnerId];
    if (!mf?.name || !mf?.price) return;
    await createPartnerMenuItem({
      partner_id: partnerId,
      name: mf.name,
      description: mf.description || '',
      price: parseFloat(mf.price),
    });
    setMenuForm(prev => ({ ...prev, [partnerId]: { name: '', description: '', price: '' } }));
    loadMenu(partnerId);
  };

  const handleDeleteMenuItem = async (itemId: string, partnerId: string) => {
    await deletePartnerMenuItem(itemId);
    loadMenu(partnerId);
  };

  const catColor: Record<string, string> = {
    restaurant: 'bg-orange-100 text-orange-700',
    attraction: 'bg-blue-100 text-blue-700',
    service: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Partners & Menu</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage nearby partners, restaurants, and their menus.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-semibold"
          style={{ backgroundColor: TEAL }}>
          <Plus size={14} /> Add Partner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-[15px] mb-4">New Partner</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none">
                <option value="restaurant">Restaurant</option>
                <option value="attraction">Attraction</option>
                <option value="service">Service</option>
              </select>
            </div>
            <Field label="Distance (e.g. 0.3 mi)" value={form.distance} onChange={v => setForm({ ...form, distance: v })} />
            <div className="col-span-2">
              <Field label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
            </div>
            <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
            <Field label="Email (order notifications)" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="orders@restaurant.com" />
            <Field label="Hours" value={form.hours} onChange={v => setForm({ ...form, hours: v })} placeholder="Mon–Sun 8am–10pm" />
            <div className="col-span-2">
              <Field label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Image</label>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={() => document.getElementById('partner-image-upload')?.click()}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600">
                  <Upload size={14} className="inline mr-1.5" />Upload Image
                </button>
                <input id="partner-image-upload" type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => setForm({ ...form, image_url: ev.target?.result as string });
                    reader.readAsDataURL(file);
                  }} />
                {form.image_url && (
                  <>
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <button type="button" onClick={() => setForm({ ...form, image_url: '' })}
                      className="text-red-400 hover:text-red-600 text-[11px] font-medium">Clear</button>
                  </>
                )}
              </div>
            </div>
            <Field label="Rating (0–5)" value={form.rating} onChange={v => setForm({ ...form, rating: v })} />

            {/* ── Delivery Setup (restaurants only) ── */}
            {form.category === 'restaurant' && (
              <div className="col-span-2 mt-2 space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-1">Delivery Setup</p>

                {/* Tier A — Restaurant-managed */}
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <p className="text-[13px] font-bold text-gray-800 mb-0.5">A · Restaurant manages their own delivery</p>
                  <p className="text-[11px] text-gray-500 mb-3">Guests see tap-to-order buttons for their existing apps. Attenda just displays the links — zero extra cost.</p>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={deliveryProviderForm.name}
                      onChange={e => setDeliveryProviderForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                    >
                      <option value="">Choose app…</option>
                      <option value="Uber Eats">Uber Eats</option>
                      <option value="DoorDash">DoorDash</option>
                      <option value="Grubhub">Grubhub</option>
                      <option value="Order Inn">Order Inn</option>
                      <option value="Instacart">Instacart</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      placeholder="Paste their store link…"
                      value={deliveryProviderForm.url}
                      onChange={e => setDeliveryProviderForm(f => ({ ...f, url: e.target.value }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                    />
                    <button type="button"
                      onClick={() => {
                        if (!deliveryProviderForm.name || !deliveryProviderForm.url) return;
                        setDeliveryProviders(prev => [...prev, { name: deliveryProviderForm.name, url: deliveryProviderForm.url }]);
                        setDeliveryProviderForm({ name: '', url: '' });
                      }}
                      className="px-3 py-2 rounded-lg text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                      + Add
                    </button>
                  </div>
                  {deliveryProviders.length > 0 && (
                    <div className="space-y-1">
                      {deliveryProviders.map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <span className="text-[12px] font-semibold text-gray-800">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 max-w-[150px] truncate">{p.url}</span>
                            <button type="button" onClick={() => setDeliveryProviders(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><XIcon size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tier B — Attenda-powered */}
                <div className={`rounded-xl border-2 p-4 transition-colors ${form.has_ordering ? 'border-[#0D9488] bg-teal-50/40' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-2.5 mb-2">
                    <input type="checkbox" id="has_ordering" checked={form.has_ordering}
                      onChange={e => setForm({ ...form, has_ordering: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 shrink-0" />
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
                            <input type="number" min="1" max="50" step="0.5"
                              value={form.attenda_fee_percent}
                              onChange={e => setForm({ ...form, attenda_fee_percent: e.target.value })}
                              className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] border border-gray-200 focus:outline-none pr-7" />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hotel earns per order</label>
                          <div className="relative">
                            <input type="number" min="0" max="50" step="0.5"
                              value={form.hotel_revenue_share_percent}
                              onChange={e => setForm({ ...form, hotel_revenue_share_percent: e.target.value })}
                              className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] border border-gray-200 focus:outline-none pr-7" />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-teal-100 text-[11px] text-teal-700">
                        On a $100 order: restaurant pays ${((parseFloat(form.attenda_fee_percent) || 15)).toFixed(0)}, hotel earns ${((parseFloat(form.hotel_revenue_share_percent) || 5)).toFixed(0)}, Attenda keeps ${Math.max(0, (parseFloat(form.attenda_fee_percent) || 15) - (parseFloat(form.hotel_revenue_share_percent) || 5)).toFixed(0)}.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: TEAL }}>
              SAVE PARTNER
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[13px]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <Store size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No partners yet. Add your first partner above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map(p => {
            const isEditing = editingPartner?.id === p.id;
            return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
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

                  {isEditing ? (
                    <div className="space-y-2 mt-2">
                      <input value={editingPartner!.name} onChange={e => setEditingPartner({ ...editingPartner!, name: e.target.value })}
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none font-bold" placeholder="Name" />
                      <input value={editingPartner!.description} onChange={e => setEditingPartner({ ...editingPartner!, description: e.target.value })}
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" placeholder="Description" />
                      <div className="flex gap-2">
                        <input value={editingPartner!.phone} onChange={e => setEditingPartner({ ...editingPartner!, phone: e.target.value })}
                          className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" placeholder="Phone" />
                        <input value={editingPartner!.hours} onChange={e => setEditingPartner({ ...editingPartner!, hours: e.target.value })}
                          className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" placeholder="Hours" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <button type="button" onClick={() => document.getElementById(`partner-edit-upload-${p.id}`)?.click()}
                          className="text-[11px] font-semibold px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600">
                          <Upload size={12} className="inline mr-1" />Upload Image
                        </button>
                        <input id={`partner-edit-upload-${p.id}`} type="file" accept="image/*" className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => setEditingPartner({ ...editingPartner!, image_url: ev.target?.result as string });
                            reader.readAsDataURL(file);
                          }} />
                        {editingPartner!.image_url && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[100px]">✓ image set</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-[15px] text-gray-900">{p.name}</p>
                      {p.description && <p className="text-[12px] text-gray-500 mt-0.5 truncate">{p.description}</p>}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={async () => {
                        if (!editingPartner) return;
                        await updatePartner(p.id, {
                          name: editingPartner.name,
                          description: editingPartner.description,
                          phone: editingPartner.phone,
                          hours: editingPartner.hours,
                          image_url: editingPartner.image_url,
                        });
                        setEditingPartner(null);
                        loadPartners();
                      }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-600 hover:bg-teal-100">
                        <Save size={12} /> Save
                      </button>
                      <button onClick={() => setEditingPartner(null)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingPartner({ ...p })}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-400">
                        <Pencil size={14} />
                      </button>
                      {(p.has_ordering || (p.delivery_providers && p.delivery_providers.length > 0)) && (
                        <button onClick={() => toggle(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                          style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                          Manage {expanded === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                      <button onClick={() => handleDelete(p.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!isEditing && expanded === p.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-5">

                  {/* ── Tier A: Own delivery apps ── */}
                  {p.category === 'restaurant' && (
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">A · Restaurant&apos;s own delivery apps</h4>
                      <div className="flex gap-2 mb-2">
                        <select value={dpForm[p.id]?.name || ''}
                          onChange={e => setDpForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))}
                          className="bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none">
                          <option value="">App…</option>
                          <option value="Uber Eats">Uber Eats</option>
                          <option value="DoorDash">DoorDash</option>
                          <option value="Grubhub">Grubhub</option>
                          <option value="Order Inn">Order Inn</option>
                          <option value="Instacart">Instacart</option>
                          <option value="Other">Other</option>
                        </select>
                        <input placeholder="Paste store link…" value={dpForm[p.id]?.url || ''}
                          onChange={e => setDpForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], url: e.target.value } }))}
                          className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
                        <button onClick={async () => {
                          const name = dpForm[p.id]?.name; const url = dpForm[p.id]?.url;
                          if (!name || !url) return;
                          await updatePartner(p.id, { delivery_providers: [...(p.delivery_providers || []), { name, url }] });
                          setDpForm(prev => ({ ...prev, [p.id]: { name: '', url: '' } }));
                          loadPartners();
                        }} className="px-3 py-2 rounded-lg text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
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
                                <button onClick={async () => {
                                  await updatePartner(p.id, { delivery_providers: (p.delivery_providers || []).filter((_, j) => j !== i) });
                                  loadPartners();
                                }} className="text-red-400 hover:text-red-600"><XIcon size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400">No apps linked — guests will only see in-room ordering or contact info.</p>
                      )}
                    </div>
                  )}

                  {/* ── Tier B: Attenda-powered ── */}
                  {p.category === 'restaurant' && (
                    <div className={`rounded-xl border-2 p-4 ${p.has_ordering ? 'border-teal-200 bg-white' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[12px] font-bold text-gray-800">B · Attenda-powered delivery</p>
                          <p className="text-[11px] text-gray-500">Restaurant saves, hotel earns.</p>
                        </div>
                        <input type="checkbox" checked={p.has_ordering}
                          onChange={async e => { await updatePartner(p.id, { has_ordering: e.target.checked }); loadPartners(); }}
                          className="w-4 h-4 rounded" />
                      </div>
                      {p.has_ordering && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-teal-100">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Attenda charges</label>
                              <div className="relative">
                                <input type="number" min="1" max="50" step="0.5"
                                  defaultValue={p.attenda_fee_percent ?? 15}
                                  onBlur={async e => { await updatePartner(p.id, { attenda_fee_percent: parseFloat(e.target.value) || 15 }); loadPartners(); }}
                                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none pr-6" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">%</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hotel earns</label>
                              <div className="relative">
                                <input type="number" min="0" max="50" step="0.5"
                                  defaultValue={p.hotel_revenue_share_percent ?? 5}
                                  onBlur={async e => { await updatePartner(p.id, { hotel_revenue_share_percent: parseFloat(e.target.value) || 5 }); loadPartners(); }}
                                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none pr-6" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Menu items (Attenda-powered only) ── */}
                  {p.has_ordering && (
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu Items</h4>
                  <div className="flex gap-2 mb-4">
                    <input
                      placeholder="Item name *"
                      value={menuForm[p.id]?.name || ''}
                      onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none"
                    />
                    <input
                      placeholder="Description"
                      value={menuForm[p.id]?.description || ''}
                      onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: e.target.value } }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none"
                    />
                    <input
                      placeholder="$0.00"
                      type="number"
                      step="0.01"
                      value={menuForm[p.id]?.price || ''}
                      onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                      className="w-20 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none"
                    />
                    <button onClick={() => handleAddMenuItem(p.id)}
                      className="px-3 py-2 rounded-lg text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
                      Add
                    </button>
                  </div>
                  {(menuItems[p.id] || []).length === 0 ? (
                    <p className="text-[12px] text-gray-400">No menu items yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(menuItems[p.id] || []).map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                          <div>
                            <span className="text-[13px] font-semibold text-gray-900">{item.name}</span>
                            {item.description && <span className="text-[11px] text-gray-400 ml-2">{item.description}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[13px] font-bold text-gray-700">${Number(item.price).toFixed(2)}</span>
                            <button onClick={() => handleDeleteMenuItem(item.id, p.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={13} />
                            </button>
                          </div>
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