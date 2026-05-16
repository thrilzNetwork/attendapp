'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Flame, AlertTriangle, ShieldCheck, DoorOpen, AlarmSmoke, Crosshair } from 'lucide-react';
import { getHotelConfig, HotelConfig } from '@/lib/supabase';

export default function SafetyPage() {
  const router = useRouter();
  const [config, setConfig] = useState<HotelConfig | null>(null);
  useEffect(() => { getHotelConfig().then(setConfig); }, []);

  const frontDesk = config?.frontDeskPhone || 'Ext. 0';
  const emergencies = [
    { label: 'Emergency (Police, Fire, Medical)', number: '911' },
    { label: 'Front Desk', number: frontDesk },
    { label: 'Hotel Security', number: 'Ext. 0' },
  ];

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => router.push('/')} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Safety</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8 space-y-3">
          {/* Emergency Banner */}
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold text-red-800 mb-1">In Case of Emergency</p>
              <p className="text-[12px] text-red-700 leading-relaxed">Remain calm. Call 911 for immediate emergency response. Then notify the front desk at {frontDesk}.</p>
            </div>
          </div>

          {/* Emergency Numbers */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-[12px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Emergency Contacts</p>
            <div className="space-y-2">
              {emergencies.map((e, i) => (
                <a key={i} href={`tel:${e.number.replace(/[^0-9]/g, '')}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 active:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-[#6B1D3C]" />
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">{e.label}</p>
                    </div>
                  </div>
                  <span className="text-[14px] font-bold text-[#6B1D3C]">{e.number}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Fire Safety */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={18} className="text-orange-500" />
              <p className="text-[14px] font-bold text-gray-800">Fire Safety</p>
            </div>
            <div className="space-y-2">
              {[
                'Smoke detectors are installed in every room and tested monthly.',
                'Know your nearest fire exit — posted on the back of your door.',
                'In case of fire: Do not use elevators. Use stairs and proceed to the nearest exit.',
                'If trapped: Seal door cracks with wet towels, signal from window, call 911.',
                'Assembly point is in the front parking lot — away from the building.',
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2">
                  <DoorOpen size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* COA / Smoke Detectors */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <AlarmSmoke size={18} className="text-[#6B1D3C]" />
              <p className="text-[14px] font-bold text-gray-800">Carbon Monoxide & Smoke Detection</p>
            </div>
            <div className="space-y-2">
              {[
                'CO detectors are located on every floor and inside every guest room.',
                'If you hear a chirping sound, notify the front desk immediately — do not silence it.',
                'Symptoms of CO poisoning: headache, dizziness, nausea, confusion — seek fresh air and call 911.',
                'Smoke alarms are interconnected. If one triggers, all units in the zone activate.',
                'Do not cover or disable any detectors. Tampering will result in a penalty.',
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Property Security */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Crosshair size={18} className="text-[#6B1D3C]" />
              <p className="text-[14px] font-bold text-gray-800">Property Security</p>
            </div>
            <div className="space-y-2">
              {[
                'Exterior doors are locked from 10:00 PM to 6:00 AM. Use your room key for entry.',
                'Security cameras are operational in public areas, parking lot, and hallways.',
                'Report any suspicious activity to the front desk immediately.',
                'Lock your room door at all times and use the deadbolt when inside.',
                'Do not leave valuables unattended. Use the in-room safe or front desk safe deposit.',
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-[11px] text-amber-700 text-center">If you have any safety concerns, contact the front desk at any time. Your wellbeing is our top priority.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
