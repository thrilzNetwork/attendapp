'use client';

import { useState } from 'react';
import { Car, Check } from 'lucide-react';
import { getHotelConfig, supabase } from '@/lib/supabase';

/**
 * Register Your Car — guest-facing card in the Food tab.
 * Five fields only: car model, color, name, room number, how many days.
 * Inserts straight into `requests` (type 'Car Registration') so Front Desk
 * sees it in the Requests tab with everything in one row.
 */
export default function RegisterCarCard({ brandColor }: { brandColor: string }) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [days, setDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const valid = model.trim() && color.trim() && name.trim() && room.trim() && days.trim();

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try {
      const cfg = await getHotelConfig();
      await supabase.from('requests').insert({
        hotel_id: cfg?.id,
        guest_name: name.trim(),
        room: room.trim(),
        type: 'Car Registration',
        status: 'pending',
        details: `Vehicle: ${model.trim()} · Color: ${color.trim()} · Parking: ${days.trim()} day${days.trim() === '1' ? '' : 's'}`,
      });
      setDone(true);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Could not register — please call the front desk.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}10` }}>
            <Check size={22} style={{ color: brandColor }} />
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-black">Car registered</h3>
            <p className="text-[12px] text-gray-500 mt-0.5">Front desk has your {model.trim()} ({color.trim()}) for {days.trim()} day{days.trim() === '1' ? '' : 's'}. Enjoy your stay!</p>
          </div>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3 text-left active:scale-[0.98] transition-transform"
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}10` }}>
          <Car size={22} style={{ color: brandColor }} />
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-bold text-black">Register your car</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">Takes 30 seconds — front desk needs your plate info for parking.</p>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}10` }}>
          <Car size={20} style={{ color: brandColor }} />
        </div>
        <h3 className="text-[14px] font-bold text-black">Register your car</h3>
      </div>

      <div className="space-y-2">
        <input value={model} onChange={e => setModel(e.target.value)} placeholder="Car model (e.g. Toyota Camry)"
          className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-[14px] border border-gray-100 outline-none focus:border-gray-300" />
        <input value={color} onChange={e => setColor(e.target.value)} placeholder="Color"
          className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-[14px] border border-gray-100 outline-none focus:border-gray-300" />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
          className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-[14px] border border-gray-100 outline-none focus:border-gray-300" />
        <div className="flex gap-2">
          <input value={room} onChange={e => setRoom(e.target.value)} inputMode="numeric" placeholder="Room #"
            className="w-1/2 bg-gray-50 rounded-xl px-3.5 py-2.5 text-[14px] border border-gray-100 outline-none focus:border-gray-300" />
          <input value={days} onChange={e => setDays(e.target.value)} inputMode="numeric" placeholder="How many days"
            className="w-1/2 bg-gray-50 rounded-xl px-3.5 py-2.5 text-[14px] border border-gray-100 outline-none focus:border-gray-300" />
        </div>
      </div>

      {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}

      <div className="flex gap-2 mt-3">
        <button onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-gray-500 bg-gray-50 active:scale-[0.98]">Cancel</button>
        <button disabled={!valid || saving} onClick={submit}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-black disabled:opacity-30 active:scale-[0.98] transition-transform"
          style={{ backgroundColor: brandColor }}>
          {saving ? 'Registering…' : 'Register car'}
        </button>
      </div>
    </div>
  );
}