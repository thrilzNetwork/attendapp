'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, Pencil, X as XIcon, ChevronDown, ChevronUp,
  Phone, Mail, Calendar, DollarSign, Package, ClipboardList, Truck,
} from 'lucide-react';
import {
  getVendors, createVendor, updateVendor, deleteVendor,
  getVendorOrderGuide, createVendorOrderGuideItem, updateVendorOrderGuideItem, deleteVendorOrderGuideItem,
  getVendorOrders, createVendorOrder, updateVendorOrder, deleteVendorOrder,
  getVendorOrderItems,
  type Vendor, type VendorOrderGuideItem, type VendorOrder, type VendorOrderItem,
} from '@/lib/supabase';

const TEAL = '#0D9488';
const CATEGORIES = ['Housekeeping', 'Maintenance', 'Laundry', 'Pool', 'Landscaping', 'Security', 'IT', 'Supplies', 'Other'];
const UNITS = ['ea', 'box', 'case', 'pack', 'gallon', 'lb', 'hr', 'flat'];

/* ── Field component ─────────────────────────────────── */
function Field({ label, value, onChange, placeholder, type = 'text' }: {
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
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ── Status badge ───────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    terminated: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-blue-100 text-blue-700',
    received: 'bg-teal-100 text-teal-700',
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

/* ── Category badge ─────────────────────────────────── */
function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Housekeeping: 'bg-blue-50 text-blue-600',
    Maintenance: 'bg-orange-50 text-orange-600',
    Laundry: 'bg-purple-50 text-purple-600',
    Pool: 'bg-cyan-50 text-cyan-600',
    Landscaping: 'bg-green-50 text-green-600',
    Security: 'bg-red-50 text-red-600',
    IT: 'bg-indigo-50 text-indigo-600',
    Supplies: 'bg-teal-50 text-teal-600',
    Other: 'bg-gray-50 text-gray-600',
  };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${colors[category] || colors.Other}`}>
      {category}
    </span>
  );
}

/* ── Vendors View ───────────────────────────────────── */
export default function VendorsView({ hotelId, userName }: { hotelId: string; userName?: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [view, setView] = useState<'list' | 'detail' | 'newOrder'>('list');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Order data
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, VendorOrderItem[]>>({});

  const load = useCallback(async () => {
    const data = await getVendors(hotelId);
    setVendors(data);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const loadOrders = useCallback(async () => {
    const data = await getVendorOrders(hotelId);
    setOrders(data);
    // Load items for each order
    const itemsMap: Record<string, VendorOrderItem[]> = {};
    for (const o of data.slice(0, 50)) {
      itemsMap[o.id] = await getVendorOrderItems(o.id);
    }
    setOrderItems(itemsMap);
  }, [hotelId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = vendors.filter(v =>
    (filterCat === 'All' || v.category === filterCat) &&
    (filterStatus === 'All' || v.status === filterStatus)
  );

  // Monthly summary
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthlySpend = orders
    .filter(o => {
      const d = new Date(o.order_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingPayments = orders.filter(o => o.status === 'submitted' || o.status === 'received');
  const activeVendors = vendors.filter(v => v.status === 'active');

  /* ── Add vendor form ── */
  const [form, setForm] = useState({
    name: '', contact_name: '', phone: '', email: '', category: 'Housekeeping',
    service_description: '', service_schedule: '', payment_terms: '',
    rate_amount: '0', rate_frequency: 'Per visit', status: 'active', notes: '',
  });

  const handleAdd = async () => {
    if (!form.name) return;
    await createVendor({
      hotel_id: hotelId,
      name: form.name,
      contact_name: form.contact_name,
      phone: form.phone,
      email: form.email,
      category: form.category,
      service_description: form.service_description,
      service_schedule: form.service_schedule,
      payment_terms: form.payment_terms,
      rate_amount: parseFloat(form.rate_amount) || 0,
      rate_frequency: form.rate_frequency,
      status: form.status,
      notes: form.notes,
    });
    setForm({ name: '', contact_name: '', phone: '', email: '', category: 'Housekeeping', service_description: '', service_schedule: '', payment_terms: '', rate_amount: '0', rate_frequency: 'Per visit', status: 'active', notes: '' });
    setShowAddForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vendor and all related data?')) return;
    await deleteVendor(id);
    setView('list');
    setSelectedVendor(null);
    load();
  };

  /* ── LIST VIEW ── */
  if (view === 'list') {
    return (
      <div className="p-5 max-w-6xl mx-auto">
        {/* Monthly Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Active Vendors</p>
            <p className="text-2xl font-bold mt-1" style={{ color: TEAL }}>{activeVendors.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Spend This Month</p>
            <p className="text-2xl font-bold mt-1 text-gray-800">${monthlySpend.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pending Payments</p>
            <p className="text-2xl font-bold mt-1 text-orange-500">{pendingPayments.length}</p>
          </div>
        </div>

        {/* Header + Add button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100">
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100">
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-semibold" style={{ background: TEAL }}>
            <Plus size={16} /> Add Vendor
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl p-5 border border-gray-200 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold">New Vendor</h3>
              <button onClick={() => setShowAddForm(false)}><XIcon size={18} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vendor Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Superior Linen Supply" />
              <Field label="Contact Name" value={form.contact_name} onChange={v => setForm({ ...form, contact_name: v })} placeholder="John Smith" />
              <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder="954-555-0100" />
              <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="contact@vendor.com" />
              <SelectField label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} options={CATEGORIES} />
              <Field label="Service Description" value={form.service_description} onChange={v => setForm({ ...form, service_description: v })} placeholder="Linen rental and laundry service" />
              <Field label="Service Schedule" value={form.service_schedule} onChange={v => setForm({ ...form, service_schedule: v })} placeholder="Mon/Wed/Fri 8AM" />
              <Field label="Payment Terms" value={form.payment_terms} onChange={v => setForm({ ...form, payment_terms: v })} placeholder="Net 30" />
              <Field label="Rate Amount" value={form.rate_amount} onChange={v => setForm({ ...form, rate_amount: v })} type="number" placeholder="0" />
              <SelectField label="Rate Frequency" value={form.rate_frequency} onChange={v => setForm({ ...form, rate_frequency: v })} options={['Per visit', 'Per month', 'Per hour', 'Per contract', 'Per order']} />
              <SelectField label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })} options={['active', 'paused', 'terminated']} />
              <Field label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Contract details, special instructions..." />
            </div>
            <button onClick={handleAdd} className="mt-4 px-6 py-2.5 rounded-xl text-white text-[13px] font-semibold" style={{ background: TEAL }}>
              Save Vendor
            </button>
          </div>
        )}

        {/* Vendor Cards */}
        {filtered.length === 0 && !showAddForm && (
          <div className="text-center py-12 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[14px]">No vendors yet. Click "Add Vendor" to get started.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(v => (
            <div key={v.id} className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
              onClick={() => { setSelectedVendor(v); setView('detail'); }}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-gray-800">{v.name}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <CategoryBadge category={v.category} />
                    <StatusBadge status={v.status} />
                  </div>
                </div>
                <div className="text-right">
                  {v.rate_amount > 0 && (
                    <p className="text-[14px] font-bold" style={{ color: TEAL }}>${v.rate_amount.toLocaleString()}</p>
                  )}
                  {v.rate_frequency && (
                    <p className="text-[10px] text-gray-400 uppercase">{v.rate_frequency}</p>
                  )}
                </div>
              </div>
              {v.service_description && (
                <p className="text-[12px] text-gray-500 mt-2 line-clamp-2">{v.service_description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-400">
                {v.service_schedule && <span className="flex items-center gap-1"><Calendar size={12} /> {v.service_schedule}</span>}
                {v.phone && <span className="flex items-center gap-1"><Phone size={12} /> {v.phone}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── DETAIL VIEW ── */
  if (view === 'detail' && selectedVendor) {
    return <VendorDetail vendor={selectedVendor} onBack={() => { setView('list'); setSelectedVendor(null); }} onDelete={() => handleDelete(selectedVendor.id)} onUpdate={(updated) => { setSelectedVendor(updated); load(); }} userName={userName} hotelId={hotelId} orders={orders.filter(o => o.vendor_id === selectedVendor.id)} orderItems={orderItems} loadOrders={loadOrders} />;
  }

  /* ── NEW ORDER VIEW ── */
  if (view === 'newOrder') {
    return <NewOrderView vendors={vendors} hotelId={hotelId} userName={userName} onBack={() => setView('list')} onSubmitted={loadOrders} />;
  }

  return null;
}

/* ── Vendor Detail Component ─────────────────────────── */
function VendorDetail({ vendor, onBack, onDelete, onUpdate, userName, hotelId, orders, orderItems, loadOrders }: {
  vendor: Vendor;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (v: Vendor) => void;
  userName?: string;
  hotelId: string;
  orders: VendorOrder[];
  orderItems: Record<string, VendorOrderItem[]>;
  loadOrders: () => void;
}) {
  const [subTab, setSubTab] = useState<'info' | 'guide' | 'history'>('info');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Vendor>(vendor);
  const [guide, setGuide] = useState<VendorOrderGuideItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ item_name: '', item_description: '', unit: 'ea', unit_price: '0', category: '', min_order_qty: '1' });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState<Partial<VendorOrderGuideItem>>({});

  const loadGuide = useCallback(async () => {
    const data = await getVendorOrderGuide(vendor.id);
    setGuide(data);
  }, [vendor.id]);

  useEffect(() => { loadGuide(); }, [loadGuide]);

  const handleSaveEdit = async () => {
    await updateVendor(vendor.id, editForm);
    onUpdate(editForm);
    setEditing(false);
  };

  const handleAddItem = async () => {
    if (!itemForm.item_name) return;
    await createVendorOrderGuideItem({
      vendor_id: vendor.id,
      hotel_id: hotelId,
      item_name: itemForm.item_name,
      item_description: itemForm.item_description,
      unit: itemForm.unit,
      unit_price: parseFloat(itemForm.unit_price) || 0,
      category: itemForm.category,
      min_order_qty: parseFloat(itemForm.min_order_qty) || 1,
      is_active: true,
    });
    setItemForm({ item_name: '', item_description: '', unit: 'ea', unit_price: '0', category: '', min_order_qty: '1' });
    setShowAddItem(false);
    loadGuide();
  };

  const handleSaveItem = async (id: string) => {
    await updateVendorOrderGuideItem(id, editItemForm);
    setEditingItem(null);
    setEditItemForm({});
    loadGuide();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await deleteVendorOrderGuideItem(id);
    loadGuide();
  };

  const handleOrderStatusChange = async (orderId: string, status: string) => {
    await updateVendorOrder(orderId, { status });
    loadOrders();
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Delete this order?')) return;
    await deleteVendorOrder(orderId);
    loadOrders();
  };

  return (
    <div className="p-5 max-w-5xl mx-auto">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 mb-4">
        ← Back to Vendors
      </button>

      {/* Vendor header */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-gray-800">{vendor.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <CategoryBadge category={vendor.category} />
              <StatusBadge status={vendor.status} />
            </div>
          </div>
          <button onClick={onDelete} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
        </div>
        {vendor.service_description && <p className="text-[13px] text-gray-500 mt-3">{vendor.service_description}</p>}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-4 bg-gray-50 rounded-xl p-1">
        {(['info', 'guide', 'history'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${subTab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>
            {t === 'info' ? 'Info' : t === 'guide' ? 'Order Guide' : 'Order History'}
          </button>
        ))}
      </div>

      {/* INFO TAB */}
      {subTab === 'info' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          {!editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Contact Name" value={vendor.contact_name} />
                <InfoRow label="Phone" value={vendor.phone} />
                <InfoRow label="Email" value={vendor.email} />
                <InfoRow label="Category" value={vendor.category} />
                <InfoRow label="Service Schedule" value={vendor.service_schedule} />
                <InfoRow label="Payment Terms" value={vendor.payment_terms} />
                <InfoRow label="Rate" value={vendor.rate_amount > 0 ? `$${vendor.rate_amount.toLocaleString()} / ${vendor.rate_frequency}` : ''} />
                <InfoRow label="Last Payment" value={vendor.last_payment_date ? `${vendor.last_payment_date} ($${vendor.last_payment_amount})` : 'None'} />
                <InfoRow label="Status" value={vendor.status} />
                <InfoRow label="Notes" value={vendor.notes} />
              </div>
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100">
                <Pencil size={14} /> Edit
              </button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vendor Name" value={editForm.name} onChange={v => setEditForm({ ...editForm, name: v })} />
                <Field label="Contact Name" value={editForm.contact_name} onChange={v => setEditForm({ ...editForm, contact_name: v })} />
                <Field label="Phone" value={editForm.phone} onChange={v => setEditForm({ ...editForm, phone: v })} />
                <Field label="Email" value={editForm.email} onChange={v => setEditForm({ ...editForm, email: v })} />
                <SelectField label="Category" value={editForm.category} onChange={v => setEditForm({ ...editForm, category: v })} options={CATEGORIES} />
                <Field label="Service Description" value={editForm.service_description} onChange={v => setEditForm({ ...editForm, service_description: v })} />
                <Field label="Service Schedule" value={editForm.service_schedule} onChange={v => setEditForm({ ...editForm, service_schedule: v })} />
                <Field label="Payment Terms" value={editForm.payment_terms} onChange={v => setEditForm({ ...editForm, payment_terms: v })} />
                <Field label="Rate Amount" value={String(editForm.rate_amount)} onChange={v => setEditForm({ ...editForm, rate_amount: parseFloat(v) || 0 })} type="number" />
                <SelectField label="Rate Frequency" value={editForm.rate_frequency} onChange={v => setEditForm({ ...editForm, rate_frequency: v })} options={['Per visit', 'Per month', 'Per hour', 'Per contract', 'Per order']} />
                <SelectField label="Status" value={editForm.status} onChange={v => setEditForm({ ...editForm, status: v })} options={['active', 'paused', 'terminated']} />
                <Field label="Notes" value={editForm.notes} onChange={v => setEditForm({ ...editForm, notes: v })} />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveEdit} className="px-6 py-2.5 rounded-xl text-white text-[13px] font-semibold" style={{ background: TEAL }}>Save</button>
                <button onClick={() => { setEditing(false); setEditForm(vendor); }} className="px-6 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-50 text-gray-600">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ORDER GUIDE TAB */}
      {subTab === 'guide' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold">Order Guide ({guide.length} items)</h3>
            <button onClick={() => setShowAddItem(!showAddItem)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: TEAL }}>
              <Plus size={15} /> Add Item
            </button>
          </div>

          {showAddItem && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Item Name" value={itemForm.item_name} onChange={v => setItemForm({ ...itemForm, item_name: v })} placeholder="Bath towels (white)" />
                <Field label="Description" value={itemForm.item_description} onChange={v => setItemForm({ ...itemForm, item_description: v })} placeholder="Standard bath towels" />
                <SelectField label="Unit" value={itemForm.unit} onChange={v => setItemForm({ ...itemForm, unit: v })} options={UNITS} />
                <Field label="Unit Price" value={itemForm.unit_price} onChange={v => setItemForm({ ...itemForm, unit_price: v })} type="number" placeholder="4.50" />
                <Field label="Category" value={itemForm.category} onChange={v => setItemForm({ ...itemForm, category: v })} placeholder="Linens" />
                <Field label="Min Order Qty" value={itemForm.min_order_qty} onChange={v => setItemForm({ ...itemForm, min_order_qty: v })} type="number" placeholder="1" />
              </div>
              <button onClick={handleAddItem} className="mt-3 px-5 py-2 rounded-xl text-white text-[13px] font-semibold" style={{ background: TEAL }}>Add to Guide</button>
            </div>
          )}

          {guide.length === 0 && !showAddItem ? (
            <div className="text-center py-8 text-gray-400">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-[13px]">No items in order guide yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {guide.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  {editingItem === item.id ? (
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <input value={editItemForm.item_name || item.item_name} onChange={e => setEditItemForm({ ...editItemForm, item_name: e.target.value })} className="bg-white rounded-lg px-2 py-1.5 text-[13px] border border-gray-200" />
                      <select value={editItemForm.unit || item.unit} onChange={e => setEditItemForm({ ...editItemForm, unit: e.target.value })} className="bg-white rounded-lg px-2 py-1.5 text-[13px] border border-gray-200">
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <input type="number" value={String(editItemForm.unit_price ?? item.unit_price)} onChange={e => setEditItemForm({ ...editItemForm, unit_price: parseFloat(e.target.value) || 0 })} className="bg-white rounded-lg px-2 py-1.5 text-[13px] border border-gray-200" />
                      <div className="flex gap-1">
                        <button onClick={() => handleSaveItem(item.id)} className="px-3 py-1.5 rounded-lg text-white text-[12px] font-semibold" style={{ background: TEAL }}>Save</button>
                        <button onClick={() => { setEditingItem(null); setEditItemForm({}); }} className="px-3 py-1.5 rounded-lg bg-gray-200 text-[12px]">X</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold text-gray-700">{item.item_name}</p>
                        {item.item_description && <p className="text-[11px] text-gray-400">{item.item_description}</p>}
                        {item.category && <span className="inline-block mt-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>}
                      </div>
                      <div className="text-right mr-3">
                        <p className="text-[14px] font-bold" style={{ color: TEAL }}>${item.unit_price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">per {item.unit}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingItem(item.id); setEditItemForm({}); }} className="p-2 text-gray-400 hover:text-gray-600"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDER HISTORY TAB */}
      {subTab === 'history' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-[15px] font-bold mb-4">Order History ({orders.length})</h3>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Truck size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-[13px]">No orders yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <div key={o.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[14px] font-bold text-gray-700">{new Date(o.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      {o.service_date && <p className="text-[11px] text-gray-400">Service: {o.service_date}</p>}
                      {o.notes && <p className="text-[11px] text-gray-400 mt-1">{o.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[16px] font-bold" style={{ color: TEAL }}>${o.total_amount.toFixed(2)}</p>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                  {/* Line items */}
                  {(orderItems[o.id] || []).length > 0 && (
                    <div className="mt-3 border-t border-gray-200 pt-2">
                      {(orderItems[o.id] || []).map(item => (
                        <div key={item.id} className="flex justify-between text-[12px] text-gray-500 py-0.5">
                          <span>{item.qty} {item.unit} × {item.item_name}</span>
                          <span>${item.line_total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Status controls */}
                  <div className="flex gap-1 mt-3">
                    {['draft', 'submitted', 'received', 'paid'].map(s => (
                      <button key={s} onClick={() => handleOrderStatusChange(o.id, s)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${o.status === s ? 'bg-white shadow-sm' : 'text-gray-400'}`}
                        style={o.status === s ? { color: TEAL } : {}}>
                        {s}
                      </button>
                    ))}
                    <button onClick={() => handleDeleteOrder(o.id)} className="ml-auto p-1.5 text-red-300 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── New Order View ──────────────────────────────────── */
function NewOrderView({ vendors, hotelId, userName, onBack, onSubmitted }: {
  vendors: Vendor[];
  hotelId: string;
  userName?: string;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [guide, setGuide] = useState<VendorOrderGuideItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [adHocItems, setAdHocItems] = useState<{ item_name: string; qty: string; unit: string; unit_price: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  useEffect(() => {
    if (!selectedVendorId) { setGuide([]); return; }
    getVendorOrderGuide(selectedVendorId).then(setGuide);
  }, [selectedVendorId]);

  const total = Object.entries(quantities).reduce((sum, [id, qty]) => {
    const item = guide.find(g => g.id === id);
    const q = parseFloat(qty) || 0;
    return sum + (item ? q * item.unit_price : 0);
  }, 0) + adHocItems.reduce((sum, a) => sum + (parseFloat(a.qty) || 0) * (parseFloat(a.unit_price) || 0), 0);

  const handleSubmit = async () => {
    if (!selectedVendorId) return;
    setSubmitting(true);

    const items: { order_guide_item_id: string | null; item_name: string; qty: number; unit: string; unit_price: number; line_total: number }[] = [];

    // Guide items with quantity
    for (const [id, qtyStr] of Object.entries(quantities)) {
      const qty = parseFloat(qtyStr);
      if (!qty || qty <= 0) continue;
      const item = guide.find(g => g.id === id);
      if (!item) continue;
      items.push({
        order_guide_item_id: id,
        item_name: item.item_name,
        qty,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: qty * item.unit_price,
      });
    }

    // Ad-hoc items
    for (const a of adHocItems) {
      const qty = parseFloat(a.qty);
      if (!qty || qty <= 0) continue;
      const price = parseFloat(a.unit_price) || 0;
      items.push({
        order_guide_item_id: null,
        item_name: a.item_name,
        qty,
        unit: a.unit,
        unit_price: price,
        line_total: qty * price,
      });
    }

    if (items.length === 0) { setSubmitting(false); return; }

    await createVendorOrder({
      vendor_id: selectedVendorId,
      hotel_id: hotelId,
      order_date: new Date().toISOString().split('T')[0],
      service_date: serviceDate || null,
      status: 'submitted',
      total_amount: total,
      logged_by: userName || 'Staff',
      notes,
    }, items);

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => { onSubmitted(); onBack(); }, 1500);
  };

  if (submitted) {
    return (
      <div className="p-5 max-w-3xl mx-auto text-center py-16">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-[20px] font-bold text-gray-800">Order Submitted!</h2>
        <p className="text-[13px] text-gray-400 mt-1">Total: ${total.toFixed(2)}</p>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 mb-4">
        ← Back to Vendors
      </button>

      <h2 className="text-[20px] font-bold text-gray-800 mb-4">New Order</h2>

      {/* Select vendor */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
        <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Select Vendor</label>
        <select value={selectedVendorId} onChange={e => { setSelectedVendorId(e.target.value); setQuantities({}); }}
          className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none">
          <option value="">Choose a vendor...</option>
          {vendors.filter(v => v.status === 'active').map(v => (
            <option key={v.id} value={v.id}>{v.name} — {v.category}</option>
          ))}
        </select>
      </div>

      {selectedVendor && (
        <>
          {/* Order guide items */}
          {guide.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
              <h3 className="text-[14px] font-bold mb-3">Order Guide</h3>
              <div className="space-y-2">
                {guide.filter(g => g.is_active).map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-gray-700">{item.item_name}</p>
                      {item.category && <span className="text-[10px] text-gray-400">{item.category}</span>}
                    </div>
                    <span className="text-[13px] font-bold text-gray-600 min-w-[60px] text-right">${item.unit_price.toFixed(2)}</span>
                    <input type="number" min={0}
                      value={quantities[item.id] || ''}
                      onChange={e => setQuantities({ ...quantities, [item.id]: e.target.value })}
                      placeholder="0"
                      className="w-16 bg-white rounded-lg px-2 py-1.5 text-[13px] text-center border border-gray-200"
                    />
                    <span className="text-[11px] text-gray-400 min-w-[24px]">{item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ad-hoc items */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold">Additional Items</h3>
              <button onClick={() => setAdHocItems([...adHocItems, { item_name: '', qty: '', unit: 'ea', unit_price: '' }])}
                className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: TEAL }}>
                <Plus size={14} /> Add Item
              </button>
            </div>
            {adHocItems.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={a.item_name} onChange={e => { const arr = [...adHocItems]; arr[i] = { ...arr[i], item_name: e.target.value }; setAdHocItems(arr); }}
                  placeholder="Item name" className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100" />
                <input type="number" value={a.qty} onChange={e => { const arr = [...adHocItems]; arr[i] = { ...arr[i], qty: e.target.value }; setAdHocItems(arr); }}
                  placeholder="Qty" className="w-16 bg-gray-50 rounded-lg px-2 py-2 text-[13px] text-center border border-gray-100" />
                <select value={a.unit} onChange={e => { const arr = [...adHocItems]; arr[i] = { ...arr[i], unit: e.target.value }; setAdHocItems(arr); }}
                  className="bg-gray-50 rounded-lg px-2 py-2 text-[13px] border border-gray-100">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="number" value={a.unit_price} onChange={e => { const arr = [...adHocItems]; arr[i] = { ...arr[i], unit_price: e.target.value }; setAdHocItems(arr); }}
                  placeholder="Price" className="w-20 bg-gray-50 rounded-lg px-2 py-2 text-[13px] text-center border border-gray-100" />
                <button onClick={() => setAdHocItems(adHocItems.filter((_, j) => j !== i))} className="text-red-300 hover:text-red-500 px-2"><XIcon size={16} /></button>
              </div>
            ))}
          </div>

          {/* Notes + service date */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Service Date" value={serviceDate} onChange={setServiceDate} type="date" />
              <Field label="Notes" value={notes} onChange={setNotes} placeholder="Special instructions..." />
            </div>
          </div>

          {/* Total + Submit */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">Order Total</p>
              <p className="text-2xl font-bold" style={{ color: TEAL }}>${total.toFixed(2)}</p>
            </div>
            <button onClick={handleSubmit} disabled={submitting || total === 0}
              className="px-8 py-3 rounded-xl text-white text-[14px] font-semibold disabled:opacity-50"
              style={{ background: TEAL }}>
              {submitting ? 'Submitting...' : 'Submit Order'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Helper component ────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-[14px] text-gray-700 mt-0.5">{value || '—'}</p>
    </div>
  );
}