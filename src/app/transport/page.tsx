'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Users, MapPin, Send, Plane, ArrowRight, Bus } from 'lucide-react';
import { supabase, getHotelConfig, HotelConfig } from '@/lib/supabase';

export default function TransportPage() {
  const router = useRouter();
  const [view, setView] = useState<'request' | 'schedule'>('request');
  const [direction, setDirection] = useState<'arrival' | 'departure'>('departure');
  const [form, setForm] = useState({
    date: '', time: '', pickup: '', destination: 'airport', passengers: '1', notes: '', airline: '', flight: ''
  });
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const stored = localStorage.getItem('guestSession');
    let guest = { name: 'Guest', room: '?' };
    if (stored) {
      try { guest = JSON.parse(stored); } catch { localStorage.removeItem('guestSession'); }
    }
    const qrRoom = localStorage.getItem('attenda_qr_room');
    const hotel = await getHotelConfig();
    const details = [
      direction === 'arrival' ? 'Arrival' : 'Departure',
      form.date && form.time ? `${form.date} at ${form.time}` : '',
      form.airline ? `${form.airline}${form.flight ? ` ${form.flight}` : ''}` : '',
      form.destination,
      `${form.passengers} passenger(s)`,
      form.notes,
    ].filter(Boolean).join(' · ');
    await supabase.from('requests').insert({
      hotel_id: hotel?.id,
      guest_name: guest.name || 'Guest',
      room: qrRoom || guest.room || '?',
      type: 'Transport',
      details,
      status: 'pending',
    });
    if (hotel?.notificationEmail) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_request',
          data: {
            notificationEmail: hotel.notificationEmail,
            hotelName: hotel.name,
            guestName: guest.name || 'Guest',
            room: qrRoom || guest.room || '?',
            requestType: 'Transport',
            details,
          },
        }),
      }).catch(() => {});
    }
    // Sync to Google Sheet (if configured)
    if (hotel?.googleSheetUrl) {
      fetch('/api/transport-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: hotel.googleSheetUrl,
          guestName: guest.name || 'Guest',
          room: qrRoom || guest.room || '?',
          date: form.date,
          time: form.time,
          direction,
          pickup: direction === 'departure' ? 'Hotel Lobby' : form.destination,
          destination: direction === 'arrival' ? 'Hotel' : form.destination,
          airline: form.airline,
          flight: form.flight,
          passengers: form.passengers,
          notes: form.notes,
        }),
      }).catch(() => {});
    }
    setSent(true);
  };

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => router.push('/')} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Transport</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8">
          {/* View Toggle */}
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex mb-3">
            <button
              onClick={() => setView('request')}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${view === 'request' ? 'text-white' : 'text-gray-500'}`}
              style={view === 'request' ? { backgroundColor: '#6B1D3C' } : undefined}
            >
              Request Ride
            </button>
            <button
              onClick={() => setView('schedule')}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${view === 'schedule' ? 'text-white' : 'text-gray-500'}`}
              style={view === 'schedule' ? { backgroundColor: '#6B1D3C' } : undefined}
            >
              Shuttle Schedule
            </button>
          </div>

          {view === 'schedule' ? <ScheduleView /> :
          (<>
          {sent ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Send size={20} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-black mb-1">Request Sent!</h2>
              <p className="text-[13px] text-gray-500">Our team will confirm your transport within 24 hours.</p>
              <button onClick={() => setSent(false)} className="mt-4 text-[13px] font-semibold text-[#6B1D3C]">New Request</button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Direction Toggle */}
              <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex">
                <button
                  onClick={() => setDirection('arrival')}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${direction === 'arrival' ? 'text-white' : 'text-gray-500 bg-gray-50'}`}
                  style={direction === 'arrival' ? { backgroundColor: '#6B1D3C' } : undefined}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Plane size={14} /> Arrival
                  </span>
                </button>
                <button
                  onClick={() => setDirection('departure')}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${direction === 'departure' ? 'text-white' : 'text-gray-500 bg-gray-50'}`}
                  style={direction === 'departure' ? { backgroundColor: '#6B1D3C' } : undefined}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    Departure <Plane size={14} />
                  </span>
                </button>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-[12px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">{direction === 'arrival' ? 'Arrival Details' : 'Departure Details'}</p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[12px] text-gray-500 block mb-1">Date</label>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
                        <Calendar size={14} className="text-gray-400" />
                        <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="bg-transparent text-[13px] text-gray-800 outline-none w-full" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-[12px] text-gray-500 block mb-1">Time</label>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
                        <Calendar size={14} className="text-gray-400" />
                        <input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} className="bg-transparent text-[13px] text-gray-800 outline-none w-full" />
                      </div>
                    </div>
                  </div>

                  {direction === 'arrival' ? (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[12px] text-gray-500 block mb-1">Airline / Cruise Line</label>
                          <input type="text" placeholder="e.g. Delta, Royal Caribbean" value={form.airline} onChange={(e) => setForm({...form, airline: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none placeholder:text-gray-400" />
                        </div>
                        <div className="w-28">
                          <label className="text-[12px] text-gray-500 block mb-1">Flight #</label>
                          <input type="text" placeholder="DL1234" value={form.flight} onChange={(e) => setForm({...form, flight: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none placeholder:text-gray-400" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[12px] text-gray-500 block mb-1">Pickup From</label>
                        <select value={form.destination} onChange={(e) => setForm({...form, destination: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none">
                          <option value="airport">Miami International Airport (MIA)</option>
                          <option value="cruiseport">Port of Miami Cruise Terminal</option>
                          <option value="fortlauderdale">Fort Lauderdale Airport (FLL)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[#6B1D3C]/5">
                        <ArrowRight size={14} className="text-[#6B1D3C]" />
                        <p className="text-[12px] text-[#6B1D3C] font-semibold">Destination: Best Western Hotel</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-[12px] text-gray-500 block mb-1">Pickup From</label>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
                          <MapPin size={14} className="text-gray-400" />
                          <input type="text" placeholder="Hotel lobby" defaultValue="Hotel lobby" className="bg-transparent text-[13px] text-gray-800 outline-none w-full" disabled />
                        </div>
                      </div>

                      <div>
                        <label className="text-[12px] text-gray-500 block mb-1">Destination</label>
                        <select value={form.destination} onChange={(e) => setForm({...form, destination: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none">
                          <option value="airport">Miami International Airport (MIA)</option>
                          <option value="cruiseport">Port of Miami Cruise Terminal</option>
                          <option value="fortlauderdale">Fort Lauderdale Airport (FLL)</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[12px] text-gray-500 block mb-1">Passengers</label>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
                      <Users size={14} className="text-gray-400" />
                      <input type="number" min="1" max="20" value={form.passengers} onChange={(e) => setForm({...form, passengers: e.target.value})} className="bg-transparent text-[13px] text-gray-800 outline-none w-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-[12px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Special Requests</p>
                <textarea placeholder="Luggage count, child seats, wheelchair access, etc." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] text-gray-800 outline-none resize-none h-20 placeholder:text-gray-400" />
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-[11px] text-amber-700">Transportation requests are processed within 24 hours. Contact front desk at ext. 0 for immediate needs.</p>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] active:scale-[0.98] shadow-sm"
                style={{ backgroundColor: '#6B1D3C' }}
              >
                Submit Request
              </button>
            </div>
          )}
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ── Schedule View (Guest-Facing) ──────────────────── */
function ScheduleView() {
  const [hotel, setHotel] = useState<HotelConfig | null>(null);

  useEffect(() => {
    getHotelConfig().then(setHotel);
  }, []);

  if (!hotel?.googleSheetUrl) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <Bus size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500">Shuttle schedule coming soon.</p>
        <p className="text-[12px] text-gray-400 mt-1">Check with the front desk for current times.</p>
      </div>
    );
  }

  const embedUrl = hotel.googleSheetUrl
    .replace(/\/edit.*$/, '/pubhtml?gid=0&single=true&widget=true&headers=false');

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ height: 500 }}>
      <iframe src={embedUrl} className="w-full h-full border-0" title="Shuttle Schedule" />
    </div>
  );
}
