'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Trash2, Copy, Check, QrCode as QrCodeIcon } from 'lucide-react';
import {
  getQrCodes, createQrCode, deleteQrCode, getAllHotelRooms, type QrCode as QrCodeRow,
} from '@/lib/supabase';

const TEAL = '#158A7C';

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

export default function QrCodesView({ hotelId, hotelSlug }: { hotelId: string; hotelSlug: string }) {
  const [codes, setCodes] = useState<QrCodeRow[]>([]);
  const [form, setForm] = useState({ label: '', location_type: 'room' });
  const [copied, setCopied] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    const data = await getQrCodes(hotelId);
    setCodes(data);
  }, [hotelId]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda.vercel.app';
  const getUrl = (label: string) => `${baseUrl}/?hotel=${hotelSlug}&room=${encodeURIComponent(label)}`;

  const handleAdd = async () => {
    if (!form.label) return;
    const url = getUrl(form.label);
    await createQrCode(hotelId, form.label, form.location_type, url);
    setForm({ label: '', location_type: 'room' });
    loadCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this QR code?')) return;
    await deleteQrCode(id);
    loadCodes();
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">QR Codes</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Generate QR codes for each room or location. Guests scan to open the app pre-filled with their info.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-[14px] mb-2">Batch Generate from Room Database</h3>
        <p className="text-[12px] text-gray-400 mb-3">
          Uses your actual room list from Room Management. Only rooms without QR codes are generated.
        </p>
        <div className="flex gap-3 mb-4">
          <div className="flex items-end">
            <button
              onClick={async () => {
                const rooms = await getAllHotelRooms(hotelId);
                if (!rooms || rooms.length === 0) return alert('No rooms in database. Upload room numbers in Room Management first.');
                let count = 0;
                let skipped = 0;
                for (const room of rooms) {
                  const label = room.room_number;
                  const exists = codes.some(c => c.label === label);
                  if (!exists) {
                    await createQrCode(hotelId, label, 'room', getUrl(label));
                    count++;
                  } else {
                    skipped++;
                  }
                }
                alert(`✅ Generated ${count} QR codes from ${rooms.length} rooms (${skipped} already existed, skipped)`);
                loadCodes();
              }}
              className="px-5 py-3 rounded-xl text-white font-semibold text-[13px] whitespace-nowrap"
              style={{ backgroundColor: TEAL }}
            >
              Generate from Room DB ({codes.filter(c => c.location_type === 'room').length} existing)
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h3 className="font-bold text-[14px] mb-4">Generate Single QR Code</h3>
          <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Label (room # or location name)" value={form.label} onChange={v => setForm({ ...form, label: v })} placeholder="205 or Pool Deck" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Type</label>
            <select value={form.location_type} onChange={e => setForm({ ...form, location_type: e.target.value })}
              className="bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none">
              {['room', 'lobby', 'pool', 'elevator', 'restaurant', 'gym', 'spa'].map(lt => (
                <option key={lt} value={lt} className="capitalize">{lt.charAt(0).toUpperCase() + lt.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleAdd}
              className="px-5 py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: TEAL }}>
              Generate
            </button>
          </div>
        </div>
        </div>
      </div>

      {codes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <QrCodeIcon size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No QR codes yet. Generate your first above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {codes.map(code => {
            const url = code.url || getUrl(code.label);
            const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
            return (
              <div key={code.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex gap-4">
                  <Image src={qrImgUrl} alt={`QR for ${code.label}`} width={80} height={80} className="rounded-lg border border-gray-100 shrink-0" unoptimized />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-bold text-[15px] text-gray-900">{code.label}</p>
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize mt-0.5">
                          {code.location_type}
                        </span>
                      </div>
                      <button onClick={() => handleDelete(code.id)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 break-all mt-2 line-clamp-2">{url}</p>
                    <button
                      onClick={() => handleCopy(url, code.id)}
                      className="mt-2 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}
                    >
                      {copied === code.id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy URL</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
