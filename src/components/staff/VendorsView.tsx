'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, Pencil, X as XIcon, Truck, Phone,
  ChevronRight, ShoppingCart, ArrowLeft, DollarSign,
} from 'lucide-react';
import {
  fetchVendors, createVendor, updateVendor, deleteVendor,
  fetchVendorOrderGuide, createVendorOrderGuideItem, updateVendorOrderGuideItem, deleteVendorOrderGuideItem,
  fetchVendorOrders, createVendorOrder, updateVendorOrder, deleteVendorOrder,
  fetchVendorOrderItems, createVendorOrderItems,
  fetchVendorEvents, createVendorEvent, updateVendorEvent, deleteVendorEvent, eventFallsOnDate,
  fetchVendorExpenses, createVendorExpense, deleteVendorExpense,
  type Vendor, type VendorOrderGuideItem, type VendorOrder, type VendorOrderItem,
  type VendorEvent, type VendorExpense,
} from '@/lib/supabase';

const TEAL = '#0D9488';

const CATEGORIES = [
  { key: 'produce', label: 'Produce' },
  { key: 'meat_seafood', label: 'Meat & Seafood' },
  { key: 'dairy', label: 'Dairy' },
  { key: 'dry_goods', label: 'Dry Goods' },
  { key: 'beverage', label: 'Beverage' },
  { key: 'chemical', label: 'Chemical / Cleaning' },
  { key: 'linen', label: 'Linen / Uniform' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'energy', label: 'Energy / Utility' },
  { key: 'service', label: 'Service' },
  { key: 'general', label: 'General' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  draft: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-700',
  received: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
};

const ORDER_STATUSES = ['draft', 'submitted', 'received', 'paid'];

const EVENT_TYPES: Record<string, { label: string; icon: string }> = {
  delivery: { label: 'Delivery', icon: '📦' },
  service: { label: 'Service Visit', icon: '🔧' },
  order: { label: 'Order Placement', icon: '📝' },
  maintenance: { label: 'Maintenance', icon: '🛠️' },
  inspection: { label: 'Inspection', icon: '🔍' },
  pickup: { label: 'Pickup', icon: '🚚' },
};

const RECURRENCE_TYPES: Record<string, string> = {
  one_time: 'One Time',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
};

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-300" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { key: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-300">
        {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── Vendor List with Monthly Summary ───────────────── */
function VendorList({ vendors, loading, error, onSelect, onAdd, expenses }: {
  vendors: Vendor[]; loading: boolean; error: string | null;
  onSelect: (v: Vendor) => void; onAdd: () => void;
  expenses: VendorExpense[];
}) {
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = vendors.filter(v =>
    (filterCat === 'all' || v.category === filterCat) &&
    (filterStatus === 'all' || v.status === filterStatus)
  );

  const activeCount = vendors.filter(v => v.status === 'active').length;
  const mStr = monthStr();
  const monthExpenses = expenses.filter(e => e.expense_date.startsWith(mStr));
  const monthSpend = monthExpenses.reduce((s, e) => s + e.amount, 0);

  if (loading) return <div className="p-8 text-center text-gray-400 text-[14px]">Loading vendors...</div>;
  if (error) return <div className="p-6 bg-red-50 rounded-xl text-red-600 text-[13px]">{error}</div>;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <Truck size={20} style={{ color: TEAL }} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Active Vendors</div>
            <div className="text-2xl font-bold text-gray-800">{activeCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
            <Plus size={20} className="text-gray-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Vendors</div>
            <div className="text-2xl font-bold text-gray-800">{vendors.length}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <DollarSign size={20} style={{ color: TEAL }} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Spend This Month</div>
            <div className="text-2xl font-bold" style={{ color: TEAL }}>${monthSpend.toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* Filters + Add */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mr-1">Filter</span>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-white rounded-xl px-3 py-2 text-[13px] border border-gray-200 focus:outline-none focus:border-teal-300 cursor-pointer">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-white rounded-xl px-3 py-2 text-[13px] border border-gray-200 focus:outline-none focus:border-teal-300 cursor-pointer">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={onAdd}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          style={{ background: TEAL }}>
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Truck size={32} style={{ color: TEAL }} />
          </div>
          <div className="text-[15px] font-medium text-gray-600 mb-1">No vendors yet</div>
          <div className="text-[13px] text-gray-400 mb-4">Add your first vendor to start tracking orders, deliveries, and spending.</div>
          <button onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-medium"
            style={{ background: TEAL }}>
            <Plus size={16} /> Add Your First Vendor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => {
            const vExpenses = monthExpenses.filter(e => e.vendor_id === v.id);
            const vSpend = vExpenses.reduce((s, e) => s + e.amount, 0);
            return (
              <button key={v.id} onClick={() => onSelect(v)}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left hover:border-teal-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                      <Truck size={20} style={{ color: TEAL }} />
                    </div>
                    <div>
                      <div className="font-semibold text-[15px] text-gray-800">{v.name}</div>
                      <div className="text-[12px] text-gray-400">{CATEGORIES.find(c => c.key === v.category)?.label || v.category}</div>
                    </div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-500'}`}>
                    {v.status}
                  </span>
                </div>
                {v.contact_name && <div className="text-[13px] text-gray-500 mt-2">{v.contact_name}</div>}
                {v.phone && (
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mt-1">
                    <Phone size={13} /> {v.phone}
                  </div>
                )}
                {vSpend > 0 && (
                  <div className="flex items-center gap-1.5 text-[12px] text-teal-600 mt-2 font-medium">
                    <DollarSign size={13} /> ${vSpend.toFixed(0)} this month
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Add/Edit Vendor Form ─────────────────────────────── */
function VendorForm({ hotelId, onSave, onCancel, editing }: {
  hotelId: string; onSave: () => void; onCancel: () => void; editing?: Vendor | null;
}) {
  const [form, setForm] = useState({
    name: editing?.name || '', category: editing?.category || 'general',
    contact_name: editing?.contact_name || '', email: editing?.email || '',
    phone: editing?.phone || '', address: editing?.address || '',
    schedule: editing?.schedule || '', payment_terms: editing?.payment_terms || '',
    rate: editing?.rate || '', status: editing?.status || 'active', notes: editing?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true); setErr(null);
    try {
      if (editing) {
        await updateVendor(editing.id, form);
      } else {
        await createVendor({ hotel_id: hotelId, ...form });
      }
      onSave();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save vendor');
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[16px] text-gray-800">{editing ? 'Edit Vendor' : 'New Vendor'}</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100"><XIcon size={18} /></button>
      </div>
      {err && <div className="bg-red-50 rounded-xl p-3 text-red-600 text-[13px]">{err}</div>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Vendor Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Sysco" />
        <SelectField label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} options={CATEGORIES.map(c => ({ key: c.key as string, label: c.label as string }))} />
        <Field label="Contact Name" value={form.contact_name} onChange={v => setForm({ ...form, contact_name: v })} />
        <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" />
        <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
        <Field label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} />
        <Field label="Schedule" value={form.schedule} onChange={v => setForm({ ...form, schedule: v })} placeholder="Mon-Fri 8am-5pm" />
        <Field label="Payment Terms" value={form.payment_terms} onChange={v => setForm({ ...form, payment_terms: v })} placeholder="Net 30" />
        <Field label="Rate / Pricing Notes" value={form.rate} onChange={v => setForm({ ...form, rate: v })} />
        <SelectField label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })}
          options={[{ key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }]} />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Notes</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-300" />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={saving || !form.name.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium disabled:opacity-50"
          style={{ background: TEAL }}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Vendor'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-gray-500 text-[13px] font-medium border border-gray-200">Cancel</button>
      </div>
    </div>
  );
}

/* ── Order Guide Tab ─────────────────────────────────── */
function OrderGuideTab({ vendorId }: { vendorId: string }) {
  const [items, setItems] = useState<VendorOrderGuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: '', description: '', unit: 'each', unit_price: '', category: '', min_order_qty: '1' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ item_name: '', unit_price: '', unit: 'each' });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchVendorOrderGuide(vendorId);
      setItems(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load order guide'); }
    finally { setLoading(false); }
  }, [vendorId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newItem.item_name.trim()) return;
    setSaving(true);
    try {
      await createVendorOrderGuideItem({
        vendor_id: vendorId, item_name: newItem.item_name,
        description: newItem.description || undefined, unit: newItem.unit,
        unit_price: parseFloat(newItem.unit_price) || 0,
        category: newItem.category || undefined,
        min_order_qty: parseInt(newItem.min_order_qty) || 1,
      });
      setNewItem({ item_name: '', description: '', unit: 'each', unit_price: '', category: '', min_order_qty: '1' });
      setShowForm(false);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to add item'); }
    finally { setSaving(false); }
  };

  const handleEditSave = async (id: string) => {
    setSaving(true);
    try {
      await updateVendorOrderGuideItem(id, {
        item_name: editForm.item_name,
        unit_price: parseFloat(editForm.unit_price) || 0,
        unit: editForm.unit,
      });
      setEditId(null);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try { await deleteVendorOrderGuideItem(id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete'); }
  };

  if (loading) return <div className="p-6 text-center text-gray-400 text-[14px]">Loading order guide...</div>;

  return (
    <div className="space-y-3">
      {error && <div className="bg-red-50 rounded-xl p-3 text-red-600 text-[13px]">{error}</div>}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-[14px] text-gray-700">Order Guide ({items.length} items)</h4>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[12px] font-medium"
          style={{ background: TEAL }}>
          <Plus size={14} /> Add Item
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
          <Field label="Item Name" value={newItem.item_name} onChange={v => setNewItem({ ...newItem, item_name: v })} />
          <Field label="Unit Price" value={newItem.unit_price} onChange={v => setNewItem({ ...newItem, unit_price: v })} type="number" />
          <Field label="Unit" value={newItem.unit} onChange={v => setNewItem({ ...newItem, unit: v })} placeholder="each, case, lb" />
          <Field label="Min Order Qty" value={newItem.min_order_qty} onChange={v => setNewItem({ ...newItem, min_order_qty: v })} type="number" />
          <div className="col-span-2">
            <Field label="Description" value={newItem.description} onChange={v => setNewItem({ ...newItem, description: v })} />
          </div>
          <div className="col-span-2 flex gap-2">
            <button onClick={handleAdd} disabled={saving || !newItem.item_name.trim()}
              className="px-3 py-1.5 rounded-xl text-white text-[12px] font-medium disabled:opacity-50"
              style={{ background: TEAL }}>
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-xl text-gray-500 text-[12px] border border-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
          <div className="text-[13px] font-medium text-gray-500 mb-1">No items in order guide yet</div>
          <div className="text-[12px] text-gray-400">Add products with prices so staff can quickly build orders.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
              {editId === item.id ? (
                <div className="flex-1 flex gap-2 items-center">
                  <input value={editForm.item_name} onChange={e => setEditForm({ ...editForm, item_name: e.target.value })}
                    className="flex-1 bg-gray-50 rounded-lg px-2.5 py-2 text-[13px] border border-gray-100" />
                  <input value={editForm.unit_price} onChange={e => setEditForm({ ...editForm, unit_price: e.target.value })}
                    className="w-24 bg-gray-50 rounded-lg px-2.5 py-2 text-[13px] border border-gray-100" type="number" />
                  <input value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-20 bg-gray-50 rounded-lg px-2.5 py-2 text-[13px] border border-gray-100" />
                  <button onClick={() => handleEditSave(item.id)} className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50"><Save size={16} /></button>
                  <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><XIcon size={16} /></button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="text-[14px] font-medium text-gray-800">{item.item_name}</div>
                    {item.description && <div className="text-[12px] text-gray-400">{item.description}</div>}
                    <div className="text-[12px] text-gray-400">${item.unit_price.toFixed(2)} / {item.unit}{item.category ? ` · ${item.category}` : ''}{item.min_order_qty > 1 ? ` · min ${item.min_order_qty}` : ''}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditId(item.id); setEditForm({ item_name: item.item_name, unit_price: String(item.unit_price), unit: item.unit }); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Vendor Events Tab (Calendar + Recurring) ────────── */
function EventsTab({ vendor, hotelId }: { vendor: Vendor; hotelId: string }) {
  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', event_type: 'delivery', recurrence: 'weekly',
    day_of_week: '1', week_of_month: '', specific_date: '', estimated_cost: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchVendorEvents(hotelId);
      setEvents(data.filter(e => e.vendor_id === vendor.id));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load events'); }
    finally { setLoading(false); }
  }, [hotelId, vendor.id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newEvent.title.trim()) return;
    setSaving(true);
    try {
      await createVendorEvent({
        hotel_id: hotelId, vendor_id: vendor.id, title: newEvent.title,
        description: newEvent.description || undefined, event_type: newEvent.event_type,
        recurrence: newEvent.recurrence,
        day_of_week: newEvent.recurrence !== 'one_time' ? parseInt(newEvent.day_of_week) : undefined,
        week_of_month: newEvent.recurrence === 'monthly' && newEvent.week_of_month ? parseInt(newEvent.week_of_month) : undefined,
        specific_date: newEvent.recurrence === 'one_time' ? newEvent.specific_date || undefined : undefined,
        estimated_cost: parseFloat(newEvent.estimated_cost) || 0,
        category: vendor.category,
      });
      setNewEvent({ title: '', description: '', event_type: 'delivery', recurrence: 'weekly', day_of_week: '1', week_of_month: '', specific_date: '', estimated_cost: '' });
      setShowForm(false);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to add event'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try { await deleteVendorEvent(id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete'); }
  };

  const handleToggle = async (ev: VendorEvent) => {
    try { await updateVendorEvent(ev.id, { is_active: !ev.is_active }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to update'); }
  };

  /* Week grid showing which events fall on which days */
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + i);
    return { dow: i, dateStr: localDate(d), label: DOW_LABELS[i], dayNum: d.getDate() };
  });

  if (loading) return <div className="p-6 text-center text-gray-400 text-[14px]">Loading events...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 rounded-xl p-3 text-red-600 text-[13px]">{error}</div>}

      <div className="flex items-center justify-between">
        <h4 className="font-medium text-[14px] text-gray-700">Scheduled Events ({events.length})</h4>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[12px] font-medium"
          style={{ background: TEAL }}>
          <Plus size={14} /> Add Event
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map(d => {
          const dayEvents = events.filter(e => eventFallsOnDate(e, d.dateStr));
          const isToday = d.dateStr === localDate();
          return (
            <div key={d.dow} className={`rounded-lg p-2 min-h-[100px] ${isToday ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="text-center mb-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase">{d.label}</div>
                <div className={`text-[14px] font-bold ${isToday ? 'text-teal-700' : 'text-gray-700'}`}>{d.dayNum}</div>
              </div>
              {dayEvents.map(ev => (
                <div key={ev.id} className="bg-white rounded-lg p-1.5 mb-1 text-[10px] shadow-sm border border-gray-100">
                  <div className="font-medium text-gray-700 truncate">
                    {EVENT_TYPES[ev.event_type]?.icon || '📌'} {ev.title}
                  </div>
                  {ev.estimated_cost > 0 && <div className="text-teal-600 font-medium">${ev.estimated_cost}</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Add Event Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Event Title" value={newEvent.title} onChange={v => setNewEvent({ ...newEvent, title: v })} placeholder="Breakfast order" />
            <SelectField label="Event Type" value={newEvent.event_type} onChange={v => setNewEvent({ ...newEvent, event_type: v })}
              options={Object.entries(EVENT_TYPES).map(([k, v]) => ({ key: k, label: v.label }))} />
            <SelectField label="Recurrence" value={newEvent.recurrence} onChange={v => setNewEvent({ ...newEvent, recurrence: v })}
              options={Object.entries(RECURRENCE_TYPES).map(([k, v]) => ({ key: k, label: v }))} />
            {newEvent.recurrence !== 'one_time' ? (
              <SelectField label="Day of Week" value={newEvent.day_of_week} onChange={v => setNewEvent({ ...newEvent, day_of_week: v })}
                options={DOW_LABELS.map((l, i) => ({ key: String(i), label: l }))} />
            ) : (
              <Field label="Specific Date" value={newEvent.specific_date} onChange={v => setNewEvent({ ...newEvent, specific_date: v })} type="date" />
            )}
            {newEvent.recurrence === 'monthly' && (
              <Field label="Week of Month (1-4, blank=any)" value={newEvent.week_of_month} onChange={v => setNewEvent({ ...newEvent, week_of_month: v })} type="number" />
            )}
            <Field label="Est. Cost" value={newEvent.estimated_cost} onChange={v => setNewEvent({ ...newEvent, estimated_cost: v })} type="number" />
          </div>
          <Field label="Description" value={newEvent.description} onChange={v => setNewEvent({ ...newEvent, description: v })} />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !newEvent.title.trim()}
              className="px-3 py-1.5 rounded-xl text-white text-[12px] font-medium disabled:opacity-50"
              style={{ background: TEAL }}>
              {saving ? 'Saving...' : 'Add Event'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-xl text-gray-500 text-[12px] border border-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Event List */}
      {events.length === 0 && !showForm ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
          <div className="text-[13px] font-medium text-gray-500 mb-1">No scheduled events</div>
          <div className="text-[12px] text-gray-400">Add recurring deliveries, services, or one-time visits.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <div key={ev.id} className={`bg-white rounded-xl border p-3 flex items-center justify-between ${ev.is_active ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
              <div className="flex items-center gap-3">
                <span className="text-[18px]">{EVENT_TYPES[ev.event_type]?.icon || '📌'}</span>
                <div>
                  <div className="text-[14px] font-medium text-gray-800">{ev.title}</div>
                  <div className="text-[12px] text-gray-400">
                    {RECURRENCE_TYPES[ev.recurrence]}
                    {ev.recurrence !== 'one_time' && ev.day_of_week != null ? ` · ${DOW_LABELS[ev.day_of_week]}` : ''}
                    {ev.recurrence === 'one_time' && ev.specific_date ? ` · ${ev.specific_date}` : ''}
                    {ev.estimated_cost > 0 ? ` · $${ev.estimated_cost}` : ''}
                  </div>
                  {ev.description && <div className="text-[11px] text-gray-400 mt-0.5">{ev.description}</div>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleToggle(ev)} className="text-[11px] px-2 py-1 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50">
                  {ev.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(ev.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Order History Tab ────────────────────────────────── */
function OrderHistoryTab({ vendorId, hotelId }: { vendorId: string; hotelId: string }) {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, VendorOrderItem[]>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const all = await fetchVendorOrders(hotelId);
      setOrders(all.filter(o => o.vendor_id === vendorId));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load orders'); }
    finally { setLoading(false); }
  }, [vendorId, hotelId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (orderId: string) => {
    if (expanded === orderId) { setExpanded(null); return; }
    setExpanded(orderId);
    if (!items[orderId]) {
      try {
        const data = await fetchVendorOrderItems(orderId);
        setItems(prev => ({ ...prev, [orderId]: data }));
      } catch { /* ignore */ }
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try { await updateVendorOrder(orderId, { status }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to update status'); }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Delete this order?')) return;
    try { await deleteVendorOrder(orderId); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete'); }
  };

  if (loading) return <div className="p-6 text-center text-gray-400 text-[14px]">Loading orders...</div>;

  return (
    <div className="space-y-3">
      {error && <div className="bg-red-50 rounded-xl p-3 text-red-600 text-[13px]">{error}</div>}
      <h4 className="font-medium text-[14px] text-gray-700">Order History ({orders.length})</h4>
      {orders.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
          <div className="text-[14px] font-medium text-gray-500 mb-1">No orders yet</div>
          <div className="text-[12px] text-gray-400">Click &ldquo;New Order&rdquo; to create your first purchase order.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => toggle(o.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="text-[13px] font-medium text-gray-800">{o.order_date}</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                  {o.service_date && <span className="text-[12px] text-gray-400">service: {o.service_date}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-gray-700">${o.total_amount.toFixed(2)}</span>
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${expanded === o.id ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {expanded === o.id && (
                <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50">
                  {(items[o.id] || []).map(it => (
                    <div key={it.id} className="flex justify-between text-[13px]">
                      <span className="text-gray-600">{it.qty} {it.unit} × {it.item_name}</span>
                      <span className="text-gray-800 font-medium">${it.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                  {(items[o.id] || []).length === 0 && <div className="text-[12px] text-gray-400">No line items.</div>}
                  {o.notes && <div className="text-[12px] text-gray-400 pt-1">Notes: {o.notes}</div>}
                  <div className="flex gap-2 pt-2">
                    <select value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}
                      className="bg-white rounded-lg px-2.5 py-1.5 text-[12px] border border-gray-200">
                      {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => handleDelete(o.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-400 text-[12px] border border-red-200 hover:bg-red-50">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── New Order Flow ──────────────────────────────────── */
function NewOrderFlow({ vendor, hotelId, userName, onDone }: {
  vendor: Vendor; hotelId: string; userName: string; onDone: () => void;
}) {
  const [guide, setGuide] = useState<VendorOrderGuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [adHocItems, setAdHocItems] = useState<{ item_name: string; qty: string; unit_price: string; unit: string }[]>([]);
  const [showAdHoc, setShowAdHoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceDate, setServiceDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchVendorOrderGuide(vendor.id);
        setGuide(data.filter(d => d.is_active));
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load order guide'); }
      finally { setLoading(false); }
    })();
  }, [vendor.id]);

  const lineItems = guide
    .filter(g => { const q = parseFloat(qtys[g.id] || '0'); return q > 0; })
    .map(g => ({ item_name: g.item_name, qty: parseFloat(qtys[g.id]), unit: g.unit, unit_price: g.unit_price, vendor_id: vendor.id }));

  const adHocLineItems = adHocItems
    .filter(a => parseFloat(a.qty) > 0 && a.item_name.trim())
    .map(a => ({ item_name: a.item_name, qty: parseFloat(a.qty), unit: a.unit, unit_price: parseFloat(a.unit_price) || 0 }));

  const allItems = [...lineItems, ...adHocLineItems];
  const total = allItems.reduce((sum, i) => sum + i.qty * i.unit_price, 0);

  const handleSubmit = async () => {
    if (allItems.length === 0) return;
    setSaving(true); setError(null);
    try {
      const order = await createVendorOrder({
        hotel_id: hotelId, vendor_id: vendor.id,
        service_date: serviceDate || undefined, total_amount: total,
        logged_by: userName, status: 'submitted', notes: notes || undefined,
      });
      await createVendorOrderItems(allItems.map(i => ({ ...i, order_id: order.id })));
      /* Auto-create expense entry for this order */
      await createVendorExpense({
        hotel_id: hotelId, vendor_id: vendor.id, vendor_order_id: order.id,
        amount: total, category: vendor.category,
        description: `Order: ${allItems.length} items`,
        logged_by: userName, expense_type: 'order',
      });
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create order'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-center text-gray-400 text-[14px]">Loading order guide...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onDone} className="p-1.5 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></button>
        <h3 className="font-semibold text-[16px] text-gray-800">New Order — {vendor.name}</h3>
      </div>

      {error && <div className="bg-red-50 rounded-xl p-3 text-red-600 text-[13px]">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Service Date" value={serviceDate} onChange={setServiceDate} type="date" />
      </div>

      {/* Order guide items */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
        <h4 className="font-medium text-[14px] text-gray-700">Order Guide</h4>
        {guide.length === 0 ? (
          <div className="text-[13px] text-gray-400 py-4 text-center">No active items in order guide. Add items in the Order Guide tab first.</div>
        ) : (
          <div className="space-y-1">
            {guide.map(g => (
              <div key={g.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-gray-700">{g.item_name}</div>
                  <div className="text-[11px] text-gray-400">${g.unit_price.toFixed(2)}/{g.unit}{g.min_order_qty > 1 ? ` · min ${g.min_order_qty}` : ''}</div>
                </div>
                <input type="number" min="0" value={qtys[g.id] || ''} onChange={e => setQtys({ ...qtys, [g.id]: e.target.value })}
                  placeholder="0"
                  className="w-20 bg-gray-50 rounded-lg px-2.5 py-1.5 text-[13px] text-center border border-gray-100" />
                {parseFloat(qtys[g.id] || '0') > 0 && (
                  <span className="text-[12px] text-gray-500 w-16 text-right">${(parseFloat(qtys[g.id]) * g.unit_price).toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ad-hoc items */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-[14px] text-gray-700">Ad-Hoc Items</h4>
          <button onClick={() => setShowAdHoc(!showAdHoc)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-teal-600 text-[12px] border border-teal-200">
            <Plus size={13} /> Add Item
          </button>
        </div>
        {showAdHoc && (
          <div className="grid grid-cols-4 gap-2">
            <input placeholder="Item name" value={adHocItems[0]?.item_name || ''}
              onChange={e => setAdHocItems([{ item_name: e.target.value, qty: adHocItems[0]?.qty || '', unit_price: adHocItems[0]?.unit_price || '', unit: adHocItems[0]?.unit || 'each' }])}
              className="bg-gray-50 rounded-lg px-2.5 py-2 text-[13px] border border-gray-100 col-span-2" />
            <input placeholder="Qty" type="number" value={adHocItems[0]?.qty || ''}
              onChange={e => setAdHocItems([{ item_name: adHocItems[0]?.item_name || '', qty: e.target.value, unit_price: adHocItems[0]?.unit_price || '', unit: adHocItems[0]?.unit || 'each' }])}
              className="bg-gray-50 rounded-lg px-2.5 py-2 text-[13px] border border-gray-100" />
            <input placeholder="Price" type="number" value={adHocItems[0]?.unit_price || ''}
              onChange={e => setAdHocItems([{ item_name: adHocItems[0]?.item_name || '', qty: adHocItems[0]?.qty || '', unit_price: e.target.value, unit: adHocItems[0]?.unit || 'each' }])}
              className="bg-gray-50 rounded-lg px-2.5 py-2 text-[13px] border border-gray-100" />
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Order Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100" />
      </div>

      {/* Total + Submit */}
      <div className="bg-teal-50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-teal-600 font-medium uppercase tracking-wider">Order Total</div>
          <div className="text-2xl font-bold text-teal-700">${total.toFixed(2)}</div>
          <div className="text-[11px] text-teal-500">{allItems.length} line items</div>
        </div>
        <button onClick={handleSubmit} disabled={saving || allItems.length === 0}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-[14px] font-medium disabled:opacity-50"
          style={{ background: TEAL }}>
          <ShoppingCart size={18} /> {saving ? 'Submitting...' : 'Submit Order'}
        </button>
      </div>
    </div>
  );
}

/* ── Spending Tab (COGS / Expenses) ─────────────────── */
function SpendingTab({ hotelId, userName, vendors }: { hotelId: string; userName: string; vendors: Vendor[] }) {
  const [expenses, setExpenses] = useState<VendorExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newExp, setNewExp] = useState({
    vendor_id: '', amount: '', category: 'general', description: '', expense_date: localDate(), expense_type: 'misc',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchVendorExpenses(hotelId);
      setExpenses(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load expenses'); }
    finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!parseFloat(newExp.amount)) return;
    setSaving(true);
    try {
      await createVendorExpense({
        hotel_id: hotelId,
        vendor_id: newExp.vendor_id || undefined,
        amount: parseFloat(newExp.amount),
        category: newExp.category,
        description: newExp.description || undefined,
        expense_date: newExp.expense_date,
        logged_by: userName,
        expense_type: newExp.expense_type,
      });
      setNewExp({ vendor_id: '', amount: '', category: 'general', description: '', expense_date: localDate(), expense_type: 'misc' });
      setShowForm(false);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to add expense'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try { await deleteVendorExpense(id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete'); }
  };

  /* Compute monthly breakdown */
  const mStr = monthStr();
  const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = monthStr(lastMonth);

  const thisMonth = expenses.filter(e => e.expense_date.startsWith(mStr));
  const lastMonthExpenses = expenses.filter(e => e.expense_date.startsWith(lastMonthStr));
  const thisMonthTotal = thisMonth.reduce((s, e) => s + e.amount, 0);
  const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const trend = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100) : 0;

  /* Category breakdown */
  const byCategory: Record<string, number> = {};
  thisMonth.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...catEntries.map(c => c[1]), 1);

  /* Vendor breakdown (top 5) */
  const byVendor: Record<string, number> = {};
  thisMonth.forEach(e => {
    const key = e.vendor_id || 'misc';
    byVendor[key] = (byVendor[key] || 0) + e.amount;
  });
  const vendorEntries = Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (loading) return <div className="p-6 text-center text-gray-400 text-[14px]">Loading expenses...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 rounded-xl p-3 text-red-600 text-[13px]">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">This Month</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">${thisMonthTotal.toFixed(0)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Last Month</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">${lastMonthTotal.toFixed(0)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Trend</div>
          <div className="text-2xl font-bold mt-1" style={{ color: trend > 0 ? '#dc2626' : '#16a34a' }}>
            {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h4 className="font-medium text-[14px] text-gray-700 mb-3">Spending by Category (This Month)</h4>
        {catEntries.length === 0 ? (
          <div className="text-[13px] text-gray-400 text-center py-6">No expenses logged this month. Add an expense to see category breakdown.</div>
        ) : (
          <div className="space-y-2">
            {catEntries.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-3">
                <div className="text-[12px] text-gray-500 w-32 shrink-0">{CATEGORIES.find(c => c.key === cat)?.label || cat}</div>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(amt / maxCat) * 100}%`, backgroundColor: TEAL }} />
                </div>
                <div className="text-[13px] font-bold text-gray-700 w-16 text-right">${amt.toFixed(0)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top vendors by spend */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h4 className="font-medium text-[14px] text-gray-700 mb-3">Top Vendors by Spend (This Month)</h4>
        {vendorEntries.length === 0 ? (
          <div className="text-[13px] text-gray-400 text-center py-6">No vendor expenses this month. Submit an order to auto-log spending.</div>
        ) : (
          <div className="space-y-1.5">
            {vendorEntries.map(([vid, amt]) => {
              const vendor = vendors.find(v => v.id === vid);
              return (
                <div key={vid} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Truck size={14} style={{ color: TEAL }} />
                    <span className="text-[13px] text-gray-700">{vendor?.name || 'Miscellaneous'}</span>
                  </div>
                  <span className="text-[13px] font-bold text-gray-800">${amt.toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add expense */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-[14px] text-gray-700">Recent Expenses</h4>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[12px] font-medium"
          style={{ background: TEAL }}>
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Vendor (optional)</label>
              <select value={newExp.vendor_id} onChange={e => setNewExp({ ...newExp, vendor_id: e.target.value })}
                className="w-full bg-white rounded-xl px-3.5 py-3 text-[14px] border border-gray-100">
                <option value="">— None —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <Field label="Amount" value={newExp.amount} onChange={v => setNewExp({ ...newExp, amount: v })} type="number" />
            <SelectField label="Category" value={newExp.category} onChange={v => setNewExp({ ...newExp, category: v })} options={CATEGORIES.map(c => ({ key: c.key as string, label: c.label as string }))} />
            <SelectField label="Type" value={newExp.expense_type} onChange={v => setNewExp({ ...newExp, expense_type: v })}
              options={[{ key: 'order', label: 'Order' }, { key: 'utility', label: 'Utility' }, { key: 'misc', label: 'Miscellaneous' }]} />
            <Field label="Date" value={newExp.expense_date} onChange={v => setNewExp({ ...newExp, expense_date: v })} type="date" />
          </div>
          <Field label="Description" value={newExp.description} onChange={v => setNewExp({ ...newExp, description: v })} />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !parseFloat(newExp.amount)}
              className="px-3 py-1.5 rounded-xl text-white text-[12px] font-medium disabled:opacity-50"
              style={{ background: TEAL }}>
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-xl text-gray-500 text-[12px] border border-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
          <div className="text-[13px] font-medium text-gray-500 mb-1">No expenses logged yet</div>
          <div className="text-[12px] text-gray-400">Track COGS, utilities, and one-off purchases here.</div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {expenses.slice(0, 30).map(e => {
            const vendor = vendors.find(v => v.id === e.vendor_id);
            return (
              <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-gray-700">
                    {vendor?.name || 'Miscellaneous'} — {e.description || e.category}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {e.expense_date} · {e.expense_type} · {CATEGORIES.find(c => c.key === e.category)?.label || e.category}
                    {e.logged_by ? ` · ${e.logged_by}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-gray-800">${e.amount.toFixed(2)}</span>
                  <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Vendor Detail ───────────────────────────────────── */
function VendorDetail({ vendor, hotelId, userName, onBack }: {
  vendor: Vendor; hotelId: string; userName: string; onBack: () => void;
}) {
  const [subTab, setSubTab] = useState<'info' | 'guide' | 'events' | 'orders' | 'new_order'>('info');
  const [editing, setEditing] = useState(false);

  const SUB_TABS = [
    { key: 'info' as const, label: 'Info' },
    { key: 'guide' as const, label: 'Order Guide' },
    { key: 'events' as const, label: 'Calendar' },
    { key: 'orders' as const, label: 'Order History' },
    { key: 'new_order' as const, label: 'New Order' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h3 className="font-semibold text-[18px] text-gray-800">{vendor.name}</h3>
          <div className="flex items-center gap-2 text-[12px] text-gray-400">
            <span>{CATEGORIES.find(c => c.key === vendor.category)?.label || vendor.category}</span>
            <span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[vendor.status] || 'bg-gray-100'}`}>{vendor.status}</span>
          </div>
        </div>
        <button onClick={() => setSubTab('new_order')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[13px] font-medium"
          style={{ background: TEAL }}>
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
              subTab === t.key ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === 'info' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
          {editing ? (
            <VendorForm hotelId={hotelId} editing={vendor} onSave={() => setEditing(false)} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Contact</div>
                  <div className="text-[14px] text-gray-700 mt-1">{vendor.contact_name || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Phone</div>
                  <div className="text-[14px] text-gray-700 mt-1">{vendor.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Email</div>
                  <div className="text-[14px] text-gray-700 mt-1">{vendor.email || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Address</div>
                  <div className="text-[14px] text-gray-700 mt-1">{vendor.address || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Schedule</div>
                  <div className="text-[14px] text-gray-700 mt-1">{vendor.schedule || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Payment Terms</div>
                  <div className="text-[14px] text-gray-700 mt-1">{vendor.payment_terms || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Rate / Pricing</div>
                  <div className="text-[14px] text-gray-700 mt-1">{vendor.rate || '—'}</div>
                </div>
              </div>
              {vendor.notes && (
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Notes</div>
                  <div className="text-[14px] text-gray-700 mt-1">{vendor.notes}</div>
                </div>
              )}
              <div className="flex gap-2 pt-3">
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-600 text-[13px] border border-gray-200">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={async () => { if (confirm('Delete this vendor and all related data?')) { await deleteVendor(vendor.id); onBack(); } }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-400 text-[13px] border border-red-200 hover:bg-red-50">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {subTab === 'guide' && <OrderGuideTab vendorId={vendor.id} />}
      {subTab === 'events' && <EventsTab vendor={vendor} hotelId={hotelId} />}
      {subTab === 'orders' && <OrderHistoryTab vendorId={vendor.id} hotelId={hotelId} />}
      {subTab === 'new_order' && <NewOrderFlow vendor={vendor} hotelId={hotelId} userName={userName} onDone={() => setSubTab('orders')} />}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */
export default function VendorsView({ hotelId, userName }: { hotelId: string; userName?: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<VendorExpense[]>([]);
  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mainTab, setMainTab] = useState<'vendors' | 'spending'>('vendors');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [v, e, ev] = await Promise.all([
        fetchVendors(hotelId),
        fetchVendorExpenses(hotelId).catch(() => []),
        fetchVendorEvents(hotelId).catch(() => []),
      ]);
      setVendors(v);
      setExpenses(e);
      setEvents(ev);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  /* Compute today's events count for the tab badge */
  const todayStr = localDate();
  const todayEventCount = events.filter(e => eventFallsOnDate(e, todayStr)).length;
  void todayEventCount;

  if (selected) {
    return <VendorDetail vendor={selected} hotelId={hotelId} userName={userName || ''} onBack={() => { setSelected(null); load(); }} />;
  }

  if (showForm) {
    return (
      <VendorForm
        hotelId={hotelId}
        onSave={() => { setShowForm(false); load(); }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Truck size={22} style={{ color: TEAL }} />
          <h2 className="text-[18px] font-bold text-gray-800">Vendor Management</h2>
        </div>
        <p className="text-[13px] text-gray-400 mt-1 ml-7">Track suppliers, order guides, delivery schedules, and spending in one place.</p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setMainTab('vendors')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            mainTab === 'vendors' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}>
          Vendors
        </button>
        <button onClick={() => setMainTab('spending')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            mainTab === 'spending' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}>
          Spending
        </button>
      </div>

      {mainTab === 'vendors' && (
        <VendorList
          vendors={vendors}
          loading={loading}
          error={error}
          onSelect={setSelected}
          onAdd={() => setShowForm(true)}
          expenses={expenses}
        />
      )}

      {mainTab === 'spending' && (
        <SpendingTab hotelId={hotelId} userName={userName || ''} vendors={vendors} />
      )}
    </div>
  );
}