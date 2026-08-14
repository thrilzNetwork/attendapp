'use client';
import { useState, useEffect } from 'react';
import { getMealCovers, createMealCover, getWasteLogs, createWasteLog, getMonthlySpends, createMonthlySpend, getFnbInventory, updateFnbInventory, type MealCover, type WasteLog, type MonthlySpend, type FnbInventoryItem } from '@/lib/supabase';
const TEAL = '#0D9488';

export default function BreakfastHubView({ hotelId, staffName }: { hotelId: string; staffName?: string }) {
  const [tab, setTab] = useState<'covers'|'waste'|'spend'|'inventory'>('covers');
  const [covers, setCovers] = useState<MealCover[]>([]);
  const [waste, setWaste] = useState<WasteLog[]>([]);
  const [spends, setSpends] = useState<MonthlySpend[]>([]);
  const [inventory, setInventory] = useState<FnbInventoryItem[]>([]);

  useEffect(() => {
    (async () => { setCovers(await getMealCovers(hotelId)); setWaste(await getWasteLogs(hotelId)); setSpends(await getMonthlySpends(hotelId)); setInventory(await getFnbInventory(hotelId)); })();
  }, [hotelId]);

  const tabs = [
    { key: 'covers', label: '🍽️ Meal Covers' },
    { key: 'waste', label: '🗑️ Waste Log' },
    { key: 'spend', label: '💰 Monthly Spend' },
    { key: 'inventory', label: '📦 Inventory' },
  ] as const;

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold ${tab === t.key ? 'text-white' : 'bg-gray-100 text-gray-500'}`} style={tab === t.key ? { backgroundColor: TEAL } : {}}>{t.label}</button>
        ))}
      </div>
      {tab === 'covers' && <MealCoversView covers={covers} hotelId={hotelId} staffName={staffName} reload={() => getMealCovers(hotelId).then(setCovers)} />}
      {tab === 'waste' && <WasteLogView waste={waste} hotelId={hotelId} staffName={staffName} reload={() => getWasteLogs(hotelId).then(setWaste)} />}
      {tab === 'spend' && <MonthlySpendView spends={spends} hotelId={hotelId} staffName={staffName} reload={() => getMonthlySpends(hotelId).then(setSpends)} />}
      {tab === 'inventory' && <InventoryView items={inventory} hotelId={hotelId} staffName={staffName} reload={() => getFnbInventory(hotelId).then(setInventory)} />}
    </div>
  );
}

function MealCoversView({ covers, hotelId, staffName, reload }: { covers: MealCover[]; hotelId: string; staffName?: string; reload: () => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ time_slot: '', guest_count: 0, leftover_portions: 0 });
  const total = covers.reduce((s, c) => s + c.guest_count, 0);
  const totalLeftover = covers.reduce((s, c) => s + c.leftover_portions, 0);

  const save = async () => {
    await createMealCover({ hotel_id: hotelId, ...form, recorded_by: staffName || 'Staff' });
    setForm({ time_slot: '', guest_count: 0, leftover_portions: 0 }); setShow(false); reload();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-2">
          <div className="bg-teal-50 rounded-xl px-4 py-2"><p className="text-[10px] text-teal-600">Total Covers</p><p className="text-[18px] font-bold text-teal-700">{total}</p></div>
          <div className="bg-amber-50 rounded-xl px-4 py-2"><p className="text-[10px] text-amber-600">Leftovers</p><p className="text-[18px] font-bold text-amber-700">{totalLeftover}</p></div>
        </div>
        <button onClick={() => setShow(!show)} className="text-white px-4 py-2 rounded-xl text-[13px] font-bold ml-auto" style={{ backgroundColor: TEAL }}>+ Add Covers</button>
      </div>
      {show && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-[11px] text-gray-400 mb-1 block">Time Slot</label><input value={form.time_slot} onChange={e => setForm({...form, time_slot: e.target.value})} placeholder="7:00 AM" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Guest Count</label><input type="number" value={form.guest_count} onChange={e => setForm({...form, guest_count: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Leftover Portions</label><input type="number" value={form.leftover_portions} onChange={e => setForm({...form, leftover_portions: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
          </div>
          <div className="flex gap-2 mt-4 justify-end"><button onClick={() => setShow(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button><button onClick={save} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold" style={{ backgroundColor: TEAL }}>Save</button></div>
        </div>
      )}
      {covers.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">No covers logged today.</p></div> : (
        <div className="space-y-2">
          {covers.map(c => <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center justify-between"><div><span className="text-[13px] font-semibold">{c.time_slot || 'No time'}</span><span className="text-[11px] text-gray-400 ml-2">{c.recorded_by}</span></div><div className="text-[13px]"><span className="font-bold">{c.guest_count} guests</span>{c.leftover_portions > 0 && <span className="text-amber-600 ml-2">· {c.leftover_portions} leftover</span>}</div></div>)}
        </div>
      )}
    </div>
  );
}

function WasteLogView({ waste, hotelId, staffName, reload }: { waste: WasteLog[]; hotelId: string; staffName?: string; reload: () => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ item: '', quantity: 1, unit: 'pcs', reason: '', estimated_cost: 0 });
  const totalCost = waste.reduce((s, w) => s + w.estimated_cost, 0);

  const save = async () => {
    if (!form.item) return;
    await createWasteLog({ hotel_id: hotelId, ...form, recorded_by: staffName || 'Staff' });
    setForm({ item: '', quantity: 1, unit: 'pcs', reason: '', estimated_cost: 0 }); setShow(false); reload();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4"><div className="bg-red-50 rounded-xl px-4 py-2"><p className="text-[10px] text-red-600">Waste Cost Today</p><p className="text-[18px] font-bold text-red-700">${totalCost.toFixed(2)}</p></div><button onClick={() => setShow(!show)} className="text-white px-4 py-2 rounded-xl text-[13px] font-bold ml-auto" style={{ backgroundColor: TEAL }}>+ Log Waste</button></div>
      {show && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-[11px] text-gray-400 mb-1 block">Item</label><input value={form.item} onChange={e => setForm({...form, item: e.target.value})} placeholder="Eggs, Bacon, etc" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Quantity</label><input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Unit</label><input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Reason</label><input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Over-prep, expired, etc" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Est. Cost ($)</label><input type="number" step="0.01" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
          </div>
          <div className="flex gap-2 mt-4 justify-end"><button onClick={() => setShow(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button><button onClick={save} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold" style={{ backgroundColor: TEAL }}>Save</button></div>
        </div>
      )}
      {waste.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">No waste logged today.</p></div> : (
        <div className="space-y-2">
          {waste.map(w => <div key={w.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center justify-between"><div><span className="text-[13px] font-semibold">{w.item}</span><span className="text-[11px] text-gray-400 ml-2">{w.quantity} {w.unit} · {w.reason}</span></div><span className="text-[13px] font-bold text-red-600">${w.estimated_cost.toFixed(2)}</span></div>)}
        </div>
      )}
    </div>
  );
}

function MonthlySpendView({ spends, hotelId, staffName, reload }: { spends: MonthlySpend[]; hotelId: string; staffName?: string; reload: () => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ category: '', amount: 0, vendor: '', notes: '' });
  const total = spends.reduce((s, sp) => s + sp.amount, 0);
  const byCategory = spends.reduce((acc, sp) => { acc[sp.category] = (acc[sp.category] || 0) + sp.amount; return acc; }, {} as Record<string, number>);

  const save = async () => {
    if (!form.category) return;
    await createMonthlySpend({ hotel_id: hotelId, ...form, recorded_by: staffName || 'Staff' });
    setForm({ category: '', amount: 0, vendor: '', notes: '' }); setShow(false); reload();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="bg-teal-50 rounded-xl px-4 py-2"><p className="text-[10px] text-teal-600">Total Spend (recent)</p><p className="text-[18px] font-bold text-teal-700">${total.toFixed(2)}</p></div>
        {Object.entries(byCategory).map(([cat, amt]) => <div key={cat} className="bg-gray-50 rounded-xl px-3 py-2"><p className="text-[10px] text-gray-400">{cat}</p><p className="text-[14px] font-bold text-gray-700">${amt.toFixed(2)}</p></div>)}
        <button onClick={() => setShow(!show)} className="text-white px-4 py-2 rounded-xl text-[13px] font-bold ml-auto" style={{ backgroundColor: TEAL }}>+ Add Spend</button>
      </div>
      {show && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-[11px] text-gray-400 mb-1 block">Category</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Food, Supplies, etc" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Amount ($)</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Vendor</label><input value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div className="col-span-2 md:col-span-3"><label className="text-[11px] text-gray-400 mb-1 block">Notes</label><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
          </div>
          <div className="flex gap-2 mt-4 justify-end"><button onClick={() => setShow(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button><button onClick={save} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold" style={{ backgroundColor: TEAL }}>Save</button></div>
        </div>
      )}
      {spends.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">No spend logged yet.</p></div> : (
        <div className="space-y-2">
          {spends.map(s => <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center justify-between"><div><span className="text-[13px] font-semibold">{s.category}</span>{s.vendor && <span className="text-[11px] text-gray-400 ml-2">{s.vendor}</span>}</div><span className="text-[13px] font-bold">${s.amount.toFixed(2)}</span></div>)}
        </div>
      )}
    </div>
  );
}

function InventoryView({ items, hotelId, staffName, reload }: { items: FnbInventoryItem[]; hotelId: string; staffName?: string; reload: () => void }) {
  const [newItem, setNewItem] = useState('');
  const lowStock = items.filter(i => i.current_count < i.par_level);

  const add = async () => {
    if (!newItem) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('fnb_inventory').insert({ hotel_id: hotelId, item_name: newItem, par_level: 10, current_count: 0, unit: 'pcs' });
    setNewItem(''); reload();
  };

  const update = async (item: FnbInventoryItem, field: 'current_count'|'par_level', value: number) => {
    await updateFnbInventory(item.id, { [field]: value, order_needed: field === 'current_count' ? value < item.par_level : item.current_count < value, last_counted_by: staffName, last_counted_at: new Date().toISOString() });
    reload();
  };

  return (
    <div>
      {lowStock.length > 0 && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><p className="text-[12px] font-bold text-red-600">⚠️ {lowStock.length} item(s) below par level</p><div className="flex flex-wrap gap-1 mt-1">{lowStock.map(i => <span key={i.id} className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{i.item_name}: {i.current_count}/{i.par_level}</span>)}</div></div>}
      <div className="flex gap-2 mb-4">
        <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add new inventory item" className="flex-1 bg-white rounded-xl border border-gray-200 px-3 py-2 text-[13px]" onKeyDown={e => e.key === 'Enter' && add()} />
        <button onClick={add} className="text-white px-4 py-2 rounded-xl text-[13px] font-bold" style={{ backgroundColor: TEAL }}>Add</button>
      </div>
      {items.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">No inventory items yet.</p></div> : (
        <div className="space-y-2">
          {items.map(i => (
            <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center gap-3">
              <span className="text-[13px] font-semibold flex-1">{i.item_name}</span>
              <div className="flex items-center gap-2"><label className="text-[10px] text-gray-400">Current</label><input type="number" value={i.current_count} onChange={e => update(i, 'current_count', parseInt(e.target.value) || 0)} className="w-16 bg-gray-50 rounded-lg px-2 py-1 text-[13px] border border-gray-200" /></div>
              <div className="flex items-center gap-2"><label className="text-[10px] text-gray-400">Par</label><input type="number" value={i.par_level} onChange={e => update(i, 'par_level', parseInt(e.target.value) || 0)} className="w-16 bg-gray-50 rounded-lg px-2 py-1 text-[13px] border border-gray-200" /></div>
              {i.current_count < i.par_level && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">ORDER</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}